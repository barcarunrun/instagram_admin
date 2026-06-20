import type { ContentItem } from "../lib/types";
import { CopyIcon, PencilIcon, TrashIcon } from "./icons";

const typeLabelMap: Record<string, string> = {
  image: "画像フィード",
  video: "動画フィード",
  carousel: "カルーセル",
  reel: "リール",
  extension: "拡張",
};

const editorNames = ["佐藤 美咲", "田中 健", "鈴木 大輔", "高橋 由紀"];
const scheduledDates = [
  "6/20 18:00",
  "6/21 12:00",
  "6/22 11:30",
  "6/19 07:45",
  "-",
  "6/17 10:00",
  "6/20 09:00",
  "6/16 15:00",
  "-",
  "6/23 19:00",
];

function toneFromStatus(status: string): string {
  if (["failed", "error", "rejected"].includes(status)) {
    return "failed";
  }
  if (
    ["action_required", "reauthorization_required", "pending"].includes(status)
  ) {
    return "action_required";
  }
  if (["scheduled", "retrying"].includes(status)) {
    return "scheduled";
  }
  if (["published", "approved", "active"].includes(status)) {
    return "published";
  }
  return "draft";
}

export function ContentsTable({
  items,
  selectedId,
  onSelect,
  onDuplicate,
}: {
  items: ContentItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>投稿名</th>
          <th>投稿種別</th>
          <th>状態</th>
          <th>予約日時</th>
          <th>最終更新者</th>
          <th>アクション</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr
            key={item.id}
            className={item.id === selectedId ? "selected" : undefined}
          >
            <td>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onSelect(item.id)}
                style={{
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  minHeight: 0,
                }}
              >
                {item.title}
              </button>
            </td>
            <td>{typeLabelMap[item.contentType] ?? item.contentType}</td>
            <td>
              <span className={`status-pill ${toneFromStatus(item.status)}`}>
                {item.status === "action_required"
                  ? "要対応"
                  : item.status === "scheduled"
                    ? "予約済み"
                    : item.status === "published"
                      ? "公開済み"
                      : item.status === "failed"
                        ? "失敗"
                        : "下書き"}
              </span>
            </td>
            <td>{scheduledDates[index] ?? "-"}</td>
            <td>{editorNames[index % editorNames.length]}</td>
            <td>
              <div className="table-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="編集"
                  onClick={() => onSelect(item.id)}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="複製"
                  onClick={() => onDuplicate(item.id)}
                >
                  <CopyIcon />
                </button>
                <button type="button" className="icon-button" aria-label="削除">
                  <TrashIcon />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
