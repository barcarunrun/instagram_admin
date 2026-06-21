import {
  acquireAccountLease,
  checkRedisConnection,
  consumePostingJob,
  releaseAccountLease,
  requeuePostingJob,
} from "./lib/redis.js";
import {
  publishToInstagramGraphApi,
  recheckPublishedMedia,
} from "./lib/instagram-graph.js";
import type {
  WorkerConfig,
  WorkerExecutionPayload,
  WorkerJob,
} from "./types.js";

const ACCOUNT_LEASE_SECONDS = Number(
  process.env.WORKER_ACCOUNT_LEASE_SECONDS ?? "120",
);

function getConfig(): WorkerConfig {
  return {
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "1"),
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000/api",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    workerToken: process.env.WORKER_INTERNAL_TOKEN ?? "local_worker_token",
  };
}

function getHeaders(config: WorkerConfig): HeadersInit {
  return {
    "content-type": "application/json",
    "x-worker-token": config.workerToken,
  };
}

async function internalFetch(
  config: WorkerConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...getHeaders(config),
      ...(init?.headers ?? {}),
    },
  });
}

async function reportFailure(
  config: WorkerConfig,
  jobId: string,
  input: { statusCode?: number; code?: string; message?: string },
): Promise<void> {
  await internalFetch(config, `/internal/jobs/${jobId}/fail`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function extractPublishIdFromDetails(details: unknown): string | undefined {
  if (!Array.isArray(details)) {
    return undefined;
  }

  const publishIdDetail = details.find(
    (detail) =>
      typeof detail === "object" &&
      detail !== null &&
      "field" in detail &&
      "reason" in detail &&
      detail.field === "publishId",
  ) as { field: string; reason: string } | undefined;

  return publishIdDetail?.reason;
}

async function publishViaApi(
  config: WorkerConfig,
  execution: WorkerExecutionPayload,
): Promise<
  | {
      ok: true;
      publishId: string;
      publishedAt: string;
      responsePayload: Record<string, unknown>;
    }
  | {
      ok: false;
      statusCode?: number;
      code?: string;
      message?: string;
      publishId?: string;
    }
> {
  if ((process.env.INSTAGRAM_API_MODE ?? "mock") !== "mock") {
    return publishToInstagramGraphApi(execution);
  }

  const publishResponse = await fetch(
    `${config.apiBaseUrl}/local/instagram/publish`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario: execution.mockScenario,
        payload: execution.payload,
      }),
    },
  );
  const publishBody = (await publishResponse.json()) as Record<string, unknown>;

  if (publishResponse.ok) {
    return {
      ok: true,
      publishId: String(publishBody.publishId),
      publishedAt: String(publishBody.publishedAt),
      responsePayload: publishBody,
    };
  }

  const errorBody = publishBody.error as
    | { code?: string; message?: string; details?: unknown }
    | undefined;

  return {
    ok: false,
    statusCode: publishResponse.status,
    code: errorBody?.code,
    message: errorBody?.message,
    publishId: extractPublishIdFromDetails(errorBody?.details),
  };
}

async function recheckUnknownResult(
  config: WorkerConfig,
  execution: WorkerExecutionPayload,
  publishId: string,
): Promise<{
  ok: true;
  publishId: string;
  publishedAt: string;
  responsePayload: Record<string, unknown>;
} | null> {
  if ((process.env.INSTAGRAM_API_MODE ?? "mock") !== "mock") {
    return recheckPublishedMedia(execution, publishId);
  }

  const response = await fetch(
    `${config.apiBaseUrl}/local/instagram/publish-status/${publishId}`,
  );

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as Record<string, unknown>;
  return {
    ok: true,
    publishId,
    publishedAt: String(body.publishedAt),
    responsePayload: body,
  };
}

async function processJob(config: WorkerConfig, job: WorkerJob): Promise<void> {
  const startResponse = await internalFetch(
    config,
    `/internal/jobs/${job.jobId}/start`,
    {
      method: "POST",
    },
  );

  if (startResponse.status === 404 || startResponse.status === 409) {
    return;
  }

  if (!startResponse.ok) {
    throw new Error(`Failed to start job ${job.jobId}`);
  }

  const payloadResponse = await internalFetch(
    config,
    `/internal/jobs/${job.jobId}/payload`,
    { method: "GET" },
  );

  if (!payloadResponse.ok) {
    await reportFailure(config, job.jobId, {
      statusCode: payloadResponse.status,
      code: "PAYLOAD_FETCH_FAILED",
      message: "ジョブ実行ペイロードを取得できませんでした。",
    });
    return;
  }

  const execution = (await payloadResponse.json()) as WorkerExecutionPayload;

  try {
    const publishResult = await publishViaApi(config, execution);

    if (publishResult.ok) {
      await internalFetch(config, `/internal/jobs/${job.jobId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          externalPublishId: publishResult.publishId,
          publishedAt: publishResult.publishedAt,
          responsePayload: publishResult.responsePayload,
        }),
      });
      return;
    }

    if (publishResult.code === "UNKNOWN_RESULT" && publishResult.publishId) {
      const rechecked = await recheckUnknownResult(
        config,
        execution,
        publishResult.publishId,
      );

      if (rechecked) {
        await internalFetch(config, `/internal/jobs/${job.jobId}/complete`, {
          method: "POST",
          body: JSON.stringify({
            externalPublishId: rechecked.publishId,
            publishedAt: rechecked.publishedAt,
            responsePayload: rechecked.responsePayload,
          }),
        });
        return;
      }
    }

    await reportFailure(config, job.jobId, {
      statusCode: publishResult.statusCode,
      code: publishResult.code,
      message: publishResult.message,
    });
  } catch (error) {
    await reportFailure(config, job.jobId, {
      statusCode: 504,
      code: "NETWORK_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "投稿実行中にネットワークエラーが発生しました。",
    });
  }
}

async function runWorkerLoop(
  config: WorkerConfig,
  workerIndex: number,
): Promise<void> {
  for (;;) {
    const message = await consumePostingJob(0);

    if (!message) {
      continue;
    }

    try {
      const job = JSON.parse(message) as WorkerJob;
      const leaseAcquired = await acquireAccountLease(
        job.accountId,
        ACCOUNT_LEASE_SECONDS,
      );

      if (!leaseAcquired) {
        await requeuePostingJob(message);
        continue;
      }

      try {
        await processJob(config, job);
      } finally {
        await releaseAccountLease(job.accountId);
      }
    } catch (error) {
      console.error(`worker loop ${workerIndex} failed`, error);
    }
  }
}

async function main(): Promise<void> {
  const config = getConfig();
  const redisPing = await checkRedisConnection();

  console.log("worker bootstrap ready", {
    concurrency: config.concurrency,
    apiBaseUrl: config.apiBaseUrl,
    redisUrl: config.redisUrl,
    redisPing,
    workerTokenConfigured: Boolean(config.workerToken),
    instagramApiMode: process.env.INSTAGRAM_API_MODE ?? "mock",
    notificationMode: process.env.NOTIFICATION_MODE ?? "log",
  });

  await Promise.all(
    Array.from({ length: Math.max(1, config.concurrency) }, (_, index) =>
      runWorkerLoop(config, index + 1),
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
