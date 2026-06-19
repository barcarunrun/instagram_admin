import { PlusIcon } from "./icons";

export function TopbarAction() {
  return (
    <button className="button" type="button">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <PlusIcon />
        新規投稿作成
      </span>
    </button>
  );
}