export type IntegrationStatus =
  | "not_connected"
  | "active"
  | "expired"
  | "error"
  | "reauthorization_required";

export type ContentStatus =
  | "draft"
  | "scheduled"
  | "failed"
  | "published"
  | "action_required";

export type ContentType = "image" | "video" | "carousel" | "reel" | "extension";

export type JobStatus =
  | "scheduled"
  | "running"
  | "success"
  | "failed"
  | "retrying"
  | "cancelled"
  | "action_required"
  | "reauthorization_required";

export type JobErrorType =
  | "auth"
  | "validation"
  | "rate_limit"
  | "network"
  | "unknown";

export interface PostingJobQueueMessage {
  jobId: string;
  scheduleId: string;
  contentId: string;
  accountId: string;
  publishAt: string;
  retryCount: number;
  triggeredBy: "scheduler" | "manual_retry";
}

export type ValidationMessageLevel = "info" | "warning" | "error";

export interface ValidationMessage {
  field: string;
  reason: string;
  message: string;
  level: ValidationMessageLevel;
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

export interface ContentConfig {
  orderedMediaAssetIds?: string[];
  coverAssetId?: string;
  templateKey?: string;
  settings?: Record<string, unknown>;
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
  contentConfig: ContentConfig;
  validation: ValidationSummary;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  versions: ContentVersion[];
}

export interface ScheduleItem {
  id: string;
  contentId: string;
  accountId: string;
  publishAt: string;
  timezone: string;
  status: JobStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobLog {
  id: string;
  scheduleId: string;
  contentId: string;
  status: JobStatus;
  retryCount: number;
  errorType?: JobErrorType;
  errorCode?: string;
  errorMessage?: string;
  resolution?: string;
  executedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface DashboardKpi {
  postingExecutionRate: number;
  weeklyPostCount: number;
  failedCount: number;
  unexecutedCount: number;
  actionRequiredCount: number;
}

export interface DashboardAlert {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  description: string;
  link: string;
}

export interface DashboardReauthorizationAccount {
  id: string;
  accountId: string;
  accountName: string;
  status: IntegrationStatus;
  tokenExpiresAt: string;
}

export interface DashboardSummary {
  kpi: DashboardKpi;
  alerts: DashboardAlert[];
  failures: JobLog[];
  unexecuted: ScheduleItem[];
  reauthorizationAccounts: DashboardReauthorizationAccount[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  status: JobStatus | ContentStatus;
  contentType: ContentType;
  accountId: string;
}
