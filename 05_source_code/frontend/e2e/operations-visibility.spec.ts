import {
  expect,
  request,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const backendBaseUrl =
  process.env.PLAYWRIGHT_BACKEND_ORIGIN ??
  `http://localhost:${process.env.PLAYWRIGHT_BACKEND_PORT ?? "4100"}`;
const mockInstagramAccountId = "ig_mock_001";
const mockInstagramAccountName = "Mock Store Tokyo";

function uniqueTitle(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("demo@example.com");
  await page.getByLabel("パスワード").fill("LocalPass123!");
  await page.getByRole("button", { name: "ログインする" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function resetInstagramIntegrations(
  apiContext: APIRequestContext,
): Promise<void> {
  const response = await apiContext.post(
    "/api/testing/integrations/instagram/reset",
  );
  expect(response.status()).toBe(204);
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

async function createWorkerApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: backendBaseUrl,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      "x-worker-token": "local_worker_token",
    },
  });
}

async function ensureActiveInstagramIntegration(
  apiContext: APIRequestContext,
  page: Page,
): Promise<void> {
  await resetInstagramIntegrations(apiContext);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Facebookで連携する" }).click();
  await expect(
    page.getByRole("button", { name: "このアカウントで接続" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "このアカウントで接続" }).click();
  await expect(page.locator(".status-panel")).toContainText("active");
}

async function createTestingImageAsset(
  apiContext: APIRequestContext,
  namePrefix: string,
): Promise<{ id: string; fileName: string }> {
  const response = await apiContext.post("/api/testing/media-assets", {
    data: {
      fileName: `${uniqueTitle(namePrefix)}.png`,
      mimeType: "image/png",
      mediaType: "image",
      width: 1080,
      height: 1350,
      fileSize: 512000,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string; fileName: string };
}

async function createApprovedContent(
  apiContext: APIRequestContext,
  input: { title: string; mediaAssetIds: string[] },
): Promise<{ id: string; title: string }> {
  const response = await apiContext.post("/api/contents", {
    data: {
      title: input.title,
      contentType: "image",
      caption: `${input.title} の運用可視化テストです`,
      hashtags: ["#ops"],
      labels: ["ops-visibility"],
      mediaAssetIds: input.mediaAssetIds,
      contentConfig: {},
      approvalStatus: "approved",
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string; title: string };
}

async function createSchedule(
  apiContext: APIRequestContext,
  input: { contentId: string; publishAt: string },
): Promise<{ id: string }> {
  const response = await apiContext.post("/api/schedules", {
    data: {
      contentId: input.contentId,
      publishAt: input.publishAt,
      timezone: "Asia/Tokyo",
      accountId: mockInstagramAccountId,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string };
}

async function getJobIdForContent(
  apiContext: APIRequestContext,
  contentId: string,
): Promise<string> {
  const response = await apiContext.get("/api/jobs/logs");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    items: Array<{ id: string; contentId: string }>;
  };
  const job = body.items.find((item) => item.contentId === contentId);

  if (!job) {
    throw new Error(`Job not found for content ${contentId}`);
  }

  return job.id;
}

async function createOperationsFixtures(
  page: Page,
): Promise<{
  failedTitle: string;
  scheduledTitle: string;
  from: string;
  to: string;
}> {
  await login(page);
  const apiContext = await createAuthedApiContext(page.context());
  const workerContext = await createWorkerApiContext();

  try {
    await ensureActiveInstagramIntegration(apiContext, page);

    const failedAsset = await createTestingImageAsset(apiContext, "ops_failed");
    const scheduledAsset = await createTestingImageAsset(
      apiContext,
      "ops_scheduled",
    );

    const failedTitle = uniqueTitle("ops_failed_content");
    const scheduledTitle = uniqueTitle("ops_scheduled_content");
    const failedContent = await createApprovedContent(apiContext, {
      title: failedTitle,
      mediaAssetIds: [failedAsset.id],
    });
    const scheduledContent = await createApprovedContent(apiContext, {
      title: scheduledTitle,
      mediaAssetIds: [scheduledAsset.id],
    });

    const publishDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const from = formatDateOnly(new Date(publishDate.getTime() - 24 * 60 * 60 * 1000));
    const to = formatDateOnly(new Date(publishDate.getTime() + 24 * 60 * 60 * 1000));
    const publishAt = publishDate.toISOString();

    await createSchedule(apiContext, {
      contentId: failedContent.id,
      publishAt,
    });
    await createSchedule(apiContext, {
      contentId: scheduledContent.id,
      publishAt,
    });

    const failedJobId = await getJobIdForContent(apiContext, failedContent.id);
    const startResponse = await workerContext.post(
      `/api/internal/jobs/${failedJobId}/start`,
    );
    expect(startResponse.ok()).toBeTruthy();

    const failResponse = await workerContext.post(
      `/api/internal/jobs/${failedJobId}/fail`,
      {
        data: {
          statusCode: 500,
          code: "INTERNAL_ERROR",
          message: "運用可視化テスト用の失敗です。",
        },
      },
    );
    expect(failResponse.ok()).toBeTruthy();

    return {
      failedTitle,
      scheduledTitle,
      from,
      to,
    };
  } finally {
    await apiContext.dispose();
    await workerContext.dispose();
  }
}

test.describe("TASK-046 Operations visibility acceptance", () => {
  test("TC-601: ダッシュボードで KPI と失敗投稿と未達アラートを確認できる", async ({
    page,
  }) => {
    const fixtures = await createOperationsFixtures(page);
    await page.goto(`/dashboard?from=${fixtures.from}&to=${fixtures.to}`);

    await expect(page.getByText("投稿実行率", { exact: true })).toBeVisible();
    await expect(page.getByText("週次投稿本数", { exact: true })).toBeVisible();
    await expect(page.getByText("失敗件数", { exact: true })).toBeVisible();
    await expect(page.getByText("未実行件数", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "直近の失敗ジョブ" }),
    ).toBeVisible();
    await expect(page.getByText(fixtures.failedTitle).first()).toBeVisible();
    await expect(page.getByText(fixtures.scheduledTitle).first()).toBeVisible();
    await expect(
      page.getByText("投稿実行率が目標を下回る見込みです。"),
    ).toBeVisible();
  });

  test("TC-602: カレンダー画面で予約イベントを確認できる", async ({ page }) => {
    const fixtures = await createOperationsFixtures(page);
    await page.goto(
      `/calendar?view=week&from=${fixtures.from}&to=${fixtures.to}`,
    );

    await expect(
      page.getByRole("heading", { name: "予約と実績のカレンダー" }),
    ).toBeVisible();
    await expect(page.getByText(fixtures.scheduledTitle).first()).toBeVisible();
    await expect(page.getByText("scheduled").first()).toBeVisible();
  });

  test("TC-603: 再認可対象はダッシュボードで識別できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await ensureActiveInstagramIntegration(apiContext, page);
      const response = await apiContext.post(
        "/api/testing/integrations/instagram/expire",
        {
          data: { accountId: mockInstagramAccountId },
        },
      );
      expect(response.status()).toBe(204);

      await page.goto("/dashboard");
      await expect(page.getByText("Instagram 再認可が必要です")).toBeVisible();
      await expect(
        page.getByText(mockInstagramAccountName, { exact: true }),
      ).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });
});
