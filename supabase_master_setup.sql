-- ================================================================
-- PARALLAX MASTER SETUP SQL
-- Supabase SQL Editor에 붙여넣고 섹션별로 실행하세요.
-- ================================================================


-- ──────────────────────────────────────────────────────────────────
-- SECTION 1: DB 스키마 마이그레이션 (처음 한 번만 실행)
-- ──────────────────────────────────────────────────────────────────

-- word_sets: 분류 컬럼 추가
ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passage_number TEXT DEFAULT '';

-- words: 출제 제어 컬럼 추가
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS is_for_test BOOLEAN DEFAULT true;

-- 기존 데이터 마이그레이션
UPDATE word_sets
SET category = workbook, sub_category = chapter
WHERE category = '' AND workbook IS NOT NULL AND workbook != '';

UPDATE words SET is_for_test = true WHERE is_for_test IS NULL;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 2: 테스트 데이터 리셋 (지문/단어/테스트 기록만 삭제)
--            학생 정보는 건드리지 않음!
-- ──────────────────────────────────────────────────────────────────

-- 테스트 기록 삭제
DELETE FROM test_sessions;
DELETE FROM wrong_answers;

-- 배당 관계 삭제
DELETE FROM set_assignments;
DELETE FROM folder_passages;
DELETE FROM folders;

-- 단어 및 지문 삭제
DELETE FROM words;
DELETE FROM word_sets;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 3: GUEST 반 학생 추가
-- ──────────────────────────────────────────────────────────────────

-- GUEST 반 학부모/학생 계정 5명 생성
-- 이미 있으면 무시
INSERT INTO students (name, class_name, school, grade, gender, password, notes, enrolled_at)
VALUES
  ('학부모', 'GUEST', '체험', 1, 'OTHER', 'guest1234', '학부모 체험 계정', NOW()),
  ('학생1', 'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정', NOW()),
  ('학생2', 'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정', NOW()),
  ('학생3', 'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정', NOW()),
  ('학생4', 'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정', NOW())
ON CONFLICT (name) DO NOTHING;
