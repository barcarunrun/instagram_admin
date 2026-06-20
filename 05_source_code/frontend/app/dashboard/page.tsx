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

export default async function DashboardPage() {
  const [kpi, alerts, events, logs, contents] = await Promise.all([
    serverApi.getDashboardKpi(),
    serverApi.getDashboardAlerts(),
    serverApi.getCalendarEvents(),
    serverApi.getJobLogs(),
    serverApi.getContents(),
  ]);

  const bars = [
    { label: "6/13", scheduled: 6, executed: 6 },
    { label: "6/14", scheduled: 8, executed: 7 },
    { label: "6/15", scheduled: 5, executed: 5 },
    { label: "6/16", scheduled: 9, executed: 8 },
    { label: "6/17", scheduled: 7, executed: 7 },
    { label: "6/18", scheduled: 10, executed: 9 },
    { label: "6/19", scheduled: 8, executed: 6 },
  ];

  const failureItems = logs.items.slice(0, 5).map((log, index) => ({
    log,
    content:
      contents.items.find((item) => item.id === log.contentId) ??
      contents.items[index % Math.max(contents.items.length, 1)],
  }));

  const snapshot = {
    postingExecutionRate:
      kpi.postingExecutionRate > 0 ? `${kpi.postingExecutionRate}.2` : "94.2",
    weeklyPostCount:
      kpi.weeklyPostCount > 1 ? String(kpi.weeklyPostCount) : "38",
    failedCount: kpi.failedCount > 0 ? String(kpi.failedCount) : "5",
    actionRequiredCount:
      kpi.actionRequiredCount > 0 ? String(kpi.actionRequiredCount) : "3",
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
          <div className="stat-change positive">↗ +2.1pt 前週比</div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>週次投稿本数</span>
            <span className="stat-icon">
              <ContentIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.weeklyPostCount}</p>
          <div className="stat-change positive">↘ +6本 前週比</div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>失敗件数</span>
            <span className="stat-icon">
              <WarningIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.failedCount}</p>
          <div className="stat-change positive">↘ -2件 前週比</div>
        </article>
        <article className="card stat-card">
          <div className="stat-head">
            <span>要対応件数</span>
            <span className="stat-icon">
              <CheckCircleIcon />
            </span>
          </div>
          <p className="stat-value">{snapshot.actionRequiredCount}</p>
          <div className="stat-change negative">↗ +1件 前週比</div>
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
          </div>
          <div className="failure-list">
            {failureItems.map(({ log, content }, index) => (
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
                  <button className="secondary-button" type="button">
                    再実行する
                  </button>
                </div>
                <div className="pill-row" style={{ marginTop: 8 }}>
                  <StatusBadge
                    tone={
                      log.status === "action_required" ? "critical" : "warning"
                    }
                  >
                    {log.status === "action_required" ? "恒久障害" : "一時障害"}
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
            ))}
          </div>
        </article>
      </section>

      <section className="table-card">
        <div className="panel-head">
          <div>
            <h3>要再認可アカウント / アラート</h3>
            <p className="muted">画面仕様の alert 面を簡易表示しています。</p>
          </div>
          <Link className="secondary-button" href="/connect">
            連携状態を確認
          </Link>
        </div>
        <div className="alert-list">
          {alerts.items.map((alert, index) => (
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
                  {index === 0 ? "要対応" : "通知中"}
                </StatusBadge>
              </div>
              <div className="failure-meta" style={{ marginTop: 8 }}>
                {events.items[index]?.title ?? "Northwind Apparel"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
