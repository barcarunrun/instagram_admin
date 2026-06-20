import { createClient, type RedisClientType } from "redis";

export const POSTING_JOB_QUEUE_KEY =
  process.env.POSTING_JOB_QUEUE_KEY ?? "posting_jobs:queue";

let redisClient: RedisClientType | undefined;

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

function getRedisClient(): RedisClientType {
  if (!redisClient) {
    redisClient = createClient({ url: getRedisUrl() });
    redisClient.on("error", (error) => {
      console.error("worker redis error", error);
    });
  }

  return redisClient;
}

export async function checkRedisConnection(): Promise<string> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  return client.ping();
}

export async function consumePostingJob(
  timeoutSeconds: number,
): Promise<string | null> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  const result = await client.blPop(POSTING_JOB_QUEUE_KEY, timeoutSeconds);
  return result?.element ?? null;
}

export async function requeuePostingJob(message: string): Promise<void> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  await client.rPush(POSTING_JOB_QUEUE_KEY, message);
}

export async function acquireAccountLease(
  accountId: string,
  ttlSeconds: number,
): Promise<boolean> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  const result = await client.set(
    `posting_jobs:account_lock:${accountId}`,
    String(Date.now()),
    { EX: ttlSeconds, NX: true },
  );

  return result === "OK";
}

export async function releaseAccountLease(accountId: string): Promise<void> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  await client.del(`posting_jobs:account_lock:${accountId}`);
}
