# データベース設計

## ER図

```
users 1---* instagram_accounts
users 1---* contents
contents 1---* content_media_assets
media_assets 1---* content_media_assets
contents 1---* schedules
schedules 1---* posting_jobs
posting_jobs 1---* publish_results
users 1---* audit_logs
```

## テーブル定義

### テーブル 1: users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### テーブル 2: instagram_accounts

```sql
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id VARCHAR(255) NOT NULL UNIQUE,
  facebook_page_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### テーブル 3: contents

```sql
CREATE TABLE contents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  caption TEXT NOT NULL,
  hashtags JSONB,
  validation_summary JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### テーブル 4: media_assets

```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  media_type VARCHAR(50) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  width INT,
  height INT,
  duration_seconds INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### テーブル 5: content_media_assets

```sql
CREATE TABLE content_media_assets (
  content_id UUID NOT NULL,
  media_asset_id UUID NOT NULL,
  display_order INT NOT NULL,
  PRIMARY KEY (content_id, media_asset_id),
  FOREIGN KEY (content_id) REFERENCES contents(id),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id)
);
```

### テーブル 6: schedules

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  instagram_account_id UUID NOT NULL,
  publish_at TIMESTAMP NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES contents(id),
  FOREIGN KEY (instagram_account_id) REFERENCES instagram_accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### テーブル 7: posting_jobs

```sql
CREATE TABLE posting_jobs (
  id UUID PRIMARY KEY,
  schedule_id UUID NOT NULL,
  job_status VARCHAR(50) NOT NULL,
  error_type VARCHAR(50),
  error_code VARCHAR(100),
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP,
  locked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);
```

### テーブル 8: publish_results

```sql
CREATE TABLE publish_results (
  id UUID PRIMARY KEY,
  posting_job_id UUID NOT NULL,
  external_publish_id VARCHAR(255),
  response_payload JSONB,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posting_job_id) REFERENCES posting_jobs(id)
);
```

### テーブル 9: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
```

## インデックス設計

- contents(status, content_type, updated_at)
- schedules(publish_at, status)
- posting_jobs(job_status, next_retry_at)
- audit_logs(resource_type, resource_id, created_at)
- instagram_accounts(status, token_expires_at)

## ローカルMVP実装差分

現行のローカルMVP API を PostgreSQL へ接続するため、実装上は以下の補助項目を追加で保持する。

- instagram_accounts: account_name, page_name, permissions, last_checked_at
- media_assets: file_name, url
- contents: labels, approval_status, created_by, updated_by
- posting_jobs: error_message, resolution, executed_at
- content_versions テーブル: UI のバージョン履歴表示用

これらは [05_source_code/infra/migrations/0002_local_mvp_extensions.sql](05_source_code/infra/migrations/0002_local_mvp_extensions.sql) で migration 管理する。

## バックアップ戦略

- PostgreSQLは日次フルバックアップ + 5分粒度のポイントインタイムリカバリを前提とする。
- バックアップ保持期間は35日とする。
- 復旧演習を四半期ごとに実施する。
