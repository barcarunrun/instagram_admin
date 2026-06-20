import type {
  ContentConfig,
  ContentItem,
  ContentType,
  MediaAsset,
} from "./types.js";

export interface NormalizedContentPayloadAsset {
  mediaAssetId: string;
  mediaType: MediaAsset["mediaType"];
  mimeType: string;
  url: string;
  order: number;
}

export interface NormalizedContentPayload {
  contentType: ContentType;
  caption: string;
  hashtags: string[];
  orderedMediaAssetIds: string[];
  primaryMediaAssetId?: string;
  coverAssetId?: string;
  graphApi: {
    mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "REELS" | "EXTENSION";
    caption: string;
    mediaUrl?: string;
    children?: string[];
    coverUrl?: string;
    templateKey?: string;
    settings?: Record<string, unknown>;
  };
  assets: NormalizedContentPayloadAsset[];
}

function getOrderedMediaAssetIds(
  mediaAssetIds: string[],
  contentConfig: ContentConfig,
): string[] {
  if (
    Array.isArray(contentConfig.orderedMediaAssetIds) &&
    contentConfig.orderedMediaAssetIds.length > 0
  ) {
    return contentConfig.orderedMediaAssetIds;
  }

  return mediaAssetIds;
}

function buildCaption(caption: string, hashtags: string[]): string {
  const hashtagText = hashtags.join(" ");
  return hashtagText ? `${caption}\n\n${hashtagText}` : caption;
}

export function normalizeContentPayload(
  input: Pick<
    ContentItem,
    "contentType" | "caption" | "hashtags" | "mediaAssetIds" | "contentConfig"
  >,
  assets: MediaAsset[],
  configAssets?: { coverAsset?: MediaAsset },
): NormalizedContentPayload {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const orderedMediaAssetIds = getOrderedMediaAssetIds(
    input.mediaAssetIds,
    input.contentConfig,
  );
  const orderedAssets = orderedMediaAssetIds.map((id, index) => {
    const asset = assetsById.get(id);
    if (!asset) {
      throw new Error(`Media asset not found for normalization: ${id}`);
    }

    return {
      mediaAssetId: asset.id,
      mediaType: asset.mediaType,
      mimeType: asset.mimeType,
      url: asset.url,
      order: index + 1,
    };
  });
  const caption = buildCaption(input.caption, input.hashtags);
  const primaryAsset = orderedAssets[0];

  switch (input.contentType) {
    case "image":
      return {
        contentType: input.contentType,
        caption: input.caption,
        hashtags: input.hashtags,
        orderedMediaAssetIds,
        primaryMediaAssetId: primaryAsset?.mediaAssetId,
        graphApi: {
          mediaType: "IMAGE",
          caption,
          mediaUrl: primaryAsset?.url,
        },
        assets: orderedAssets,
      };
    case "video":
      return {
        contentType: input.contentType,
        caption: input.caption,
        hashtags: input.hashtags,
        orderedMediaAssetIds,
        primaryMediaAssetId: primaryAsset?.mediaAssetId,
        graphApi: {
          mediaType: "VIDEO",
          caption,
          mediaUrl: primaryAsset?.url,
        },
        assets: orderedAssets,
      };
    case "carousel":
      return {
        contentType: input.contentType,
        caption: input.caption,
        hashtags: input.hashtags,
        orderedMediaAssetIds,
        primaryMediaAssetId: primaryAsset?.mediaAssetId,
        graphApi: {
          mediaType: "CAROUSEL",
          caption,
          children: orderedAssets.map((asset) => asset.url),
        },
        assets: orderedAssets,
      };
    case "reel": {
      const coverAsset = configAssets?.coverAsset;
      if (!coverAsset) {
        throw new Error("Reel cover asset is required for normalization.");
      }

      return {
        contentType: input.contentType,
        caption: input.caption,
        hashtags: input.hashtags,
        orderedMediaAssetIds,
        primaryMediaAssetId: primaryAsset?.mediaAssetId,
        coverAssetId: coverAsset.id,
        graphApi: {
          mediaType: "REELS",
          caption,
          mediaUrl: primaryAsset?.url,
          coverUrl: coverAsset.url,
        },
        assets: orderedAssets,
      };
    }
    case "extension":
      return {
        contentType: input.contentType,
        caption: input.caption,
        hashtags: input.hashtags,
        orderedMediaAssetIds,
        primaryMediaAssetId: primaryAsset?.mediaAssetId,
        graphApi: {
          mediaType: "EXTENSION",
          caption,
          children: orderedAssets.map((asset) => asset.url),
          templateKey: input.contentConfig.templateKey,
          settings: input.contentConfig.settings,
        },
        assets: orderedAssets,
      };
  }
}
