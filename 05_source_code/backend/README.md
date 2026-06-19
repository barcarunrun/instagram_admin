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

`.env` の既定値:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
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
- `GET /integrations/instagram/status`: Instagram連携状態の取得
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

## 実装の前提

- データストアは `src/domain/store.ts` のインメモリ実装です。
- サーバー再起動で作成・更新したデータは初期状態に戻ります。
- 入力バリデーションは Zod で実施します。
- エラー応答は `error.code`、`error.message`、`error.details`、`error.requestId` を含む JSON 形式です。

## ディレクトリ構成

```text
backend/
  src/
    index.ts              # Express 起動エントリポイント
    routes/
      index.ts            # API ルーティング
    domain/
      store.ts            # インメモリデータストア
      content-rules.ts    # コンテンツバリデーションルール
      types.ts            # ドメイン型定義
    lib/
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

## 関連

- frontend: `../frontend`
- リポジトリ全体の概要: `../../README.md`