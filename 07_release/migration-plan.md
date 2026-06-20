# マイグレーション計画

## 対象範囲

現時点ではローカル MVP 向けの PostgreSQL 初期化と拡張 migration を管理する。

対象ファイル:

- `05_source_code/infra/migrations/0001_initial_schema.sql`
- `05_source_code/infra/migrations/0002_local_mvp_extensions.sql`
- `05_source_code/infra/seed.sql`
- `05_source_code/scripts/local-db.sh`

## 現行 migration 構成

### 0001_initial_schema.sql

データベース設計書に記載の基本テーブルとインデックスを作成する。

- users
- instagram_accounts
- contents
- media_assets
- content_media_assets
- schedules
- posting_jobs
- publish_results
- audit_logs

### 0002_local_mvp_extensions.sql

現行ローカル MVP API を PostgreSQL へ接続するための補助項目を追加する。

- instagram_accounts: account_name, page_name, permissions, last_checked_at
- media_assets: file_name, url
- contents: labels, approval_status, created_by, updated_by
- posting_jobs: error_message, resolution, executed_at
- content_versions テーブル追加

### seed.sql

ローカル確認用の初期データを投入する。

- demo user 1件
- instagram account 1件
- media assets 3件
- content 1件
- schedule 1件
- posting jobs 2件
- audit log 1件

## 実行手順

作業ディレクトリ:

```bash
cd /Users/eiichisugiyama/Desktop/job/instagram_development/05_source_code
```

初回セットアップ:

```bash
./scripts/local-db.sh bootstrap
```

migration のみ再実行:

```bash
./scripts/local-db.sh migrate
```

seed のみ再投入:

```bash
./scripts/local-db.sh seed
```

テーブル一覧確認:

```bash
./scripts/local-db.sh tables
```

## ロールバック方針

現時点ではローカル MVP を前提とし、down migration は未整備とする。

ロールバックが必要な場合の基本手順:

1. Docker volume を破棄して DB を再生成する
2. `./scripts/local-stack.sh reset` を実行する
3. `./scripts/local-stack.sh up` を再実行する
4. `./scripts/local-db.sh bootstrap` を再実行する

## リスク分析

- ダウンタイム: ローカル用途のため限定的
- データ損失リスク: `seed.sql` 再投入時は既存データを truncate するため高い
- パフォーマンス影響: 現状は軽微

## 実行前の確認

- [ ] PostgreSQL コンテナが起動している
- [ ] `infra/.env` の接続ポートを確認した
- [ ] 必要なら既存データを退避した
- [ ] `seed.sql` 実行でローカルデータが初期化されることを理解している
