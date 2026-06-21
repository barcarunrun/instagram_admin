import type { WorkerExecutionPayload } from "../types.js";

type PublishSuccess = {
  ok: true;
  publishId: string;
  publishedAt: string;
  responsePayload: Record<string, unknown>;
};

type PublishFailure = {
  ok: false;
  statusCode?: number;
  code?: string;
  message?: string;
  publishId?: string;
};

type GraphApiErrorBody = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    is_transient?: boolean;
    error_user_msg?: string;
  };
};

const DEFAULT_GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";
const DEFAULT_POLL_INTERVAL_MS = Number(
  process.env.INSTAGRAM_GRAPH_POLL_INTERVAL_MS ?? "5000",
);
const DEFAULT_POLL_ATTEMPTS = Number(
  process.env.INSTAGRAM_GRAPH_POLL_ATTEMPTS ?? "24",
);

function getGraphApiBaseUrl(): string {
  return (
    process.env.FACEBOOK_GRAPH_API_BASE_URL ?? DEFAULT_GRAPH_API_BASE_URL
  ).replace(/\/$/, "");
}

function isAbsoluteHttpUrl(value: string | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFailure(input: {
  statusCode?: number;
  code?: string;
  message?: string;
  publishId?: string;
}): PublishFailure {
  return {
    ok: false,
    statusCode: input.statusCode,
    code: input.code,
    message: input.message,
    publishId: input.publishId,
  };
}

function normalizeTimestamp(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime())
    ? new Date().toISOString()
    : normalized.toISOString();
}

function mapGraphApiError(
  statusCode: number,
  body: GraphApiErrorBody,
): PublishFailure {
  const error = body.error;
  const code = error?.code;
  const message =
    error?.error_user_msg ??
    error?.message ??
    "Instagram Graph API request failed.";

  if (statusCode === 401 || code === 190) {
    return createFailure({
      statusCode,
      code: "AUTH_EXPIRED",
      message,
    });
  }

  if (
    statusCode === 429 ||
    error?.is_transient ||
    code === 4 ||
    code === 17 ||
    code === 32 ||
    code === 613
  ) {
    return createFailure({
      statusCode,
      code: "RATE_LIMIT",
      message,
    });
  }

  if (statusCode === 403 || code === 10 || code === 200) {
    return createFailure({
      statusCode,
      code: "PERMISSION_DENIED",
      message,
    });
  }

  if (statusCode >= 500) {
    return createFailure({
      statusCode,
      code: "TIMEOUT",
      message,
    });
  }

  return createFailure({
    statusCode,
    code: "VALIDATION_ERROR",
    message,
  });
}

async function parseGraphResponse<T>(
  response: Response,
): Promise<T | GraphApiErrorBody> {
  return (await response.json().catch(() => ({}))) as T | GraphApiErrorBody;
}

