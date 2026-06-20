CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_accounts (
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

CREATE TABLE IF NOT EXISTS contents (
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

CREATE TABLE IF NOT EXISTS media_assets (
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

CREATE TABLE IF NOT EXISTS content_media_assets (
  content_id UUID NOT NULL,
  media_asset_id UUID NOT NULL,
  display_order INT NOT NULL,
  PRIMARY KEY (content_id, media_asset_id),
  FOREIGN KEY (content_id) REFERENCES contents(id),
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id)
);

CREATE TABLE IF NOT EXISTS schedules (
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

CREATE TABLE IF NOT EXISTS posting_jobs (
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

CREATE TABLE IF NOT EXISTS publish_results (
  id UUID PRIMARY KEY,
  posting_job_id UUID NOT NULL,
  external_publish_id VARCHAR(255),
  response_payload JSONB,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posting_job_id) REFERENCES posting_jobs(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_contents_status_content_type_updated_at
  ON contents(status, content_type, updated_at);

CREATE INDEX IF NOT EXISTS idx_schedules_publish_at_status
  ON schedules(publish_at, status);

CREATE INDEX IF NOT EXISTS idx_posting_jobs_job_status_next_retry_at
  ON posting_jobs(job_status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_resource_id_created_at
  ON audit_logs(resource_type, resource_id, created_at);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_status_token_expires_at
  ON instagram_accounts(status, token_expires_at);