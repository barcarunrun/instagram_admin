import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createHash } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { recordAuditLog, store } from "../domain/postgres-store.js";
import {
  authenticateUser,
  createAccessToken,
  getAccessTokenExpiresInSeconds,
} from "../lib/auth.js";
import { requireAuth } from "../lib/auth-middleware.js";
import { checkDatabaseConnection } from "../lib/db.js";
import { sendError } from "../lib/errors.js";
import { extractMediaMetadata } from "../lib/media-metadata.js";
import {
  getStoredMediaPath,
  writeMediaToLocalStorage,
} from "../lib/media-storage.js";
import {
  consumeInstagramOAuthSession,
  createInstagramOAuthSession,
  createInstagramExistingTokenSession,
  finalizeInstagramOAuthCallback,
  getInstagramOAuthSession,
} from "../lib/instagram-oauth.js";
import {
  completeMockOAuthCallback,
  createMockOAuthStart,
  getMockInstagramAccounts,
  getMockModes,
  publishToMockInstagram,
  sendMockNotification,
} from "../lib/local-mocks.js";
import { checkRedisConnection, getRedisConnectionInfo } from "../lib/redis.js";
import { encryptToken } from "../lib/token-crypto.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
]);
const maxImageFileSize = 10 * 1024 * 1024;
const maxVideoFileSize = 100 * 1024 * 1024;

const contentSchema = z.object({
  title: z.string().min(1),
  contentType: z.enum(["image", "video", "carousel", "reel", "extension"]),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  mediaAssetIds: z.array(z.string()).min(1),
  approvalStatus: z
    .enum(["not_required", "pending", "approved", "rejected"])
    .default("not_required"),
  createdBy: z.string().default("user_demo"),
  updatedBy: z.string().default("user_demo"),
});

