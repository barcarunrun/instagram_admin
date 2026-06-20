import { createClient, type RedisClientType } from "redis";

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
