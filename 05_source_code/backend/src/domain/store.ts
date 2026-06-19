import { createId } from "../lib/id.js";
import { addDays, addHours, nowIso } from "../lib/time.js";
import { validateContentDraft } from "./content-rules.js";
import type {
  AuditLog,
  CalendarEvent,
  ContentItem,
  DashboardAlert,
  DashboardKpi,
  InstagramIntegration,
  JobLog,
  MediaAsset,
  ScheduleItem,
} from "./types.js";

const integrations: InstagramIntegration[] = [
  {
    id: "integration_1",
    accountId: "ig_12345",
    facebookPageId: "fb_45678",
    accountName: "Northwind Apparel",
    pageName: "Northwind Official",
    status: "active",
    tokenExpiresAt: addDays(14),
    permissions: ["content_publish", "pages_show_list"],
    lastCheckedAt: nowIso(),
  },
];

const mediaAssets: MediaAsset[] = [
  {
    id: "asset_1",
    fileName: "summer-shirt-1.jpg",
    mimeType: "image/jpeg",
    mediaType: "image",
    fileSize: 512000,
    width: 1080,
    height: 1350,
    url: "https://placehold.co/1080x1350",
    createdAt: nowIso(),
  },
  {
    id: "asset_2",
    fileName: "summer-shirt-2.jpg",
    mimeType: "image/jpeg",
    mediaType: "image",
    fileSize: 624000,
    width: 1080,
    height: 1350,
    url: "https://placehold.co/1080x1350",
    createdAt: nowIso(),
  },
  {
    id: "asset_3",
    fileName: "reel-teaser.mp4",
    mimeType: "video/mp4",
    mediaType: "video",
    fileSize: 10240000,
    width: 1080,
    height: 1920,
    durationSeconds: 22,
    url: "https://example.com/reel-teaser.mp4",
    createdAt: nowIso(),
  },
];

const seededContentValidation = validateContentDraft(
  {
    title: "新作シャツ_初夏コーデ_2026W25",
    contentType: "carousel",
    caption: "新作シャツの着回し提案です",
    hashtags: ["#メンズファッション", "#新作"],
    mediaAssetIds: ["asset_1", "asset_2"],
  },
  mediaAssets.slice(0, 2),
);

const contents: ContentItem[] = [
  {
    id: "content_456",
    title: "新作シャツ_初夏コーデ_2026W25",
    contentType: "carousel",
    status: "scheduled",
    caption: "新作シャツの着回し提案です",
    hashtags: ["#メンズファッション", "#新作"],
    labels: ["夏コーデ", "新商品"],
    mediaAssetIds: ["asset_1", "asset_2"],
    validation: seededContentValidation,
    approvalStatus: "approved",
    createdBy: "user_demo",
    updatedBy: "user_demo",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    versions: [
      {
        id: "version_1",
        updatedAt: nowIso(),
        updatedBy: "user_demo",
        summary: "初回作成",
      },
    ],
  },
];

