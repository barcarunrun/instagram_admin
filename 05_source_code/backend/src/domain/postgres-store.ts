import type { PoolClient } from "pg";
import { createId } from "../lib/id.js";
import { pool } from "../lib/db.js";
import { normalizeContentPayload } from "./content-normalization.js";
import { validateContentDraft } from "./content-rules.js";
import type {
  AuditLog,
  CalendarEvent,
  ContentConfig,
  ContentItem,
  ContentStatus,
  DashboardAlert,
  DashboardKpi,
  DashboardReauthorizationAccount,
  DashboardSummary,
  InstagramIntegration,
  JobStatus,
  JobLog,
  PostingJobQueueMessage,
  MediaAsset,
  ScheduleItem,
  ValidationSummary,
} from "./types.js";

const DEFAULT_ACTOR_KEY = "user_demo";
const EXECUTION_RATE_ALERT_THRESHOLD = 85;
const MAX_AUTOMATIC_RETRIES = Number(process.env.MAX_AUTOMATIC_RETRIES ?? "3");
const RETRY_BASE_SECONDS = Number(process.env.RETRY_BASE_SECONDS ?? "30");

type ContentRow = {
  id: string;
  title: string;
  content_type: ContentItem["contentType"];
  status: ContentStatus;
  caption: string;
  hashtags: string[] | null;
  content_config: ContentConfig | null;
  validation_summary: ValidationSummary | null;
  created_at: string | Date;
  updated_at: string | Date;
  labels: string[] | null;
  approval_status: ContentItem["approvalStatus"];
  created_by: string;
  updated_by: string;
};

type ContentVersionRow = {
  id: string;
  content_id: string;
  updated_at: string | Date;
  updated_by: string;
  summary: string;
};

type MediaRelationRow = {
  content_id: string;
  media_asset_id: string;
};

type ScheduleRow = {
  id: string;
  content_id: string;
  instagram_account_id: string;
  publish_at: string | Date;
  timezone: string;
  schedule_status: JobStatus | "cancelled";
  job_status: JobStatus | null;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  has_publish_result: boolean;
};

type DashboardDateRange = {
  from?: string;
  to?: string;
};

export class StoreConflictError extends Error {}

function toIso(value: string | Date | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function toValidationSummary(value: unknown): ValidationSummary {
  if (
    typeof value === "object" &&
    value !== null &&
    "valid" in value &&
    "messages" in value
  ) {
    return value as ValidationSummary;
  }

  return { valid: false, messages: [] };
}

function toContentConfig(value: unknown): ContentConfig {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as ContentConfig;
  }

  return {};
}

function normalizeDashboardDateRange(range?: DashboardDateRange): {
  from?: string;
  to?: string;
} {
  if (!range?.from && !range?.to) {
    return {};
  }

  return {
    from: range?.from ? toIso(range.from) : undefined,
    to: range?.to ? toIso(range.to) : undefined,
  };
}

function buildPublishAtRangeWhere(
  column: string,
  range?: DashboardDateRange,
): { clause: string; values: string[] } {
  const normalized = normalizeDashboardDateRange(range);
  const conditions: string[] = [];
  const values: string[] = [];

  if (normalized.from) {
    values.push(normalized.from);
    conditions.push(`${column} >= $${values.length}::timestamptz`);
  }

  if (normalized.to) {
    values.push(normalized.to);
    conditions.push(`${column} <= $${values.length}::timestamptz`);
  }

  return {
    clause: conditions.length > 0 ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

function mapMediaAsset(row: {
  id: string;
  file_name: string;
  mime_type: string;
  media_type: "image" | "video";
  file_size: number;
  width: number;
  height: number;
  duration_seconds: number | null;
  url: string;
  created_at: string | Date;
}): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds ?? undefined,
    url: row.url,
    createdAt: toIso(row.created_at),
  };
}

