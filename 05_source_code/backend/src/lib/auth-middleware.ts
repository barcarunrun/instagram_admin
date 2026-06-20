import type { NextFunction, Request, Response } from "express";
import { getAuthUserFromRequest } from "./auth.js";
import { sendError } from "./errors.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      sendError(response, 401, "AUTH_EXPIRED", "認証が必要です。");
      return;
    }

    request.authUser = authUser;
    next();
  } catch (error) {
    console.error(error);
    sendError(response, 401, "AUTH_EXPIRED", "認証情報が無効です。");
  }
}
