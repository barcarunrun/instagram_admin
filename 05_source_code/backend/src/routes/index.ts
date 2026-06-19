import { Router } from "express";
import { z } from "zod";
import { store } from "../domain/store.js";
import { sendError } from "../lib/errors.js";

const router = Router();

const contentSchema = z.object({
  title: z.string().min(1),
  contentType: z.enum(["image", "video", "carousel", "reel", "extension"]),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  mediaAssetIds: z.array(z.string()).min(1),
  approvalStatus: z.enum(["not_required", "pending", "approved", "rejected"]).default("not_required"),
  createdBy: z.string().default("user_demo"),
  updatedBy: z.string().default("user_demo"),
});

const scheduleSchema = z.object({
  contentId: z.string().min(1),
  publishAt: z.string().datetime(),
  timezone: z.string().min(1),
  accountId: z.string().min(1),
});

router.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

router.get("/integrations/instagram/status", (_request, response) => {
  const status = store.getIntegrationStatus();
  if (!status) {
    return sendError(response, 404, "RESOURCE_NOT_FOUND", "連携情報が見つかりません。");
  }
  response.json(status);
});

router.get("/media-assets", (_request, response) => {
  response.json({ items: store.getMediaAssets() });
});

router.get("/contents", (request, response) => {
  const status = typeof request.query.status === "string" ? request.query.status.split(",") : [];
  const contentType = typeof request.query.contentType === "string" ? request.query.contentType.split(",") : [];
  const keyword = typeof request.query.keyword === "string" ? request.query.keyword : undefined;
  response.json({ items: store.getContents({ keyword, status, contentType }) });
});

router.post("/contents", (request, response) => {
  const result = contentSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, 400, "VALIDATION_ERROR", "未入力の必須項目があります。入力してから再度お試しください。", result.error.issues.map((issue) => ({ field: issue.path.join("."), reason: issue.code })));
  }
  const created = store.createContent(result.data);
  response.status(201).json(created);
});

router.put("/contents/:id", (request, response) => {
  const result = contentSchema.partial().safeParse(request.body);
  if (!result.success) {
    return sendError(response, 400, "VALIDATION_ERROR", "入力内容を確認してください。", result.error.issues.map((issue) => ({ field: issue.path.join("."), reason: issue.code })));
  }
  const updated = store.updateContent(request.params.id, result.data);
  if (!updated) {
    return sendError(response, 404, "RESOURCE_NOT_FOUND", "コンテンツが見つかりません。");
  }
  response.json(updated);
});

router.post("/contents/:id/duplicate", (request, response) => {
  const duplicated = store.duplicateContent(request.params.id);
  if (!duplicated) {
    return sendError(response, 404, "RESOURCE_NOT_FOUND", "コンテンツが見つかりません。");
  }
  response.status(201).json(duplicated);
});

router.post("/contents/:id/validate", (request, response) => {
  const validation = store.validateContent(request.params.id);
  if (!validation) {
    return sendError(response, 404, "RESOURCE_NOT_FOUND", "コンテンツが見つかりません。");
  }
  response.json(validation);
});

router.post("/schedules/validate", (request, response) => {
  const result = scheduleSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, 400, "VALIDATION_ERROR", "入力内容を確認してください。", result.error.issues.map((issue) => ({ field: issue.path.join("."), reason: issue.code })));
  }
  response.json(store.validateSchedule(result.data));
});

router.post("/schedules", (request, response) => {
  const result = scheduleSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, 400, "VALIDATION_ERROR", "入力内容を確認してください。", result.error.issues.map((issue) => ({ field: issue.path.join("."), reason: issue.code })));
  }
  const validation = store.validateSchedule(result.data);
  if (!validation.valid) {
    return sendError(response, 409, "CONFLICT", validation.messages[0], validation.messages.map((message) => ({ field: "publishAt", reason: message })));
  }
  response.status(201).json(store.createSchedule(result.data));
});

router.get("/calendar/events", (_request, response) => {
  response.json({ items: store.getCalendarEvents() });
});

router.get("/dashboard/kpi", (_request, response) => {
  response.json(store.getDashboardKpi());
});

router.get("/dashboard/alerts", (_request, response) => {
  response.json({ items: store.getDashboardAlerts() });
});

router.get("/jobs/logs", (_request, response) => {
  response.json({ items: store.getJobLogs() });
});

router.post("/jobs/:jobId/retry", (request, response) => {
  const retried = store.retryJob(request.params.jobId);
  if (!retried) {
    return sendError(response, 404, "RESOURCE_NOT_FOUND", "ジョブが見つかりません。");
  }
  response.json(retried);
});

router.get("/audit-logs", (_request, response) => {
  response.json({ items: store.getAuditLogs() });
});

export { router };