-- ============================================================
-- WOODOK — word_sets 테이블 분류 컬럼 추가
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passage_number TEXT DEFAULT '';

-- Migrate existing data: workbook -> category, chapter -> sub_category
UPDATE word_sets
SET category = workbook, sub_category = chapter
WHERE category = '' AND workbook IS NOT NULL AND workbook != '';
