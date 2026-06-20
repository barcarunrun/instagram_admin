TRUNCATE TABLE
  publish_results,
  posting_jobs,
  schedules,
  content_versions,
  content_media_assets,
  audit_logs,
  contents,
  media_assets,
  instagram_accounts,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'demo@example.com',
  'user_demo',
  'platform_operator',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO instagram_accounts (
  id,
  user_id,
  instagram_account_id,
  facebook_page_id,
  status,
  access_token_encrypted,
  token_expires_at,
  created_at,
  updated_at,
  account_name,
  page_name,
  permissions,
  last_checked_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'ig_12345',
  'fb_45678',
  'active',
  'local-dev-token',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'Northwind Apparel',
  'Northwind Official',
  '["content_publish", "pages_show_list"]'::jsonb,
  CURRENT_TIMESTAMP
);

INSERT INTO media_assets (
  id,
  storage_key,
  media_type,
  mime_type,
  file_size,
  width,
  height,
  duration_seconds,
  created_at,
  file_name,
  url
) VALUES
(
  '33333333-3333-3333-3333-333333333331',
  'media/summer-shirt-1.jpg',
  'image',
  'image/jpeg',
  512000,
  1080,
  1350,
  NULL,
  CURRENT_TIMESTAMP,
  'summer-shirt-1.jpg',
  'https://placehold.co/1080x1350'
),
(
  '33333333-3333-3333-3333-333333333332',
  'media/summer-shirt-2.jpg',
  'image',
  'image/jpeg',
  624000,
  1080,
  1350,
  NULL,
  CURRENT_TIMESTAMP,
  'summer-shirt-2.jpg',
  'https://placehold.co/1080x1350'
),
(
  '33333333-3333-3333-3333-333333333333',
  'media/reel-teaser.mp4',
  'video',
  'video/mp4',
  10240000,
  1080,
  1920,
  22,
  CURRENT_TIMESTAMP,
  'reel-teaser.mp4',
  'https://example.com/reel-teaser.mp4'
);

INSERT INTO contents (
  id,
  user_id,
  title,
  content_type,
  status,
  caption,
  hashtags,
  validation_summary,
  created_at,
  updated_at,
  labels,
  approval_status,
  created_by,
  updated_by
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '新作シャツ_初夏コーデ_2026W25',
  'carousel',
  'scheduled',
  '新作シャツの着回し提案です',
  '["#メンズファッション", "#新作"]'::jsonb,
  '{"valid":true,"messages":[]}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  '["夏コーデ", "新商品"]'::jsonb,
  'approved',
  'user_demo',
  'user_demo'
);

INSERT INTO content_media_assets (content_id, media_asset_id, display_order)
VALUES
(
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333331',
  1
),
(
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333332',
  2
);

INSERT INTO content_versions (id, content_id, updated_at, updated_by, summary)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  CURRENT_TIMESTAMP,
  'user_demo',
  '初回作成'
);

INSERT INTO schedules (
  id,
  content_id,
  instagram_account_id,
  publish_at,
  timezone,
  status,
  created_by,
  created_at,
  updated_at
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP + INTERVAL '6 hours',
  'Asia/Tokyo',
  'scheduled',
  '11111111-1111-1111-1111-111111111111',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO posting_jobs (
  id,
  schedule_id,
  job_status,
  error_type,
  error_code,
  retry_count,
  next_retry_at,
  locked_at,
  created_at,
  updated_at,
  error_message,
  resolution,
  executed_at
) VALUES
(
  '77777777-7777-7777-7777-777777777771',
  '66666666-6666-6666-6666-666666666666',
  'retrying',
  'rate_limit',
  'RATE_LIMITED',
  1,
  CURRENT_TIMESTAMP + INTERVAL '15 minutes',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  '混雑のため処理を待機しています。自動で再試行します。',
  '自動再試行中です（1/3）。',
  CURRENT_TIMESTAMP
),
(
  '77777777-7777-7777-7777-777777777772',
  '66666666-6666-6666-6666-666666666666',
  'action_required',
  'validation',
  'MEDIA_INVALID',
  3,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'この投稿種別では利用できないメディア形式です。',
  'メディアを差し替えて再実行してください。',
  CURRENT_TIMESTAMP
);

INSERT INTO audit_logs (
  id,
  actor_user_id,
  action,
  resource_type,
  resource_id,
  metadata,
  created_at
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  'content.updated',
  'content',
  '44444444-4444-4444-4444-444444444444',
  '{"summary":"キャプション更新"}'::jsonb,
  CURRENT_TIMESTAMP
);