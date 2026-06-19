export type IntegrationStatus = "not_connected" | "active" | "expired" | "error" | "reauthorization_required";

export type ContentStatus = "draft" | "scheduled" | "failed" | "published" | "action_required";

export type ContentType = "image" | "video" | "carousel" | "reel" | "extension";

export type JobStatus = "scheduled" | "running" | "success" | "failed" | "retrying" | "action_required" | "reauthorization_required";

export interface ValidationMessage {
  field: string;
  reason: string;
  message: string;
  level: "info" | "warning" | "error";
}

export interface ValidationSummary {
  valid: boolean;
  messages: ValidationMessage[];
}

export interface InstagramIntegration {
  id: string;
  accountId: string;
  facebookPageId: string;
  accountName: string;
  pageName: string;
  status: IntegrationStatus;
  tokenExpiresAt: string;
  permissions: string[];
  lastCheckedAt: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  mimeType: string;
  mediaType: "image" | "video";
  fileSize: number;
  width: number;
  height: number;
  durationSeconds?: number;
  url: string;
  createdAt: string;
}

export interface ContentVersion {
  id: string;
  updatedAt: string;
  updatedBy: string;
  summary: string;
}

export interface ContentItem {
  id: string;
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  caption: string;
  hashtags: string[];
  labels: string[];
  mediaAssetIds: string[];
  validation: ValidationSummary;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  versions: ContentVersion[];
}

export interface DashboardKpi {
  postingExecutionRate: number;
  weeklyPostCount: number;
  failedCount: number;
  actionRequiredCount: number;
}

export interface DashboardAlert {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  description: string;
  link: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  status: JobStatus | ContentStatus;
  contentType: ContentType;
  accountId: string;
}

export interface JobLog {
  id: string;
  scheduleId: string;
  contentId: string;
  status: JobStatus;
  retryCount: number;
  errorType?: "auth" | "validation" | "rate_limit" | "network";
  errorCode?: string;
  errorMessage?: string;
  resolution?: string;
  executedAt: string;
}

export interface ScheduleValidationResult {
  valid: boolean;
  messages: string[];
}