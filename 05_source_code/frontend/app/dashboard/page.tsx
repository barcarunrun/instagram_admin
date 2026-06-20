import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { DashboardChart } from "../../components/dashboard-chart";
import { Hero } from "../../components/hero";
import {
  CalendarIcon,
  CheckCircleIcon,
  ContentIcon,
  WarningIcon,
} from "../../components/icons";
import { StatusBadge } from "../../components/status-badge";
import { serverApi } from "../../lib/server-api";

type DashboardPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toRange(searchParams?: { from?: string; to?: string }) {
  const today = new Date();
  const defaultTo = formatDateInput(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 6);
  const defaultFrom = formatDateInput(defaultFromDate);

  const from = searchParams?.from ?? defaultFrom;
  const to = searchParams?.to ?? defaultTo;

  return {
    from,
    to,
    apiFrom: `${from}T00:00:00.000Z`,
    apiTo: `${to}T23:59:59.999Z`,
  };
}

function buildChartPoints(
  from: string,
  to: string,
  events: Awaited<ReturnType<typeof serverApi.getCalendarEvents>>["items"],
) {
  const labels = new Map<
    string,
    { label: string; scheduled: number; executed: number }
  >();
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    labels.set(key, {
      label: `${cursor.getUTCMonth() + 1}/${cursor.getUTCDate()}`,
      scheduled: 0,
      executed: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const event of events) {
    const key = event.startsAt.slice(0, 10);
    const current = labels.get(key);

    if (!current) {
      continue;
    }

    current.scheduled += 1;

    if (event.status === "success") {
      current.executed += 1;
    }
  }

  return Array.from(labels.values());
}

export default async function DashboardPage(props: DashboardPageProps) {
  const searchParams = await props.searchParams;
  const range = toRange(searchParams);

  const [summary, events, contents] = await Promise.all([
    serverApi.getDashboardSummary({ from: range.apiFrom, to: range.apiTo }),
    serverApi.getCalendarEvents({ from: range.apiFrom, to: range.apiTo }),
    serverApi.getContents(),
  ]);

  const bars = buildChartPoints(range.from, range.to, events.items);

  const failureItems = summary.failures.map((log, index) => ({
    log,
    content:
      contents.items.find((item) => item.id === log.contentId) ??
      contents.items[index % Math.max(contents.items.length, 1)],
  }));

  const snapshot = {
    postingExecutionRate: String(summary.kpi.postingExecutionRate),
    weeklyPostCount: String(summary.kpi.weeklyPostCount),
    failedCount: String(summary.kpi.failedCount),
    unexecutedCount: String(summary.kpi.unexecutedCount),
  };

  return (
    <AppShell currentPath="/dashboard">
      <Hero
        eyebrow="ダッシュボード"
        title="ダッシュボード"
        description="投稿の実行状況と KPI をひと目で確認できます。"
        actions={
          <Link className="button" href="/contents">
            新規投稿作成
          </Link>
        }
      />

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="dashboard-from">開始日</label>
          <input
            className="input"
            id="dashboard-from"
            name="from"
            type="date"
            defaultValue={range.from}
          />
        </div>
        <div className="field">
          <label htmlFor="dashboard-to">終了日</label>
          <input
            className="input"
            id="dashboard-to"
            name="to"
            type="date"
            defaultValue={range.to}
          />
        </div>
        <div className="filter-bar-actions">
          <button className="button" type="submit">
            期間を更新
          </button>
          <Link
            className="secondary-button"
            href={`/calendar?from=${range.from}&to=${range.to}&view=week`}
          >
            カレンダーで確認
          </Link>
        </div>
      </form>

      <section className="stats-grid">
        <article className="card stat-card">
          <div className="stat-head">
            <span>投稿実行率</span>
            <span className="stat-icon">
              <CalendarIcon />
            </span>
          </div>
          <p className="stat-value">
            {snapshot.postingExecutionRate}
            <span style={{ fontSize: 12 }}>%</span>
          </p>
          <div className="stat-change positive">指定期間の成功率</div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>週次投稿本数</span>
            <span className="stat-icon">
              <ContentIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.weeklyPostCount}</p>
          <div className="stat-change positive">指定期間の予約件数</div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>失敗件数</span>
            <span className="stat-icon">
              <WarningIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.failedCount}</p>
          <div className="stat-change negative">
            失敗または要対応の対象を監視
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>未実行件数</span>
            <span className="stat-icon">
              <CheckCircleIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.unexecutedCount}</p>
          <div className="stat-change negative">実行待ちまたは再試行待ち</div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="chart-panel">
          <div className="chart-panel-head">
            <div>
              <h3>予約数と実行数</h3>
              <p className="muted">直近7日間の日次推移</p>
            </div>
          </div>
          <DashboardChart points={bars} />
        </article>

        <article className="list-panel">
          <div className="list-head">
            <div>
              <h3>直近の失敗ジョブ</h3>
              <p className="muted">再実行または再連携が必要です</p>
            </div>
            <Link className="secondary-button" href="/logs">
              実行ログへ
            </Link>
          </div>
          <div className="failure-list">
            {failureItems.length > 0 ? (
              failureItems.map(({ log, content }, index) => (
                <div key={`${log.id}-${index}`} className="failure-item">
                  <div className="failure-item-head">
                    <div>
                      <div className="failure-title">
                        {content?.title ?? "新作告知"}
                      </div>
                      <div className="failure-meta">
                        {content?.contentType === "reel"
                          ? "リール"
                          : content?.contentType === "carousel"
                            ? "カルーセル"
                            : content?.contentType === "video"
                              ? "動画フィード"
                              : "画像フィード"}
                      </div>
                    </div>
                    <Link className="secondary-button" href="/logs">
                      詳細を見る
                    </Link>
                  </div>
                  <div className="pill-row" style={{ marginTop: 8 }}>
                    <StatusBadge
                      tone={
                        log.status === "action_required" ||
                        log.status === "reauthorization_required"
                          ? "critical"
                          : "warning"
                      }
                    >
                      {log.status === "action_required"
                        ? "恒久障害"
                        : log.status === "reauthorization_required"
                          ? "再認可待ち"
                          : "一時障害"}
                    </StatusBadge>
                    <span className="failure-meta">
                      {log.errorMessage ?? "APIエラー"}
                    </span>
                  </div>
                  <div className="failure-meta" style={{ marginTop: 8 }}>
                    ・{new Date(log.executedAt).toLocaleString("ja-JP")} ・ 試行{" "}
                    {log.retryCount}/3
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-inset">失敗ジョブはありません。</div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <article className="list-panel">
          <div className="panel-head">
            <div>
              <h3>未実行一覧</h3>
              <p className="muted">指定期間内で実行待ちの予約</p>
            </div>
            <Link
              className="secondary-button"
              href={`/calendar?from=${range.from}&to=${range.to}&view=week`}
            >
              カレンダーへ
            </Link>
          </div>
          <div className="alert-list">
            {summary.unexecuted.length > 0 ? (
              summary.unexecuted.map((item) => {
                const content = contents.items.find(
                  (entry) => entry.id === item.contentId,
                );

                return (
                  <div key={item.id} className="alert-item">
                    <div className="failure-item-head">
                      <div>
                        <div className="failure-title">
                          {content?.title ?? "予約投稿"}
                        </div>
                        <div className="failure-meta">
                          {new Date(item.publishAt).toLocaleString("ja-JP")} ・{" "}
                          {item.timezone}
                        </div>
                      </div>
                      <StatusBadge tone="info">{item.status}</StatusBadge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="surface-inset">未実行の予約はありません。</div>
            )}
          </div>
        </article>

        <article className="table-card">
          <div className="panel-head">
            <div>
              <h3>要再認可アカウント / アラート</h3>
              <p className="muted">
                再認可対象と KPI 未達アラートを表示します。
              </p>
            </div>
            <Link className="secondary-button" href="/connect">
              連携状態を確認
            </Link>
          </div>
          <div className="alert-list">
            {summary.reauthorizationAccounts.map((account) => (
              <div key={account.id} className="alert-item">
                <div className="failure-item-head">
                  <div>
                    <div className="failure-title">{account.accountName}</div>
                    <div className="failure-meta">
                      期限:{" "}
                      {new Date(account.tokenExpiresAt).toLocaleDateString(
                        "ja-JP",
                      )}
                    </div>
                  </div>
                  <StatusBadge tone="critical">{account.status}</StatusBadge>
                </div>
              </div>
            ))}
            {summary.alerts.map((alert, index) => (
              <div key={alert.id} className="alert-item">
                <div className="failure-item-head">
                  <div>
                    <div className="failure-title">{alert.title}</div>
                    <div className="failure-meta">{alert.description}</div>
                  </div>
                  <StatusBadge
                    tone={
                      alert.level === "critical"
                        ? "critical"
                        : alert.level === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {index === 0 ? "要確認" : "通知中"}
                  </StatusBadge>
                </div>
              </div>
            ))}
            {summary.reauthorizationAccounts.length === 0 &&
            summary.alerts.length === 0 ? (
              <div className="surface-inset">現在アラートはありません。</div>
            ) : null}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
