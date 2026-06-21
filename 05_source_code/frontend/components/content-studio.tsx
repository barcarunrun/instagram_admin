"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { api } from "../lib/api";
import { resolveMediaAssetUrl } from "../lib/media-url";
import type {
  ContentItem,
  ContentType,
  MediaAsset,
  ScheduleItem,
  ScheduleValidationResult,
} from "../lib/types";
import { ContentsFilter, type ContentsFilters } from "./contents-filter";
import { ContentsTable } from "./contents-table";
import { ArrowLeftIcon, CopyIcon, PlusIcon, UploadIcon } from "./icons";
import { ValidationPanel } from "./validation-panel";

const contentTypeHelp: Record<
  ContentType,
  {
    description: string;
    mediaHint: string;
    chips: string[];
  }
> = {
  image: {
    description: "単一画像のフィード投稿です。画像のみ 1 件選択してください。",
    mediaHint: "画像フィードで利用可能な形式: .jpg / .png / .webp / .gif",
    chips: ["1画像", "画像のみ"],
  },
  video: {
    description:
      "単一動画のフィード投稿です。3 秒から 60 秒の動画を選択してください。",
    mediaHint: "動画フィードで利用可能な形式: .mp4 / .mov",
    chips: ["1動画", "3-60秒"],
  },
  carousel: {
    description:
      "2 件以上のメディアを並び順つきで公開します。順序を調整できます。",
    mediaHint: "カルーセルは 2 から 10 件の画像・動画を選択できます。",
    chips: ["2-10件", "順序管理"],
  },
  reel: {
    description: "単一動画に加え、カバー画像の指定が必要です。",
    mediaHint:
      "リールで利用可能な形式: .mp4 / .mov、カバー画像は画像から選択します。",
    chips: ["1動画", "カバー必須", "3-90秒"],
  },
  extension: {
    description:
      "将来拡張用の種別です。テンプレートキーと任意設定を保持できます。",
    mediaHint: "拡張種別は設定駆動でメディア構成を切り替えます。",
    chips: ["拡張", "設定駆動"],
  },
};

const initialForm = {
  title: "",
  contentType: "image" as ContentType,
  caption: "",
  hashtags: "",
  labels: "",
  mediaAssetIds: [] as string[],
  contentConfig: {
    orderedMediaAssetIds: [] as string[],
    coverAssetId: "",
    templateKey: "generic",
  },
};

type ContentStudioForm = typeof initialForm;

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function scheduleStatusLabel(status: ScheduleItem["status"]): string {
  switch (status) {
    case "scheduled":
      return "予約済み";
    case "failed":
      return "失敗";
    case "cancelled":
      return "取消済み";
    case "running":
      return "実行中";
    case "success":
      return "成功";
    case "retrying":
      return "再試行中";
    case "action_required":
      return "要対応";
    case "reauthorization_required":
      return "要再認可";
    default:
      return status;
  }
}

function buildContentPayload(form: ContentStudioForm) {
  return {
    title: form.title,
    contentType: form.contentType,
    caption: form.caption,
    hashtags: form.hashtags
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean),
    labels: form.labels
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    mediaAssetIds: form.mediaAssetIds,
    contentConfig:
      form.contentType === "carousel"
        ? {
            orderedMediaAssetIds:
              form.contentConfig.orderedMediaAssetIds.length > 0
                ? form.contentConfig.orderedMediaAssetIds.filter((assetId) =>
                    form.mediaAssetIds.includes(assetId),
                  )
                : form.mediaAssetIds,
          }
        : form.contentType === "reel"
          ? {
              coverAssetId: form.contentConfig.coverAssetId || undefined,
            }
          : form.contentType === "extension"
            ? {
                templateKey: form.contentConfig.templateKey || "generic",
                settings: { source: "content-studio" },
              }
            : {},
    approvalStatus: "approved" as const,
  };
}

