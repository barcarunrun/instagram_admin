import type {
  ContentItem,
  ContentType,
  MediaAsset,
  ValidationMessage,
  ValidationSummary,
} from "./types.js";

const feedAspectRatio = { min: 0.8, max: 1.91 };
const videoAspectRatio = { min: 0.56, max: 1.91 };
const reelAspectRatio = { min: 0.56, max: 0.8 };
const maxImageFileSize = 8 * 1024 * 1024;
const maxVideoFileSize = 100 * 1024 * 1024;

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

function pushAssetMessage(
  messages: ValidationMessage[],
  asset: MediaAsset,
  reason: string,
  message: string,
  level: ValidationMessage["level"] = "error",
): void {
  messages.push({
    field: `mediaAssets:${asset.fileName}`,
    reason,
    message,
    level,
  });
}

function getAspectRatio(asset: MediaAsset): number | null {
  if (!asset.width || !asset.height) {
    return null;
  }

  return asset.width / asset.height;
}

function validateAssetByContentType(
  contentType: ContentType,
  asset: MediaAsset,
  messages: ValidationMessage[],
): void {
  const aspectRatio = getAspectRatio(asset);
  const ratioRule =
    contentType === "reel"
      ? reelAspectRatio
      : contentType === "video" ||
          (contentType === "carousel" && asset.mediaType === "video")
        ? videoAspectRatio
        : feedAspectRatio;

  if (asset.mediaType === "image" && asset.fileSize > maxImageFileSize) {
    pushAssetMessage(
      messages,
      asset,
      "file_too_large",
      "画像サイズが大きすぎます。8MB 以下の画像に差し替えてください。",
    );
  }

  if (asset.mediaType === "video" && asset.fileSize > maxVideoFileSize) {
    pushAssetMessage(
      messages,
      asset,
      "file_too_large",
      "動画サイズが大きすぎます。100MB 以下の動画に差し替えてください。",
    );
  }

  if (!asset.width || !asset.height) {
    pushAssetMessage(
      messages,
      asset,
      "dimensions_missing",
      "解像度情報を取得できませんでした。別のファイルで再アップロードしてください。",
    );
  }

  if (aspectRatio !== null) {
    if (aspectRatio < ratioRule.min || aspectRatio > ratioRule.max) {
      pushAssetMessage(
        messages,
        asset,
        "aspect_ratio_invalid",
        contentType === "reel"
          ? "リール動画は縦長比率のメディアを指定してください。"
          : "投稿種別に対してアスペクト比が不正です。推奨比率のメディアに差し替えてください。",
      );
    }
  }

  if (asset.mediaType === "image" && asset.width < 320) {
    pushAssetMessage(
      messages,
      asset,
      "image_too_small",
      "画像幅が不足しています。320px 以上の画像を指定してください。",
    );
  }

  if (asset.mediaType === "video") {
    const durationSeconds = asset.durationSeconds ?? 0;

    if (!durationSeconds) {
      pushAssetMessage(
        messages,
        asset,
        "duration_required",
        "動画メディアの尺情報が不足しています。",
      );
      return;
    }

    const maxDuration = contentType === "reel" ? 90 : 60;
    if (durationSeconds < 3 || durationSeconds > maxDuration) {
      pushAssetMessage(
        messages,
        asset,
        "duration_out_of_range",
        contentType === "reel"
          ? "リール動画は 3 秒から 90 秒の範囲で指定してください。"
          : "動画は 3 秒から 60 秒の範囲で指定してください。",
      );
    }
  }

  if (contentType === "carousel" && asset.mimeType === "image/gif") {
    pushAssetMessage(
      messages,
      asset,
      "carousel_partial_invalid",
      "カルーセルではこのメディアを利用できません。対象ファイルのみ修正してください。",
      "warning",
    );
  }
}

export function validateContentDraft(
  input: Pick<
    ContentItem,
    "title" | "contentType" | "caption" | "hashtags" | "mediaAssetIds"
  >,
  assets: MediaAsset[],
): ValidationSummary {
  const messages: ValidationMessage[] = [];
  const rule = limits[input.contentType];
  const requestedAssetCount = new Set(input.mediaAssetIds).size;

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

  if (assets.length !== requestedAssetCount) {
    messages.push({
      field: "mediaAssets",
      reason: "asset_not_found",
      message: "存在しないメディア資産が含まれています。再選択してください。",
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

  for (const asset of assets) {
    validateAssetByContentType(input.contentType, asset, messages);
  }

  return {
    valid: messages.every((message) => message.level !== "error"),
    messages,
  };
}
