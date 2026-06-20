import { randomBytes, randomUUID } from "node:crypto";
import type { IntegrationStatus } from "../domain/types.js";
import {
  completeMockOAuthCallback,
  getMockInstagramAccounts,
} from "./local-mocks.js";

export type OAuthIntent = "connect" | "reauthorize";

export type InstagramAccountCandidate = {
  accountId: string;
  accountName: string;
  facebookPageId: string;
  pageName: string;
  permissions: string[];
  status: IntegrationStatus;
};

type PendingOAuthSession = {
  id: string;
  state: string;
  actorKey: string;
  intent: OAuthIntent;
  scenario?: string;
  createdAt: string;
  completedAt?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  accounts?: InstagramAccountCandidate[];
};

type CallbackSuccess = {
  accessToken: string;
  tokenExpiresAt: string;
  accounts: InstagramAccountCandidate[];
};

const SESSION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SCOPES =
  "pages_show_list,instagram_basic,instagram_content_publish";
const oauthSessions = new Map<string, PendingOAuthSession>();
const oauthSessionIdsByState = new Map<string, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function cleanupExpiredSessions(): void {
  const now = Date.now();

  for (const [sessionId, session] of oauthSessions.entries()) {
    if (new Date(session.createdAt).getTime() + SESSION_TTL_MS < now) {
      oauthSessions.delete(sessionId);
      oauthSessionIdsByState.delete(session.state);
    }
  }
}

function getOAuthMode(): string {
  return process.env.OAUTH_MODE ?? "mock";
}

function getCallbackUrl(): string {
  return (
    process.env.FACEBOOK_OAUTH_REDIRECT_URI ??
    "http://localhost:4000/api/auth/instagram/callback"
  );
}

function getFrontendCompletionUrl(): string {
  return (
    process.env.FRONTEND_OAUTH_COMPLETE_URL ?? "http://localhost:3000/connect"
  );
}

function normalizePermissions(input: string[]): string[] {
  const normalized = input.map((permission) => {
    if (permission === "instagram_content_publish") {
      return "content_publish";
    }

    return permission;
  });

  return Array.from(new Set(normalized));
}

function toIntegrationStatus(permissions: string[]): IntegrationStatus {
  return permissions.includes("content_publish") &&
    permissions.includes("pages_show_list")
    ? "active"
    : "reauthorization_required";
}

function getSessionByState(state?: string): PendingOAuthSession | undefined {
  if (!state) {
    return undefined;
  }

  const sessionId = oauthSessionIdsByState.get(state);
  return sessionId ? oauthSessions.get(sessionId) : undefined;
}

async function exchangeCodeForAccessToken(code: string): Promise<{
  accessToken: string;
  tokenExpiresAt: string;
}> {
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Facebook OAuth credentials are not configured.");
  }

  const tokenUrl = new URL(
    "/v23.0/oauth/access_token",
    process.env.FACEBOOK_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
  );
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", getCallbackUrl());
  tokenUrl.searchParams.set("code", code);

  const response = await fetch(tokenUrl, { method: "GET" });
  const body = (await response.json().catch(() => undefined)) as
    | {
        access_token?: string;
        expires_in?: number;
        error?: { message?: string };
      }
    | undefined;

  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error?.message ?? "OAuth token exchange failed.");
  }

  const expiresInSeconds = Number(body.expires_in ?? 60 * 60 * 24 * 30);

  return {
    accessToken: body.access_token,
    tokenExpiresAt: new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString(),
  };
}

async function fetchGrantedPermissions(accessToken: string): Promise<string[]> {
  const permissionsUrl = new URL(
    "/v23.0/me/permissions",
    process.env.FACEBOOK_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
  );
  permissionsUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(permissionsUrl, { method: "GET" });
  const body = (await response.json().catch(() => undefined)) as
    | { data?: Array<{ permission?: string; status?: string }> }
    | undefined;

  if (!response.ok) {
    throw new Error("Failed to fetch Facebook permissions.");
  }

  const granted = (body?.data ?? [])
    .filter((item) => item.status === "granted" && item.permission)
    .map((item) => String(item.permission));

  return normalizePermissions(granted);
}

