# Worker

Instagram 投稿ジョブの実行を担う worker の雛形です。

## Scope

- Scheduler から渡されたジョブを受け取る
- 将来的な Instagram Graph API 投稿処理の実装先とする
- TASK-001 時点では、開発基盤として最小の起動・型検証のみを提供する

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
```

起動時には Redis へ ping を行い、local stack 上で最低限の接続確認を実施します。
