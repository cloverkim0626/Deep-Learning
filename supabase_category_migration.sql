-- ============================================================
-- WOODOK — word_sets 분류 컬럼 + words.is_for_test 추가
-- Run in Supabase SQL Editor
-- ============================================================

-- word_sets 분류 컬럼
ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passage_number TEXT DEFAULT '';

-- words 테스트 출제 여부 컬럼
-- is_for_test: 출제 포함 여부 (체크된 단어만 출제)
-- is_key: 핵심 단어 = 유의어 + 반의어 모두 출제 (is_for_test도 true로 간주)
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS is_for_test BOOLEAN DEFAULT true;

-- Migrate existing data: workbook -> category, chapter -> sub_category
UPDATE word_sets
SET category = workbook, sub_category = chapter
WHERE category = '' AND workbook IS NOT NULL AND workbook != '';

-- Ensure all existing words are marked for test by default
UPDATE words SET is_for_test = true WHERE is_for_test IS NULL;