export function ContentStudio({
  initialContents,
  mediaAssets: initialMediaAssets,
  accountId,
}: {
  initialContents: ContentItem[];
  mediaAssets: MediaAsset[];
  accountId: string | null;
}) {
  const [contents, setContents] = useState(initialContents);
  const [mediaAssets, setMediaAssets] = useState(initialMediaAssets);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string>("");
  const [scheduleMessage, setScheduleMessage] = useState<string>("");
  const [scheduleValidation, setScheduleValidation] =
    useState<ScheduleValidationResult | null>(null);
  const [scheduleItem, setScheduleItem] = useState<ScheduleItem | null>(null);
  const [previewValidation, setPreviewValidation] = useState<
    ContentItem["validation"] | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const [filters, setFilters] = useState<ContentsFilters>({
    query: "",
    status: "all",
    type: "all",
    period: "all",
  });
  const [view, setView] = useState<"list" | "edit">("list");
  const [isUploading, setIsUploading] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedContent =
    contents.find((item) => item.id === selectedId) ?? null;
  const selectedAssets = form.mediaAssetIds
    .map((assetId) => mediaAssets.find((asset) => asset.id === assetId) ?? null)
    .filter((asset): asset is MediaAsset => Boolean(asset));
  const imageAssets = mediaAssets.filter(
    (asset) => asset.mediaType === "image",
  );
  const currentTypeHelp = contentTypeHelp[form.contentType];
  const filteredContents = contents.filter((item) => {
    const matchesQuery = !filters.query || item.title.includes(filters.query);
    const matchesStatus =
      filters.status === "all" || item.status === filters.status;
    const matchesType =
      filters.type === "all" || item.contentType === filters.type;
    return matchesQuery && matchesStatus && matchesType;
  });

  useEffect(() => {
    if (!selectedContent) {
      setForm(initialForm);
      return;
    }

    setForm({
      title: selectedContent.title,
      contentType: selectedContent.contentType,
      caption: selectedContent.caption,
      hashtags: selectedContent.hashtags.join(" "),
      labels: selectedContent.labels.join(", "),
      mediaAssetIds: selectedContent.mediaAssetIds,
      contentConfig: {
        orderedMediaAssetIds:
          selectedContent.contentConfig.orderedMediaAssetIds ??
          selectedContent.mediaAssetIds,
        coverAssetId: selectedContent.contentConfig.coverAssetId ?? "",
        templateKey: selectedContent.contentConfig.templateKey ?? "generic",
      },
    });
    setPreviewValidation(selectedContent.validation);
  }, [selectedContent]);

  useEffect(() => {
    if (!selectedContent) {
      setPreviewValidation(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void api
        .previewContentValidation(selectedContent.id, buildContentPayload(form))
        .then((validation) => setPreviewValidation(validation))
        .catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [selectedContent, form]);

  async function refreshContents() {
    const result = await api.getContents();
    setContents(result.items);
  }

  async function refreshMediaAssets() {
    const result = await api.getMediaAssets({ excludeDemo: true });
    setMediaAssets(result.items);
  }

  async function loadScheduleForContent(contentId: string): Promise<void> {
    try {
      const schedule = await api.getScheduleForContent(contentId);
      setScheduleItem(schedule);
      setScheduleAt(toDateTimeLocalValue(schedule.publishAt));
    } catch {
      setScheduleItem(null);
      setScheduleAt("");
    }
  }

  function buildPayload() {
    return buildContentPayload(form);
  }

  function toggleAsset(id: string) {
    setForm((current) => ({
      ...current,
      mediaAssetIds: current.mediaAssetIds.includes(id)
        ? current.mediaAssetIds.filter((item) => item !== id)
        : [...current.mediaAssetIds, id],
      contentConfig: {
        ...current.contentConfig,
        orderedMediaAssetIds: current.mediaAssetIds.includes(id)
          ? current.contentConfig.orderedMediaAssetIds.filter(
              (item) => item !== id,
            )
          : [...current.contentConfig.orderedMediaAssetIds, id],
      },
    }));
  }

  function moveAsset(assetId: string, direction: "up" | "down") {
    setForm((current) => {
      const currentOrder =
        current.contentConfig.orderedMediaAssetIds.length > 0
          ? [...current.contentConfig.orderedMediaAssetIds]
          : [...current.mediaAssetIds];
      const index = currentOrder.indexOf(assetId);
      if (index < 0) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= currentOrder.length) {
        return current;
      }

      const [moved] = currentOrder.splice(index, 1);
      currentOrder.splice(nextIndex, 0, moved);

      return {
        ...current,
        mediaAssetIds: currentOrder,
        contentConfig: {
          ...current.contentConfig,
          orderedMediaAssetIds: currentOrder,
        },
      };
    });
  }

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    const items = Array.from(files);
    if (items.length === 0) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const uploadedAssets = [] as MediaAsset[];
      for (const file of items) {
        uploadedAssets.push(await api.uploadMedia(file));
      }

      await refreshMediaAssets();
      setForm((current) => ({
        ...current,
        mediaAssetIds: Array.from(
          new Set([
            ...current.mediaAssetIds,
            ...uploadedAssets.map((asset) => asset.id),
          ]),
        ),
        contentConfig: {
          ...current.contentConfig,
          orderedMediaAssetIds: Array.from(
            new Set([
              ...current.contentConfig.orderedMediaAssetIds,
              ...uploadedAssets.map((asset) => asset.id),
            ]),
          ),
        },
      }));
      setIsAssetLibraryOpen(true);
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

  function onSave() {
    setMessage("");
    startTransition(async () => {
      try {
        if (selectedContent) {
          const updated = await api.updateContent(
            selectedContent.id,
            buildPayload(),
          );
          setSelectedId(updated.id);
        } else {
          const created = await api.createContent(buildPayload());
          setSelectedId(created.id);
        }
        await refreshContents();
        setMessage("下書きを保存しました。");
        setView("list");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "保存に失敗しました。",
        );
      }
    });
  }

  function onDuplicate() {
    if (!selectedContent) {
      return;
    }

    startTransition(async () => {
      try {
        const duplicated = await api.duplicateContent(selectedContent.id);
        await refreshContents();
        setSelectedId(duplicated.id);
        setView("edit");
        setMessage("下書きを複製しました。");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "複製に失敗しました。",
        );
      }
    });
  }

  function onValidateSchedule() {
    if (!accountId) {
      setScheduleMessage(
        "予約投稿を利用するには Instagram 連携を完了してください。",
      );
      return;
    }

    if (!selectedContent || !scheduleAt) {
      setScheduleMessage("公開日時は現在より後の時刻を指定してください。");
      return;
    }

    startTransition(async () => {
      try {
        const publishAt = new Date(scheduleAt).toISOString();
        if (scheduleItem) {
          const updated = await api.updateSchedule(scheduleItem.id, {
            contentId: selectedContent.id,
            publishAt,
            timezone: "Asia/Tokyo",
            accountId,
          });
          setScheduleItem(updated);
          setScheduleValidation({ valid: true, messages: [] });
          setScheduleMessage("予約を更新しました。公開設定を反映しました。");
          await refreshContents();
          await loadScheduleForContent(selectedContent.id);
          return;
        }

        const result = await api.validateSchedule({
          contentId: selectedContent.id,
          publishAt,
          timezone: "Asia/Tokyo",
          accountId,
        });
        setScheduleValidation(result);
        setScheduleMessage(
          result.valid
            ? "予約を登録しました。指定時刻に自動投稿されます。"
            : (result.messages[0] ?? "予約条件を確認してください。"),
        );
        if (!result.valid) {
          return;
        }

        const created = await api.createSchedule({
          contentId: selectedContent.id,
          publishAt,
          timezone: "Asia/Tokyo",
          accountId,
        });
        setScheduleItem(created);
        await refreshContents();
        await loadScheduleForContent(selectedContent.id);
      } catch (error) {
        setScheduleValidation({ valid: false, messages: [] });
        setScheduleMessage(
          error instanceof Error ? error.message : "予約に失敗しました。",
        );
      }
    });
  }

  function onCancelSchedule() {
    if (!scheduleItem || !selectedContent) {
      return;
    }

    if (!window.confirm("この予約を取り消しますか？")) {
      return;
    }

    startTransition(async () => {
      try {
        await api.cancelSchedule(scheduleItem.id);
        setScheduleItem(null);
        setScheduleValidation(null);
        setScheduleAt("");
        setScheduleMessage("予約を取り消しました。");
        await refreshContents();
        await loadScheduleForContent(selectedContent.id);
      } catch (error) {
        setScheduleMessage(
          error instanceof Error ? error.message : "予約取消に失敗しました。",
        );
      }
    });
  }

  function startCreate() {
    setSelectedId("");
    setForm(initialForm);
    setScheduleItem(null);
    setScheduleAt("");
    setScheduleMessage("");
    setScheduleValidation(null);
    setMessage("");
    setPreviewValidation(null);
    setIsAssetLibraryOpen(false);
    setView("edit");
  }

  function openEdit(id: string) {
    setSelectedId(id);
    setIsAssetLibraryOpen(false);
    setView("edit");
  }

  useEffect(() => {
    if (!selectedContent) {
      setScheduleItem(null);
      setScheduleAt("");
      return;
    }

    void loadScheduleForContent(selectedContent.id);
  }, [selectedContent]);

  if (view === "list") {
    return (
      <>
        <HeroListHeader onCreate={startCreate} />
        <section className="table-card" aria-label="コンテンツ一覧">
          <div className="button-row">
            <button className="tab-button active" type="button">
              初期表示
            </button>
            <button className="tab-button" type="button">
              ローディング
            </button>
            <button className="tab-button" type="button">
              空状態
            </button>
            <button className="tab-button" type="button">
              エラー
            </button>
          </div>
          <div className="table-toolbar" style={{ marginTop: 16 }}>
            <ContentsFilter value={filters} onChange={setFilters} />
          </div>
          <p className="helper" style={{ marginTop: 12 }}>
            {filteredContents.length}件のコンテンツ
          </p>
          <div style={{ marginTop: 12 }}>
            <ContentsTable
              items={filteredContents}
              selectedId={selectedId}
              onSelect={openEdit}
              onDuplicate={async (id) => {
                setSelectedId(id);
                const duplicated = await api.duplicateContent(id);
                await refreshContents();
                setSelectedId(duplicated.id);
                setView("edit");
              }}
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="button-row">
        <button
          className="page-back ghost-button"
          type="button"
          onClick={() => setView("list")}
        >
          <ArrowLeftIcon />
          一覧へ戻る
        </button>
      </div>

      <section className="page-hero">
        <div>
          <div className="eyebrow">コンテンツ編集</div>
          <h2>コンテンツ編集</h2>
          <p className="muted">
            投稿内容を編集し、下書き保存または予約を行います。
          </p>
        </div>
        <span
          className={`status-pill ${selectedContent?.status ?? "action_required"}`}
        >
          {selectedContent?.status === "action_required"
            ? "要対応"
            : (selectedContent?.status ?? "下書き")}
        </span>
      </section>

      <div className="edit-grid">
        <section className="editor-panel" aria-label="編集フォーム">
          <div className="meta-list">
            <div className="surface-panel">
              <div className="panel-head">
                <div>
                  <h3>基本情報</h3>
                </div>
              </div>
              <div className="field">
                <label htmlFor="title">投稿名</label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="contentType">投稿種別</label>
                <select
                  id="contentType"
                  value={form.contentType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contentType: event.target.value as ContentType,
                    }))
                  }
                >
                  <option value="image">画像フィード</option>
                  <option value="video">動画フィード</option>
                  <option value="carousel">カルーセル</option>
                  <option value="reel">リール</option>
                  <option value="extension">拡張</option>
                </select>
                <div className="field-hint">{currentTypeHelp.description}</div>
                <div className="pill-row" style={{ marginTop: 10 }}>
                  {currentTypeHelp.chips.map((chip) => (
                    <span key={chip} className="tag-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-panel">
              <div className="panel-head">
                <div>
                  <h3>メディア</h3>
                  <p className="muted">
                    複数ファイルを添付できます。既存メディアは必要なときだけ表示します。
                  </p>
                </div>
              </div>
              <div className="dropzone">
                <div
                  className="dropzone-inner"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void uploadFiles(event.dataTransfer.files);
                  }}
                >
                  <div className="dropzone-icon">
                    <UploadIcon />
                  </div>
                  <div>
                    <div>メディアをドラッグ&ドロップ、または選択</div>
                    <div className="field-hint">
                      {currentTypeHelp.mediaHint}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
                    multiple
                    hidden
                    onChange={(event) => {
                      if (event.target.files) {
                        void uploadFiles(event.target.files);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "アップロード中..." : "ファイルを選択"}
                  </button>
                  <div className="pill-row">
                    {currentTypeHelp.chips.map((chip) => (
                      <span key={chip} className="tag-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {selectedAssets.length > 0 ? (
                <div className="surface-inset" style={{ marginTop: 12 }}>
                  <div className="panel-head">
                    <div>
                      <h3>選択中のメディア</h3>
                      <p className="muted">
                        現在この投稿に紐づいているメディアです。
                      </p>
                    </div>
                  </div>
                  <div className="meta-list" style={{ marginTop: 10 }}>
                    {selectedAssets.map((asset) => (
                      <div key={asset.id} className="meta-item">
                        <div
                          className="media-preview"
                          style={{ marginBottom: 12 }}
                        >
                          {asset.mediaType === "image" ? (
                            <Image
                              src={resolveMediaAssetUrl(asset.url)}
                              alt={asset.fileName}
                              width={asset.width}
                              height={asset.height}
                              unoptimized
                            />
                          ) : (
                            <video
                              src={resolveMediaAssetUrl(asset.url)}
                              controls
                              muted
                              preload="metadata"
                            />
                          )}
                        </div>
                        <div className="asset-card-head">
                          <div>
                            <div className="asset-title">{asset.fileName}</div>
                            <div className="asset-meta">
                              {asset.mediaType === "video" ? "動画" : "画像"} /{" "}
                              {asset.mimeType}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ghost-button compact-button"
                            onClick={() => toggleAsset(asset.id)}
                          >
                            外す
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="button-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsAssetLibraryOpen((current) => !current)}
                >
                  {isAssetLibraryOpen
                    ? "既存メディアを隠す"
                    : "既存メディアを表示"}
                </button>
                <Link href="/media" className="ghost-button">
                  メディア管理へ
                </Link>
              </div>

              {isAssetLibraryOpen ? (
                <div className="asset-grid" style={{ marginTop: 12 }}>
                  {mediaAssets.length === 0 ? (
                    <div className="surface-inset">
                      <p className="muted">
                        アップロードしたメディアがここに表示されます。上のエリアからファイルを追加してください。
                      </p>
                    </div>
                  ) : (
                    mediaAssets.map((asset) => {
                      const selected = form.mediaAssetIds.includes(asset.id);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          className="asset-card"
                          onClick={() => toggleAsset(asset.id)}
                        >
                          <div className="asset-card-head">
                            <div>
                              <div className="asset-title">
                                {asset.fileName}
                              </div>
                              <div className="asset-meta">
                                {asset.mediaType === "video" ? "動画" : "画像"}{" "}
                                / {asset.mimeType}
                              </div>
                            </div>
                            {selected ? (
                              <span className="status-pill published">
                                選択中
                              </span>
                            ) : (
                              <span className="chip">追加</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="surface-inset" style={{ marginTop: 12 }}>
                  <p className="muted">
                    既存メディアは初期状態で非表示です。必要な場合のみ「既存メディアを表示」を選択してください。
                  </p>
                </div>
              )}

              {form.contentType === "carousel" && selectedAssets.length > 0 ? (
                <div className="surface-inset" style={{ marginTop: 12 }}>
                  <div className="panel-head">
                    <div>
                      <h3>カルーセル順序</h3>
                      <p className="muted">
                        選択済みメディアの表示順を調整します。
                      </p>
                    </div>
                  </div>
                  <div className="meta-list" style={{ marginTop: 10 }}>
                    {selectedAssets.map((asset, index) => (
                      <div key={asset.id} className="meta-item">
                        <div className="asset-card-head">
                          <div>
                            <div className="asset-title">
                              {index + 1}. {asset.fileName}
                            </div>
                            <div className="asset-meta">{asset.mimeType}</div>
                          </div>
                          <div className="button-row">
                            <button
                              type="button"
                              className="ghost-button compact-button"
                              onClick={() => moveAsset(asset.id, "up")}
                              disabled={index === 0}
                            >
                              上へ
                            </button>
                            <button
                              type="button"
                              className="ghost-button compact-button"
                              onClick={() => moveAsset(asset.id, "down")}
                              disabled={index === selectedAssets.length - 1}
                            >
                              下へ
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {form.contentType === "reel" && isAssetLibraryOpen ? (
                <div className="surface-inset" style={{ marginTop: 12 }}>
                  <div className="panel-head">
                    <div>
                      <h3>リール設定</h3>
                      <p className="muted">
                        カバー画像を 1 件選択してください。
                      </p>
                    </div>
                  </div>
                  <div className="asset-grid" style={{ marginTop: 10 }}>
                    {imageAssets.map((asset) => {
                      const selected =
                        form.contentConfig.coverAssetId === asset.id;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          className="asset-card"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              contentConfig: {
                                ...current.contentConfig,
                                coverAssetId: asset.id,
                              },
                            }))
                          }
                        >
                          <div className="asset-card-head">
                            <div>
                              <div className="asset-title">
                                {asset.fileName}
                              </div>
                              <div className="asset-meta">
                                カバー候補 / {asset.mimeType}
                              </div>
                            </div>
                            {selected ? (
                              <span className="status-pill published">
                                選択中
                              </span>
                            ) : (
                              <span className="chip">選択</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {form.contentType === "extension" ? (
                <div className="surface-inset" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label htmlFor="templateKey">拡張テンプレートキー</label>
                    <input
                      id="templateKey"
                      value={form.contentConfig.templateKey}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contentConfig: {
                            ...current.contentConfig,
                            templateKey: event.target.value,
                          },
                        }))
                      }
                    />
                    <div className="field-hint">
                      将来追加する投稿種別の設定キーを保持します。
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="surface-panel">
              <div className="panel-head">
                <div>
                  <h3>キャプション・ハッシュタグ</h3>
                </div>
              </div>
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="caption">キャプション</label>
                  <span className="field-hint">
                    {form.caption.length} / 2200
                  </span>
                </div>
                <textarea
                  id="caption"
                  value={form.caption}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      caption: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="hashtags">ハッシュタグ</label>
                <input
                  id="hashtags"
                  value={form.hashtags}
                  placeholder="タグを入力して Enter"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hashtags: event.target.value,
                    }))
                  }
                />
                <div className="tag-list">
                  {form.hashtags
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="labels">ラベル</label>
                <input
                  id="labels"
                  value={form.labels}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      labels: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <div className="meta-list">
          <section className="schedule-panel" aria-label="公開設定">
            <h3>公開設定</h3>
            {scheduleItem ? (
              <div className="surface-inset" style={{ marginTop: 12 }}>
                <div className="panel-head">
                  <div>
                    <h3>現在の予約</h3>
                    <p className="muted">
                      {new Date(scheduleItem.publishAt).toLocaleString("ja-JP")}{" "}
                      / {scheduleItem.timezone}
                    </p>
                  </div>
                  <span className={`status-pill ${scheduleItem.status}`}>
                    {scheduleStatusLabel(scheduleItem.status)}
                  </span>
                </div>
                <div className="field-hint" style={{ marginTop: 8 }}>
                  公開先: {scheduleItem.accountId}
                </div>
              </div>
            ) : null}
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="scheduleAt">公開日時</label>
              <input
                id="scheduleAt"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                disabled={!accountId}
              />
              <div className="field-hint">
                {accountId
                  ? "未来の日時のみ指定できます。"
                  : "Instagram 連携後に予約投稿を利用できます。"}
              </div>
            </div>
          </section>

          <ValidationPanel validation={previewValidation} />

          <section className="status-panel">
            <div className="button-row" style={{ display: "grid", gap: 10 }}>
              <button
                className="button"
                onClick={onValidateSchedule}
                disabled={isPending || !accountId}
              >
                {isPending
                  ? "確認中..."
                  : scheduleItem
                    ? "この内容で予約を更新"
                    : "この日時で予約する"}
              </button>
              {scheduleItem ? (
                <button
                  className="ghost-button"
                  onClick={onCancelSchedule}
                  disabled={isPending}
                >
                  予約を取り消す
                </button>
              ) : null}
              <button
                className="secondary-button"
                onClick={onSave}
                disabled={isPending || isUploading}
              >
                {isPending ? "保存中..." : "下書きを保存"}
              </button>
              {selectedContent ? (
                <button className="ghost-button" onClick={onDuplicate}>
                  <CopyIcon /> 複製
                </button>
              ) : null}
              {!selectedContent ? (
                <button className="ghost-button" onClick={startCreate}>
                  <PlusIcon /> 新規作成
                </button>
              ) : null}
            </div>
            {message ? (
              <p
                className={
                  message.includes("失敗") ? "error-text" : "success-text"
                }
                style={{ marginTop: 12 }}
              >
                {message}
              </p>
            ) : null}
            {scheduleMessage ? (
              <p
                className={
                  scheduleValidation?.valid ? "success-text" : "error-text"
                }
                style={{ marginTop: 8 }}
              >
                {scheduleMessage}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

function HeroListHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="page-hero">
      <div>
        <div className="eyebrow">コンテンツ一覧</div>
        <h2>コンテンツ一覧</h2>
        <p className="muted">
          投稿コンテンツの作成・予約・状態管理を行います。
        </p>
      </div>
      <button className="button" type="button" onClick={onCreate}>
        新規投稿作成
      </button>
    </section>
  );
}
