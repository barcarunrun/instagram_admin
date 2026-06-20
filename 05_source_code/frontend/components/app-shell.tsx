import Link from "next/link";
import { ReactNode } from "react";
import { serverApi } from "../lib/server-api";
import {
  CalendarIcon,
  ContentIcon,
  DashboardIcon,
  LinkIcon,
  LogsIcon,
  MediaIcon,
} from "./icons";
import { TopbarAction } from "./topbar-action";

const navigation = [
  { href: "/dashboard", label: "ダッシュボード", icon: <DashboardIcon /> },
  { href: "/calendar", label: "カレンダー", icon: <CalendarIcon /> },
  { href: "/contents", label: "コンテンツ", icon: <ContentIcon /> },
  { href: "/media", label: "メディア", icon: <MediaIcon /> },
  { href: "/connect", label: "連携", icon: <LinkIcon /> },
  { href: "/logs", label: "実行ログ", icon: <LogsIcon /> },
];

function formatRole(role: string): string {
  if (role === "platform_operator") {
    return "運用マネージャー";
  }

  return role;
}

export async function AppShell({
  children,
  currentPath,
}: {
  children: ReactNode;
  currentPath: string;
}) {
  const { user } = await serverApi.getCurrentUser();

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
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${currentPath === item.href ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-spacer" />
          <div className="sidebar-user">
            <div className="user-avatar">{user.name.slice(0, 2)}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{formatRole(user.role)}</div>
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
