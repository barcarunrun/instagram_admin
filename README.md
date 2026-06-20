# Instagram Development

## Project Overview

Instagramの開発プロジェクトです。

## Repository Structure

このリポジトリはAI-Nativeなシステム開発リポジトリモデルを採用しています。

```
instagram_development/
  README.md
  00_business/              # ビジネスゴール、ユーザー、KPI
  01_requirements/          # 要件、ユーザーストーリー、受入基準
  02_design/                # UI/UX設計、ユーザーフロー
  03_architecture/          # システム設計、API設計、DB設計
  04_tasks/                 # タスク管理、実装順序
  05_source_code/           # ソースコード、フロントエンド、バックエンド
  06_tests/                 # テスト計画、テストケース
  07_release/               # リリース手続き、デプロイ計画
  08_operation/             # 運用手順、監視、インシデント対応
  09_ai_prompts/            # AI活用のプロンプト集
  10_decisions/             # アーキテクチャ決定記録 (ADR)
```

## Important Rules

- コード変更時は、関連するドキュメントも更新すること
- 重要な要件には対応するテストケースを用意すること
- 大きなコード変更は関連する要件・アーキテクチャ・テストの更新なしに行わないこと

## Copilot Guidance

GitHub Copilot 向けの共通指示は .github/copilot-instructions.md に定義しています。
詳細な依頼テンプレートは 09_ai_prompts/ 配下を参照してください。

## Current Local MVP

05_source_code 配下に、ローカル確認用の初期 MVP を追加済みです。

- frontend: Next.js + TypeScript による管理画面
- backend: Node.js + Express + TypeScript による Application API
- worker: Node.js + TypeScript による投稿ジョブ実行ワーカーの雛形

## Service Responsibilities

- frontend: 管理画面表示、フォーム入力、一時的なクライアント状態管理
- backend: 認証連携、コンテンツ管理、予約管理、ジョブログ取得、ダッシュボード集計 API
- worker: 将来的な投稿ジョブ実行、再試行、外部 API 呼び出しの実装先

### Implemented Scope

- Instagram連携状態表示画面
- ダッシュボード画面
- コンテンツ一覧 / 編集 / 予約の統合画面
- 投稿実行ログ画面
- 主要 API: 連携状態、コンテンツ CRUD、バリデーション、予約、KPI、アラート、ジョブログ

### Local Run

統合起動を使う場合:

1. `cd 05_source_code`
2. `cp infra/.env.example infra/.env`
3. `./scripts/local-stack.sh up`
4. `./scripts/local-stack.sh logs`
5. `./scripts/local-db.sh bootstrap`

詳細な実行手順は [05_source_code/infra/README.md](05_source_code/infra/README.md) を参照してください。

既定ポートが使用中の場合は、`infra/.env` の `FRONTEND_PORT`、`BACKEND_PORT`、`POSTGRES_PORT`、`REDIS_PORT` を変更します。

停止とリセット:

- `./scripts/local-stack.sh down`
- `./scripts/local-stack.sh reset`

単体起動を使う場合:

1. backend
  - `cd 05_source_code/backend`
  - `.env.example` を `.env` として利用
  - `npm install`
  - `npm run dev`
2. frontend
  - `cd 05_source_code/frontend`
  - `.env.local.example` を `.env.local` として利用
  - `npm install`
  - `npm run dev`
3. worker
  - `cd 05_source_code/worker`
  - `.env.example` を `.env` として利用
  - `npm install`
  - `npm run dev`

compose 起動時の既定ポートは frontend が 3000、backend が 4000、PostgreSQL が 5432、Redis が 6379 です。

### Quality Commands

各サービス配下で以下を実行できます。

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`

既定ポートは frontend が 3000、backend が 4000 です。

## TASK-001 Scope Notes

- TASK-001 では frontend / backend / worker の雛形、Lint、Formatter、typecheck、環境変数テンプレート、最小 CI を整備する。
- PostgreSQL、Redis、統合起動スクリプト、docker-compose は TASK-002 以降で整備する。
