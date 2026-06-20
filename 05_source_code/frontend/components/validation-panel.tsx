import type { ValidationSummary } from "../lib/types";
import { WarningIcon } from "./icons";

const fieldLabels: Record<string, string> = {
  title: "投稿名",
  caption: "キャプション",
  hashtags: "ハッシュタグ",
  mediaAssets: "メディア",
  "contentConfig.coverAssetId": "リールカバー画像",
  "contentConfig.orderedMediaAssetIds": "カルーセル順序",
};

function toFieldLabel(field: string): string {
  if (fieldLabels[field]) {
    return fieldLabels[field];
  }

  if (field.startsWith("mediaAssets:")) {
    return `メディア: ${field.split(":")[1]}`;
  }

  return field;
}

export function ValidationPanel({
  validation,
}: {
  validation: ValidationSummary | null;
}) {
  const errorCount =
    validation?.messages.filter((message) => message.level === "error")
      .length ?? 0;
  const warningCount =
    validation?.messages.filter((message) => message.level === "warning")
      .length ?? 0;

  return (
    <section className="status-panel">
      <h3>バリデーション結果</h3>
      <div className="validation-summary">
        <WarningIcon />
        <span>
          {errorCount}件のエラー / {warningCount}件の警告
        </span>
      </div>
      <div className="validation-list">
        {validation?.messages.length ? (
          validation.messages.map((message, index) => (
            <div
              key={`${message.field}-${index}`}
              className={`validation-item ${message.level === "error" ? "error" : "warning"}`}
            >
              <div className="validation-item-head">
                <strong>{toFieldLabel(message.field)}</strong>
              </div>
              <p>{message.message}</p>
            </div>
          ))
        ) : (
          <div className="validation-item">
            <p>問題のあるバリデーションはありません。</p>
          </div>
        )}
      </div>
    </section>
  );
}
