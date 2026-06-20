import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request } from "express";
import { pool } from "./db.js";

const jwtSecret = process.env.JWT_SECRET ?? "local-dev-jwt-secret";
const accessTokenExpiresInSeconds = Number(
  process.env.ACCESS_TOKEN_EXPIRES_IN ?? "3600",
);

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

function parseCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  return headerValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

function extractToken(request: Request): string | undefined {
  const authorization = request.header("authorization");
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization.slice("Bearer ".length).trim();
  }

  return parseCookies(request.header("cookie")).auth_token;
}

async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const result = await pool.query<UserRow>(
    `
      select id, email, name, role, password_hash
      from users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  return result.rows[0];
}

async function getUserById(id: string): Promise<AuthUser | undefined> {
  const result = await pool.query<AuthUser>(
    `
      select id, email, name, role
      from users
      where id = $1::uuid
      limit 1
    `,
    [id],
  );

  return result.rows[0];
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUser | undefined> {
  const user = await getUserByEmail(email);
  if (!user) {
    return undefined;
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return undefined;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function createAccessToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: accessTokenExpiresInSeconds,
  });
}

export async function getAuthUserFromRequest(
  request: Request,
): Promise<AuthUser | undefined> {
  const token = extractToken(request);
  if (!token) {
    return undefined;
  }

  const payload = jwt.verify(token, jwtSecret) as TokenPayload & jwt.JwtPayload;
  return getUserById(payload.sub);
}

export function getAccessTokenExpiresInSeconds(): number {
  return accessTokenExpiresInSeconds;
}
