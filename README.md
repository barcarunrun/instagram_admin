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

## Current Local MVP

05_source_code 配下に、ローカル確認用の初期 MVP を追加済みです。

- frontend: Next.js + TypeScript による管理画面
- backend: Node.js + Express + TypeScript による Application API

### Implemented Scope

- Instagram連携状態表示画面
- ダッシュボード画面
- コンテンツ一覧 / 編集 / 予約の統合画面
- 投稿実行ログ画面
- 主要 API: 連携状態、コンテンツ CRUD、バリデーション、予約、KPI、アラート、ジョブログ

### Local Run

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

既定ポートは frontend が 3000、backend が 4000 です。
