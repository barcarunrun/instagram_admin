"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import type {
  InstagramIntegration,
  InstagramIntegrationCandidate,
  InstagramOAuthSession,
} from "../lib/types";
import { Hero } from "./hero";
import { CheckCircleIcon, LinkIcon, WarningIcon } from "./icons";
import { StatusBadge } from "./status-badge";

function getStatusTone(status: InstagramIntegration["status"] | undefined) {
  if (status === "active") {
    return "success" as const;
  }

  if (status === "expired" || status === "reauthorization_required") {
    return "warning" as const;
  }

  if (status === "error") {
    return "error" as const;
  }

  return "info" as const;
}

function toCandidate(
  integration: InstagramIntegration | null,
): InstagramIntegrationCandidate | null {
  if (!integration) {
    return null;
  }

  return {
    accountId: integration.accountId,
    facebookPageId: integration.facebookPageId,
    accountName: integration.accountName,
    pageName: integration.pageName,
    permissions: integration.permissions,
    status: integration.status,
  };
}

export function ConnectWorkflow({
  initialIntegration,
  initialOauthSessionId,
  initialOauthError,
}: {
  initialIntegration: InstagramIntegration | null;
  initialOauthSessionId?: string;
  initialOauthError?: string;
}) {
  const router = useRouter();
  const [integration, setIntegration] = useState<InstagramIntegration | null>(
    initialIntegration,
  );
  const [oauthSession, setOauthSession] =
    useState<InstagramOAuthSession | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [message, setMessage] = useState(initialOauthError ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialOauthSessionId) {
      return;
    }

    let active = true;

    void api
      .getInstagramOAuthSession(initialOauthSessionId)
      .then((session) => {
        if (!active) {
          return;
        }

        setOauthSession(session);
        setSelectedAccountId(session.accounts[0]?.accountId ?? "");
        setMessage(
          session.intent === "reauthorize"
            ? "再認可が完了しました。接続対象を確認して保存してください。"
            : "認可が完了しました。接続するアカウントを選択してください。",
        );
      })
      .catch((error) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "OAuth セッションの取得に失敗しました。",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [initialOauthSessionId]);

  const selectedCandidate =
    oauthSession?.accounts.find(
      (account) => account.accountId === selectedAccountId,
    ) ??
    oauthSession?.accounts[0] ??
    toCandidate(integration);

  function startOAuth(intent: "connect" | "reauthorize") {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await api.startInstagramOAuth({ intent });
        window.location.assign(result.authorizeUrl);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "OAuth 開始に失敗しました。",
        );
      }
    });
  }

  function bootstrapExistingToken() {
    setMessage("");

    startTransition(async () => {
      try {
        const session = await api.bootstrapInstagramWithExistingToken();
        setOauthSession(session);
        setSelectedAccountId(session.accounts[0]?.accountId ?? "");
        setMessage(
          "既存トークンから接続候補を読み込みました。アカウントを選んで保存してください。",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "既存トークンの読み込みに失敗しました。",
        );
      }
    });
  }

  function connectSelectedAccount() {
    if (!oauthSession || !selectedCandidate) {
      setMessage("先に OAuth 認可を完了してください。");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const nextIntegration = await api.connectInstagram({
          oauthSessionId: oauthSession.oauthSessionId,
          accountId: selectedCandidate.accountId,
        });
        setIntegration(nextIntegration);
        setOauthSession(null);
        setSelectedAccountId(nextIntegration.accountId);
        setMessage("Instagram アカウントを接続しました。");
        router.replace("/connect");
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "アカウント接続に失敗しました。",
        );
      }
    });
  }

  return (
    <>
      <Hero
        eyebrow="アカウント連携"
        title="Facebook OAuth と Instagram 連携"
        description="認可、対象アカウント選択、権限確認、再認可導線を一つの操作面に集約しています。"
        actions={
          <>
            <button
              className="button"
              onClick={() => startOAuth("connect")}
              disabled={isPending}
            >
              Facebookで連携する
            </button>
            <button
              className="secondary-button"
              onClick={() => startOAuth("reauthorize")}
              disabled={isPending}
            >
              再認可する
            </button>
            <button
              className="ghost-button"
              onClick={bootstrapExistingToken}
              disabled={isPending}
            >
              既存トークンを読み込む
            </button>
          </>
        }
      />

      <section className="dashboard-grid">
        <article className="surface-panel">
          <h3>接続ステップ</h3>
          <div className="timeline">
            <div className="timeline-item">
              <div className="button-row">
                <StatusBadge tone={oauthSession ? "success" : "info"}>
                  1. 認可開始
                </StatusBadge>
                <span className="muted">
                  <LinkIcon />
                </span>
              </div>
              <p>
                Facebook OAuth に遷移し、認可成功時に次のステップへ進みます。
              </p>
            </div>
            <div className="timeline-item">
              <div className="button-row">
                <StatusBadge tone={selectedCandidate ? "success" : "info"}>
                  2. アカウント選択
                </StatusBadge>
                <span className="muted">
                  <CheckCircleIcon />
                </span>
              </div>
              {oauthSession ? (
                <label className="login-field" style={{ marginTop: 12 }}>
                  <span>接続対象アカウント</span>
                  <select
                    className="input"
                    value={selectedAccountId}
                    onChange={(event) =>
                      setSelectedAccountId(event.target.value)
                    }
                  >
                    {oauthSession.accounts.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.accountName} / {account.pageName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p>
                Instagramアカウント:{" "}
                {selectedCandidate?.accountName ?? "未選択"}
              </p>
              <p>Facebookページ: {selectedCandidate?.pageName ?? "未選択"}</p>
              <div className="button-row" style={{ marginTop: 10 }}>
                <button
                  className="ghost-button"
                  onClick={connectSelectedAccount}
                  disabled={isPending || !oauthSession || !selectedCandidate}
                >
                  このアカウントで接続
                </button>
              </div>
            </div>
            <div className="timeline-item">
              <div className="button-row">
                <StatusBadge tone={getStatusTone(selectedCandidate?.status)}>
                  3. 権限確認
                </StatusBadge>
                <span className="muted">
                  <WarningIcon />
                </span>
              </div>
              <p>
                必要権限:{" "}
                {(selectedCandidate?.permissions ?? []).join(", ") || "未取得"}
              </p>
            </div>
          </div>
          {message ? (
            <p
              className={
                message.includes("失敗") || message.includes("必要")
                  ? "error-text"
                  : "helper"
              }
              style={{ marginTop: 16 }}
            >
              {message}
            </p>
          ) : null}
        </article>

        <aside className="status-panel">
          <h3>連携状態</h3>
          <div className="meta-list" style={{ marginTop: 12 }}>
            <div className="meta-item">
              <div className="failure-item-head">
                <div>
                  <div className="failure-title">接続ステータス</div>
                  <div className="failure-meta">
                    最終検証:{" "}
                    {integration?.lastCheckedAt
                      ? new Date(integration.lastCheckedAt).toLocaleString(
                          "ja-JP",
                        )
                      : "未連携"}
                  </div>
                </div>
                <StatusBadge tone={getStatusTone(integration?.status)}>
                  {integration?.status ?? "not_connected"}
                </StatusBadge>
              </div>
            </div>
            <div className="meta-item">
              <div className="failure-title">Instagram Account</div>
              <div className="failure-meta">
                {integration?.accountId ?? "未連携"}
              </div>
            </div>
            <div className="meta-item">
              <div className="failure-title">Facebook Page</div>
              <div className="failure-meta">
                {integration?.facebookPageId ?? "未連携"}
              </div>
            </div>
            <div className="meta-item">
              <div className="failure-title">トークン期限</div>
              <div className="failure-meta">
                {integration?.tokenExpiresAt
                  ? new Date(integration.tokenExpiresAt).toLocaleString("ja-JP")
                  : "未連携"}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