const scheduleSchema = z.object({
  contentId: z.string().min(1),
  publishAt: z.string().datetime(),
  timezone: z.string().min(1),
  accountId: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const notificationSchema = z.object({
  eventType: z.string().min(1),
  channel: z.enum(["email", "chat", "audit"]),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const instagramOAuthStartSchema = z.object({
  intent: z.enum(["connect", "reauthorize"]).default("connect"),
  scenario: z.string().optional(),
});

const instagramConnectSchema = z.object({
  oauthSessionId: z.string().min(1),
  accountId: z.string().min(1),
});

const instagramTestingExpireSchema = z.object({
  accountId: z.string().min(1).optional(),
});

function assertTestingRouteEnabled(response: Response): boolean {
  if (process.env.NODE_ENV === "production") {
    sendError(
      response,
      404,
      "RESOURCE_NOT_FOUND",
      "テスト用エンドポイントは利用できません。",
    );
    return false;
  }

  return true;
}

function asyncHandler(
  handler: (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => Promise<void | Response>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

function runUploadMiddleware(
  request: Request,
  response: Response,
): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(request, response, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function buildStorageKey(buffer: Buffer, originalName: string): string {
  const hash = createHash("sha256").update(buffer).digest("hex");
  const extension = path.extname(originalName).toLowerCase();
  return `${hash.slice(0, 2)}/${hash}${extension}`;
}

function validateUploadedFile(
  file: Express.Multer.File,
  mimeType: string,
): {
  valid: boolean;
  message?: string;
  reason?: string;
} {
  if (!allowedMimeTypes.has(mimeType)) {
    return {
      valid: false,
      reason: "unsupported_mime_type",
      message: "サポートされていないメディア形式です。",
    };
  }

  const sizeLimit = mimeType.startsWith("video/")
    ? maxVideoFileSize
    : maxImageFileSize;
  if (file.size > sizeLimit) {
    return {
      valid: false,
      reason: "file_too_large",
      message: "ファイルサイズが上限を超えています。",
    };
  }

  return { valid: true };
}

async function refreshInstagramStatuses(): Promise<void> {
  const expiredIntegrations = await store.refreshExpiredIntegrations();

  for (const integration of expiredIntegrations) {
    sendMockNotification({
      eventType: "instagram.reauthorization_required",
      channel: "audit",
      message: `${integration.accountName} のトークンが期限切れになりました。`,
      metadata: {
        accountId: integration.accountId,
        status: integration.status,
        tokenExpiresAt: integration.tokenExpiresAt,
      },
    });
  }
}

router.get(
  "/health",
  asyncHandler(async (_request, response) => {
    await checkDatabaseConnection();
    response.json({ status: "ok" });
  }),
);

router.post(
  "/auth/login",
  asyncHandler(async (request, response) => {
    const result = loginSchema.safeParse(request.body);

    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "メールアドレスとパスワードを確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }

    const authUser = await authenticateUser(
      result.data.email,
      result.data.password,
    );

    if (!authUser) {
      return sendError(
        response,
        401,
        "AUTH_EXPIRED",
        "メールアドレスまたはパスワードが正しくありません。",
      );
    }

    await recordAuditLog({
      action: "auth.login",
      resourceType: "user",
      resourceId: authUser.id,
      metadata: {
        email: authUser.email,
        requestId: request.requestId,
      },
      actorKey: authUser.id,
    });

    response.json({
      accessToken: createAccessToken(authUser),
      expiresIn: getAccessTokenExpiresInSeconds(),
      user: authUser,
    });
  }),
);

router.get(
  "/local/mocks/status",
  asyncHandler(async (_request, response) => {
    response.json({
      modes: getMockModes(),
      redis: getRedisConnectionInfo(),
    });
  }),
);

router.get(
  "/local/dependencies/redis",
  asyncHandler(async (_request, response) => {
    const ping = await checkRedisConnection();
    response.json({
      status: "ok",
      ping,
      redis: getRedisConnectionInfo(),
    });
  }),
);

router.get(
  "/local/oauth/start",
  asyncHandler(async (_request, response) => {
    response.json(createMockOAuthStart());
  }),
);

router.get(
  "/local/oauth/callback",
  asyncHandler(async (request, response) => {
    const result = completeMockOAuthCallback({
      code:
        typeof request.query.code === "string" ? request.query.code : undefined,
      state:
        typeof request.query.state === "string"
          ? request.query.state
          : undefined,
      scenario:
        typeof request.query.scenario === "string"
          ? request.query.scenario
          : undefined,
    });

    if (!result.ok) {
      return sendError(
        response,
        result.status,
        result.code,
        result.message,
        result.details,
      );
    }

    response.json(result);
  }),
);

router.get(
  "/auth/instagram/callback",
  asyncHandler(async (request, response) => {
    const result = await finalizeInstagramOAuthCallback({
      code:
        typeof request.query.code === "string" ? request.query.code : undefined,
      state:
        typeof request.query.state === "string"
          ? request.query.state
          : undefined,
      scenario:
        typeof request.query.scenario === "string"
          ? request.query.scenario
          : undefined,
    });

    if (!result.ok) {
      return sendError(response, result.status, result.code, result.message);
    }

    response.redirect(result.redirectUrl);
  }),
);

router.get(
  "/local/instagram/accounts",
  asyncHandler(async (request, response) => {
    const scenario =
      typeof request.query.scenario === "string"
        ? request.query.scenario
        : undefined;

    response.json({
      items: getMockInstagramAccounts(scenario),
    });
  }),
);

router.post(
  "/local/instagram/publish",
  asyncHandler(async (request, response) => {
    const scenario =
      typeof request.body?.scenario === "string"
        ? request.body.scenario
        : undefined;
    const publishResult = publishToMockInstagram(scenario);

    if (!publishResult.ok) {
      return sendError(
        response,
        publishResult.status,
        publishResult.error.code,
        publishResult.error.message,
      );
    }

    response.status(201).json(publishResult);
  }),
);

router.post(
  "/local/notifications/test",
  asyncHandler(async (request, response) => {
    const result = notificationSchema.safeParse(request.body);

    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "通知ペイロードを確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }

    response.status(202).json(sendMockNotification(result.data));
  }),
);

router.use(requireAuth);

router.get(
  "/auth/me",
  asyncHandler(async (request, response) => {
    response.json({ user: request.authUser });
  }),
);

router.post(
  "/media-assets",
  asyncHandler(async (request, response) => {
    try {
      await runUploadMiddleware(request, response);
    } catch (error) {
      if (error instanceof multer.MulterError) {
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "アップロード内容を確認してください。",
          [{ field: "file", reason: error.code }],
        );
      }

      throw error;
    }

    const file = request.file;
    if (!file) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "メディアファイルを指定してください。",
        [{ field: "file", reason: "required" }],
      );
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);
    const mimeType = detectedType?.mime ?? file.mimetype;
    const validation = validateUploadedFile(file, mimeType);
    if (!validation.valid) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        validation.message ?? "メディアファイルを確認してください。",
        [{ field: "file", reason: validation.reason ?? "invalid_file" }],
      );
    }

    const storageKey = buildStorageKey(file.buffer, file.originalname);
    const existing = await store.findMediaAssetByStorageKey(storageKey);
    if (existing) {
      return response.status(200).json(existing);
    }

    const storedPath = await writeMediaToLocalStorage({
      storageKey,
      buffer: file.buffer,
    });
    const metadata = await extractMediaMetadata({
      buffer: file.buffer,
      filePath: storedPath,
      mimeType,
    });
    const asset = await store.createMediaAsset({
      storageKey,
      fileName: file.originalname,
      mimeType,
      mediaType: metadata.mediaType,
      fileSize: file.size,
      width: metadata.width,
      height: metadata.height,
      durationSeconds: metadata.durationSeconds,
      url: "/api/media-assets/pending/file",
    });
    const finalizedUrl = `/api/media-assets/${asset.id}/file`;
    const updated = await store.updateMediaAssetUrl(asset.id, finalizedUrl);

    await recordAuditLog({
      action: "media.uploaded",
      resourceType: "media_asset",
      resourceId: updated.id,
      metadata: {
        fileName: updated.fileName,
        mimeType: updated.mimeType,
        requestId: request.requestId,
      },
      actorKey: request.authUser?.id ?? "user_demo",
    });

    response.status(201).json(updated);
  }),
);

router.get(
  "/media-assets/:id/file",
  asyncHandler(async (request, response) => {
    const asset = await store.getMediaAssetById(String(request.params.id));
    if (!asset) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "メディア資産が見つかりません。",
      );
    }

    const storageKey = await store.getMediaAssetStorageKeyById(asset.id);
    if (!storageKey) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "保存済みメディアが見つかりません。",
      );
    }

    response.type(asset.mimeType);
    response.sendFile(getStoredMediaPath(storageKey));
  }),
);