const schedules: ScheduleItem[] = [
  {
    id: "schedule_1",
    contentId: "content_456",
    accountId: "ig_12345",
    publishAt: addHours(6),
    timezone: "Asia/Tokyo",
    status: "scheduled",
    createdBy: "user_demo",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const jobLogs: JobLog[] = [
  {
    id: "job_1",
    scheduleId: "schedule_1",
    contentId: "content_456",
    status: "retrying",
    retryCount: 1,
    errorType: "rate_limit",
    errorCode: "RATE_LIMITED",
    errorMessage: "混雑のため処理を待機しています。自動で再試行します。",
    resolution: "自動再試行中です（1/3）。",
    executedAt: nowIso(),
  },
  {
    id: "job_2",
    scheduleId: "schedule_1",
    contentId: "content_456",
    status: "action_required",
    retryCount: 3,
    errorType: "validation",
    errorCode: "MEDIA_INVALID",
    errorMessage: "この投稿種別では利用できないメディア形式です。",
    resolution: "メディアを差し替えて再実行してください。",
    executedAt: nowIso(),
  },
];

const auditLogs: AuditLog[] = [
  {
    id: "audit_1",
    actorUserId: "user_demo",
    action: "content.updated",
    resourceType: "content",
    resourceId: "content_456",
    metadata: { summary: "キャプション更新" },
    createdAt: nowIso(),
  },
];

function createAuditLog(action: string, resourceType: string, resourceId: string, metadata: Record<string, string>): void {
  auditLogs.unshift({
    id: createId("audit"),
    actorUserId: "user_demo",
    action,
    resourceType,
    resourceId,
    metadata,
    createdAt: nowIso(),
  });
}

export const store = {
  getIntegrationStatus(): InstagramIntegration | undefined {
    return integrations[0];
  },

  getContents(filters: { keyword?: string; status?: string[]; contentType?: string[] }): ContentItem[] {
    return contents.filter((item) => {
      const matchesKeyword = !filters.keyword || [item.title, item.caption, ...item.labels].join(" ").includes(filters.keyword);
      const matchesStatus = !filters.status || filters.status.length === 0 || filters.status.includes(item.status);
      const matchesType = !filters.contentType || filters.contentType.length === 0 || filters.contentType.includes(item.contentType);
      return matchesKeyword && matchesStatus && matchesType;
    });
  },

  getContentById(id: string): ContentItem | undefined {
    return contents.find((item) => item.id === id);
  },

  getMediaAssets(): MediaAsset[] {
    return mediaAssets;
  },

  createContent(input: Omit<ContentItem, "id" | "status" | "validation" | "createdAt" | "updatedAt" | "versions">): ContentItem {
    const validation = validateContentDraft(input, mediaAssets.filter((asset) => input.mediaAssetIds.includes(asset.id)));
    const createdAt = nowIso();
    const content: ContentItem = {
      ...input,
      id: createId("content"),
      status: "draft",
      validation,
      createdAt,
      updatedAt: createdAt,
      versions: [
        {
          id: createId("version"),
          updatedAt: createdAt,
          updatedBy: input.updatedBy,
          summary: "初回作成",
        },
      ],
    };
    contents.unshift(content);
    createAuditLog("content.created", "content", content.id, { title: content.title });
    return content;
  },

  updateContent(id: string, patch: Partial<ContentItem>): ContentItem | undefined {
    const content = contents.find((item) => item.id === id);
    if (!content) {
      return undefined;
    }

    Object.assign(content, patch);
    content.updatedAt = nowIso();
    content.validation = validateContentDraft(content, mediaAssets.filter((asset) => content.mediaAssetIds.includes(asset.id)));
    content.versions.unshift({
      id: createId("version"),
      updatedAt: content.updatedAt,
      updatedBy: content.updatedBy,
      summary: "下書き更新",
    });
    createAuditLog("content.updated", "content", content.id, { title: content.title });
    return content;
  },

  duplicateContent(id: string): ContentItem | undefined {
    const existing = contents.find((item) => item.id === id);
    if (!existing) {
      return undefined;
    }

    return this.createContent({
      title: `${existing.title}_copy`,
      contentType: existing.contentType,
      caption: existing.caption,
      hashtags: [...existing.hashtags],
      labels: [...existing.labels],
      mediaAssetIds: [...existing.mediaAssetIds],
      approvalStatus: existing.approvalStatus,
      createdBy: "user_demo",
      updatedBy: "user_demo",
    });
  },

  validateContent(id: string): ContentItem["validation"] | undefined {
    const content = contents.find((item) => item.id === id);
    if (!content) {
      return undefined;
    }

    content.validation = validateContentDraft(content, mediaAssets.filter((asset) => content.mediaAssetIds.includes(asset.id)));
    return content.validation;
  },

  validateSchedule(input: { contentId: string; publishAt: string; timezone: string; accountId: string }): { valid: boolean; messages: string[] } {
    const messages: string[] = [];
    const integration = integrations.find((item) => item.accountId === input.accountId);
    const content = contents.find((item) => item.id === input.contentId);
    if (!integration || integration.status !== "active") {
      messages.push("アカウント連携の有効期限が切れています。再連携してください。");
    }
    if (!content) {
      messages.push("コンテンツが見つかりません。");
    }
    if (new Date(input.publishAt).getTime() <= Date.now()) {
      messages.push("公開日時は現在より後の時刻を指定してください。");
    }
    if (schedules.some((item) => item.contentId === input.contentId && item.accountId === input.accountId && item.publishAt === input.publishAt)) {
      messages.push("同一コンテンツ・同一公開先・同一時刻の重複予約はできません。");
    }
    if (content?.approvalStatus === "pending") {
      messages.push("承認待ちのため予約できません。");
    }
    return { valid: messages.length === 0, messages };
  },

  createSchedule(input: { contentId: string; publishAt: string; timezone: string; accountId: string }): ScheduleItem {
    const schedule: ScheduleItem = {
      id: createId("schedule"),
      contentId: input.contentId,
      accountId: input.accountId,
      publishAt: input.publishAt,
      timezone: input.timezone,
      status: "scheduled",
      createdBy: "user_demo",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    schedules.unshift(schedule);
    const content = contents.find((item) => item.id === input.contentId);
    if (content) {
      content.status = "scheduled";
      content.updatedAt = nowIso();
    }
    jobLogs.unshift({
      id: createId("job"),
      scheduleId: schedule.id,
      contentId: schedule.contentId,
      status: "scheduled",
      retryCount: 0,
      executedAt: schedule.createdAt,
    });
    createAuditLog("schedule.created", "schedule", schedule.id, { contentId: schedule.contentId });
    return schedule;
  },

  getCalendarEvents(): CalendarEvent[] {
    return schedules.map((schedule) => {
      const content = contents.find((item) => item.id === schedule.contentId)!;
      return {
        id: schedule.id,
        title: content.title,
        startsAt: schedule.publishAt,
        status: schedule.status,
        contentType: content.contentType,
        accountId: schedule.accountId,
      };
    });
  },

  getDashboardKpi(): DashboardKpi {
    const total = Math.max(jobLogs.length, 1);
    const successCount = jobLogs.filter((job) => job.status === "success").length;
    return {
      postingExecutionRate: Math.round((successCount / total) * 100),
      weeklyPostCount: schedules.length,
      failedCount: jobLogs.filter((job) => job.status === "failed").length,
      actionRequiredCount: jobLogs.filter((job) => job.status === "action_required" || job.status === "reauthorization_required").length,
    };
  },

  getDashboardAlerts(): DashboardAlert[] {
    return [
      {
        id: "alert_1",
        level: "warning",
        title: "再対応が必要な投稿があります",
        description: "メディア仕様不一致のため、修正して再実行してください。",
        link: "/logs",
      },
      {
        id: "alert_2",
        level: "info",
        title: "投稿実行率が目標を下回る見込みです。",
        description: "今週の成功率は 85% を下回っています。",
        link: "/dashboard",
      },
    ];
  },

  getJobLogs(): JobLog[] {
    return jobLogs;
  },

  retryJob(jobId: string): JobLog | undefined {
    const log = jobLogs.find((item) => item.id === jobId);
    if (!log) {
      return undefined;
    }
    log.status = "retrying";
    log.retryCount += 1;
    log.errorType = "network";
    log.errorCode = "RETRY_REQUESTED";
    log.errorMessage = "再実行する";
    log.resolution = `自動再試行中です（${log.retryCount}/3）。`;
    log.executedAt = nowIso();
    createAuditLog("job.retried", "posting_job", log.id, { contentId: log.contentId });
    return log;
  },

  getAuditLogs(): AuditLog[] {
    return auditLogs;
  },
};