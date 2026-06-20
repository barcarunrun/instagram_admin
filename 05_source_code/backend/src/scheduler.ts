import "dotenv/config";
import { store } from "./domain/postgres-store.js";
import { enqueuePostingJob } from "./lib/redis.js";

const pollIntervalMs = Number(process.env.SCHEDULER_POLL_INTERVAL_MS ?? "5000");
const claimBatchSize = Number(process.env.SCHEDULER_BATCH_SIZE ?? "10");

async function runCycle(): Promise<void> {
  const dueJobs = await store.claimDuePostingJobs(claimBatchSize);

  if (dueJobs.length === 0) {
    return;
  }

  await Promise.all(dueJobs.map((job) => enqueuePostingJob(job)));

  console.log("scheduler enqueued posting jobs", {
    count: dueJobs.length,
    jobIds: dueJobs.map((job) => job.jobId),
  });
}

async function main(): Promise<void> {
  console.log("scheduler bootstrap ready", {
    pollIntervalMs,
    claimBatchSize,
  });

  await runCycle();
  setInterval(() => {
    void runCycle().catch((error) => {
      console.error("scheduler cycle failed", error);
    });
  }, pollIntervalMs);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