async function fetchInstagramProfile(
  instagramAccountId: string,
  accessToken: string,
): Promise<{ id: string; username?: string; name?: string }> {
  const profileUrl = new URL(
    `/v23.0/${instagramAccountId}`,
    process.env.FACEBOOK_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
  );
  profileUrl.searchParams.set("fields", "id,username,name");
  profileUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(profileUrl, { method: "GET" });
  const body = (await response.json().catch(() => undefined)) as
    | {
        id?: string;
        username?: string;
        name?: string;
        error?: { message?: string };
      }
    | undefined;

  if (!response.ok || !body?.id) {
    throw new Error(
      body?.error?.message ?? "Failed to fetch Instagram account profile.",
    );
  }

  return {
    id: String(body.id),
    username: body.username,
    name: body.name,
  };
}

async function fetchInstagramAccounts(
  accessToken: string,
  instagramAccountId?: string,
): Promise<InstagramAccountCandidate[]> {
  const permissions = await fetchGrantedPermissions(accessToken);
  const accountsUrl = new URL(
    "/v23.0/me/accounts",
    process.env.FACEBOOK_GRAPH_API_BASE_URL ?? "https://graph.facebook.com",
  );
  accountsUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username},connected_instagram_account{id,username}",
  );
  accountsUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(accountsUrl, { method: "GET" });
  const body = (await response.json().catch(() => undefined)) as
    | {
        data?: Array<{
          id?: string;
          name?: string;
          instagram_business_account?: { id?: string; username?: string };
          connected_instagram_account?: { id?: string; username?: string };
        }>;
      }
    | undefined;

  if (!response.ok) {
    throw new Error("Failed to fetch Instagram business accounts.");
  }

  const accounts = (body?.data ?? [])
    .map((item) => {
      const instagramAccount =
        item.instagram_business_account ?? item.connected_instagram_account;

      if (!instagramAccount?.id) {
        return undefined;
      }

      return {
        accountId: String(instagramAccount.id),
        accountName: String(instagramAccount.username ?? item.name ?? ""),
        facebookPageId: String(item.id ?? ""),
        pageName: String(item.name ?? ""),
        permissions,
        status: toIntegrationStatus(permissions),
      } satisfies InstagramAccountCandidate;
    })
    .filter((item): item is InstagramAccountCandidate => Boolean(item));

  if (!instagramAccountId) {
    return accounts;
  }

  const matchedAccounts = accounts.filter(
    (account) => account.accountId === instagramAccountId,
  );

  if (matchedAccounts.length > 0) {
    return matchedAccounts;
  }

  const fallbackPage = (body?.data ?? []).find((item) => item.id);

  if (!fallbackPage) {
    return [];
  }

  const instagramProfile = await fetchInstagramProfile(
    instagramAccountId,
    accessToken,
  );

  return [
    {
      accountId: instagramProfile.id,
      accountName:
        instagramProfile.username ??
        instagramProfile.name ??
        instagramProfile.id,
      facebookPageId: String(fallbackPage.id ?? ""),
      pageName: String(fallbackPage.name ?? ""),
      permissions,
      status: toIntegrationStatus(permissions),
    },
  ];
}

async function completeRealOAuthCallback(
  code: string,
): Promise<CallbackSuccess> {
  const token = await exchangeCodeForAccessToken(code);
  const accounts = await fetchInstagramAccounts(
    token.accessToken,
    process.env.IG_USER_ID,
  );

  return {
    accessToken: token.accessToken,
    tokenExpiresAt: token.tokenExpiresAt,
    accounts,
  };
}

