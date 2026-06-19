import { AppShell } from "../../components/app-shell";
import { Hero } from "../../components/hero";
import { CheckCircleIcon, LinkIcon, WarningIcon } from "../../components/icons";
import { StatusBadge } from "../../components/status-badge";
import { api } from "../../lib/api";

export default async function ConnectPage() {
  const integration = await api.getIntegrationStatus();

  return (
    <AppShell currentPath="/connect">
      <Hero
        eyebrow="アカウント連携"
        title="Facebook OAuth と Instagram 連携"
        description="認可、対象アカウント選択、権限確認、再認可導線を一つの操作面に集約しています。"
        actions={
          <>
            <button className="button">Facebookで連携する</button>
            <button className="secondary-button">再認可する</button>
          </>
        }
      />

      <section className="dashboard-grid">
        <article className="surface-panel">
          <h3>接続ステップ</h3>
          <div className="timeline">
            <div className="timeline-item">
              <div className="button-row"><StatusBadge tone="success">1. 認可開始</StatusBadge><span className="muted"><LinkIcon /></span></div>
              <p>Facebook OAuth に遷移し、認可成功時に次のステップへ進みます。</p>
            </div>
            <div className="timeline-item">
              <div className="button-row"><StatusBadge tone="info">2. アカウント選択</StatusBadge><span className="muted"><CheckCircleIcon /></span></div>
              <p>Instagramアカウント: {integration.accountName}</p>
              <p>Facebookページ: {integration.pageName}</p>
              <div className="button-row" style={{ marginTop: 10 }}>
                <button className="ghost-button">このアカウントで接続</button>
              </div>
            </div>
            <div className="timeline-item">
              <div className="button-row"><StatusBadge tone="warning">3. 権限確認</StatusBadge><span className="muted"><WarningIcon /></span></div>
              <p>必要権限: {integration.permissions.join(", ")}</p>
            </div>
          </div>
        </article>

        <aside className="status-panel">
          <h3>連携状態</h3>
          <div className="meta-list" style={{ marginTop: 12 }}>
            <div className="meta-item">
              <div className="failure-item-head">
                <div>
                  <div className="failure-title">接続ステータス</div>
                  <div className="failure-meta">最終検証: {new Date(integration.lastCheckedAt).toLocaleString("ja-JP")}</div>
                </div>
                <StatusBadge tone={integration.status === "active" ? "success" : "warning"}>{integration.status}</StatusBadge>
              </div>
            </div>
            <div className="meta-item">
              <div className="failure-title">Instagram Account</div>
              <div className="failure-meta">{integration.accountId}</div>
            </div>
            <div className="meta-item">
              <div className="failure-title">Facebook Page</div>
              <div className="failure-meta">{integration.facebookPageId}</div>
            </div>
            <div className="meta-item">
              <div className="failure-title">トークン期限</div>
              <div className="failure-meta">{new Date(integration.tokenExpiresAt).toLocaleString("ja-JP")}</div>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}