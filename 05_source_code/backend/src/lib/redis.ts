import { createClient, type RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

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

export function getRedisConnectionInfo() {
  return {
    url: redisUrl,
  };
}
