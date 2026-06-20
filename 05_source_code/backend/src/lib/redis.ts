import { createClient, type RedisClientType } from "redis";
import type { PostingJobQueueMessage } from "../domain/types.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
export const POSTING_JOB_QUEUE_KEY =
  process.env.POSTING_JOB_QUEUE_KEY ?? "posting_jobs:queue";

let redisClient: RedisClientType | undefined;

function getRedisClient(): RedisClientType {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      console.error("backend redis error", error);
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

async function getConnectedRedisClient(): Promise<RedisClientType> {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

export async function enqueuePostingJob(
  job: PostingJobQueueMessage,
): Promise<void> {
  const client = await getConnectedRedisClient();
  await client.rPush(POSTING_JOB_QUEUE_KEY, JSON.stringify(job));
}

export async function getPostingJobQueueLength(): Promise<number> {
  const client = await getConnectedRedisClient();
  return client.lLen(POSTING_JOB_QUEUE_KEY);
}

export function getRedisConnectionInfo() {
  return {
    url: redisUrl,
    postingJobQueueKey: POSTING_JOB_QUEUE_KEY,
  };
}