async function resolveActorUserId(
  actorKey: string = DEFAULT_ACTOR_KEY,
  client?: PoolClient,
): Promise<string> {
  const executor = client ?? pool;
  const result = await executor.query<{ id: string }>(
    `
      select id
      from users
      where name = $1 or email = $1 or id::text = $1
      order by created_at asc
      limit 1
    `,
    [actorKey],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Actor not found for key: ${actorKey}`);
  }

  return row.id;
}

async function getMediaAssetsByIds(assetIds: string[]): Promise<MediaAsset[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const result = await pool.query<{
    id: string;
    file_name: string;
    mime_type: string;
    media_type: "image" | "video";
    file_size: number;
    width: number;
    height: number;
    duration_seconds: number | null;
    url: string;
    created_at: string | Date;
  }>(
    `
      select id, file_name, mime_type, media_type, file_size, width, height,
        duration_seconds, url, created_at
      from media_assets
      where id = any($1::uuid[])
    `,
    [assetIds],
  );

  return result.rows.map(mapMediaAsset);
}

async function getMediaAssetByStorageKey(
  storageKey: string,
): Promise<MediaAsset | undefined> {
  const result = await pool.query<{
    id: string;
    file_name: string;
    mime_type: string;
    media_type: "image" | "video";
    file_size: number;
    width: number;
    height: number;
    duration_seconds: number | null;
    url: string;
    created_at: string | Date;
  }>(
    `
      select id, file_name, mime_type, media_type, file_size, width, height,
        duration_seconds, url, created_at
      from media_assets
      where storage_key = $1
      limit 1
    `,
    [storageKey],
  );

  const row = result.rows[0];
  return row ? mapMediaAsset(row) : undefined;
}

async function getContentRelations(contentIds: string[]): Promise<{
  mediaIdsByContent: Map<string, string[]>;
  versionsByContent: Map<string, ContentItem["versions"]>;
}> {
  const mediaIdsByContent = new Map<string, string[]>();
  const versionsByContent = new Map<string, ContentItem["versions"]>();

  if (contentIds.length === 0) {
    return { mediaIdsByContent, versionsByContent };
  }

  const [mediaRows, versionRows] = await Promise.all([
    pool.query<MediaRelationRow>(
      `
        select content_id, media_asset_id
        from content_media_assets
        where content_id = any($1::uuid[])
        order by display_order asc
      `,
      [contentIds],
    ),
    pool.query<ContentVersionRow>(
      `
        select id, content_id, updated_at, updated_by, summary
        from content_versions
        where content_id = any($1::uuid[])
        order by updated_at desc
      `,
      [contentIds],
    ),
  ]);

  for (const row of mediaRows.rows) {
    const current = mediaIdsByContent.get(row.content_id) ?? [];
    current.push(row.media_asset_id);
    mediaIdsByContent.set(row.content_id, current);
  }

  for (const row of versionRows.rows) {
    const current = versionsByContent.get(row.content_id) ?? [];
    current.push({
      id: row.id,
      updatedAt: toIso(row.updated_at),
      updatedBy: row.updated_by,
      summary: row.summary,
    });
    versionsByContent.set(row.content_id, current);
  }

  return { mediaIdsByContent, versionsByContent };
}

function mapContentRow(
  row: ContentRow,
  relations: {
    mediaIdsByContent: Map<string, string[]>;
    versionsByContent: Map<string, ContentItem["versions"]>;
  },
): ContentItem {
  return {
    id: row.id,
    title: row.title,
    contentType: row.content_type,
    status: row.status,
    caption: row.caption,
    hashtags: toStringArray(row.hashtags),
    labels: toStringArray(row.labels),
    mediaAssetIds: relations.mediaIdsByContent.get(row.id) ?? [],
    contentConfig: toContentConfig(row.content_config),
    validation: toValidationSummary(row.validation_summary),
    approvalStatus: row.approval_status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    versions: relations.versionsByContent.get(row.id) ?? [],
  };
}

function mapScheduleRow(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    contentId: row.content_id,
    accountId: row.instagram_account_id,
    publishAt: toIso(row.publish_at),
    timezone: row.timezone,
    status: row.job_status ?? row.schedule_status,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function getMockScenarioFromLabels(labels: string[]): string | undefined {
  const scenarioLabel = labels.find((label) => label.startsWith("mock:"));
  return scenarioLabel ? scenarioLabel.slice("mock:".length) : undefined;
}

function calculateNextRetryAt(retryCount: number): Date {
  const delaySeconds = RETRY_BASE_SECONDS * 2 ** Math.max(retryCount - 1, 0);
  return new Date(Date.now() + delaySeconds * 1000);
}

function classifyJobFailure(input: {
  statusCode?: number;
  code?: string;
  message?: string;
}): {
  errorType: JobLog["errorType"];
  jobStatus: JobStatus;
  errorCode: string;
  errorMessage: string;
  resolution: string;
  retryable: boolean;
} {
  const statusCode = input.statusCode;
  const code = input.code ?? "UNKNOWN_ERROR";
  const message = input.message ?? "投稿実行に失敗しました。";

  if (statusCode === 401 || code === "AUTH_EXPIRED") {
    return {
      errorType: "auth",
      jobStatus: "reauthorization_required",
      errorCode: code,
      errorMessage: message,
      resolution: "Instagram を再認可してから再実行してください。",
      retryable: false,
    };
  }

  if (
    statusCode === 403 ||
    code === "PERMISSION_DENIED" ||
    code === "VALIDATION_ERROR"
  ) {
    return {
      errorType: "validation",
      jobStatus: "action_required",
      errorCode: code,
      errorMessage: message,
      resolution: "投稿内容または権限設定を修正してから再実行してください。",
      retryable: false,
    };
  }

  if (statusCode === 429 || code === "RATE_LIMIT") {
    return {
      errorType: "rate_limit",
      jobStatus: "retrying",
      errorCode: code,
      errorMessage: message,
      resolution: "レート制限のため、時間をおいて自動再試行します。",
      retryable: true,
    };
  }

  if (
    statusCode === 408 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    code === "NETWORK_ERROR" ||
    code === "TIMEOUT" ||
    code === "UNKNOWN_RESULT"
  ) {
    return {
      errorType: code === "UNKNOWN_RESULT" ? "unknown" : "network",
      jobStatus: "retrying",
      errorCode: code,
      errorMessage: message,
      resolution: "一時障害のため、自動再試行します。",
      retryable: true,
    };
  }

  return {
    errorType: "unknown",
    jobStatus: "failed",
    errorCode: code,
    errorMessage: message,
    resolution: "原因を確認して再実行してください。",
    retryable: false,
  };
}

async function getContentValidationAssets(
  input: Pick<ContentItem, "contentType" | "mediaAssetIds" | "contentConfig">,
): Promise<{
  assets: MediaAsset[];
  configAssets: { coverAsset?: MediaAsset };
}> {
  const extraAssetIds: string[] = [];

  if (input.contentType === "reel" && input.contentConfig.coverAssetId) {
    extraAssetIds.push(input.contentConfig.coverAssetId);
  }

  const allAssets = await getMediaAssetsByIds([
    ...new Set([...input.mediaAssetIds, ...extraAssetIds]),
  ]);
  const assetsById = new Map(allAssets.map((asset) => [asset.id, asset]));

  return {
    assets: input.mediaAssetIds
      .map((assetId) => assetsById.get(assetId))
      .filter((asset): asset is MediaAsset => Boolean(asset)),
    configAssets: {
      coverAsset: input.contentConfig.coverAssetId
        ? assetsById.get(input.contentConfig.coverAssetId)
        : undefined,
    },
  };
}

function deriveIntegrationStatus(
  status: InstagramIntegration["status"],
  tokenExpiresAt: string | Date | null,
): InstagramIntegration["status"] {
  if (!tokenExpiresAt) {
    return status;
  }

  return new Date(tokenExpiresAt).getTime() <= Date.now() ? "expired" : status;
}

function mapIntegrationRow(row: {
  id: string;
  instagram_account_id: string;
  facebook_page_id: string;
  account_name: string;
  page_name: string;
  status: InstagramIntegration["status"];
  token_expires_at: string | Date | null;
  permissions: string[] | null;
  last_checked_at: string | Date | null;
}): InstagramIntegration {
  return {
    id: row.id,
    accountId: row.instagram_account_id,
    facebookPageId: row.facebook_page_id,
    accountName: row.account_name,
    pageName: row.page_name,
    status: deriveIntegrationStatus(row.status, row.token_expires_at),
    tokenExpiresAt: toIso(row.token_expires_at),
    permissions: toStringArray(row.permissions),
    lastCheckedAt: toIso(row.last_checked_at),
  };
}

async function refreshExpiredInstagramAccounts(): Promise<
  InstagramIntegration[]
> {
  const result = await pool.query<{
    id: string;
    instagram_account_id: string;
    facebook_page_id: string;
    account_name: string;
    page_name: string;
    status: InstagramIntegration["status"];
    token_expires_at: string | Date | null;
    permissions: string[] | null;
    last_checked_at: string | Date | null;
  }>(
    `
      update instagram_accounts
      set status = 'expired',
        updated_at = current_timestamp,
        last_checked_at = current_timestamp
      where token_expires_at is not null
        and token_expires_at <= current_timestamp
        and status <> 'expired'
      returning id, instagram_account_id, facebook_page_id, account_name,
        page_name, status, token_expires_at, permissions, last_checked_at
    `,
  );

  return result.rows.map(mapIntegrationRow);
}

async function getExpiringInstagramAccounts(
  days: number,
): Promise<InstagramIntegration[]> {
  const result = await pool.query<{
    id: string;
    instagram_account_id: string;
    facebook_page_id: string;
    account_name: string;
    page_name: string;
    status: InstagramIntegration["status"];
    token_expires_at: string | Date | null;
    permissions: string[] | null;
    last_checked_at: string | Date | null;
  }>(
    `
      select id, instagram_account_id, facebook_page_id, account_name,
        page_name, status, token_expires_at, permissions, last_checked_at
      from instagram_accounts
      where status = 'active'
        and token_expires_at is not null
        and token_expires_at > current_timestamp
        and token_expires_at <= current_timestamp + ($1::int * interval '1 day')
      order by token_expires_at asc
    `,
    [days],
  );

  return result.rows.map(mapIntegrationRow);
}

async function getReauthorizationInstagramAccounts(): Promise<
  InstagramIntegration[]
> {
  const result = await pool.query<{
    id: string;
    instagram_account_id: string;
    facebook_page_id: string;
    account_name: string;
    page_name: string;
    status: InstagramIntegration["status"];
    token_expires_at: string | Date | null;
    permissions: string[] | null;
    last_checked_at: string | Date | null;
  }>(
    `
      select id, instagram_account_id, facebook_page_id, account_name,
        page_name, status, token_expires_at, permissions, last_checked_at
      from instagram_accounts
      where status in ('expired', 'reauthorization_required')
      order by token_expires_at asc nulls last, updated_at desc
    `,
  );

  return result.rows.map(mapIntegrationRow);
}

async function fetchContents(rows: ContentRow[]): Promise<ContentItem[]> {
  const relations = await getContentRelations(rows.map((row) => row.id));
  return rows.map((row) => mapContentRow(row, relations));
}

async function fetchContentById(id: string): Promise<ContentItem | undefined> {
  const result = await pool.query<ContentRow>(
    `
      select id, title, content_type, status, caption, hashtags,
        content_config, validation_summary, created_at, updated_at, labels,
        approval_status, created_by, updated_by
      from contents
      where id = $1::uuid
      limit 1
    `,
    [id],
  );
  const row = result.rows[0];

  if (!row) {
    return undefined;
  }

  const [content] = await fetchContents([row]);
  return content;
}

async function fetchScheduleRowByQuery(
  whereClause: string,
  values: Array<string | null>,
): Promise<ScheduleRow | undefined> {
  const result = await pool.query<ScheduleRow>(
    `
      select s.id, s.content_id, ia.instagram_account_id, s.publish_at,
        s.timezone, s.status as schedule_status, pj.job_status,
        coalesce(nullif(u.name, ''), u.email, u.id::text) as created_by,
        s.created_at, s.updated_at,
        exists(
          select 1
          from publish_results pr
          where pr.posting_job_id = pj.id
        ) as has_publish_result
      from schedules s
      join instagram_accounts ia on ia.id = s.instagram_account_id
      join users u on u.id = s.created_by
      left join posting_jobs pj on pj.schedule_id = s.id
      where ${whereClause}
      order by pj.updated_at desc nulls last, pj.created_at desc nulls last
      limit 1
    `,
    values,
  );

  return result.rows[0];
}

async function refreshContentScheduleStatus(
  contentId: string,
  client: PoolClient,
): Promise<void> {
  const activeScheduleResult = await client.query<{ has_active: boolean }>(
    `
      select exists(
        select 1
        from schedules
        where content_id = $1::uuid
          and status <> 'cancelled'
      ) as has_active
    `,
    [contentId],
  );

  await client.query(
    `
      update contents
      set status = $2,
        updated_at = current_timestamp
      where id = $1::uuid
    `,
    [
      contentId,
      activeScheduleResult.rows[0]?.has_active ? "scheduled" : "draft",
    ],
  );
}

async function createAuditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, string>,
  actorKey: string = DEFAULT_ACTOR_KEY,
  client?: PoolClient,
): Promise<void> {
  const executor = client ?? pool;
  const actorUserId = await resolveActorUserId(actorKey, client);

  await executor.query(
    `
      insert into audit_logs (
        id, actor_user_id, action, resource_type, resource_id, metadata, created_at
      ) values ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, current_timestamp)
    `,
    [
      createId("audit"),
      actorUserId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(metadata),
    ],
  );
}

export async function recordAuditLog(input: {
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, string>;
  actorKey?: string;
}): Promise<void> {
  await createAuditLog(
    input.action,
    input.resourceType,
    input.resourceId,
    input.metadata,
    input.actorKey,
  );
}

export const store = {
  async refreshExpiredIntegrations(): Promise<InstagramIntegration[]> {
    return refreshExpiredInstagramAccounts();
  },

  async resetInstagramIntegrationsForTesting(): Promise<void> {
    await pool.query(
      `
        delete from publish_results
        where posting_job_id in (
          select pj.id
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          join instagram_accounts ia on ia.id = s.instagram_account_id
        )
      `,
    );
    await pool.query(
      `
        delete from posting_jobs
        where schedule_id in (
          select s.id
          from schedules s
          join instagram_accounts ia on ia.id = s.instagram_account_id
        )
      `,
    );
    await pool.query(
      `
        delete from schedules
        where instagram_account_id in (select id from instagram_accounts)
      `,
    );
    await pool.query(
      `
        delete from instagram_accounts
      `,
    );
  },

  async expireInstagramIntegrationForTesting(
    accountId?: string,
  ): Promise<void> {
    const values = accountId ? [accountId] : [];
    const where = accountId
      ? "where instagram_account_id = $1"
      : "where instagram_account_id like 'ig_mock_%'";

    await pool.query(
      `
        update instagram_accounts
        set status = 'active',
          token_expires_at = current_timestamp - interval '1 hour',
          updated_at = current_timestamp,
          last_checked_at = current_timestamp
        ${where}
      `,
      values,
    );
  },

  async getIntegrationStatus(): Promise<InstagramIntegration | undefined> {
    await refreshExpiredInstagramAccounts();
    const result = await pool.query<{
      id: string;
      instagram_account_id: string;
      facebook_page_id: string;
      account_name: string;
      page_name: string;
      status: InstagramIntegration["status"];
      token_expires_at: string | Date | null;
      permissions: string[] | null;
      last_checked_at: string | Date | null;
    }>(
      `
        select id, instagram_account_id, facebook_page_id, account_name,
          page_name, status, token_expires_at, permissions, last_checked_at
        from instagram_accounts
        order by created_at asc
        limit 1
      `,
    );
    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapIntegrationRow(row);
  },

  async upsertInstagramIntegration(
    input: {
      accountId: string;
      facebookPageId: string;
      accountName: string;
      pageName: string;
      accessTokenEncrypted: string;
      tokenExpiresAt: string;
      permissions: string[];
      status: InstagramIntegration["status"];
    },
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<InstagramIntegration> {
    const actorUserId = await resolveActorUserId(actorKey);
    const result = await pool.query<{
      id: string;
      instagram_account_id: string;
      facebook_page_id: string;
      account_name: string;
      page_name: string;
      status: InstagramIntegration["status"];
      token_expires_at: string | Date | null;
      permissions: string[] | null;
      last_checked_at: string | Date | null;
    }>(
      `
        insert into instagram_accounts (
          id, user_id, instagram_account_id, facebook_page_id, status,
          access_token_encrypted, token_expires_at, created_at, updated_at,
          account_name, page_name, permissions, last_checked_at
        ) values (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7::timestamp,
          current_timestamp, current_timestamp, $8, $9, $10::jsonb,
          current_timestamp
        )
        on conflict (instagram_account_id)
        do update set
          user_id = excluded.user_id,
          facebook_page_id = excluded.facebook_page_id,
          status = excluded.status,
          access_token_encrypted = excluded.access_token_encrypted,
          token_expires_at = excluded.token_expires_at,
          updated_at = current_timestamp,
          account_name = excluded.account_name,
          page_name = excluded.page_name,
          permissions = excluded.permissions,
          last_checked_at = current_timestamp
        returning id, instagram_account_id, facebook_page_id, account_name,
          page_name, status, token_expires_at, permissions, last_checked_at
      `,
      [
        createId("igacct"),
        actorUserId,
        input.accountId,
        input.facebookPageId,
        input.status,
        input.accessTokenEncrypted,
        input.tokenExpiresAt,
        input.accountName,
        input.pageName,
        JSON.stringify(input.permissions),
      ],
    );

    const integration = result.rows[0];
    if (!integration) {
      throw new Error("Failed to save Instagram integration.");
    }

    await createAuditLog(
      "integration.instagram.upserted",
      "instagram_account",
      integration.id,
      {
        accountId: input.accountId,
        status: input.status,
        requestId: options?.requestId ?? "",
      },
      actorKey,
    );

    return mapIntegrationRow(integration);
  },

  async getContents(filters: {
    keyword?: string;
    status?: string[];
    contentType?: string[];
  }): Promise<ContentItem[]> {
    const clauses: string[] = [];
    const values: Array<string | string[]> = [];

    if (filters.keyword) {
      values.push(`%${filters.keyword}%`);
      clauses.push(
        `(title ilike $${values.length} or caption ilike $${values.length} or coalesce(labels::text, '') ilike $${values.length})`,
      );
    }

    if (filters.status && filters.status.length > 0) {
      values.push(filters.status);
      clauses.push(`status = any($${values.length}::text[])`);
    }

    if (filters.contentType && filters.contentType.length > 0) {
      values.push(filters.contentType);
      clauses.push(`content_type = any($${values.length}::text[])`);
    }

    const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
    const result = await pool.query<ContentRow>(
      `
        select id, title, content_type, status, caption, hashtags,
          content_config, validation_summary, created_at, updated_at, labels,
          approval_status, created_by, updated_by
        from contents
        ${where}
        order by updated_at desc
      `,
      values,
    );

    return fetchContents(result.rows);
  },

  async getContentById(id: string): Promise<ContentItem | undefined> {
    return fetchContentById(id);
  },

  async getMediaAssets(): Promise<MediaAsset[]> {
    const result = await pool.query<{
      id: string;
      file_name: string;
      mime_type: string;
      media_type: "image" | "video";
      file_size: number;
      width: number;
      height: number;
      duration_seconds: number | null;
      url: string;
      created_at: string | Date;
    }>(
      `
        select id, file_name, mime_type, media_type, file_size, width, height,
          duration_seconds, url, created_at
        from media_assets
        order by created_at desc
      `,
    );

    return result.rows.map(mapMediaAsset);
  },

  async findMediaAssetByStorageKey(
    storageKey: string,
  ): Promise<MediaAsset | undefined> {
    return getMediaAssetByStorageKey(storageKey);
  },

  async getMediaAssetById(id: string): Promise<MediaAsset | undefined> {
    const assets = await getMediaAssetsByIds([id]);
    return assets[0];
  },

  async getMediaAssetStorageKeyById(id: string): Promise<string | undefined> {
    const result = await pool.query<{ storage_key: string }>(
      `
        select storage_key
        from media_assets
        where id = $1::uuid
        limit 1
      `,
      [id],
    );

    return result.rows[0]?.storage_key;
  },

  async createMediaAsset(input: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    mediaType: "image" | "video";
    fileSize: number;
    width: number;
    height: number;
    durationSeconds?: number;
    url: string;
  }): Promise<MediaAsset> {
    const assetId = createId("asset");
    await pool.query(
      `
        insert into media_assets (
          id, storage_key, file_name, mime_type, media_type,
          file_size, width, height, duration_seconds, url, created_at
        ) values (
          $1::uuid, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, current_timestamp
        )
      `,
      [
        assetId,
        input.storageKey,
        input.fileName,
        input.mimeType,
        input.mediaType,
        input.fileSize,
        input.width,
        input.height,
        input.durationSeconds ?? null,
        input.url,
      ],
    );

    const created = await getMediaAssetsByIds([assetId]);
    const asset = created[0];

    if (!asset) {
      throw new Error("Created media asset was not found");
    }

    return asset;
  },

  async updateMediaAssetUrl(id: string, url: string): Promise<MediaAsset> {
    await pool.query(
      `
        update media_assets
        set url = $2
        where id = $1::uuid
      `,
      [id, url],
    );

    const asset = await this.getMediaAssetById(id);
    if (!asset) {
      throw new Error("Updated media asset was not found");
    }

    return asset;
  },

  async createContent(
    input: Omit<
      ContentItem,
      "id" | "status" | "validation" | "createdAt" | "updatedAt" | "versions"
    >,
    options?: { requestId?: string },
  ): Promise<ContentItem> {
    const actorUserId = await resolveActorUserId(input.createdBy);
    const { assets, configAssets } = await getContentValidationAssets(input);
    const validation = validateContentDraft(input, assets, configAssets);
    const contentId = createId("content");
    const versionId = createId("version");
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          insert into contents (
            id, user_id, title, content_type, status, caption, hashtags,
            content_config, validation_summary, created_at, updated_at, labels,
            approval_status, created_by, updated_by
          ) values (
            $1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb,
            $8::jsonb, $9::jsonb, current_timestamp, current_timestamp, $10::jsonb,
            $11, $12, $13
          )
        `,
        [
          contentId,
          actorUserId,
          input.title,
          input.contentType,
          "draft",
          input.caption,
          JSON.stringify(input.hashtags),
          JSON.stringify(input.contentConfig),
          JSON.stringify(validation),
          JSON.stringify(input.labels),
          input.approvalStatus,
          input.createdBy,
          input.updatedBy,
        ],
      );

      for (const [index, mediaAssetId] of input.mediaAssetIds.entries()) {
        await client.query(
          `
            insert into content_media_assets (content_id, media_asset_id, display_order)
            values ($1::uuid, $2::uuid, $3)
          `,
          [contentId, mediaAssetId, index + 1],
        );
      }

      await client.query(
        `
          insert into content_versions (id, content_id, updated_at, updated_by, summary)
          values ($1::uuid, $2::uuid, current_timestamp, $3, $4)
        `,
        [versionId, contentId, input.updatedBy, "初回作成"],
      );

      await createAuditLog(
        "content.created",
        "content",
        contentId,
        { title: input.title, requestId: options?.requestId ?? "" },
        input.createdBy,
        client,
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const content = await fetchContentById(contentId);
    if (!content) {
      throw new Error("Created content was not found");
    }

    return content;
  },

  async updateContent(
    id: string,
    patch: Partial<ContentItem>,
    options?: { requestId?: string },
  ): Promise<ContentItem | undefined> {
    const existing = await fetchContentById(id);
    if (!existing) {
      return undefined;
    }

    const merged: ContentItem = {
      ...existing,
      ...patch,
      hashtags: patch.hashtags ?? existing.hashtags,
      labels: patch.labels ?? existing.labels,
      mediaAssetIds: patch.mediaAssetIds ?? existing.mediaAssetIds,
      contentConfig: patch.contentConfig ?? existing.contentConfig,
      approvalStatus: patch.approvalStatus ?? existing.approvalStatus,
      createdBy: patch.createdBy ?? existing.createdBy,
      updatedBy: patch.updatedBy ?? existing.updatedBy,
      status: patch.status ?? existing.status,
      versions: existing.versions,
    };
    const { assets, configAssets } = await getContentValidationAssets(merged);
    const validation = validateContentDraft(merged, assets, configAssets);
    const versionId = createId("version");
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          update contents
          set title = $2,
            content_type = $3,
            status = $4,
            caption = $5,
            hashtags = $6::jsonb,
            content_config = $7::jsonb,
            validation_summary = $8::jsonb,
            updated_at = current_timestamp,
            labels = $9::jsonb,
            approval_status = $10,
            created_by = $11,
            updated_by = $12
          where id = $1::uuid
        `,
        [
          id,
          merged.title,
          merged.contentType,
          merged.status,
          merged.caption,
          JSON.stringify(merged.hashtags),
          JSON.stringify(merged.contentConfig),
          JSON.stringify(validation),
          JSON.stringify(merged.labels),
          merged.approvalStatus,
          merged.createdBy,
          merged.updatedBy,
        ],
      );

      await client.query(
        `delete from content_media_assets where content_id = $1::uuid`,
        [id],
      );

      for (const [index, mediaAssetId] of merged.mediaAssetIds.entries()) {
        await client.query(
          `
            insert into content_media_assets (content_id, media_asset_id, display_order)
            values ($1::uuid, $2::uuid, $3)
          `,
          [id, mediaAssetId, index + 1],
        );
      }

      await client.query(
        `
          insert into content_versions (id, content_id, updated_at, updated_by, summary)
          values ($1::uuid, $2::uuid, current_timestamp, $3, $4)
        `,
        [versionId, id, merged.updatedBy, "下書き更新"],
      );

      await createAuditLog(
        "content.updated",
        "content",
        id,
        { title: merged.title, requestId: options?.requestId ?? "" },
        merged.updatedBy,
        client,
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return fetchContentById(id);
  },

  async duplicateContent(
    id: string,
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<ContentItem | undefined> {
    const existing = await fetchContentById(id);
    if (!existing) {
      return undefined;
    }

    return this.createContent(
      {
        title: `${existing.title}_copy`,
        contentType: existing.contentType,
        caption: existing.caption,
        hashtags: [...existing.hashtags],
        labels: [...existing.labels],
        mediaAssetIds: [...existing.mediaAssetIds],
        contentConfig: { ...existing.contentConfig },
        approvalStatus: existing.approvalStatus,
        createdBy: actorKey,
        updatedBy: actorKey,
      },
      options,
    );
  },

  async validateContent(
    id: string,
  ): Promise<ContentItem["validation"] | undefined> {
    const content = await fetchContentById(id);
    if (!content) {
      return undefined;
    }

    const { assets, configAssets } = await getContentValidationAssets(content);
    const validation = validateContentDraft(content, assets, configAssets);
    await pool.query(
      `
        update contents
        set validation_summary = $2::jsonb,
          updated_at = current_timestamp
        where id = $1::uuid
      `,
      [id, JSON.stringify(validation)],
    );
    return validation;
  },

  async previewContentValidation(
    id: string,
    patch: Partial<ContentItem>,
  ): Promise<ContentItem["validation"] | undefined> {
    const existing = await fetchContentById(id);
    if (!existing) {
      return undefined;
    }

    const merged: ContentItem = {
      ...existing,
      ...patch,
      hashtags: patch.hashtags ?? existing.hashtags,
      labels: patch.labels ?? existing.labels,
      mediaAssetIds: patch.mediaAssetIds ?? existing.mediaAssetIds,
      contentConfig: patch.contentConfig ?? existing.contentConfig,
      approvalStatus: patch.approvalStatus ?? existing.approvalStatus,
      createdBy: patch.createdBy ?? existing.createdBy,
      updatedBy: patch.updatedBy ?? existing.updatedBy,
      status: patch.status ?? existing.status,
      versions: existing.versions,
    };

    const { assets, configAssets } = await getContentValidationAssets(merged);
    return validateContentDraft(merged, assets, configAssets);
  },

  async getNormalizedContentPayload(id: string) {
    const content = await fetchContentById(id);
    if (!content) {
      return undefined;
    }

    const { assets, configAssets } = await getContentValidationAssets(content);
    return normalizeContentPayload(content, assets, configAssets);
  },

  async claimDuePostingJobs(
    limit: number = 10,
  ): Promise<PostingJobQueueMessage[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const result = await pool.query<{
      id: string;
      schedule_id: string;
      content_id: string;
      account_id: string;
      publish_at: string | Date;
      retry_count: number;
    }>(
      `
        with due_jobs as (
          select pj.id, pj.schedule_id, s.content_id,
            ia.instagram_account_id as account_id,
            s.publish_at, pj.retry_count
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          join instagram_accounts ia on ia.id = s.instagram_account_id
          where s.status <> 'cancelled'
            and pj.job_status in ('scheduled', 'retrying')
            and (
              (pj.job_status = 'scheduled' and s.publish_at <= current_timestamp)
              or (
                pj.job_status = 'retrying'
                and pj.next_retry_at is not null
                and pj.next_retry_at <= current_timestamp
              )
            )
            and (
              pj.locked_at is null
              or pj.locked_at <= current_timestamp - interval '5 minutes'
            )
          order by coalesce(pj.next_retry_at, s.publish_at) asc
          limit $1
          for update skip locked
        )
        update posting_jobs pj
        set locked_at = current_timestamp,
          updated_at = current_timestamp
        from due_jobs dj
        where pj.id = dj.id
        returning pj.id, dj.schedule_id, dj.content_id, dj.account_id,
          dj.publish_at, pj.retry_count
      `,
      [safeLimit],
    );

    return result.rows.map((row) => ({
      jobId: row.id,
      scheduleId: row.schedule_id,
      contentId: row.content_id,
      accountId: row.account_id,
      publishAt: toIso(row.publish_at),
      retryCount: row.retry_count,
      triggeredBy: "scheduler",
    }));
  },

  async startPostingJob(jobId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query("begin");
      const eligibility = await client.query<{
        id: string;
        schedule_id: string;
        content_id: string;
        job_status: JobStatus;
        integration_status: InstagramIntegration["status"];
        token_expires_at: string | Date | null;
      }>(
        `
          select pj.id, pj.schedule_id, s.content_id, pj.job_status,
            ia.status as integration_status, ia.token_expires_at
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          join instagram_accounts ia on ia.id = s.instagram_account_id
          where pj.id = $1::uuid
          limit 1
        `,
        [jobId],
      );
      const job = eligibility.rows[0];

      if (!job) {
        await client.query("rollback");
        return false;
      }

      const integrationStatus = deriveIntegrationStatus(
        job.integration_status,
        job.token_expires_at,
      );

      if (integrationStatus !== "active") {
        await client.query(
          `
            update posting_jobs
            set job_status = 'reauthorization_required',
              error_type = 'auth',
              error_code = 'AUTH_EXPIRED',
              error_message = 'アカウント連携の有効期限が切れています。',
              resolution = 'Instagram を再認可してから再実行してください。',
              next_retry_at = null,
              locked_at = null,
              executed_at = current_timestamp,
              updated_at = current_timestamp
            where id = $1::uuid
          `,
          [jobId],
        );
        await client.query(
          `
            update schedules
            set status = 'reauthorization_required',
              updated_at = current_timestamp
            where id = $1::uuid
          `,
          [job.schedule_id],
        );
        await client.query(
          `
            update contents
            set status = 'action_required',
              updated_at = current_timestamp
            where id = $1::uuid
          `,
          [job.content_id],
        );
        await createAuditLog(
          "job.reauthorization_required",
          "posting_job",
          jobId,
          { contentId: job.content_id, reason: "AUTH_EXPIRED" },
          DEFAULT_ACTOR_KEY,
          client,
        );
        await client.query("commit");
        throw new StoreConflictError(
          "Instagram の再認可が必要なため、このジョブは開始できません。",
        );
      }

      const started = await client.query<{ id: string }>(
        `
          update posting_jobs
          set job_status = 'running',
            executed_at = current_timestamp,
            updated_at = current_timestamp
          where id = $1::uuid
            and job_status in ('scheduled', 'retrying')
          returning id
        `,
        [jobId],
      );

      if (started.rows.length === 0) {
        await client.query("rollback");
        return false;
      }

      await client.query(
        `
          update schedules
          set status = 'running',
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [job.schedule_id],
      );
      await createAuditLog(
        "job.started",
        "posting_job",
        jobId,
        { contentId: job.content_id },
        DEFAULT_ACTOR_KEY,
        client,
      );
      await client.query("commit");
      return true;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  },

  async getPostingJobExecutionPayload(jobId: string) {
    const jobResult = await pool.query<{
      id: string;
      schedule_id: string;
      content_id: string;
      account_id: string;
      publish_at: string | Date;
      retry_count: number;
      job_status: JobStatus;
    }>(
      `
        select pj.id, pj.schedule_id, s.content_id,
          ia.instagram_account_id as account_id,
          s.publish_at, pj.retry_count, pj.job_status
        from posting_jobs pj
        join schedules s on s.id = pj.schedule_id
        join instagram_accounts ia on ia.id = s.instagram_account_id
        where pj.id = $1::uuid
        limit 1
      `,
      [jobId],
    );
    const job = jobResult.rows[0];

    if (!job || job.job_status !== "running") {
      return undefined;
    }

    const content = await fetchContentById(job.content_id);
    const payload = await this.getNormalizedContentPayload(job.content_id);

    if (!content || !payload) {
      return undefined;
    }

    return {
      jobId: job.id,
      scheduleId: job.schedule_id,
      contentId: job.content_id,
      accountId: job.account_id,
      publishAt: toIso(job.publish_at),
      retryCount: job.retry_count,
      mockScenario: getMockScenarioFromLabels(content.labels),
      payload,
    };
  },

  async getPostingJobQueueMessage(
    jobId: string,
    triggeredBy: PostingJobQueueMessage["triggeredBy"],
  ): Promise<PostingJobQueueMessage | undefined> {
    const result = await pool.query<{
      id: string;
      schedule_id: string;
      content_id: string;
      account_id: string;
      publish_at: string | Date;
      retry_count: number;
    }>(
      `
        select pj.id, pj.schedule_id, s.content_id,
          ia.instagram_account_id as account_id,
          s.publish_at, pj.retry_count
        from posting_jobs pj
        join schedules s on s.id = pj.schedule_id
        join instagram_accounts ia on ia.id = s.instagram_account_id
        where pj.id = $1::uuid
        limit 1
      `,
      [jobId],
    );
    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return {
      jobId: row.id,
      scheduleId: row.schedule_id,
      contentId: row.content_id,
      accountId: row.account_id,
      publishAt: toIso(row.publish_at),
      retryCount: row.retry_count,
      triggeredBy,
    };
  },

  async completePostingJob(input: {
    jobId: string;
    externalPublishId?: string;
    responsePayload?: Record<string, unknown>;
    publishedAt?: string;
  }): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query("begin");
      const jobResult = await client.query<{
        id: string;
        schedule_id: string;
        content_id: string;
      }>(
        `
          select pj.id, pj.schedule_id, s.content_id
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          where pj.id = $1::uuid
          limit 1
        `,
        [input.jobId],
      );
      const job = jobResult.rows[0];

      if (!job) {
        await client.query("rollback");
        return false;
      }

      const publishResultExists = await client.query<{ id: string }>(
        `
          select id
          from publish_results
          where posting_job_id = $1::uuid
          limit 1
        `,
        [input.jobId],
      );

      if (publishResultExists.rows.length === 0) {
        await client.query(
          `
            insert into publish_results (
              id, posting_job_id, external_publish_id, response_payload,
              published_at, created_at
            ) values (
              $1::uuid, $2::uuid, $3, $4::jsonb, $5::timestamp, current_timestamp
            )
          `,
          [
            createId("publish"),
            input.jobId,
            input.externalPublishId ?? null,
            JSON.stringify(input.responsePayload ?? {}),
            input.publishedAt ?? new Date().toISOString(),
          ],
        );
      }

      await client.query(
        `
          update posting_jobs
          set job_status = 'success',
            error_type = null,
            error_code = null,
            error_message = null,
            resolution = '投稿が完了しました。',
            next_retry_at = null,
            locked_at = null,
            executed_at = current_timestamp,
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [input.jobId],
      );
      await client.query(
        `
          update schedules
          set status = 'success',
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [job.schedule_id],
      );
      await client.query(
        `
          update contents
          set status = 'published',
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [job.content_id],
      );
      await createAuditLog(
        "job.completed",
        "posting_job",
        input.jobId,
        { contentId: job.content_id },
        DEFAULT_ACTOR_KEY,
        client,
      );
      await client.query("commit");
      return true;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  },

  async failPostingJob(input: {
    jobId: string;
    statusCode?: number;
    code?: string;
    message?: string;
  }): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query("begin");
      const jobResult = await client.query<{
        id: string;
        schedule_id: string;
        content_id: string;
        retry_count: number;
      }>(
        `
          select pj.id, pj.schedule_id, s.content_id, pj.retry_count
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          where pj.id = $1::uuid
          limit 1
        `,
        [input.jobId],
      );
      const job = jobResult.rows[0];

      if (!job) {
        await client.query("rollback");
        return false;
      }

      const classified = classifyJobFailure(input);
      const nextRetryCount = job.retry_count + 1;
      const shouldRetry =
        classified.retryable && nextRetryCount <= MAX_AUTOMATIC_RETRIES;

      const finalStatus: JobStatus = shouldRetry
        ? "retrying"
        : classified.jobStatus === "retrying"
          ? "failed"
          : classified.jobStatus;
      const resolution = shouldRetry
        ? `${classified.resolution}（${nextRetryCount}/${MAX_AUTOMATIC_RETRIES}）`
        : classified.jobStatus === "retrying"
          ? `自動再試行が上限に達しました。手動確認が必要です。`
          : classified.resolution;
      const nextRetryAt = shouldRetry
        ? calculateNextRetryAt(nextRetryCount).toISOString()
        : null;

      await client.query(
        `
          update posting_jobs
          set job_status = $2,
            error_type = $3,
            error_code = $4,
            error_message = $5,
            resolution = $6,
            retry_count = $7,
            next_retry_at = $8::timestamp,
            locked_at = null,
            executed_at = current_timestamp,
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [
          input.jobId,
          finalStatus,
          classified.errorType,
          classified.errorCode,
          classified.errorMessage,
          resolution,
          shouldRetry ? nextRetryCount : job.retry_count,
          nextRetryAt,
        ],
      );
      await client.query(
        `
          update schedules
          set status = $2,
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [job.schedule_id, finalStatus],
      );
      await client.query(
        `
          update contents
          set status = $2,
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [
          job.content_id,
          ["action_required", "reauthorization_required"].includes(finalStatus)
            ? "action_required"
            : "failed",
        ],
      );
      await createAuditLog(
        shouldRetry ? "job.retry_scheduled" : "job.failed",
        "posting_job",
        input.jobId,
        { contentId: job.content_id, errorCode: classified.errorCode },
        DEFAULT_ACTOR_KEY,
        client,
      );
      await client.query("commit");
      return true;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  },

  async validateSchedule(input: {
    contentId: string;
    publishAt: string;
    timezone: string;
    accountId: string;
    excludeScheduleId?: string;
  }): Promise<{ valid: boolean; messages: string[] }> {
    await refreshExpiredInstagramAccounts();
    const messages: string[] = [];
    const [integrationResult, contentResult, duplicateResult] =
      await Promise.all([
        pool.query<{
          status: InstagramIntegration["status"];
          token_expires_at: string | Date | null;
        }>(
          `
          select status, token_expires_at
          from instagram_accounts
          where instagram_account_id = $1
          limit 1
        `,
          [input.accountId],
        ),
        pool.query<{ approval_status: ContentItem["approvalStatus"] }>(
          `
          select approval_status
          from contents
          where id = $1::uuid
          limit 1
        `,
          [input.contentId],
        ),
        pool.query<{ id: string }>(
          `
          select s.id
          from schedules s
          join instagram_accounts ia on ia.id = s.instagram_account_id
          where s.content_id = $1::uuid
            and ia.instagram_account_id = $2
            and s.publish_at = $3::timestamp
            and s.status <> 'cancelled'
            and ($4::uuid is null or s.id <> $4::uuid)
          limit 1
        `,
          [
            input.contentId,
            input.accountId,
            input.publishAt,
            input.excludeScheduleId ?? null,
          ],
        ),
      ]);

    const integration = integrationResult.rows[0];
    const content = contentResult.rows[0];
    const integrationStatus = integration
      ? deriveIntegrationStatus(
          integration.status,
          integration.token_expires_at,
        )
      : "expired";

    if (!integration || integrationStatus !== "active") {
      messages.push(
        "アカウント連携の有効期限が切れています。再連携してください。",
      );
    }

    if (!content) {
      messages.push("コンテンツが見つかりません。");
    }

    if (new Date(input.publishAt).getTime() <= Date.now()) {
      messages.push("公開日時は現在より後の時刻を指定してください。");
    }

    if (duplicateResult.rows.length > 0) {
      messages.push(
        "同一コンテンツ・同一公開先・同一時刻の重複予約はできません。",
      );
    }

    if (content?.approval_status === "pending") {
      messages.push("承認待ちのため予約できません。");
    }

    return { valid: messages.length === 0, messages };
  },

  async getScheduleById(id: string): Promise<ScheduleItem | undefined> {
    const row = await fetchScheduleRowByQuery("s.id = $1::uuid", [id]);
    return row ? mapScheduleRow(row) : undefined;
  },

  async getLatestScheduleForContent(
    contentId: string,
  ): Promise<ScheduleItem | undefined> {
    const row = await fetchScheduleRowByQuery(
      "s.content_id = $1::uuid and s.status <> 'cancelled'",
      [contentId],
    );
    return row ? mapScheduleRow(row) : undefined;
  },

  async createSchedule(
    input: {
      contentId: string;
      publishAt: string;
      timezone: string;
      accountId: string;
    },
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<{
    id: string;
    contentId: string;
    accountId: string;
    publishAt: string;
    timezone: string;
    status: "scheduled";
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const actorUserId = await resolveActorUserId(actorKey);
    const integrationResult = await pool.query<{ id: string }>(
      `
        select id
        from instagram_accounts
        where instagram_account_id = $1
        limit 1
      `,
      [input.accountId],
    );
    const integration = integrationResult.rows[0];

    if (!integration) {
      throw new Error("Integration not found for schedule creation");
    }

    const scheduleId = createId("schedule");
    const jobId = createId("job");
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          insert into schedules (
            id, content_id, instagram_account_id, publish_at, timezone,
            status, created_by, created_at, updated_at
          ) values (
            $1::uuid, $2::uuid, $3::uuid, $4::timestamp, $5,
            $6, $7::uuid, current_timestamp, current_timestamp
          )
        `,
        [
          scheduleId,
          input.contentId,
          integration.id,
          input.publishAt,
          input.timezone,
          "scheduled",
          actorUserId,
        ],
      );

      await client.query(
        `
          update contents
          set status = 'scheduled',
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [input.contentId],
      );

      await client.query(
        `
          insert into posting_jobs (
            id, schedule_id, job_status, retry_count,
            created_at, updated_at, executed_at
          ) values (
            $1::uuid, $2::uuid, $3, 0,
            current_timestamp, current_timestamp, current_timestamp
          )
        `,
        [jobId, scheduleId, "scheduled"],
      );

      await createAuditLog(
        "schedule.created",
        "schedule",
        scheduleId,
        { contentId: input.contentId, requestId: options?.requestId ?? "" },
        actorKey,
        client,
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const scheduleResult = await pool.query<{
      created_at: string | Date;
      updated_at: string | Date;
    }>(
      `select created_at, updated_at from schedules where id = $1::uuid limit 1`,
      [scheduleId],
    );
    const scheduleRow = scheduleResult.rows[0];

    return {
      id: scheduleId,
      contentId: input.contentId,
      accountId: input.accountId,
      publishAt: input.publishAt,
      timezone: input.timezone,
      status: "scheduled",
      createdBy: actorKey,
      createdAt: toIso(scheduleRow?.created_at),
      updatedAt: toIso(scheduleRow?.updated_at),
    };
  },

  async updateSchedule(
    id: string,
    input: {
      contentId: string;
      publishAt: string;
      timezone: string;
      accountId: string;
    },
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<ScheduleItem | undefined> {
    const existing = await fetchScheduleRowByQuery("s.id = $1::uuid", [id]);

    if (!existing) {
      return undefined;
    }

    const effectiveStatus = existing.job_status ?? existing.schedule_status;
    if (effectiveStatus !== "scheduled") {
      throw new StoreConflictError("予約済みのスケジュールのみ変更できます。");
    }

    const integrationResult = await pool.query<{ id: string }>(
      `
        select id
        from instagram_accounts
        where instagram_account_id = $1
        limit 1
      `,
      [input.accountId],
    );
    const integration = integrationResult.rows[0];

    if (!integration) {
      throw new StoreConflictError(
        "公開先アカウントが見つかりません。連携状態を確認してください。",
      );
    }

    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          update schedules
          set content_id = $2::uuid,
            instagram_account_id = $3::uuid,
            publish_at = $4::timestamp,
            timezone = $5,
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [id, input.contentId, integration.id, input.publishAt, input.timezone],
      );

      await client.query(
        `
          update posting_jobs
          set updated_at = current_timestamp
          where schedule_id = $1::uuid
        `,
        [id],
      );

      await refreshContentScheduleStatus(existing.content_id, client);
      if (existing.content_id !== input.contentId) {
        await refreshContentScheduleStatus(input.contentId, client);
      }

      await createAuditLog(
        "schedule.updated",
        "schedule",
        id,
        {
          contentId: input.contentId,
          publishAt: input.publishAt,
          requestId: options?.requestId ?? "",
        },
        actorKey,
        client,
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return this.getScheduleById(id);
  },

  async cancelSchedule(
    id: string,
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<ScheduleItem | undefined> {
    const existing = await fetchScheduleRowByQuery("s.id = $1::uuid", [id]);

    if (!existing) {
      return undefined;
    }

    const effectiveStatus = existing.job_status ?? existing.schedule_status;
    if (!["scheduled", "failed"].includes(effectiveStatus)) {
      throw new StoreConflictError(
        "予約済み、または失敗したスケジュールのみ取消できます。",
      );
    }

    if (existing.has_publish_result) {
      throw new StoreConflictError(
        "公開結果が存在するため、このスケジュールは取消できません。",
      );
    }

    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(
        `
          update schedules
          set status = 'cancelled',
            updated_at = current_timestamp
          where id = $1::uuid
        `,
        [id],
      );

      await client.query(
        `
          update posting_jobs
          set job_status = 'cancelled',
            resolution = '予約を取り消しました。',
            updated_at = current_timestamp
          where schedule_id = $1::uuid
        `,
        [id],
      );

      await refreshContentScheduleStatus(existing.content_id, client);

      await createAuditLog(
        "schedule.cancelled",
        "schedule",
        id,
        {
          contentId: existing.content_id,
          requestId: options?.requestId ?? "",
        },
        actorKey,
        client,
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return this.getScheduleById(id);
  },

  async getCalendarEvents(
    range?: DashboardDateRange,
  ): Promise<CalendarEvent[]> {
    const publishRange = buildPublishAtRangeWhere("s.publish_at", range);
    const result = await pool.query<{
      id: string;
      title: string;
      publish_at: string | Date;
      status: CalendarEvent["status"];
      content_type: CalendarEvent["contentType"];
      instagram_account_id: string;
    }>(
      `
        select s.id, c.title, s.publish_at, s.status, c.content_type,
          ia.instagram_account_id
        from schedules s
        join contents c on c.id = s.content_id
        join instagram_accounts ia on ia.id = s.instagram_account_id
        ${publishRange.clause}
        order by s.publish_at asc
      `,
      publishRange.values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: toIso(row.publish_at),
      status: row.status,
      contentType: row.content_type,
      accountId: row.instagram_account_id,
    }));
  },

  async getDashboardKpi(range?: DashboardDateRange): Promise<DashboardKpi> {
    const publishRange = buildPublishAtRangeWhere("s.publish_at", range);
    const [jobAggregate, scheduleCount, unexecutedCount] = await Promise.all([
      pool.query<{
        total: string;
        success_count: string;
        failed_count: string;
        unexecuted_count: string;
        action_required_count: string;
      }>(
        `
          select
            count(*)::text as total,
            count(*) filter (where job_status = 'success')::text as success_count,
            count(*) filter (where job_status = 'failed')::text as failed_count,
            count(*) filter (
              where job_status in ('scheduled', 'running', 'retrying')
            )::text as unexecuted_count,
            count(*) filter (
              where job_status in ('action_required', 'reauthorization_required')
            )::text as action_required_count
          from posting_jobs pj
          join schedules s on s.id = pj.schedule_id
          ${publishRange.clause}
        `,
        publishRange.values,
      ),
      pool.query<{ count: string }>(
        `
          select count(*)::text as count
          from schedules s
          ${publishRange.clause}
        `,
        publishRange.values,
      ),
      pool.query<{ count: string }>(
        `
          select count(*)::text as count
          from schedules s
          left join posting_jobs pj on pj.schedule_id = s.id
          ${publishRange.clause}${publishRange.clause ? " and" : " where"}
            coalesce(pj.job_status, s.status) in ('scheduled', 'running', 'retrying')
        `,
        publishRange.values,
      ),
    ]);
    const jobRow = jobAggregate.rows[0] ?? {
      total: "0",
      success_count: "0",
      failed_count: "0",
      unexecuted_count: "0",
      action_required_count: "0",
    };
    const total = Math.max(Number(jobRow.total), 1);

    return {
      postingExecutionRate: Math.round(
        (Number(jobRow.success_count) / total) * 100,
      ),
      weeklyPostCount: Number(scheduleCount.rows[0]?.count ?? 0),
      failedCount: Number(jobRow.failed_count),
      unexecutedCount: Number(
        unexecutedCount.rows[0]?.count ?? jobRow.unexecuted_count,
      ),
      actionRequiredCount: Number(jobRow.action_required_count),
    };
  },

  async getDashboardAlerts(
    range?: DashboardDateRange,
  ): Promise<DashboardAlert[]> {
    await refreshExpiredInstagramAccounts();
    const kpi = await this.getDashboardKpi(range);
    const alerts: DashboardAlert[] = [];
    const [expiringAccounts, reauthorizationAccounts] = await Promise.all([
      getExpiringInstagramAccounts(7),
      getReauthorizationInstagramAccounts(),
    ]);

    if (kpi.actionRequiredCount > 0) {
      alerts.push({
        id: createId("alert"),
        level: "warning",
        title: "再対応が必要な投稿があります",
        description: "メディア仕様不一致のため、修正して再実行してください。",
        link: "/logs",
      });
    }

    if (kpi.postingExecutionRate < EXECUTION_RATE_ALERT_THRESHOLD) {
      alerts.push({
        id: createId("alert"),
        level: "info",
        title: "投稿実行率が目標を下回る見込みです。",
        description: `今週の成功率は ${EXECUTION_RATE_ALERT_THRESHOLD}% を下回っています。`,
        link: "/dashboard",
      });
    }

    if (reauthorizationAccounts.length > 0) {
      const account = reauthorizationAccounts[0];
      alerts.push({
        id: createId("alert"),
        level: "critical",
        title: "Instagram 再認可が必要です",
        description: `${account.accountName} の連携状態が ${account.status} です。再認可を実行してください。`,
        link: "/connect",
      });
    } else if (expiringAccounts.length > 0) {
      const account = expiringAccounts[0];
      alerts.push({
        id: createId("alert"),
        level: "warning",
        title: "Instagram トークンの期限が近づいています",
        description: `${account.accountName} のトークンは ${new Date(account.tokenExpiresAt).toLocaleDateString("ja-JP")} に期限を迎えます。`,
        link: "/connect",
      });
    }

    return alerts;
  },

  async getDashboardReauthorizationAccounts(): Promise<
    DashboardReauthorizationAccount[]
  > {
    await refreshExpiredInstagramAccounts();

    const accounts = await getReauthorizationInstagramAccounts();
    return accounts.map((account) => ({
      id: account.id,
      accountId: account.accountId,
      accountName: account.accountName,
      status: account.status,
      tokenExpiresAt: account.tokenExpiresAt,
    }));
  },

  async getDashboardFailures(range?: DashboardDateRange): Promise<JobLog[]> {
    const publishRange = buildPublishAtRangeWhere("s.publish_at", range);
    const result = await pool.query<{
      id: string;
      schedule_id: string;
      content_id: string;
      job_status: JobLog["status"];
      retry_count: number;
      error_type: JobLog["errorType"] | null;
      error_code: string | null;
      error_message: string | null;
      resolution: string | null;
      executed_at: string | Date;
    }>(
      `
        select pj.id, pj.schedule_id, s.content_id, pj.job_status, pj.retry_count,
          pj.error_type, pj.error_code, pj.error_message, pj.resolution,
          pj.executed_at
        from posting_jobs pj
        join schedules s on s.id = pj.schedule_id
        ${publishRange.clause}${publishRange.clause ? " and" : " where"}
          pj.job_status in ('failed', 'action_required', 'reauthorization_required')
        order by pj.executed_at desc, pj.created_at desc
        limit 10
      `,
      publishRange.values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      contentId: row.content_id,
      status: row.job_status,
      retryCount: row.retry_count,
      errorType: row.error_type ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      resolution: row.resolution ?? undefined,
      executedAt: toIso(row.executed_at),
    }));
  },

  async getDashboardUnexecuted(
    range?: DashboardDateRange,
  ): Promise<ScheduleItem[]> {
    const publishRange = buildPublishAtRangeWhere("s.publish_at", range);
    const result = await pool.query<ScheduleRow>(
      `
        select s.id, s.content_id, ia.instagram_account_id, s.publish_at, s.timezone,
          s.status as schedule_status, pj.job_status, s.created_by, s.created_at,
          s.updated_at,
          exists (
            select 1
            from publish_results pr
            where pr.posting_job_id = pj.id
          ) as has_publish_result
        from schedules s
        join instagram_accounts ia on ia.id = s.instagram_account_id
        left join posting_jobs pj on pj.schedule_id = s.id
        ${publishRange.clause}${publishRange.clause ? " and" : " where"}
          coalesce(pj.job_status, s.status) in ('scheduled', 'running', 'retrying')
        order by s.publish_at asc
        limit 10
      `,
      publishRange.values,
    );

    return result.rows.map(mapScheduleRow);
  },

  async getDashboardSummary(
    range?: DashboardDateRange,
  ): Promise<DashboardSummary> {
    const [kpi, alerts, failures, unexecuted, reauthorizationAccounts] =
      await Promise.all([
        this.getDashboardKpi(range),
        this.getDashboardAlerts(range),
        this.getDashboardFailures(range),
        this.getDashboardUnexecuted(range),
        this.getDashboardReauthorizationAccounts(),
      ]);

    return {
      kpi,
      alerts,
      failures,
      unexecuted,
      reauthorizationAccounts,
    };
  },

  async getJobLogs(): Promise<JobLog[]> {
    const result = await pool.query<{
      id: string;
      schedule_id: string;
      content_id: string;
      job_status: JobLog["status"];
      retry_count: number;
      error_type: JobLog["errorType"] | null;
      error_code: string | null;
      error_message: string | null;
      resolution: string | null;
      executed_at: string | Date;
    }>(
      `
        select pj.id, pj.schedule_id, s.content_id, pj.job_status, pj.retry_count,
          pj.error_type, pj.error_code, pj.error_message, pj.resolution,
          pj.executed_at
        from posting_jobs pj
        join schedules s on s.id = pj.schedule_id
        order by pj.executed_at desc, pj.created_at desc
      `,
    );

    return result.rows.map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      contentId: row.content_id,
      status: row.job_status,
      retryCount: row.retry_count,
      errorType: row.error_type ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
      resolution: row.resolution ?? undefined,
      executedAt: toIso(row.executed_at),
    }));
  },

  async retryJob(
    jobId: string,
    actorKey: string = DEFAULT_ACTOR_KEY,
    options?: { requestId?: string },
  ): Promise<JobLog | undefined> {
    const client = await pool.connect();

    try {
      await client.query("begin");
      const updateResult = await client.query<{
        id: string;
        schedule_id: string;
        content_id: string;
        job_status: JobLog["status"];
        retry_count: number;
        error_type: JobLog["errorType"] | null;
        error_code: string | null;
        error_message: string | null;
        resolution: string | null;
        executed_at: string | Date;
      }>(
        `
          update posting_jobs pj
          set job_status = 'retrying',
            retry_count = pj.retry_count + 1,
            error_type = 'network',
            error_code = 'RETRY_REQUESTED',
            error_message = '再実行する',
            resolution = concat('自動再試行中です（', pj.retry_count + 1, '/3）。'),
            next_retry_at = current_timestamp,
            locked_at = null,
            executed_at = current_timestamp,
            updated_at = current_timestamp
          from schedules s
          where pj.id = $1::uuid
            and s.id = pj.schedule_id
          returning pj.id, pj.schedule_id, s.content_id, pj.job_status, pj.retry_count,
            pj.error_type, pj.error_code, pj.error_message, pj.resolution,
            pj.executed_at
        `,
        [jobId],
      );
      const row = updateResult.rows[0];

      if (!row) {
        await client.query("rollback");
        return undefined;
      }

      await createAuditLog(
        "job.retried",
        "posting_job",
        row.id,
        { contentId: row.content_id, requestId: options?.requestId ?? "" },
        actorKey,
        client,
      );

      await client.query("commit");

      return {
        id: row.id,
        scheduleId: row.schedule_id,
        contentId: row.content_id,
        status: row.job_status,
        retryCount: row.retry_count,
        errorType: row.error_type ?? undefined,
        errorCode: row.error_code ?? undefined,
        errorMessage: row.error_message ?? undefined,
        resolution: row.resolution ?? undefined,
        executedAt: toIso(row.executed_at),
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const result = await pool.query<{
      id: string;
      actor_user_id: string | null;
      action: string;
      resource_type: string;
      resource_id: string;
      metadata: Record<string, string> | null;
      created_at: string | Date;
    }>(
      `
        select id, actor_user_id, action, resource_type, resource_id, metadata, created_at
        from audit_logs
        order by created_at desc
      `,
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id ?? DEFAULT_ACTOR_KEY,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      metadata: row.metadata ?? {},
      createdAt: toIso(row.created_at),
    }));
  },
};
