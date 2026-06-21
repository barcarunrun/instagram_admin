const MEDIA_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function getMediaOrigin(): string {
  return MEDIA_API_BASE.replace(/\/api\/?$/, "");
}

export function resolveMediaAssetUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (!url.startsWith("/")) {
    return url;
  }

  return `${getMediaOrigin()}${url}`;
}