function getExistingTokenExpiresAt(): string {
  const configured = process.env.IG_TOKEN_EXPIRES_AT;

  if (configured) {
    return new Date(configured).toISOString();
  }

  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
}

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export async function createInstagramExistingTokenSession(input: {
  actorKey: string;
}): Promise<{
  oauthSessionId: string;
  tokenExpiresAt: string;
  accounts: InstagramAccountCandidate[];
}> {
  cleanupExpiredSessions();

  const accessToken = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;

  if (!accessToken || !userId) {
    throw new Error(
      "IG_ACCESS_TOKEN と IG_USER_ID を backend の .env に設定してください。",
    );
  }

  const accounts = await fetchInstagramAccounts(accessToken, userId);
  const pageId = process.env.IG_PAGE_ID;
  const filteredAccounts = pageId
    ? accounts.filter((account) => account.facebookPageId === pageId)
    : accounts;

  if (filteredAccounts.length === 0) {
    throw new Error(
      "既存トークンで参照可能な Instagram ビジネスアカウントが見つかりません。",
    );
  }

  const configuredAccountName = getOptionalEnvValue("IG_ACCOUNT_NAME");
  const configuredPageName = getOptionalEnvValue("IG_PAGE_NAME");
  const overriddenAccounts = filteredAccounts.map((account) => ({
    ...account,
    accountName: configuredAccountName ?? account.accountName,
    pageName: configuredPageName ?? account.pageName,
  }));

  const oauthSessionId = randomUUID();
  const state = randomBytes(16).toString("hex");
  const tokenExpiresAt = getExistingTokenExpiresAt();

  oauthSessions.set(oauthSessionId, {
    id: oauthSessionId,
    state,
    actorKey: input.actorKey,
    intent: "connect",
    createdAt: nowIso(),
    completedAt: nowIso(),
    accessToken,
    tokenExpiresAt,
    accounts: overriddenAccounts,
  });
  oauthSessionIdsByState.set(state, oauthSessionId);

  return {
    oauthSessionId,
    tokenExpiresAt,
    accounts: overriddenAccounts,
  };
}

async function completeOAuthCallback(
  code: string,
  state: string,
  scenario?: string,
): Promise<CallbackSuccess> {
  if (getOAuthMode() === "mock") {
    const result = completeMockOAuthCallback({ code, state, scenario });

    if (!result.ok) {
      throw new Error(result.message);
    }

    const accounts = getMockInstagramAccounts(scenario).map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      facebookPageId: account.facebookPageId,
      pageName: account.pageName,
      permissions: account.permissions,
      status: account.status as IntegrationStatus,
    }));

    return {
      accessToken: result.accessToken,
      tokenExpiresAt: result.tokenExpiresAt,
      accounts,
    };
  }

  return completeRealOAuthCallback(code);
}

export function createInstagramOAuthSession(input: {
  actorKey: string;
  intent: OAuthIntent;
  scenario?: string;
}): {
  oauthSessionId: string;
  state: string;
  authorizeUrl: string;
  callbackUrl: string;
} {
  cleanupExpiredSessions();

  const oauthSessionId = randomUUID();
  const state = randomBytes(16).toString("hex");
  const session: PendingOAuthSession = {
    id: oauthSessionId,
    state,
    actorKey: input.actorKey,
    intent: input.intent,
    scenario: input.scenario,
    createdAt: nowIso(),
  };
  oauthSessions.set(oauthSessionId, session);
  oauthSessionIdsByState.set(state, oauthSessionId);

  const callbackUrl = getCallbackUrl();
  let authorizeUrl: string;

  if (getOAuthMode() === "mock") {
    const mockUrl = new URL(callbackUrl);
    mockUrl.searchParams.set("code", "mock_auth_code");
    mockUrl.searchParams.set("state", state);
    if (input.scenario) {
      mockUrl.searchParams.set("scenario", input.scenario);
    }
    authorizeUrl = mockUrl.toString();
  } else {
    const oauthUrl = new URL(
      "/v23.0/dialog/oauth",
      process.env.FACEBOOK_AUTHORIZE_BASE_URL ?? "https://www.facebook.com",
    );
    oauthUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID ?? "");
    oauthUrl.searchParams.set("redirect_uri", callbackUrl);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set(
      "scope",
      process.env.FACEBOOK_OAUTH_SCOPES ?? DEFAULT_SCOPES,
    );
    oauthUrl.searchParams.set("state", state);
    authorizeUrl = oauthUrl.toString();
  }

  return {
    oauthSessionId,
    state,
    authorizeUrl,
    callbackUrl,
  };
}

