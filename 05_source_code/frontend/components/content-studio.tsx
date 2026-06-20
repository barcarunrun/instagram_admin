"use client";

import { useEffect, useState, useTransition } from "react";
import { api } from "../lib/api";
import type {
  ContentItem,
  ContentType,
  MediaAsset,
  ScheduleValidationResult,
} from "../lib/types";
import { ContentsFilter, type ContentsFilters } from "./contents-filter";
import { ContentsTable } from "./contents-table";
import { ArrowLeftIcon, CopyIcon, PlusIcon, UploadIcon } from "./icons";
import { ValidationPanel } from "./validation-panel";

const initialForm = {
  title: "",
  contentType: "image" as ContentType,
  caption: "",
  hashtags: "",
  labels: "",
  mediaAssetIds: [] as string[],
};

export function ContentStudio({
  initialContents,
  mediaAssets,
  accountId,
}: {
  initialContents: ContentItem[];
  mediaAssets: MediaAsset[];
  accountId: string;
}) {
  const [contents, setContents] = useState(initialContents);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string>("");
  const [scheduleMessage, setScheduleMessage] = useState<string>("");
  const [scheduleValidation, setScheduleValidation] =
    useState<ScheduleValidationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const [filters, setFilters] = useState<ContentsFilters>({
    query: "",
    status: "all",
    type: "all",
    period: "all",
  });
  const [view, setView] = useState<"list" | "edit">("list");

  const selectedContent =
    contents.find((item) => item.id === selectedId) ?? null;
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
    });
  }, [selectedContent]);

  async function refreshContents() {
    const result = await api.getContents();
    setContents(result.items);
  }

  function buildPayload() {
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
      approvalStatus: "approved" as const,
    };
  }

  function toggleAsset(id: string) {
    setForm((current) => ({
      ...current,
      mediaAssetIds: current.mediaAssetIds.includes(id)
        ? current.mediaAssetIds.filter((item) => item !== id)
        : [...current.mediaAssetIds, id],
    }));
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
    if (!selectedContent || !scheduleAt) {
      setScheduleMessage("公開日時は現在より後の時刻を指定してください。");
      return;
    }

    startTransition(async () => {
      try {
        const publishAt = new Date(scheduleAt).toISOString();
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
        if (result.valid) {
          await api.createSchedule({
            contentId: selectedContent.id,
            publishAt,
            timezone: "Asia/Tokyo",
            accountId,
          });
          await refreshContents();
        }
      } catch (error) {
        setScheduleMessage(
          error instanceof Error ? error.message : "予約に失敗しました。",
        );
      }
    });
  }

  function startCreate() {
    setSelectedId("");
    setForm(initialForm);
    setScheduleAt("");
    setScheduleMessage("");
    setScheduleValidation(null);
    setMessage("");
    setView("edit");
  }

  function openEdit(id: string) {
    setSelectedId(id);
    setView("edit");
  }

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
                <div className="field-hint">
                  種別を変更すると、利用可能なメディア形式も切り替わります。
                </div>
              </div>
            </div>

            <div className="surface-panel">
              <div className="panel-head">
                <div>
                  <h3>メディア</h3>
                  <p className="muted">複数ファイルを添付できます</p>
                </div>
              </div>
              <div className="dropzone">
                <div className="dropzone-inner">
                  <div className="dropzone-icon">
                    <UploadIcon />
                  </div>
                  <div>
                    <div>メディアをドラッグ&ドロップ、または選択</div>
                    <div className="field-hint">
                      リールで利用可能な形式: .mp4 / .mov
                    </div>
                  </div>
                  <button type="button" className="secondary-button">
                    ファイルを選択
                  </button>
                  <div className="pill-row">
                    <span className="tag-chip">.jpg</span>
                    <span className="tag-chip">.mp4</span>
                    <span className="tag-chip">.gif</span>
                  </div>
                </div>
              </div>
              <div className="asset-grid" style={{ marginTop: 12 }}>
                {mediaAssets.map((asset) => {
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
                          <div className="asset-title">{asset.fileName}</div>
                          <div className="asset-meta">
                            {asset.mediaType === "video" ? "動画" : "画像"} /{" "}
                            {asset.mimeType}
                          </div>
                        </div>
                        {selected ? (
                          <span className="status-pill published">選択中</span>
                        ) : (
                          <span className="chip">追加</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
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
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="scheduleAt">公開日時</label>
              <input
                id="scheduleAt"
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
              />
              <div className="field-hint">未来の日時のみ指定できます。</div>
            </div>
          </section>

          <ValidationPanel validation={selectedContent?.validation ?? null} />

          <section className="status-panel">
            <div className="button-row" style={{ display: "grid", gap: 10 }}>
              <button
                className="button"
                onClick={onValidateSchedule}
                disabled={isPending}
              >
                {isPending ? "確認中..." : "この日時で予約する"}
              </button>
              <button
                className="secondary-button"
                onClick={onSave}
                disabled={isPending}
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
