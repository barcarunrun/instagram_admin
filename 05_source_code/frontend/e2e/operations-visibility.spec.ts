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
const seededContentTitle = "新作シャツ_初夏コーデ_2026W25";
const seededInstagramAccountId = "ig_12345";
const seededInstagramAccountName = "Northwind Apparel";

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

test.describe("TASK-046 Operations visibility acceptance", () => {
  test("TC-601: ダッシュボードで KPI と失敗投稿と未達アラートを確認できる", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/dashboard");

    await expect(page.getByText("投稿実行率", { exact: true })).toBeVisible();
    await expect(page.getByText("週次投稿本数", { exact: true })).toBeVisible();
    await expect(page.getByText("失敗件数", { exact: true })).toBeVisible();
    await expect(page.getByText("未実行件数", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "直近の失敗ジョブ" })).toBeVisible();
    await expect(page.getByText(seededContentTitle).first()).toBeVisible();
    await expect(
      page.getByText("投稿実行率が目標を下回る見込みです。"),
    ).toBeVisible();
  });

  test("TC-602: カレンダー画面で予約イベントを確認できる", async ({ page }) => {
    await login(page);
    await page.goto("/calendar?view=week");

    await expect(
      page.getByRole("heading", { name: "予約と実績のカレンダー" }),
    ).toBeVisible();
    await expect(page.getByText(seededContentTitle).first()).toBeVisible();
    await expect(page.getByText("scheduled").first()).toBeVisible();
  });

  test("TC-603: 再認可対象はダッシュボードで識別できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const response = await apiContext.post(
        "/api/testing/integrations/instagram/expire",
        {
          data: { accountId: seededInstagramAccountId },
        },
      );
      expect(response.status()).toBe(204);

      await page.goto("/dashboard");
      await expect(page.getByText("Instagram 再認可が必要です")).toBeVisible();
      await expect(
        page.getByText(seededInstagramAccountName, { exact: true }),
      ).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });
});