router.post(
  "/auth/logout",
  asyncHandler(async (request, response) => {
    if (request.authUser) {
      await recordAuditLog({
        action: "auth.logout",
        resourceType: "user",
        resourceId: request.authUser.id,
        metadata: {
          email: request.authUser.email,
          requestId: request.requestId,
        },
        actorKey: request.authUser.id,
      });
    }

    response.json({ success: true });
  }),
);

router.post(
  "/testing/integrations/instagram/reset",
  asyncHandler(async (_request, response) => {
    if (!assertTestingRouteEnabled(response)) {
      return;
    }

    await store.resetInstagramIntegrationsForTesting();
    response.status(204).send();
  }),
);

router.post(
  "/testing/integrations/instagram/expire",
  asyncHandler(async (request, response) => {
    if (!assertTestingRouteEnabled(response)) {
      return;
    }

    const result = instagramTestingExpireSchema.safeParse(request.body);

    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "期限切れテストパラメータを確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }

    await store.expireInstagramIntegrationForTesting(result.data.accountId);
    response.status(204).send();
  }),
);

router.get(
  "/auth/instagram/oauth-url",
  asyncHandler(async (request, response) => {
    const result = instagramOAuthStartSchema.safeParse({
      intent: request.query.intent,
      scenario: request.query.scenario,
    });

    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "OAuth 開始パラメータを確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }

    const oauth = createInstagramOAuthSession({
      actorKey: request.authUser?.id ?? "user_demo",
      intent: result.data.intent,
      scenario: result.data.scenario,
    });

    response.json(oauth);
  }),
);

router.get(
  "/integrations/instagram/oauth-sessions/:oauthSessionId",
  asyncHandler(async (request, response) => {
    const session = getInstagramOAuthSession(
      String(request.params.oauthSessionId),
      request.authUser?.id ?? "user_demo",
    );

    if (!session) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "OAuth セッションが見つかりません。",
      );
    }

    response.json(session);
  }),
);

router.post(
  "/integrations/instagram/bootstrap-existing-token",
  asyncHandler(async (request, response) => {
    const session = await createInstagramExistingTokenSession({
      actorKey: request.authUser?.id ?? "user_demo",
    });

    response.status(201).json(session);
  }),
);

router.post(
  "/integrations/instagram/connect",
  asyncHandler(async (request, response) => {
    const result = instagramConnectSchema.safeParse(request.body);

    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "連携確定パラメータを確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }

    const oauthSession = consumeInstagramOAuthSession(
      result.data.oauthSessionId,
      request.authUser?.id ?? "user_demo",
    );

    if (!oauthSession) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "有効な OAuth セッションが見つかりません。",
      );
    }

    const selectedAccount = oauthSession.accounts.find(
      (account) => account.accountId === result.data.accountId,
    );

    if (!selectedAccount) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "選択した Instagram アカウントが見つかりません。",
      );
    }

    const integration = await store.upsertInstagramIntegration(
      {
        accountId: selectedAccount.accountId,
        facebookPageId: selectedAccount.facebookPageId,
        accountName: selectedAccount.accountName,
        pageName: selectedAccount.pageName,
        accessTokenEncrypted: encryptToken(oauthSession.accessToken),
        tokenExpiresAt: oauthSession.tokenExpiresAt,
        permissions: selectedAccount.permissions,
        status: selectedAccount.status,
      },
      request.authUser?.id ?? "user_demo",
      { requestId: request.requestId },
    );

    response.status(201).json(integration);
  }),
);

