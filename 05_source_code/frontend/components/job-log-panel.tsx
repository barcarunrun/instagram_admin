"use client";

import { useState, useTransition } from "react";
import { api } from "../lib/api";
import type { JobLog } from "../lib/types";
import { StatusBadge } from "./status-badge";

export function JobLogPanel({ initialLogs }: { initialLogs: JobLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function retryJob(jobId: string) {
    startTransition(async () => {
      try {
        const updated = await api.retryJob(jobId);
        setLogs((current) => current.map((log) => (log.id === jobId ? updated : log)));
        setMessage("再実行を受け付けました。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "再実行に失敗しました。");
      }
    });
  }

  return (
    <section className="table-card">
      <div className="panel-head">
        <div>
          <h3>投稿実行ログ</h3>
          <p className="muted">成功、失敗、再試行履歴とエラー詳細を確認できます。</p>
        </div>
        {message ? <p className={message.includes("失敗") ? "error-text" : "success-text"}>{message}</p> : null}
      </div>
      <div className="log-list">
        {logs.map((log) => (
          <article key={log.id} className="log-item">
            <div className="log-item-head">
              <div>
                <StatusBadge tone={log.status === "action_required" ? "critical" : log.status === "retrying" ? "warning" : "info"}>{log.status}</StatusBadge>
                <p style={{ marginTop: 8 }}>{log.errorMessage ?? "投稿が完了しました。"}</p>
                <p className="muted" style={{ marginTop: 6 }}>{new Date(log.executedAt).toLocaleString("ja-JP")} / retry: {log.retryCount}</p>
              </div>
              <button className="ghost-button" onClick={() => retryJob(log.id)} disabled={isPending}>再実行する</button>
            </div>
            <p style={{ marginTop: 10 }}>{log.resolution ?? "詳細はありません。"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}