# Frontend

Instagram運用管理MVPのフロントエンドです。Next.js App Router を使った管理画面で、ダッシュボード、コンテンツ管理、Instagram連携、実行ログを提供します。

## 技術スタック

- Next.js 15.1.3
- React 19
- TypeScript

## 前提条件

- Node.js が利用できること
- backend が起動していること
  - 既定のAPI URLは `http://localhost:4000/api`

## セットアップ

```bash
cd 05_source_code/frontend
npm install
cp .env.local.example .env.local
```

`.env.local` では API の接続先を指定できます。

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## 実行コマンド

```bash
npm run dev
```

開発サーバー起動後、以下にアクセスします。

- `http://localhost:3000`
- `http://localhost:3000/dashboard`

その他のコマンド:

```bash
npm run build
npm run start
npm run typecheck
```

## 画面一覧

- `/dashboard`: 投稿実行率、週次投稿本数、失敗ジョブ、アラートの確認
- `/contents`: コンテンツ一覧、作成、編集、複製、バリデーション、予約
- `/connect`: Facebook OAuth / Instagram 連携状態の確認
- `/logs`: 投稿ジョブの成功・失敗・再試行履歴の確認

`/` へアクセスすると `/dashboard` にリダイレクトされます。

## ディレクトリ構成

```text
frontend/
  app/
    layout.tsx         # ルートレイアウト
    page.tsx           # / から /dashboard へのリダイレクト
    dashboard/         # ダッシュボード画面
    contents/          # コンテンツ管理画面
    connect/           # 連携画面
    logs/              # 実行ログ画面
  components/          # UIコンポーネント群
  lib/
    api.ts             # backend API クライアント
    types.ts           # フロントエンド用型定義
  .env.local.example   # 環境変数サンプル
  package.json
  tsconfig.json
```

## 実装メモ

- API呼び出しは `lib/api.ts` に集約されています。
- `fetch` は `cache: "no-store"` で実行され、管理画面で常に最新状態を取得します。
- 各ページは App Router のサーバーコンポーネントとして API を取得して描画します。

## 関連

- backend: `../backend`
- リポジトリ全体の概要: `../../README.md`