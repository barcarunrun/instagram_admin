import type {
  ContentItem,
  ContentType,
  MediaAsset,
  ValidationMessage,
  ValidationSummary,
} from "./types.js";

const limits: Record<
  ContentType,
  {
    minAssets: number;
    maxAssets: number;
    allowVideo: boolean;
    requireDuration?: boolean;
  }
> = {
  image: { minAssets: 1, maxAssets: 1, allowVideo: false },
  video: {
    minAssets: 1,
    maxAssets: 1,
    allowVideo: true,
    requireDuration: true,
  },
  carousel: { minAssets: 2, maxAssets: 10, allowVideo: true },
  reel: { minAssets: 1, maxAssets: 1, allowVideo: true, requireDuration: true },
  extension: { minAssets: 1, maxAssets: 10, allowVideo: true },
};

export function validateContentDraft(
  input: Pick<
    ContentItem,
    "title" | "contentType" | "caption" | "hashtags" | "mediaAssetIds"
  >,
  assets: MediaAsset[],
): ValidationSummary {
  const messages: ValidationMessage[] = [];
  const rule = limits[input.contentType];

  if (!input.title.trim()) {
    messages.push({
      field: "title",
      reason: "required",
      message: "未入力の必須項目があります。入力してから再度お試しください。",
      level: "error",
    });
  }

  if (!input.caption.trim()) {
    messages.push({
      field: "caption",
      reason: "required",
      message: "未入力の必須項目があります。入力してから再度お試しください。",
      level: "error",
    });
  }

  if (input.caption.length > 2200) {
    messages.push({
      field: "caption",
      reason: "max_length",
      message: "キャプションは2200文字以内で入力してください。",
      level: "error",
    });
  }

  if (input.hashtags.length > 30) {
    messages.push({
      field: "hashtags",
      reason: "max_items",
      message: "ハッシュタグは最大30件まで指定できます。",
      level: "error",
    });
  }

  const tooLongTag = input.hashtags.find((tag) => tag.length > 30);
  if (tooLongTag) {
    messages.push({
      field: "hashtags",
      reason: "tag_too_long",
      message: "ハッシュタグは1件30文字以内で入力してください。",
      level: "error",
    });
  }

  if (assets.length < rule.minAssets || assets.length > rule.maxAssets) {
    messages.push({
      field: "mediaAssets",
      reason: "asset_count",
      message: `${input.contentType} ではメディアを ${rule.minAssets} から ${rule.maxAssets} 件指定してください。`,
      level: "error",
    });
  }

  if (!rule.allowVideo && assets.some((asset) => asset.mediaType === "video")) {
    messages.push({
      field: "mediaAssets",
      reason: "invalid_media_type",
      message: "この投稿種別では利用できないメディア形式です。",
      level: "error",
    });
  }

  if (
    rule.requireDuration &&
    assets.some(
      (asset) => asset.mediaType === "video" && !asset.durationSeconds,
    )
  ) {
    messages.push({
      field: "mediaAssets",
      reason: "duration_required",
      message: "動画メディアの尺情報が不足しています。",
      level: "error",
    });
  }

  if (input.contentType === "carousel") {
    const invalidAssets = assets.filter(
      (asset) => asset.mimeType === "image/gif",
    );
    if (invalidAssets.length > 0) {
      messages.push({
        field: "mediaAssets",
        reason: "carousel_partial_invalid",
        message:
          "カルーセル内に規格外メディアがあります。対象メディアを修正してください。",
        level: "warning",
      });
    }
  }

  return {
    valid: messages.every((message) => message.level !== "error"),
    messages,
  };
}