router.get(
  "/integrations/instagram/status",
  asyncHandler(async (_request, response) => {
    await refreshInstagramStatuses();
    const status = await store.getIntegrationStatus();
    if (!status) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "連携情報が見つかりません。",
      );
    }
    response.json(status);
  }),
);

router.get(
  "/media-assets",
  asyncHandler(async (_request, response) => {
    response.json({ items: await store.getMediaAssets() });
  }),
);

router.get(
  "/contents",
  asyncHandler(async (request, response) => {
    const status =
      typeof request.query.status === "string"
        ? request.query.status.split(",")
        : [];
    const contentType =
      typeof request.query.contentType === "string"
        ? request.query.contentType.split(",")
        : [];
    const keyword =
      typeof request.query.keyword === "string"
        ? request.query.keyword
        : undefined;
    response.json({
      items: await store.getContents({ keyword, status, contentType }),
    });
  }),
);

router.post(
  "/contents",
  asyncHandler(async (request, response) => {
    const result = contentSchema.safeParse(request.body);
    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "未入力の必須項目があります。入力してから再度お試しください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }
    const actorKey = request.authUser?.name ?? "user_demo";
    const created = await store.createContent(
      {
        ...result.data,
        createdBy: actorKey,
        updatedBy: actorKey,
      },
      { requestId: request.requestId },
    );
    response.status(201).json(created);
  }),
);

router.put(
  "/contents/:id",
  asyncHandler(async (request, response) => {
    const result = contentSchema.partial().safeParse(request.body);
    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }
    const updated = await store.updateContent(
      String(request.params.id),
      {
        ...result.data,
        updatedBy: request.authUser?.name ?? "user_demo",
        createdBy: undefined,
      },
      { requestId: request.requestId },
    );
    if (!updated) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "コンテンツが見つかりません。",
      );
    }
    response.json(updated);
  }),
);

router.post(
  "/contents/:id/duplicate",
  asyncHandler(async (request, response) => {
    const duplicated = await store.duplicateContent(
      String(request.params.id),
      request.authUser?.name ?? "user_demo",
      { requestId: request.requestId },
    );
    if (!duplicated) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "コンテンツが見つかりません。",
      );
    }
    response.status(201).json(duplicated);
  }),
);

router.post(
  "/contents/:id/validate",
  asyncHandler(async (request, response) => {
    const validation = await store.validateContent(String(request.params.id));
    if (!validation) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "コンテンツが見つかりません。",
      );
    }
    response.json(validation);
  }),
);

router.post(
  "/schedules/validate",
  asyncHandler(async (request, response) => {
    const result = scheduleSchema.safeParse(request.body);
    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }
    response.json(await store.validateSchedule(result.data));
  }),
);

router.post(
  "/schedules",
  asyncHandler(async (request, response) => {
    const result = scheduleSchema.safeParse(request.body);
    if (!result.success) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          reason: issue.code,
        })),
      );
    }
    const validation = await store.validateSchedule(result.data);
    if (!validation.valid) {
      return sendError(
        response,
        409,
        "CONFLICT",
        validation.messages[0],
        validation.messages.map((message) => ({
          field: "publishAt",
          reason: message,
        })),
      );
    }
    response
      .status(201)
      .json(
        await store.createSchedule(
          result.data,
          request.authUser?.name ?? "user_demo",
          { requestId: request.requestId },
        ),
      );
  }),
);

router.get(
  "/calendar/events",
  asyncHandler(async (_request, response) => {
    response.json({ items: await store.getCalendarEvents() });
  }),
);

router.get(
  "/dashboard/kpi",
  asyncHandler(async (_request, response) => {
    response.json(await store.getDashboardKpi());
  }),
);

router.get(
  "/dashboard/alerts",
  asyncHandler(async (_request, response) => {
    await refreshInstagramStatuses();
    response.json({ items: await store.getDashboardAlerts() });
  }),
);

router.get(
  "/jobs/logs",
  asyncHandler(async (_request, response) => {
    response.json({ items: await store.getJobLogs() });
  }),
);

router.post(
  "/jobs/:jobId/retry",
  asyncHandler(async (request, response) => {
    const retried = await store.retryJob(
      String(request.params.jobId),
      request.authUser?.name ?? "user_demo",
      { requestId: request.requestId },
    );
    if (!retried) {
      return sendError(
        response,
        404,
        "RESOURCE_NOT_FOUND",
        "ジョブが見つかりません。",
      );
    }
    response.json(retried);
  }),
);

router.get(
  "/audit-logs",
  asyncHandler(async (_request, response) => {
    response.json({ items: await store.getAuditLogs() });
  }),
);

export { router };
