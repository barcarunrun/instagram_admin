import Link from "next/link";
import { ReactNode } from "react";
import { ContentIcon, DashboardIcon, LinkIcon, LogsIcon } from "./icons";
import { TopbarAction } from "./topbar-action";

const navigation = [
  { href: "/dashboard", label: "ダッシュボード", icon: <DashboardIcon /> },
  { href: "/contents", label: "コンテンツ", icon: <ContentIcon /> },
  { href: "/connect", label: "連携", icon: <LinkIcon /> },
  { href: "/logs", label: "実行ログ", icon: <LogsIcon /> },
];

export function AppShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  return (
    <div className="shell">
      <div className="shell-grid">
        <aside className="sidebar" aria-label="メインナビゲーション">
          <div className="sidebar-head">
            <div className="brand-mark">~</div>
            <div className="brand-name">Reelflow</div>
          </div>
          <div className="sidebar-section">運用</div>
          <nav className="nav-list">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-item ${currentPath === item.href ? "active" : ""}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-spacer" />
          <div className="sidebar-user">
            <div className="user-avatar">佐藤</div>
            <div>
              <div className="user-name">佐藤 美咲</div>
              <div className="user-role">運用マネージャー</div>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="topbar-title">Instagram運用管理</div>
            <TopbarAction />
          </header>
          <div className="page">{children}</div>
        </main>
      </div>
    </div>
  );
}