async function graphApiPost<T>(
  path: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<{ ok: true; body: T } | { ok: false; failure: PublishFailure }> {
  const body = new URLSearchParams({
    ...params,
    access_token: accessToken,
  });
  const response = await fetch(`${getGraphApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const parsed = await parseGraphResponse<T>(response);

  if (!response.ok) {
    return {
      ok: false,
      failure: mapGraphApiError(response.status, parsed as GraphApiErrorBody),
    };
  }

  return { ok: true, body: parsed as T };
}

async function graphApiGet<T>(
  path: string,
  accessToken: string,
  query: Record<string, string>,
): Promise<{ ok: true; body: T } | { ok: false; failure: PublishFailure }> {
  const url = new URL(`${getGraphApiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { method: "GET" });
  const parsed = await parseGraphResponse<T>(response);

  if (!response.ok) {
    return {
      ok: false,
      failure: mapGraphApiError(response.status, parsed as GraphApiErrorBody),
    };
  }

  return { ok: true, body: parsed as T };
}

function requireMediaUrl(
  url: string | undefined,
  field: string,
): string | PublishFailure {
  if (!isAbsoluteHttpUrl(url)) {
    return createFailure({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: `${field} には外部公開可能な https URL が必要です。`,
    });
  }

  return url;
}

async function waitForContainerReady(
  accessToken: string,
  creationId: string,
): Promise<
  | { ok: true; responsePayload: Record<string, unknown> }
  | { ok: false; failure: PublishFailure }
> {
  for (let attempt = 0; attempt < DEFAULT_POLL_ATTEMPTS; attempt += 1) {
    const statusResponse = await graphApiGet<{
      id?: string;
      status_code?: string;
      status?: string;
      error_message?: string;
    }>(`/${creationId}`, accessToken, {
      fields: "id,status_code,status,error_message",
    });

    if (!statusResponse.ok) {
      return { ok: false, failure: statusResponse.failure };
    }

    const statusCode =
      statusResponse.body.status_code ?? statusResponse.body.status;
    if (
      !statusCode ||
      statusCode === "FINISHED" ||
      statusCode === "PUBLISHED"
    ) {
      return {
        ok: true,
        responsePayload: statusResponse.body as Record<string, unknown>,
      };
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return {
        ok: false,
        failure: createFailure({
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message:
            statusResponse.body.error_message ??
            `Instagram コンテナ処理が ${statusCode} で終了しました。`,
        }),
      };
    }

    await sleep(DEFAULT_POLL_INTERVAL_MS);
  }

  return {
    ok: false,
    failure: createFailure({
      statusCode: 504,
      code: "TIMEOUT",
      message: "Instagram メディア処理の完了待ちがタイムアウトしました。",
    }),
  };
}

async function createChildContainer(
  accountId: string,
  accessToken: string,
  mediaUrl: string,
  mediaType: "image" | "video",
): Promise<
  { ok: true; creationId: string } | { ok: false; failure: PublishFailure }
> {
  const postParams: Record<string, string> = {
    is_carousel_item: "true",
  };

  if (mediaType === "video") {
    postParams.media_type = "VIDEO";
    postParams.video_url = mediaUrl;
  } else {
    postParams.image_url = mediaUrl;
  }

  const createResponse = await graphApiPost<{ id?: string }>(
    `/${accountId}/media`,
    accessToken,
    postParams,
  );

  if (!createResponse.ok) {
    return createResponse;
  }

  if (!createResponse.body.id) {
    return {
      ok: false,
      failure: createFailure({
        statusCode: 502,
        code: "UNKNOWN_RESULT",
        message: "Instagram child container ID を取得できませんでした。",
      }),
    };
  }

  if (mediaType === "video") {
    const ready = await waitForContainerReady(
      accessToken,
      createResponse.body.id,
    );
    if (!ready.ok) {
      return ready;
    }
  }

  return {
    ok: true,
    creationId: createResponse.body.id,
  };
}

async function createMediaContainer(execution: WorkerExecutionPayload): Promise<
  | {
      ok: true;
      creationId: string;
      responsePayload: Record<string, unknown>;
    }
  | { ok: false; failure: PublishFailure }
> {
  const accessToken = execution.integration.accessToken;
  const accountId = execution.integration.accountId;
  const mediaType = execution.payload.graphApi.mediaType;

  if (mediaType === "EXTENSION") {
    return {
      ok: false,
      failure: createFailure({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "extension 種別は Instagram Graph API の実投稿に未対応です。",
      }),
    };
  }

  if (mediaType === "CAROUSEL") {
    const childIds: string[] = [];

    for (const asset of execution.payload.assets) {
      const childUrl = requireMediaUrl(
        asset.url,
        `assets.${asset.mediaAssetId}.url`,
      );
      if (typeof childUrl !== "string") {
        return { ok: false, failure: childUrl };
      }

      const child = await createChildContainer(
        accountId,
        accessToken,
        childUrl,
        asset.mediaType,
      );
      if (!child.ok) {
        return child;
      }
      childIds.push(child.creationId);
    }

    const carouselResponse = await graphApiPost<{ id?: string }>(
      `/${accountId}/media`,
      accessToken,
      {
        media_type: "CAROUSEL",
        caption: execution.payload.graphApi.caption,
        children: childIds.join(","),
      },
    );

    if (!carouselResponse.ok) {
      return carouselResponse;
    }

    if (!carouselResponse.body.id) {
      return {
        ok: false,
        failure: createFailure({
          statusCode: 502,
          code: "UNKNOWN_RESULT",
          message: "Instagram carousel container ID を取得できませんでした。",
        }),
      };
    }

    return {
      ok: true,
      creationId: carouselResponse.body.id,
      responsePayload: {
        childContainerIds: childIds,
        containerId: carouselResponse.body.id,
      },
    };
  }

  const mediaUrl = requireMediaUrl(
    execution.payload.graphApi.mediaUrl,
    "payload.graphApi.mediaUrl",
  );
  if (typeof mediaUrl !== "string") {
    return { ok: false, failure: mediaUrl };
  }

  const params: Record<string, string> = {
    caption: execution.payload.graphApi.caption,
  };

  if (mediaType === "IMAGE") {
    params.image_url = mediaUrl;
  }

  if (mediaType === "VIDEO") {
    params.media_type = "VIDEO";
    params.video_url = mediaUrl;
  }

  if (mediaType === "REELS") {
    params.media_type = "REELS";
    params.video_url = mediaUrl;

    const coverUrl = requireMediaUrl(
      execution.payload.graphApi.coverUrl,
      "payload.graphApi.coverUrl",
    );
    if (typeof coverUrl !== "string") {
      return { ok: false, failure: coverUrl };
    }
    params.cover_url = coverUrl;
  }

  const createResponse = await graphApiPost<{ id?: string }>(
    `/${accountId}/media`,
    accessToken,
    params,
  );

  if (!createResponse.ok) {
    return createResponse;
  }

  if (!createResponse.body.id) {
    return {
      ok: false,
      failure: createFailure({
        statusCode: 502,
        code: "UNKNOWN_RESULT",
        message: "Instagram media container ID を取得できませんでした。",
      }),
    };
  }

  if (mediaType === "VIDEO" || mediaType === "REELS") {
    const ready = await waitForContainerReady(
      accessToken,
      createResponse.body.id,
    );
    if (!ready.ok) {
      return ready;
    }

    return {
      ok: true,
      creationId: createResponse.body.id,
      responsePayload: {
        containerId: createResponse.body.id,
        containerStatus: ready.responsePayload,
      },
    };
  }

  return {
    ok: true,
    creationId: createResponse.body.id,
    responsePayload: {
      containerId: createResponse.body.id,
    },
  };
}

async function publishMediaContainer(
  execution: WorkerExecutionPayload,
  creationId: string,
): Promise<
  | { ok: true; publishId: string; responsePayload: Record<string, unknown> }
  | { ok: false; failure: PublishFailure }
> {
  const publishResponse = await graphApiPost<{ id?: string }>(
    `/${execution.integration.accountId}/media_publish`,
    execution.integration.accessToken,
    { creation_id: creationId },
  );

  if (!publishResponse.ok) {
    return publishResponse;
  }

  if (!publishResponse.body.id) {
    return {
      ok: false,
      failure: createFailure({
        statusCode: 502,
        code: "UNKNOWN_RESULT",
        message: "Instagram publish ID を取得できませんでした。",
      }),
    };
  }

  return {
    ok: true,
    publishId: publishResponse.body.id,
    responsePayload: publishResponse.body as Record<string, unknown>,
  };
}

export async function recheckPublishedMedia(
  execution: WorkerExecutionPayload,
  publishId: string,
): Promise<PublishSuccess | null> {
  const response = await graphApiGet<{
    id?: string;
    permalink?: string;
    timestamp?: string;
    media_product_type?: string;
  }>(`/${publishId}`, execution.integration.accessToken, {
    fields: "id,permalink,timestamp,media_product_type",
  });

  if (!response.ok || !response.body.id) {
    return null;
  }

  return {
    ok: true,
    publishId,
    publishedAt: normalizeTimestamp(response.body.timestamp),
    responsePayload: response.body as Record<string, unknown>,
  };
}

export async function publishToInstagramGraphApi(
  execution: WorkerExecutionPayload,
): Promise<PublishSuccess | PublishFailure> {
  const created = await createMediaContainer(execution);
  if (!created.ok) {
    return created.failure;
  }

  const published = await publishMediaContainer(execution, created.creationId);
  if (!published.ok) {
    return published.failure;
  }

  const rechecked = await recheckPublishedMedia(execution, published.publishId);
  if (!rechecked) {
    return createFailure({
      statusCode: 504,
      code: "UNKNOWN_RESULT",
      message: "投稿後の状態確認に失敗しました。再照会してください。",
      publishId: published.publishId,
    });
  }

  return {
    ok: true,
    publishId: published.publishId,
    publishedAt: rechecked.publishedAt,
    responsePayload: {
      ...created.responsePayload,
      publish: published.responsePayload,
      media: rechecked.responsePayload,
    },
  };
}
