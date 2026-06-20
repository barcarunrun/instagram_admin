import type { AuthUser } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: AuthUser;
    }
  }
}

export {};
