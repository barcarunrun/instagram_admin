ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS content_config JSONB NOT NULL DEFAULT '{}'::jsonb;