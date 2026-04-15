-- ============================================================
-- WOODOK — Update Script (Round 2)
-- Run in Supabase SQL Editor
-- ============================================================

-- 8. Add clinic timing columns (started_at, completed_at)
ALTER TABLE clinic_queue ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE clinic_queue ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- New: Add context_korean and is_key to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS context_korean TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS is_key BOOLEAN DEFAULT false;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('clinic_queue', 'words')
ORDER BY table_name, ordinal_position;

