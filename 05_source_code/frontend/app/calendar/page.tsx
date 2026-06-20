import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { Hero } from "../../components/hero";
import { StatusBadge } from "../../components/status-badge";
import { serverApi } from "../../lib/server-api";

type CalendarView = "day" | "week" | "month";

type CalendarPageProps = {
  searchParams?: Promise<{
    view?: CalendarView;
    from?: string;
    to?: string;
  }>;
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange(view: CalendarView) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (view === "day") {
    return { from: formatDateInput(start), to: formatDateInput(end) };
  }

  if (view === "week") {
    start.setDate(start.getDate() - start.getDay());
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    return { from: formatDateInput(start), to: formatDateInput(end) };
  }

  start.setDate(1);
  end.setMonth(end.getMonth() + 1, 0);
  return { from: formatDateInput(start), to: formatDateInput(end) };
}

function getRange(searchParams?: {
  view?: CalendarView;
  from?: string;
  to?: string;
}) {
  const view = searchParams?.view ?? "week";
  const defaults = getDefaultRange(view);
  const from = searchParams?.from ?? defaults.from;
  const to = searchParams?.to ?? defaults.to;

  return {
    view,
    from,
    to,
    apiFrom: `${from}T00:00:00.000Z`,
    apiTo: `${to}T23:59:59.999Z`,
  };
}

function buildDayColumns(from: string, to: string) {
  const items: Array<{ key: string; label: string }> = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    items.push({
      key: cursor.toISOString().slice(0, 10),
      label: `${cursor.getUTCMonth() + 1}/${cursor.getUTCDate()}`,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return items;
}

function toneForStatus(
  status: string,
): "info" | "warning" | "critical" | "success" {
  if (status === "success" || status === "published") {
    return "success";
  }

  if (
    status === "failed" ||
    status === "action_required" ||
    status === "reauthorization_required"
  ) {
    return "critical";
  }

  if (status === "retrying") {
    return "warning";
  }

  return "info";
}

export default async function CalendarPage(props: CalendarPageProps) {
  const searchParams = await props.searchParams;
  const range = getRange(searchParams);
  const events = await serverApi.getCalendarEvents({
    from: range.apiFrom,
    to: range.apiTo,
  });

  const columns = buildDayColumns(range.from, range.to);
  const eventsByDay = new Map<string, typeof events.items>();

  for (const column of columns) {
    eventsByDay.set(column.key, []);
  }

  for (const event of events.items) {
    const dayKey = event.startsAt.slice(0, 10);
    const dayEvents = eventsByDay.get(dayKey);

    if (!dayEvents) {
      continue;
    }

    dayEvents.push(event);
  }

  return (
    <AppShell currentPath="/calendar">
      <Hero
        eyebrow="投稿カレンダー"
        title="予約と実績のカレンダー"
        description="日次・週次・月次で予約状況と投稿結果を確認できます。"
        actions={
          <Link className="button" href="/contents">
            新規投稿作成
          </Link>
        }
      />

      <div className="button-row">
        {(["day", "week", "month"] as const).map((view) => (
          <Link
            key={view}
            className={`tab-button ${range.view === view ? "active" : ""}`}
            href={`/calendar?view=${view}&from=${range.from}&to=${range.to}`}
          >
            {view === "day" ? "Day" : view === "week" ? "Week" : "Month"}
          </Link>
        ))}
      </div>

      <form className="filter-bar" method="get">
        <input name="view" type="hidden" value={range.view} />
        <div className="field">
          <label htmlFor="calendar-from">開始日</label>
          <input
            className="input"
            id="calendar-from"
            name="from"
            type="date"
            defaultValue={range.from}
          />
        </div>
        <div className="field">
          <label htmlFor="calendar-to">終了日</label>
          <input
            className="input"
            id="calendar-to"
            name="to"
            type="date"
            defaultValue={range.to}
          />
        </div>
        <div className="filter-bar-actions">
          <button className="button" type="submit">
            表示を更新
          </button>
          <Link
            className="secondary-button"
            href={`/dashboard?from=${range.from}&to=${range.to}`}
          >
            ダッシュボードへ
          </Link>
        </div>
      </form>

      <section className="calendar-board">
        {columns.map((column) => {
          const dayEvents = eventsByDay.get(column.key) ?? [];

          return (
            <article key={column.key} className="calendar-column">
              <div className="calendar-column-head">
                <h3>{column.label}</h3>
                <span className="muted">{dayEvents.length}件</span>
              </div>
              <div className="calendar-event-list">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <div key={event.id} className="calendar-event-card">
                      <div className="failure-item-head">
                        <div>
                          <div className="failure-title">{event.title}</div>
                          <div className="failure-meta">
                            {new Date(event.startsAt).toLocaleTimeString(
                              "ja-JP",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                        <StatusBadge tone={toneForStatus(event.status)}>
                          {event.status}
                        </StatusBadge>
                      </div>
                      <div className="pill-row" style={{ marginTop: 8 }}>
                        <span className="chip">{event.contentType}</span>
                        <span className="chip">{event.accountId}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="surface-inset">イベントはありません。</div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
