import type { Response } from "express";

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  details: Array<{ field: string; reason: string }> = [],
): void {
  response.status(status).json({
    error: {
      code,
      message,
      details,
      requestId: `req_${Math.random().toString(36).slice(2, 10)}`,
    },
  });
}
