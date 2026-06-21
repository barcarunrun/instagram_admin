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
const mockInstagramAccountId = "ig_mock_001";
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

  const apiContext = await createAuthedApiContext(page.context());

  try {
    await ensureActiveInstagramIntegration(apiContext, page);
  } finally {
    await apiContext.dispose();
  }

  await page.goto("/dashboard");
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

async function connectSelectedAccount(page: Page): Promise<void> {
  const connectButton = page.getByRole("button", {
    name: "このアカウントで接続",
  });
  await expect(connectButton).toBeEnabled();
  await connectButton.click();
  await expect(page.locator(".status-panel")).toContainText("active");
}

async function ensureActiveInstagramIntegration(
  apiContext: APIRequestContext,
  page: Page,
): Promise<void> {
  await resetInstagramIntegrations(apiContext);
  await page.goto("/connect");
  await page.getByRole("button", { name: "Facebookで連携する" }).click();
  await expect(page).toHaveURL(/\/connect(\?|$)/);
  await expect(
    page.getByRole("button", { name: "このアカウントで接続" }),
  ).toBeEnabled();
  await connectSelectedAccount(page);
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
): Promise<{
  id: string;
  fileName: string;
  mediaType: "image" | "video";
}> {
  const response = await apiContext.post("/api/testing/media-assets", {
    data: input,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    id: string;
    fileName: string;
    mediaType: "image" | "video";
  };
}

async function createTestingImageAsset(
  apiContext: APIRequestContext,
  namePrefix: string,
): Promise<{
  id: string;
  fileName: string;
  mediaType: "image" | "video";
}> {
  return createTestingMediaAsset(apiContext, {
    fileName: `${uniqueTitle(namePrefix)}.png`,
    mimeType: "image/png",
    mediaType: "image",
    width: 1080,
    height: 1350,
    fileSize: 512000,
  });
}

async function createTestingVideoAsset(
  apiContext: APIRequestContext,
  namePrefix: string,
): Promise<{
  id: string;
  fileName: string;
  mediaType: "image" | "video";
}> {
  return createTestingMediaAsset(apiContext, {
    fileName: `${uniqueTitle(namePrefix)}.mp4`,
    mimeType: "video/mp4",
    mediaType: "video",
    width: 1080,
    height: 1920,
    fileSize: 10_240_000,
    durationSeconds: 22,
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

async function openMediaLibrary(page: Page): Promise<void> {
  await page.getByRole("button", { name: "既存メディアを表示" }).click();
}

async function createApprovedContent(
  apiContext: APIRequestContext,
  input: {
    title: string;
    mediaAssetIds: string[];
    contentType?: "image" | "video" | "carousel" | "reel" | "extension";
  },
): Promise<{ id: string; title: string }> {
  const response = await apiContext.post("/api/contents", {
    data: {
      title: input.title,
      contentType: input.contentType ?? "image",
      caption: `${input.title} の予約テストです`,
      hashtags: ["#schedule"],
      labels: ["schedule-test"],
      mediaAssetIds: input.mediaAssetIds,
      contentConfig: {},
      approvalStatus: "approved",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { id: string; title: string };
  return body;
}

async function createScheduleViaApi(
  apiContext: APIRequestContext,
  payload: {
    contentId: string;
    publishAt: string;
    timezone: string;
    accountId: string;
  },
): Promise<void> {
  const response = await apiContext.post("/api/schedules", {
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
}

async function waitForScheduleForContent(
  apiContext: APIRequestContext,
  contentId: string,
  matcher?: (schedule: { publishAt: string; status: string }) => boolean,
): Promise<void> {
  await expect
    .poll(async () => {
      const response = await apiContext.get(
        `/api/schedules/content/${contentId}`,
      );
      if (!response.ok()) {
        return false;
      }

      const body = (await response.json()) as {
        publishAt: string;
        status: string;
      };

      return matcher ? matcher(body) : true;
    })
    .toBe(true);
}

async function waitForScheduleRemoval(
  apiContext: APIRequestContext,
  contentId: string,
): Promise<void> {
  await expect
    .poll(async () => {
      const response = await apiContext.get(
        `/api/schedules/content/${contentId}`,
      );
      return response.status();
    })
    .toBe(404);
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
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const videoAsset = await createTestingVideoAsset(
        apiContext,
        "video_asset",
      );

      await page.goto("/contents");
      await startNewContent(page);
      await openMediaLibrary(page);
      await page.getByLabel("投稿名").fill(title);
      await page.getByLabel("投稿種別").selectOption("video");
      await page
        .getByLabel("キャプション")
        .fill("既存動画アセットを利用した保存テストです");
      await page
        .getByRole("button", { name: new RegExp(videoAsset.fileName) })
        .click();
      await page.getByRole("button", { name: "下書きを保存" }).click();
      await expect(page.getByRole("button", { name: title })).toBeVisible();
      await page.getByRole("button", { name: title }).click();
      await expect(page.getByText("0件のエラー / 0件の警告")).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
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

      await expect
        .poll(async () => {
          const response = await apiContext.get("/api/contents");
          if (!response.ok()) {
            return false;
          }

          const body = (await response.json()) as {
            items: Array<{
              title: string;
              versions: Array<{ summary: string }>;
            }>;
          };
          const updated = body.items.find(
            (item) => item.title === seededContentTitle,
          );

          return Boolean(
            updated &&
            updated.versions.length > 1 &&
            updated.versions.some(
              (version) => version.summary === "下書き更新",
            ),
          );
        })
        .toBe(true);

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

  test("TC-206: カルーセルの並び順を保存できる", async ({ page }) => {
    const title = uniqueTitle("carousel_draft");
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const firstImage = await createTestingImageAsset(
        apiContext,
        "carousel_first",
      );
      const secondImage = await createTestingImageAsset(
        apiContext,
        "carousel_second",
      );

      await page.goto("/contents");
      await startNewContent(page);
      await openMediaLibrary(page);
      await page.getByLabel("投稿名").fill(title);
      await page.getByLabel("投稿種別").selectOption("carousel");
      await page
        .getByLabel("キャプション")
        .fill("カルーセル順序の保存テストです");
      await page
        .getByRole("button", { name: new RegExp(firstImage.fileName) })
        .click();
      await page
        .getByRole("button", { name: new RegExp(secondImage.fileName) })
        .click();
      await page.getByRole("button", { name: "下へ" }).first().click();
      await page.getByRole("button", { name: "下書きを保存" }).click();
      await expect(page.getByRole("button", { name: title })).toBeVisible();

      const response = await apiContext.get("/api/contents");
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as {
        items: Array<{
          title: string;
          contentConfig?: { orderedMediaAssetIds?: string[] };
        }>;
      };
      const created = body.items.find((item) => item.title === title);
      expect(created).toBeDefined();
      expect(created?.contentConfig?.orderedMediaAssetIds).toEqual([
        secondImage.id,
        firstImage.id,
      ]);
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-207: リールはカバー画像を指定して保存できる", async ({ page }) => {
    const title = uniqueTitle("reel_draft");
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const videoAsset = await createTestingVideoAsset(
        apiContext,
        "reel_video",
      );
      const coverAsset = await createTestingImageAsset(
        apiContext,
        "reel_cover",
      );

      await page.goto("/contents");
      await startNewContent(page);
      await openMediaLibrary(page);
      await page.getByLabel("投稿名").fill(title);
      await page.getByLabel("投稿種別").selectOption("reel");
      await page.getByLabel("キャプション").fill("リール保存テストです");
      await page
        .getByRole("button", { name: new RegExp(videoAsset.fileName) })
        .click();
      await page.getByRole("button", { name: "下書きを保存" }).click();
      await page.getByRole("button", { name: title }).click();
      await expect(
        page.getByText("リールではカバー画像を指定してください。"),
      ).toBeVisible();

      await openMediaLibrary(page);
      await page
        .getByRole("button", { name: new RegExp(coverAsset.fileName) })
        .last()
        .click();
      await page.getByRole("button", { name: "下書きを保存" }).click();
      await page.getByRole("button", { name: title }).click();
      await expect(page.getByText("0件のエラー / 0件の警告")).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-208: 拡張種別のテンプレートキーを保持できる", async ({ page }) => {
    const title = uniqueTitle("extension_draft");
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "extension_image",
      );

      await page.goto("/contents");
      await startNewContent(page);
      await openMediaLibrary(page);
      await page.getByLabel("投稿名").fill(title);
      await page.getByLabel("投稿種別").selectOption("extension");
      await page.getByLabel("キャプション").fill("拡張種別の保存テストです");
      await page.getByLabel("拡張テンプレートキー").fill("story_pack_v2");
      await page
        .getByRole("button", { name: new RegExp(imageAsset.fileName) })
        .click();
      await page.getByRole("button", { name: "下書きを保存" }).click();
      await expect(page.getByRole("button", { name: title })).toBeVisible();

      const response = await apiContext.get("/api/contents");
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as {
        items: Array<{
          title: string;
          contentConfig?: { templateKey?: string };
        }>;
      };
      const created = body.items.find((item) => item.title === title);
      expect(created).toBeDefined();
      expect(created?.contentConfig?.templateKey).toBe("story_pack_v2");
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-301: 未来時刻で予約登録できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "schedule_image",
      );
      const title = uniqueTitle("scheduled_content");
      const content = await createApprovedContent(apiContext, {
        title,
        mediaAssetIds: [imageAsset.id],
      });

      const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

      await page.goto("/contents");
      await page.getByRole("button", { name: title, exact: true }).click();
      await page.getByLabel("公開日時").fill(future);
      await page.getByRole("button", { name: "この日時で予約する" }).click();

      await waitForScheduleForContent(apiContext, content.id);
      await expect(page.getByText("現在の予約")).toBeVisible();
      await expect(page.getByText("予約済み")).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-302: 過去日時での予約はエラーになる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "past_schedule_image",
      );
      const title = uniqueTitle("past_schedule");
      await createApprovedContent(apiContext, {
        title,
        mediaAssetIds: [imageAsset.id],
      });

      const past = new Date(Date.now() - 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

      await page.goto("/contents");
      await page.getByRole("button", { name: title, exact: true }).click();
      await page.getByLabel("公開日時").fill(past);
      await page.getByRole("button", { name: "この日時で予約する" }).click();

      await expect(
        page.getByText("公開日時は現在より後の時刻を指定してください。"),
      ).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-303: 同一コンテンツ・同一時刻の重複予約は拒否される", async ({
    page,
  }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "duplicate_schedule_image",
      );
      const title = uniqueTitle("duplicate_schedule");
      const content = await createApprovedContent(apiContext, {
        title,
        mediaAssetIds: [imageAsset.id],
      });
      const publishAt = new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toISOString();

      await createScheduleViaApi(apiContext, {
        contentId: content.id,
        publishAt,
        timezone: "Asia/Tokyo",
        accountId: mockInstagramAccountId,
      });

      const duplicateResponse = await apiContext.post("/api/schedules", {
        data: {
          contentId: content.id,
          publishAt,
          timezone: "Asia/Tokyo",
          accountId: mockInstagramAccountId,
        },
      });

      expect(duplicateResponse.status()).toBe(409);
      const body = (await duplicateResponse.json()) as {
        error: { message: string };
      };
      expect(body.error.message).toContain("重複予約");
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-304: 予約を取り消せる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "cancel_schedule_image",
      );
      const title = uniqueTitle("cancel_schedule");
      const content = await createApprovedContent(apiContext, {
        title,
        mediaAssetIds: [imageAsset.id],
      });
      await createScheduleViaApi(apiContext, {
        contentId: content.id,
        publishAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        timezone: "Asia/Tokyo",
        accountId: mockInstagramAccountId,
      });

      await page.goto("/contents");
      await page.getByRole("button", { name: title, exact: true }).click();
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "予約を取り消す" }).click();

      await waitForScheduleRemoval(apiContext, content.id);
      await expect(page.getByText("現在の予約")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "この日時で予約する" }),
      ).toBeVisible();
    } finally {
      await apiContext.dispose();
    }
  });

  test("TC-305: 予約済みスケジュールを更新できる", async ({ page }) => {
    await login(page);
    const apiContext = await createAuthedApiContext(page.context());

    try {
      const imageAsset = await createTestingImageAsset(
        apiContext,
        "update_schedule_image",
      );
      const title = uniqueTitle("update_schedule");
      const content = await createApprovedContent(apiContext, {
        title,
        mediaAssetIds: [imageAsset.id],
      });
      const initialPublishAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
      await createScheduleViaApi(apiContext, {
        contentId: content.id,
        publishAt: initialPublishAt,
        timezone: "Asia/Tokyo",
        accountId: mockInstagramAccountId,
      });

      const updatedLocalValue = new Date(Date.now() + 120 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

      await page.goto("/contents");
      await page.getByRole("button", { name: title, exact: true }).click();
      await page.getByLabel("公開日時").fill(updatedLocalValue);
      await page.getByRole("button", { name: "この内容で予約を更新" }).click();

      await waitForScheduleForContent(
        apiContext,
        content.id,
        (schedule) => schedule.publishAt !== initialPublishAt,
      );

      const scheduleResponse = await apiContext.get(
        `/api/schedules/content/${content.id}`,
      );
      expect(scheduleResponse.ok()).toBeTruthy();
      const scheduleBody = (await scheduleResponse.json()) as {
        publishAt: string;
      };
      expect(scheduleBody.publishAt).not.toBe(initialPublishAt);
    } finally {
      await apiContext.dispose();
    }
  });
});
