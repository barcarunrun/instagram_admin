# Worker

Instagram 投稿ジョブの実行を担う worker です。

## Scope

- Scheduler から渡されたジョブを受け取る
- backend の internal job API から投稿 payload を取得する
- mock または Instagram Graph API へ投稿し、結果を backend へ返す

## Commands

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run build`

## Local Compose

`05_source_code` 配下で `./scripts/local-stack.sh up` を実行すると、backend / frontend / PostgreSQL / Redis と合わせて起動できます。

`.env` では以下を指定できます。

```env
WORKER_CONCURRENCY=1
API_BASE_URL=http://localhost:4000/api
DATABASE_URL=postgresql://instagram:instagram@localhost:5432/instagram_ops
REDIS_URL=redis://localhost:6379
INSTAGRAM_API_MODE=mock
NOTIFICATION_MODE=log
FACEBOOK_GRAPH_API_BASE_URL=https://graph.facebook.com/v23.0
INSTAGRAM_GRAPH_POLL_INTERVAL_MS=5000
INSTAGRAM_GRAPH_POLL_ATTEMPTS=24
```

起動時には Redis へ ping を行い、local stack 上で最低限の接続確認を実施します。

## Real 投稿の前提

- `INSTAGRAM_API_MODE=real` を backend と worker の両方で設定する
- backend 側で `IG_ACCESS_TOKEN` と `IG_USER_ID` を設定し、`POST /api/integrations/instagram/bootstrap-existing-token` で連携候補を作成後、`POST /api/integrations/instagram/connect` で active な integration を保存する
- worker が受け取るメディア URL は backend の `PUBLIC_API_BASE_URL` を使って absolute URL 化されるため、Instagram Graph API から到達可能な `https` 公開 URL を設定する
- 動画 / リール / カルーセル動画は Graph API 上の非同期処理完了待ちを行うため、`INSTAGRAM_GRAPH_POLL_INTERVAL_MS` と `INSTAGRAM_GRAPH_POLL_ATTEMPTS` で待機設定を調整できる
