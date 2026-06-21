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

const pngBase64 = `
iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAIAAABC8jL9AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAIQ0lE
QVR4nO3VwQ0DAQwCwSvxykn3mx7yQZFHogBrAfP0eQkBBPrPIjzzCwgBBFJgIUCge3tggfceEAIpsBAg
0L1vaIH3HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4Q
AimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1v
aIH3HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAimw
ECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3
HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAimwECDQ
vW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhAC
KbAQINC9b2iB9x4QAimwECDQvW9ogfceEAIpsBAg0L1vaIH3HhACKbAQINC9b2iB9x4QAgosBAi8Bx+B
Bd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBC
gED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57
QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3
vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAik
wEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF
3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoDAQQIWeO8BIZACCwEC
3fuGFnjvASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAt37hhZ47wEh
kAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuG
FnjvASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAgcJWOC9B4RACiwE
CHTvG1rgvQeEQAosBAh07xta4L0HhEAKLAQIdO8bWuC9B4RACiwECHTvG1rgvQeEQAosBAh07xta4L0H
hEAKLAQIdO8bWuC9B4RAv8bgC9pjGaofIhFCAAAAAElFTkSuQmCC
`;

function pngBuffer(): Buffer {
  return Buffer.from(pngBase64.replace(/\s+/g, ""), "base64");
}

function uniquePngBuffer(): Buffer {
  return Buffer.concat([
    pngBuffer(),
    Buffer.from(`marker:${Date.now()}:${Math.random()}`, "utf8"),
  ]);
}

function uniqueTitle(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("demo@example.com");
  await page.getByLabel("パスワード").fill("LocalPass123!");
  await page.getByRole("button", { name: "ログインする" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const apiContext = await createAuthedApiContext(page.context());

  try {
    await ensureActiveInstagramIntegration(apiContext, page);
  } finally {
    await apiContext.dispose();
  }
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

async function createTestingMediaAsset(
  apiContext: APIRequestContext,
  input: {
    fileName: string;
    mimeType: string;
    mediaType: "image" | "video";
    width: number;
    height: number;
    fileSize?: number;
    durationSeconds?: number;
  },
): Promise<{ id: string; fileName: string }> {
  const response = await apiContext.post("/api/testing/media-assets", {
    data: input,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string; fileName: string };
}

async function createApprovedContent(
  apiContext: APIRequestContext,
  input: { title: string; mediaAssetIds: string[] },
): Promise<void> {
  const response = await apiContext.post("/api/contents", {
    data: {
      title: input.title,
      contentType: "image",
      caption: `${input.title} のメディア利用テストです`,
      hashtags: ["#media"],
      labels: ["media-test"],
      mediaAssetIds: input.mediaAssetIds,
      contentConfig: {},
      approvalStatus: "approved",
    },
  });

  expect(response.ok()).toBeTruthy();
}

test.describe("TASK-065 Media management", () => {
  test.describe.configure({ mode: "serial" });

  test("TC-209: メディア管理ページで一覧とアップロードを確認できる", async ({
    page,
  }) => {
    const fileName = `${uniqueTitle("media_page")}.png`;

    await login(page);
    await page.goto("/media");
    await expect(
      page.getByRole("heading", { name: "メディア管理" }),
    ).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: uniquePngBuffer(),
    });

    await expect(page.getByText("1件のメディアを登録しました。")).toBeVisible();
    const uploadedCard = page.getByRole("button", {
      name: new RegExp(fileName),
    });
    await expect(uploadedCard).toBeVisible();
    await expect(uploadedCard.getByText("未使用")).toBeVisible();
  });

  test("TC-210: 未使用メディアを削除できる", async ({ page }) => {
    const fileName = `${uniqueTitle("delete_unused")}.png`;

    await login(page);
    await page.goto("/media");
    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: uniquePngBuffer(),
    });
    await expect(
      page.getByRole("button", { name: new RegExp(fileName) }),
    ).toBeVisible();
    await page.getByRole("button", { name: new RegExp(fileName) }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "メディアを削除" }).click();

    await expect(page.getByText("メディアを削除しました。")).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(fileName) }),
    ).toHaveCount(0);
  });

  test("TC-211: 利用中メディアは削除できない", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const asset = await createTestingMediaAsset(apiContext, {
        fileName: `${uniqueTitle("used_media")}.png`,
        mimeType: "image/png",
        mediaType: "image",
        width: 1080,
        height: 1350,
        fileSize: 512000,
      });

      await createApprovedContent(apiContext, {
        title: uniqueTitle("media_usage_content"),
        mediaAssetIds: [asset.id],
      });

      await page.goto("/media");
      const usedCard = page.getByRole("button", {
        name: new RegExp(asset.fileName),
      });
      await usedCard.click();
      await expect(usedCard.getByText(/使用中 1件/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "メディアを削除" }),
      ).toBeDisabled();

      const deleteResponse = await apiContext.delete(
        `/api/media-assets/${asset.id}`,
      );
      expect(deleteResponse.status()).toBe(409);
    } finally {
      await apiContext.dispose();
    }
  });
});
