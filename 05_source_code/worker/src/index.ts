import type { WorkerConfig } from "./types.js";

function getConfig(): WorkerConfig {
  return {
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "1"),
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000/api",
  };
}

function main(): void {
  const config = getConfig();

  console.log("worker bootstrap ready", {
    concurrency: config.concurrency,
    apiBaseUrl: config.apiBaseUrl,
  });
}

main();
