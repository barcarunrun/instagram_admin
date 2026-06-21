# Backend

Instagram運用管理MVPのバックエンドです。Express と TypeScript で構成されたローカル API で、フロントエンド管理画面向けに連携状態、コンテンツ管理、予約、KPI、実行ログを提供します。

## 技術スタック

- Node.js
- Express 4
- TypeScript
- Zod

## 前提条件

- Node.js が利用できること
- frontend からアクセスする場合、既定では `http://localhost:3000` からの接続を許可します

## セットアップ

```bash
cd 05_source_code/backend
npm install
cp .env.example .env
```

Docker Compose でまとめて起動する場合は、`05_source_code` 配下で `./scripts/local-stack.sh up` を使います。

`.env` の既定値:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://instagram:instagram@localhost:5432/instagram_ops
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-jwt-secret
ACCESS_TOKEN_EXPIRES_IN=3600
INSTAGRAM_API_MODE=mock
OAUTH_MODE=mock
NOTIFICATION_MODE=log
PUBLIC_API_BASE_URL=
MEDIA_STORAGE_MODE=local
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=
MOCK_OAUTH_CALLBACK_URL=http://localhost:4000/api/local/oauth/callback
MOCK_OAUTH_EXPECTED_STATE=mock_state_demo
```

## 実行コマンド

```bash
npm run dev
```

起動後の既定エンドポイント:

- `http://localhost:4000/api/health`

その他のコマンド:

```bash
npm run build
npm run start
npm run typecheck
```

## API概要

ベースパスは `/api` です。

- `GET /health`: ヘルスチェック
- `POST /auth/login`: ローカルログイン
- `GET /auth/me`: 現在ユーザー取得
- `POST /auth/logout`: ログアウト監査イベント記録
- `GET /integrations/instagram/status`: Instagram連携状態の取得
- `POST /integrations/instagram/bootstrap-existing-token`: 既存 `IG_ACCESS_TOKEN` / `IG_USER_ID` から接続候補を生成
- `GET /media-assets`: メディアアセット一覧の取得
- `GET /contents`: コンテンツ一覧の取得
- `POST /contents`: コンテンツ作成
- `PUT /contents/:id`: コンテンツ更新
- `POST /contents/:id/duplicate`: コンテンツ複製
- `POST /contents/:id/validate`: コンテンツバリデーション
- `POST /schedules/validate`: 予約可否チェック
- `POST /schedules`: 予約作成
- `GET /calendar/events`: カレンダーイベント取得
- `GET /dashboard/kpi`: ダッシュボードKPI取得
- `GET /dashboard/alerts`: ダッシュボードアラート取得
- `GET /jobs/logs`: 投稿ジョブログ取得
- `POST /jobs/:jobId/retry`: ジョブ再実行
- `GET /audit-logs`: 監査ログ取得

ローカル外部依存モック:

- `GET /local/mocks/status`: mock mode と callback URL の確認
- `GET /local/dependencies/redis`: Redis 接続確認
- `GET /local/oauth/start`: 認可開始相当の mock URL 生成
- `GET /local/oauth/callback`: state / code 検証付き callback mock
- `GET /local/instagram/accounts`: Instagram 候補アカウント mock
- `POST /local/instagram/publish`: 投稿成功 / 認証切れ / 権限不足 mock
- `POST /local/notifications/test`: 通知スタブをログ出力

## ローカル認証

- 初期ユーザー: `demo@example.com`
- 初期パスワード: `LocalPass123!`
- 保護 API は Authorization Bearer または `auth_token` cookie のどちらでも認証できます。
- login API は JWT を返し、frontend は cookie に保存して管理画面から保護 API を呼び出します。

## 実装の前提

- データストアは PostgreSQL を参照する `src/domain/postgres-store.ts` です。
- `DATABASE_URL` は backend 起動前に到達可能な PostgreSQL を指している必要があります。
- 初期 migration と seed は `05_source_code` 配下で `./scripts/local-db.sh bootstrap` を実行して投入します。
- 入力バリデーションは Zod で実施します。
- エラー応答は `error.code`、`error.message`、`error.details`、`error.requestId` を含む JSON 形式です。
- real 投稿では `PUBLIC_API_BASE_URL` に Instagram Graph API から到達可能な `https` 公開 URL を設定する必要があります。
- `MEDIA_STORAGE_MODE=azure_blob` を設定すると、アップロード済みメディアを Azure Blob Storage に保存し、`media_assets.url` へ blob の `https` URL を保存します。

## Real Instagram 投稿

1. `.env` で `INSTAGRAM_API_MODE=real` を設定する
2. `IG_ACCESS_TOKEN` と `IG_USER_ID` を設定する
3. `PUBLIC_API_BASE_URL` に backend の公開 URL を設定する
4. Azure Blob Storage を使う場合は `MEDIA_STORAGE_MODE=azure_blob`、`AZURE_STORAGE_CONNECTION_STRING`、`AZURE_STORAGE_CONTAINER_NAME` を設定する
5. `POST /api/integrations/instagram/bootstrap-existing-token` を呼び出す
6. 返ってきた `oauthSessionId` と対象 `accountId` で `POST /api/integrations/instagram/connect` を呼び、active な integration を保存する
7. メディアが `https` で取得できることを確認したうえで、予約投稿を実行する

## ディレクトリ構成

```text
backend/
  src/
    index.ts              # Express 起動エントリポイント
    routes/
      index.ts            # API ルーティング
    domain/
      postgres-store.ts   # PostgreSQL データストア
      content-rules.ts    # コンテンツバリデーションルール
      types.ts            # ドメイン型定義
    lib/
      db.ts               # PostgreSQL 接続
      errors.ts           # エラーレスポンス整形
      id.ts               # ID生成
      time.ts             # 日時ユーティリティ
  .env.example
  package.json
  tsconfig.json
```

## フロントエンド連携

- frontend の既定接続先は `http://localhost:4000/api` です。
- CORS は `CORS_ORIGIN` をカンマ区切りで指定できます。

## Migration / Seed

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
./scripts/local-db.sh bootstrap
```

## 関連

- frontend: `../frontend`
- リポジトリ全体の概要: `../../README.md`
