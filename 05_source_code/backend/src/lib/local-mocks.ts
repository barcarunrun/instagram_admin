type MockScenario = "success" | "auth_expired" | "permission_denied";

type NotificationPayload = {
  eventType: string;
  channel: string;
  message: string;
  metadata?: Record<string, unknown>;
};

const expectedState =
  process.env.MOCK_OAUTH_EXPECTED_STATE ?? "mock_state_demo";

const instagramAccounts = [
  {
    accountId: "ig_mock_001",
    accountName: "Mock Store Tokyo",
    facebookPageId: "fb_page_mock_001",
    pageName: "Mock Store JP",
    permissions: ["content_publish", "pages_show_list"],
    status: "active",
  },
];

export function getMockModes() {
  return {
    instagramApiMode: process.env.INSTAGRAM_API_MODE ?? "mock",
    oauthMode: process.env.OAUTH_MODE ?? "mock",
    notificationMode: process.env.NOTIFICATION_MODE ?? "log",
    callbackUrl:
      process.env.MOCK_OAUTH_CALLBACK_URL ??
      "http://localhost:4000/api/local/oauth/callback",
    expectedState,
  };
}

export function createMockOAuthStart() {
  const callbackUrl =
    process.env.MOCK_OAUTH_CALLBACK_URL ??
    "http://localhost:4000/api/local/oauth/callback";

  const authorizeUrl = new URL(callbackUrl);
  authorizeUrl.searchParams.set("code", "mock_auth_code");
  authorizeUrl.searchParams.set("state", expectedState);
  authorizeUrl.searchParams.set("scenario", "success");

  return {
    authorizeUrl: authorizeUrl.toString(),
    callbackUrl,
    state: expectedState,
  };
}

export function completeMockOAuthCallback(input: {
  code?: string;
  state?: string;
  scenario?: string;
}) {
  if (!input.state) {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_EXPIRED",
      message: "state の検証に失敗しました。",
      details: [{ field: "state", reason: "required" }],
    };
  }

  if (!input.code) {
    return {
      ok: false as const,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "code が不足しています。",
      details: [{ field: "code", reason: "required" }],
    };
  }

  if (input.scenario === "auth_expired") {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_EXPIRED",
      message: "モックトークンの期限が切れています。",
      details: [{ field: "code", reason: "token_expired" }],
    };
  }

  return {
    ok: true as const,
    accessToken: "mock_access_token",
    tokenExpiresAt: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    account: instagramAccounts[0],
  };
}

export function getMockInstagramAccounts(scenario?: string) {
  if (scenario === "permission_denied") {
    return instagramAccounts.map((account) => ({
      ...account,
      permissions: ["pages_show_list"],
      status: "reauthorization_required",
    }));
  }

  return instagramAccounts;
}

export function publishToMockInstagram(scenario?: string) {
  const currentScenario = (scenario ?? "success") as MockScenario;

  if (currentScenario === "auth_expired") {
    return {
      ok: false as const,
      status: 401,
      error: {
        code: "AUTH_EXPIRED",
        message: "Instagram Graph API モックが認証期限切れを返しました。",
      },
    };
  }

  if (currentScenario === "permission_denied") {
    return {
      ok: false as const,
      status: 403,
      error: {
        code: "PERMISSION_DENIED",
        message: "Instagram Graph API モックが権限不足を返しました。",
      },
    };
  }

  return {
    ok: true as const,
    publishId: `ig_publish_${Date.now()}`,
    status: "published",
    publishedAt: new Date().toISOString(),
  };
}

export function sendMockNotification(payload: NotificationPayload) {
  const entry = {
    mode: process.env.NOTIFICATION_MODE ?? "log",
    sentAt: new Date().toISOString(),
    ...payload,
  };

  console.info("local notification mock", entry);
  return entry;
}
