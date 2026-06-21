export type WorkerJob = {
  jobId: string;
  scheduleId: string;
  contentId: string;
  accountId: string;
  publishAt: string;
  retryCount: number;
  triggeredBy: "scheduler" | "manual_retry";
};

export type WorkerExecutionPayload = {
  jobId: string;
  scheduleId: string;
  contentId: string;
  accountId: string;
  integration: {
    accountId: string;
    facebookPageId: string;
    accessToken: string;
    tokenExpiresAt: string;
    permissions: string[];
  };
  publishAt: string;
  retryCount: number;
  mockScenario?: string;
  payload: {
    contentType: "image" | "video" | "carousel" | "reel" | "extension";
    caption: string;
    hashtags: string[];
    orderedMediaAssetIds: string[];
    graphApi: {
      mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "REELS" | "EXTENSION";
      caption: string;
      mediaUrl?: string;
      children?: string[];
      coverUrl?: string;
      templateKey?: string;
      settings?: Record<string, unknown>;
    };
    assets: Array<{
      mediaAssetId: string;
      mediaType: "image" | "video";
      mimeType: string;
      url: string;
      order: number;
    }>;
  };
};

export type WorkerConfig = {
  concurrency: number;
  apiBaseUrl: string;
  redisUrl: string;
  workerToken: string;
};
