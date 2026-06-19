import { SearchIcon } from "./icons";

export type ContentsFilters = {
  query: string;
  status: string;
  type: string;
  period: string;
};

export function ContentsFilter({
  value,
  onChange,
}: {
  value: ContentsFilters;
  onChange: (next: ContentsFilters) => void;
}) {
  return (
    <div className="filter-grid">
      <div className="search-wrap">
        <span className="search-icon"><SearchIcon /></span>
        <input
          className="search-input"
          value={value.query}
          placeholder="投稿名で検索"
          onChange={(event) => onChange({ ...value, query: event.target.value })}
        />
      </div>
      <select className="filter-select" value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}>
        <option value="all">状態: すべて</option>
        <option value="draft">下書き</option>
        <option value="scheduled">予約済み</option>
        <option value="failed">失敗</option>
        <option value="action_required">要対応</option>
        <option value="published">公開済み</option>
      </select>
      <select className="filter-select" value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
        <option value="all">種別: すべて</option>
        <option value="image">画像フィード</option>
        <option value="video">動画フィード</option>
        <option value="carousel">カルーセル</option>
        <option value="reel">リール</option>
      </select>
      <select className="filter-select" value={value.period} onChange={(event) => onChange({ ...value, period: event.target.value })}>
        <option value="all">期間: すべて</option>
        <option value="today">今日</option>
        <option value="week">今週</option>
        <option value="month">今月</option>
      </select>
    </div>
  );
}