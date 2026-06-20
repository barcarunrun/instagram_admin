CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET password_hash = crypt('LocalPass123!', gen_salt('bf', 10))
WHERE password_hash IS NULL OR password_hash = '';

ALTER TABLE users
ALTER COLUMN password_hash SET NOT NULL;