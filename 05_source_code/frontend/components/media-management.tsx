"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { resolveMediaAssetUrl } from "../lib/media-url";
import type { MediaAsset } from "../lib/types";
import { Hero } from "./hero";
import { TrashIcon, UploadIcon } from "./icons";

type MediaFilters = {
  keyword: string;
  mediaType: "all" | "image" | "video";
  usedOnly: boolean;
};

const initialFilters: MediaFilters = {
  keyword: "",
  mediaType: "all",
  usedOnly: false,
};

function formatFileSize(fileSize: number): string {
  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

async function fetchMediaAssets(filters: MediaFilters): Promise<MediaAsset[]> {
  const result = await api.getMediaAssets({
    excludeDemo: true,
    keyword: filters.keyword || undefined,
    mediaType: filters.mediaType,
    usedOnly: filters.usedOnly,
  });

  return result.items;
}

export function MediaManagement({
  initialMediaAssets,
}: {
  initialMediaAssets: MediaAsset[];
}) {
  const [mediaAssets, setMediaAssets] = useState(initialMediaAssets);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(initialMediaAssets[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAsset =
    mediaAssets.find((asset) => asset.id === selectedId) ??
    mediaAssets[0] ??
    null;

  async function refresh(nextFilters: MediaFilters = filters): Promise<void> {
    setIsRefreshing(true);

    try {
      const items = await fetchMediaAssets(nextFilters);
      setMediaAssets(items);
      setSelectedId((current) => {
        if (current && items.some((asset) => asset.id === current)) {
          return current;
        }

        return items[0]?.id ?? "";
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function onUpload(files: FileList | File[]): Promise<void> {
    const items = Array.from(files);

    if (items.length === 0) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const uploadedAssets: MediaAsset[] = [];

      for (const file of items) {
        uploadedAssets.push(await api.uploadMedia(file));
      }

      await refresh();
      setSelectedId(uploadedAssets[0]?.id ?? "");
      setMessage(`${uploadedAssets.length}件のメディアを登録しました。`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "メディアアップロードに失敗しました。",
      );
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function onDelete(): Promise<void> {
    if (!selectedAsset || isDeleting) {
      return;
    }

    if (!window.confirm(`「${selectedAsset.fileName}」を削除しますか？`)) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await api.deleteMediaAsset(selectedAsset.id);
      setMessage("メディアを削除しました。");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "メディア削除に失敗しました。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function applyFilters(nextFilters: MediaFilters): Promise<void> {
    setFilters(nextFilters);
    setMessage("");
    await refresh(nextFilters);
  }

  return (
    <>
      <Hero
        eyebrow="メディア管理"
        title="メディア管理"
        description="アップロード済みメディアの一覧、再利用状況、削除可否をまとめて確認します。"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) {
                  void onUpload(event.target.files);
                }
              }}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadIcon />
              {isUploading ? "アップロード中..." : "メディアを追加"}
            </button>
          </>
        }
      />

      <section className="table-card" aria-label="メディアフィルタ">
        <div className="media-toolbar">
          <div>
            <h3>ライブラリ</h3>
            <p className="muted">
              既存メディアを検索し、再利用状況を確認できます。
            </p>
          </div>
          <div className="button-row">
            <span
              className={`media-summary-chip ${isRefreshing ? "used" : "unused"}`}
            >
              {isRefreshing ? "更新中" : `${mediaAssets.length}件`}
            </span>
          </div>
        </div>
        <div className="media-filter-grid" style={{ marginTop: 14 }}>
          <input
            value={filters.keyword}
            placeholder="ファイル名・MIME で検索"
            onChange={(event) =>
              void applyFilters({ ...filters, keyword: event.target.value })
            }
          />
          <select
            value={filters.mediaType}
            onChange={(event) =>
              void applyFilters({
                ...filters,
                mediaType: event.target.value as MediaFilters["mediaType"],
              })
            }
          >
            <option value="all">種別: すべて</option>
            <option value="image">画像</option>
            <option value="video">動画</option>
          </select>
          <label
            className="surface-inset"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={filters.usedOnly}
              onChange={(event) =>
                void applyFilters({
                  ...filters,
                  usedOnly: event.target.checked,
                })
              }
            />
            使用中のみ表示
          </label>
        </div>
      </section>

      {message ? <div className="surface-inset">{message}</div> : null}

      <div className="media-library-grid">
        <section className="table-card" aria-label="メディア一覧">
          <div className="asset-grid">
            {mediaAssets.length === 0 ? (
              <div className="surface-inset media-empty">
                <div>
                  <p className="muted">条件に一致するメディアがありません。</p>
                  <p className="field-hint">
                    上部のアップロードから新規追加できます。
                  </p>
                </div>
              </div>
            ) : (
              mediaAssets.map((asset) => {
                const selected = selectedAsset?.id === asset.id;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`asset-card media-asset-card ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedId(asset.id)}
                  >
                    <div className="asset-card-head">
                      <div>
                        <div className="asset-title">{asset.fileName}</div>
                        <div className="asset-meta">
                          {asset.mediaType === "video" ? "動画" : "画像"} /{" "}
                          {asset.mimeType}
                        </div>
                      </div>
                      <span
                        className={`media-summary-chip ${asset.isUsed ? "used" : "unused"}`}
                      >
                        {asset.isUsed
                          ? `使用中 ${asset.usageCount ?? 0}件`
                          : "未使用"}
                      </span>
                    </div>
                    <div className="field-hint" style={{ marginTop: 10 }}>
                      {asset.width} x {asset.height}
                      {asset.durationSeconds
                        ? ` / ${asset.durationSeconds}秒`
                        : ""}
                      {` / ${formatFileSize(asset.fileSize)}`}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="editor-panel" aria-label="メディア詳細">
          <div className="panel-head">
            <div>
              <h3>詳細</h3>
              <p className="muted">
                選択中メディアの情報と削除可否を確認できます。
              </p>
            </div>
          </div>

          {selectedAsset ? (
            <div className="meta-list" style={{ marginTop: 12 }}>
              <div className="media-preview">
                {selectedAsset.mediaType === "image" ? (
                  <Image
                    src={resolveMediaAssetUrl(selectedAsset.url)}
                    alt={selectedAsset.fileName}
                    width={selectedAsset.width}
                    height={selectedAsset.height}
                    unoptimized
                  />
                ) : (
                  <video
                    src={resolveMediaAssetUrl(selectedAsset.url)}
                    controls
                    muted
                    preload="metadata"
                  />
                )}
              </div>

              <div className="surface-inset">
                <div className="asset-title">{selectedAsset.fileName}</div>
                <div className="asset-meta" style={{ marginTop: 4 }}>
                  {selectedAsset.mimeType}
                </div>
                <div className="media-asset-meta" style={{ marginTop: 12 }}>
                  <div>
                    <div className="subtle">登録日時</div>
                    <div className="media-meta-value">
                      {formatCreatedAt(selectedAsset.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="subtle">利用状況</div>
                    <div className="media-meta-value">
                      {selectedAsset.isUsed
                        ? `${selectedAsset.usageCount ?? 0}件のコンテンツで利用中`
                        : "未使用"}
                    </div>
                  </div>
                  <div>
                    <div className="subtle">解像度</div>
                    <div className="media-meta-value">
                      {selectedAsset.width} x {selectedAsset.height}
                    </div>
                  </div>
                  <div>
                    <div className="subtle">容量</div>
                    <div className="media-meta-value">
                      {formatFileSize(selectedAsset.fileSize)}
                    </div>
                  </div>
                </div>
                {selectedAsset.latestUsedContentTitle ? (
                  <div className="field-hint" style={{ marginTop: 12 }}>
                    直近の利用先: {selectedAsset.latestUsedContentTitle}
                  </div>
                ) : null}
              </div>

              <div className="surface-inset">
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void onDelete()}
                    disabled={Boolean(selectedAsset.isUsed) || isDeleting}
                  >
                    <TrashIcon />
                    {isDeleting ? "削除中..." : "メディアを削除"}
                  </button>
                </div>
                <div className="field-hint" style={{ marginTop: 10 }}>
                  {selectedAsset.isUsed
                    ? "使用中メディアは削除できません。コンテンツから外してから再度お試しください。"
                    : "未使用メディアのみ削除できます。削除すると復元できません。"}
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-inset" style={{ marginTop: 12 }}>
              <p className="muted">メディアを選択すると詳細が表示されます。</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