export async function finalizeInstagramOAuthCallback(input: {
  code?: string;
  state?: string;
  scenario?: string;
}): Promise<
  | { ok: false; status: number; code: string; message: string }
  | { ok: true; redirectUrl: string; oauthSessionId: string }
> {
  cleanupExpiredSessions();

  const session = getSessionByState(input.state);

  if (!session || !input.state) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_EXPIRED",
      message: "state の検証に失敗しました。",
    };
  }

  if (!input.code) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "code が不足しています。",
    };
  }

  try {
    const callback = await completeOAuthCallback(
      input.code,
      input.state,
      input.scenario ?? session.scenario,
    );
    oauthSessions.set(session.id, {
      ...session,
      accessToken: callback.accessToken,
      tokenExpiresAt: callback.tokenExpiresAt,
      accounts: callback.accounts,
      completedAt: nowIso(),
    });

    const redirectUrl = new URL(getFrontendCompletionUrl());
    redirectUrl.searchParams.set("oauthSessionId", session.id);
    redirectUrl.searchParams.set("oauthIntent", session.intent);

    return {
      ok: true,
      redirectUrl: redirectUrl.toString(),
      oauthSessionId: session.id,
    };
  } catch (error) {
    const redirectUrl = new URL(getFrontendCompletionUrl());
    redirectUrl.searchParams.set(
      "oauthError",
      error instanceof Error ? error.message : "OAuth callback failed.",
    );
    return {
      ok: true,
      redirectUrl: redirectUrl.toString(),
      oauthSessionId: session.id,
    };
  }
}

export function getInstagramOAuthSession(
  oauthSessionId: string,
  actorKey: string,
):
  | {
      oauthSessionId: string;
      intent: OAuthIntent;
      tokenExpiresAt: string;
      accounts: InstagramAccountCandidate[];
      completedAt: string;
    }
  | undefined {
  cleanupExpiredSessions();

  const session = oauthSessions.get(oauthSessionId);
  if (!session || session.actorKey !== actorKey) {
    return undefined;
  }

  if (
    !session.accessToken ||
    !session.tokenExpiresAt ||
    !session.accounts ||
    !session.completedAt
  ) {
    return undefined;
  }

  return {
    oauthSessionId: session.id,
    intent: session.intent,
    tokenExpiresAt: session.tokenExpiresAt,
    accounts: session.accounts,
    completedAt: session.completedAt,
  };
}

export function consumeInstagramOAuthSession(
  oauthSessionId: string,
  actorKey: string,
):
  | {
      intent: OAuthIntent;
      accessToken: string;
      tokenExpiresAt: string;
      accounts: InstagramAccountCandidate[];
    }
  | undefined {
  cleanupExpiredSessions();

  const session = oauthSessions.get(oauthSessionId);
  if (
    !session ||
    session.actorKey !== actorKey ||
    !session.accessToken ||
    !session.tokenExpiresAt ||
    !session.accounts
  ) {
    return undefined;
  }

  oauthSessions.delete(oauthSessionId);
  oauthSessionIdsByState.delete(session.state);

  return {
    intent: session.intent,
    accessToken: session.accessToken,
    tokenExpiresAt: session.tokenExpiresAt,
    accounts: session.accounts,
  };
}
