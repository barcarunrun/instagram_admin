export type WorkerJob = {
  id: string;
  contentId: string;
  scheduledAt: string;
};

export type WorkerConfig = {
  concurrency: number;
  apiBaseUrl: string;
};
