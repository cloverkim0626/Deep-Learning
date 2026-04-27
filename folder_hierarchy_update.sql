-- ================================================================
-- FOLDER HIERARCHY UPDATE — 완전 안전 (ADD COLUMN IF NOT EXISTS)
-- passage_folders 테이블에 대분류/중분류/소분류 추가
-- ================================================================

ALTER TABLE passage_folders
  ADD COLUMN IF NOT EXISTS large_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS mid_category   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS small_category TEXT DEFAULT '';

-- 확인
SELECT id, name, large_category, mid_category, small_category, created_at
FROM passage_folders
ORDER BY created_at DESC
LIMIT 5;
