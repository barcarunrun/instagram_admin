# Local Stack Runbook

TASK-002 で追加したローカル起動基盤の具体的な実行手順です。

## 対象サービス

- frontend: Next.js 管理画面
- backend: Express API
- worker: Node.js worker
- postgres: ローカル PostgreSQL
- redis: ローカル Redis

## 前提条件

- Docker Desktop などで `docker` と `docker compose` が利用できること
- リポジトリのルートは `instagram_development/` であること

動作確認:

```bash
docker --version
docker compose version
```

## 初回セットアップ

`05_source_code` 配下へ移動し、compose 用の環境変数ファイルを作成します。

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
cp infra/.env.example infra/.env
```

必要に応じて `infra/.env` を編集します。

既定値:

```env
POSTGRES_DB=instagram_ops
POSTGRES_USER=instagram
POSTGRES_PASSWORD=instagram
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=4000
FRONTEND_PORT=3100
WORKER_CONCURRENCY=1
JWT_SECRET=local-dev-jwt-secret
ACCESS_TOKEN_EXPIRES_IN=3600
```

## 起動

通常起動:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh up
```

このコマンドは以下をまとめて起動し、healthcheck 完了まで待機します。

- postgres
- redis
- backend
- frontend
- worker

## ログ確認

全体ログ:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh logs
```

特定サービスのログ:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh logs backend
./scripts/local-stack.sh logs frontend
./scripts/local-stack.sh logs worker
```

## 状態確認

compose サービス一覧:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh ps
```

backend ヘルスチェック:

```bash
curl http://localhost:4000/api/health
```

期待値:

```json
{"status":"ok"}
```

Redis 接続確認:

```bash
curl http://localhost:4000/api/local/dependencies/redis
```

期待値:

```json
{"status":"ok","ping":"PONG"}
```

frontend 確認先:

- http://localhost:3100
- http://localhost:3100/login
- http://localhost:3100/dashboard

ローカルログイン:

- メールアドレス: `demo@example.com`
- パスワード: `LocalPass123!`

## 外部依存モック確認

backend には TASK-003 用のローカル mock ルートを含めています。既定では `infra/.env` の mode が `mock` / `log` になっているため、そのまま検証できます。

mock mode の確認:

```bash
curl http://localhost:4000/api/local/mocks/status
```

OAuth 開始相当 URL の取得:

```bash
curl http://localhost:4000/api/local/oauth/start
```

正常系 callback 確認:

```bash
curl "http://localhost:4000/api/local/oauth/callback?code=mock_auth_code&state=mock_state_demo"
```

state 不一致確認:

```bash
curl "http://localhost:4000/api/local/oauth/callback?code=mock_auth_code&state=invalid_state"
```

Instagram 候補アカウント取得:

```bash
curl http://localhost:4000/api/local/instagram/accounts
```

Instagram 権限不足シナリオ取得:

```bash
curl "http://localhost:4000/api/local/instagram/accounts?scenario=permission_denied"
```

投稿成功シナリオ確認:

```bash
curl -X POST http://localhost:4000/api/local/instagram/publish \
	-H 'Content-Type: application/json' \
	-d '{"scenario":"success"}'
```

投稿認証期限切れシナリオ確認:

```bash
curl -X POST http://localhost:4000/api/local/instagram/publish \
	-H 'Content-Type: application/json' \
	-d '{"scenario":"auth_expired"}'
```

通知スタブ確認:

```bash
curl -X POST http://localhost:4000/api/local/notifications/test \
	-H 'Content-Type: application/json' \
	-d '{"eventType":"post_failed","channel":"chat","message":"mock notification"}'
```

通知スタブは backend ログへ構造化出力されます。TASK-057 までは実送信ではなくログ出力による確認を前提とします。

## Migration と Seed

データベース設計書 [03_architecture/database-design.md](03_architecture/database-design.md) をベースに、現行 MVP API の保存項目を補う migration を `infra/migrations/` に配置しています。初期データは `infra/seed.sql` にあります。

初回セットアップ:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-db.sh bootstrap
```

migration のみ適用:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-db.sh migrate
```

seed のみ再投入:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-db.sh seed
```

テーブル一覧確認:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-db.sh tables
```

## 停止

コンテナ停止:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh down
```

ボリュームも含めて完全初期化:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh reset
```

## ポート競合時の対応

既定ポート 3000, 4000, 5432, 6379 が使用中の場合は `infra/.env` を変更します。

例:

```env
FRONTEND_PORT=3100
BACKEND_PORT=4100
POSTGRES_PORT=55432
REDIS_PORT=16379
```

変更後に再起動します。

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh down
./scripts/local-stack.sh up
```

この場合の疎通確認も変更後ポートで行います。

```bash
curl http://localhost:4100/api/health
```

## よく使う確認コマンド

compose 定義の解決結果を確認:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-stack.sh config
```

各サービスの型検証:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code/backend && npm run typecheck
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code/frontend && npm run typecheck
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code/worker && npm run typecheck
```

## 注意事項

- backend は PostgreSQL を参照する実装へ切り替わっています。起動前に `./scripts/local-db.sh bootstrap` で migration と seed を投入してください。
- frontend はブラウザ向けに `NEXT_PUBLIC_API_BASE_URL`、SSR 向けに `SERVER_API_BASE_URL` を使い分けます。
- worker は現時点では Redis ping を含む起動確認用の最小実装です。
- OAuth / Instagram / Notification の mock はローカル検証専用です。実連携実装時は対応タスクで real 実装へ差し替えてください。
- TASK-004 の認証は JWT ベースです。local stack では backend に `JWT_SECRET` を注入し、frontend は login 後の cookie で保護 API を呼び出します。