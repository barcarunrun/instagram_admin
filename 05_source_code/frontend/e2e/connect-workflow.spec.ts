import {
  expect,
  request,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const backendBaseUrl =
  process.env.PLAYWRIGHT_BACKEND_ORIGIN ?? "http://localhost:4100";
const seededContentId = "44444444-4444-4444-4444-444444444444";
const mockInstagramAccountId = "ig_mock_001";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("demo@example.com");
  await page.getByLabel("パスワード").fill("LocalPass123!");
  await page.getByRole("button", { name: "ログインする" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createAuthedApiContext(
  context: BrowserContext,
): Promise<APIRequestContext> {
  const authCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "auth_token",
  );

  if (!authCookie) {
    throw new Error("auth_token cookie was not set after login.");
  }

  return request.newContext({
    baseURL: backendBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${authCookie.value}`,
      "Content-Type": "application/json",
    },
  });
}

async function resetInstagramIntegrations(
  apiContext: APIRequestContext,
): Promise<void> {
  const response = await apiContext.post(
    "/api/testing/integrations/instagram/reset",
  );
  expect(response.status()).toBe(204);
}

async function expireInstagramIntegration(
  apiContext: APIRequestContext,
  accountId = mockInstagramAccountId,
): Promise<void> {
  const response = await apiContext.post(
    "/api/testing/integrations/instagram/expire",
    {
      data: { accountId },
    },
  );
  expect(response.status()).toBe(204);
}

async function startMockOauth(
  apiContext: APIRequestContext,
  page: Page,
  params: {
    intent: "connect" | "reauthorize";
    scenario?: string;
  },
): Promise<void> {
  const searchParams = new URLSearchParams({ intent: params.intent });
  if (params.scenario) {
    searchParams.set("scenario", params.scenario);
  }

  const response = await apiContext.get(
    `/api/auth/instagram/oauth-url?${searchParams.toString()}`,
  );
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { authorizeUrl: string };

  await page.goto(body.authorizeUrl);
  await expect(page).toHaveURL(/\/connect(\?|$)/);
  await expect(
    page.getByRole("button", { name: "このアカウントで接続" }),
  ).toBeEnabled();
}

async function connectSelectedAccount(page: Page): Promise<void> {
  const connectButton = page.getByRole("button", {
    name: "このアカウントで接続",
  });
  await expect(connectButton).toBeEnabled();
  await connectButton.click();
  await expect(page.locator(".status-panel")).toContainText("ig_mock_001");
}

test.describe("TASK-007 Instagram account acceptance", () => {
  test("TC-101: OAuth認可からアカウント接続まで完了できる", async ({
    page,
  }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await resetInstagramIntegrations(apiContext);
      await page.goto("/connect");

      await page.getByRole("button", { name: "Facebookで連携する" }).click();
      await expect(page).toHaveURL(/\/connect(\?|$)/);

      await connectSelectedAccount(page);

      await expect(page.locator(".status-panel")).toContainText("active");
      await expect(page.locator(".timeline")).toContainText("content_publish");
      await expect(page.locator(".timeline")).toContainText("pages_show_list");
      await expect(
        page.getByText("Instagram アカウントを接続しました。"),
      ).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-102: 権限不足アカウントで再認可導線が出る", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await resetInstagramIntegrations(apiContext);
      await page.goto("/connect");

      await startMockOauth(apiContext, page, {
        intent: "connect",
        scenario: "permission_denied",
      });
      await connectSelectedAccount(page);

      await expect(page.locator(".status-panel")).toContainText(
        "reauthorization_required",
      );
      await expect(page.locator(".timeline")).toContainText(
        "必要権限: pages_show_list",
      );
      await expect(
        page.getByRole("button", { name: "再認可する" }),
      ).toBeVisible();

      await page.goto("/dashboard");
      await expect(page.getByText("Instagram 再認可が必要です")).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-103: トークン期限切れの状態遷移を確認できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await resetInstagramIntegrations(apiContext);
      await page.goto("/connect");
      await page.getByRole("button", { name: "Facebookで連携する" }).click();
      await connectSelectedAccount(page);

      await expireInstagramIntegration(apiContext);

      await page.goto("/connect");
      await expect(page.locator(".status-panel")).toContainText("expired");

      await page.goto("/dashboard");
      await expect(page.getByText("Instagram 再認可が必要です")).toBeVisible();
      await expect(page.getByText(/連携状態が expired です/)).toBeVisible();

      const validationResponse = await apiContext.post(
        "/api/schedules/validate",
        {
          data: {
            contentId: seededContentId,
            publishAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timezone: "Asia/Tokyo",
            accountId: mockInstagramAccountId,
          },
        },
      );
      expect(validationResponse.ok()).toBeTruthy();
      const validation = (await validationResponse.json()) as {
        valid: boolean;
        messages: string[];
      };
      expect(validation.valid).toBeFalsy();
      expect(validation.messages).toContain(
        "アカウント連携の有効期限が切れています。再連携してください。",
      );
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-104: 再認可後に active へ復旧できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await resetInstagramIntegrations(apiContext);
      await page.goto("/connect");
      await page.getByRole("button", { name: "Facebookで連携する" }).click();
      await connectSelectedAccount(page);

      await expireInstagramIntegration(apiContext);

      await page.goto("/connect");
      await expect(page.locator(".status-panel")).toContainText("expired");

      await page.getByRole("button", { name: "再認可する" }).click();
      await expect(
        page.getByText(
          "再認可が完了しました。接続対象を確認して保存してください。",
        ),
      ).toBeVisible();

      await connectSelectedAccount(page);

      await expect(page.locator(".status-panel")).toContainText("active");
      await expect(
        page.getByText("Instagram アカウントを接続しました。"),
      ).toBeVisible();

      const statusResponse = await apiContext.get(
        "/api/integrations/instagram/status",
      );
      expect(statusResponse.ok()).toBeTruthy();
      const status = (await statusResponse.json()) as {
        status: string;
        tokenExpiresAt: string;
      };

      expect(status.status).toBe("active");
      expect(new Date(status.tokenExpiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
    } finally {
      await apiContext.dispose();
    }
  });
});
