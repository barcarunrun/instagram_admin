import { checkRedisConnection } from "./lib/redis.js";
import type { WorkerConfig } from "./types.js";

function getConfig(): WorkerConfig {
  return {
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "1"),
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000/api",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  };
}

async function main(): Promise<void> {
  const config = getConfig();
  const redisPing = await checkRedisConnection();

  console.log("worker bootstrap ready", {
    concurrency: config.concurrency,
    apiBaseUrl: config.apiBaseUrl,
    redisUrl: config.redisUrl,
    redisPing,
    instagramApiMode: process.env.INSTAGRAM_API_MODE ?? "mock",
    notificationMode: process.env.NOTIFICATION_MODE ?? "log",
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
