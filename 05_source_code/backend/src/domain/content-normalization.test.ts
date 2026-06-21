import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContentPayload } from "./content-normalization.js";
import { validateContentDraft } from "./content-rules.js";
import type { ContentItem, MediaAsset } from "./types.js";

function createImageAsset(id: string): MediaAsset {
  return {
    id,
    fileName: `${id}.png`,
    mimeType: "image/png",
    mediaType: "image",
    fileSize: 1024,
    width: 1080,
    height: 1350,
    url: `/media/${id}.png`,
    createdAt: new Date().toISOString(),
  };
}

function createVideoAsset(id: string): MediaAsset {
  return {
    id,
    fileName: `${id}.mp4`,
    mimeType: "video/mp4",
    mediaType: "video",
    fileSize: 2048,
    width: 1080,
    height: 1920,
    durationSeconds: 30,
    url: `/media/${id}.mp4`,
    createdAt: new Date().toISOString(),
  };
}

function createContentBase(): Pick<
  ContentItem,
  "title" | "caption" | "hashtags" | "mediaAssetIds" | "contentConfig"
> {
  return {
    title: "テスト投稿",
    caption: "キャプション",
    hashtags: ["#test"],
    mediaAssetIds: [],
    contentConfig: {},
  };
}

test("normalizeContentPayload keeps carousel order from contentConfig", () => {
  const first = createImageAsset("asset-1");
  const second = createImageAsset("asset-2");
  const payload = normalizeContentPayload(
    {
      ...createContentBase(),
      contentType: "carousel",
      mediaAssetIds: [first.id, second.id],
      contentConfig: { orderedMediaAssetIds: [second.id, first.id] },
    },
    [first, second],
  );

  assert.deepEqual(payload.orderedMediaAssetIds, [second.id, first.id]);
  assert.deepEqual(payload.graphApi.children, [second.url, first.url]);
});

test("validateContentDraft requires reel cover image", () => {
  const video = createVideoAsset("video-1");
  const cover = createImageAsset("cover-1");

  const missingCover = validateContentDraft(
    {
      ...createContentBase(),
      contentType: "reel",
      mediaAssetIds: [video.id],
      contentConfig: {},
    },
    [video],
  );

  assert.equal(missingCover.valid, false);
  assert.equal(
    missingCover.messages.some(
      (message) => message.field === "contentConfig.coverAssetId",
    ),
    true,
  );

  const valid = validateContentDraft(
    {
      ...createContentBase(),
      contentType: "reel",
      mediaAssetIds: [video.id],
      contentConfig: { coverAssetId: cover.id },
    },
    [video],
    { coverAsset: cover },
  );

  assert.equal(valid.valid, true);
});
