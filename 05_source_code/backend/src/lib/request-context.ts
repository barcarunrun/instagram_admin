import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function attachRequestContext(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const headerRequestId = request.header("x-request-id");
  const requestId =
    typeof headerRequestId === "string" && headerRequestId.length > 0
      ? headerRequestId
      : `req_${randomUUID()}`;

  request.requestId = requestId;
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
}
