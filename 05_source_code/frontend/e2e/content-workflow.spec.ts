import {
  expect,
  request,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const backendBaseUrl =
  process.env.PLAYWRIGHT_BACKEND_ORIGIN ?? "http://localhost:4000";
const seededContentTitle = "新作シャツ_初夏コーデ_2026W25";
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
3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKA
QPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntA
CKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+
oQXee0AIpMBCgED3vqEF3ntACKTAQoBA976hBd57QAikwEKAQPe+oQXee0AIpMBCgED3vqEF3ntACKTA
QoDAQQIWeO8BIZACCwEC3fuGFnjvASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjv
ASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAt37hhZ47wEhkAILAQLd
+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQ
AgsBAt37hhZ47wEhkAILAQLd+4YWeO8BIZACCwEC3fuGFnjvASGQAgsBAgcJWOC9B4RACiwECHTvG1rg
vQeEQAosBAh07xta4L0HhEAKLAQIdO8bWuC9B4RACiwECHTvG1rgvQeEQAosBAh07xta4L0HhEAKLAQI
dO8bWuC9B4RAv8bgC9pjGaofIhFCAAAAAElFTkSuQmCC
`;

function pngBuffer(): Buffer {
  return Buffer.from(pngBase64.replace(/\s+/g, ""), "base64");
}

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

function uniqueTitle(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

async function startNewContent(page: Page): Promise<void> {
  await page
    .locator("section.page-hero")
    .getByRole("button", { name: "新規投稿作成" })
    .click();
}

test.describe("TASK-016 Draft content acceptance", () => {
  test.describe.configure({ mode: "serial" });

  test("TC-201: 画像アップロード付きで下書きを保存できる", async ({ page }) => {
    const title = uniqueTitle("image_draft");

    await login(page);
    await page.goto("/contents");
    await startNewContent(page);
    await page.getByLabel("投稿名").fill(title);
    await page
      .getByLabel("キャプション")
      .fill("画像付き下書きの保存テストです");
    await page.locator('input[type="file"]').setInputFiles({
      name: "content-image.png",
      mimeType: "image/png",
      buffer: pngBuffer(),
    });
    await expect(page.getByText("1件のメディアを登録しました。")).toBeVisible();
    await page.getByRole("button", { name: "下書きを保存" }).click();
    await expect(page.getByRole("button", { name: title })).toBeVisible();
    await page.getByRole("button", { name: title }).click();
    await expect(page.getByText("0件のエラー / 0件の警告")).toBeVisible();
  });

  test("TC-202: 動画メディアを使って下書きを保存できる", async ({ page }) => {
    const title = uniqueTitle("video_draft");

    await login(page);
    await page.goto("/contents");
    await startNewContent(page);
    await page.getByLabel("投稿名").fill(title);
    await page.getByLabel("投稿種別").selectOption("video");
    await page
      .getByLabel("キャプション")
      .fill("既存動画アセットを利用した保存テストです");
    await page.getByRole("button", { name: /reel-teaser\.mp4/ }).click();
    await page.getByRole("button", { name: "下書きを保存" }).click();
    await expect(page.getByRole("button", { name: title })).toBeVisible();
    await page.getByRole("button", { name: title }).click();
    await expect(page.getByText("0件のエラー / 0件の警告")).toBeVisible();
  });

  test("TC-203: サポート外メディアはエラー表示される", async ({ page }) => {
    await login(page);
    await page.goto("/contents");
    await startNewContent(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid-media", "utf8"),
    });
    await expect(
      page.getByText("サポートされていないメディア形式です。"),
    ).toBeVisible();
  });

  test("TC-204: 既存下書きを複製できる", async ({ page }) => {
    await login(page);
    await page.goto("/contents");
    await page
      .getByRole("button", { name: seededContentTitle, exact: true })
      .click();
    await page.getByRole("button", { name: /複製/ }).click();
    await expect(page.getByLabel("投稿名")).toHaveValue(
      `${seededContentTitle}_copy`,
    );
  });

  test("TC-205: 下書き更新時に履歴が追加される", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      await page.goto("/contents");
      await page
        .getByRole("button", { name: seededContentTitle, exact: true })
        .click();
      await page
        .getByLabel("キャプション")
        .fill(`履歴更新テスト ${Date.now()}`);
      await page.getByRole("button", { name: "下書きを保存" }).click();

      const response = await apiContext.get("/api/contents");
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as {
        items: Array<{ title: string; versions: Array<{ summary: string }> }>;
      };
      const updated = body.items.find(
        (item) => item.title === seededContentTitle,
      );

      expect(updated).toBeDefined();
      expect(updated?.versions.length).toBeGreaterThan(1);
      expect(
        updated?.versions.some((version) => version.summary === "下書き更新"),
      ).toBeTruthy();
    } finally {
      await apiContext.dispose();
    }
  });
});
