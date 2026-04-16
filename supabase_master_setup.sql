-- ================================================================
-- PARALLAX MASTER SETUP SQL
-- Supabase SQL Editor에 붙여넣고 섹션별로 실행하세요.
-- ================================================================


-- ──────────────────────────────────────────────────────────────────
-- SECTION 0: 배당 현황 진단 (가장 먼저 실행 → 결과 확인)
-- ──────────────────────────────────────────────────────────────────

-- 0-A. set_assignments 테이블 컬럼 목록 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'set_assignments'
ORDER BY ordinal_position;

-- 0-B. 배당 데이터 전체 조회 (몇 건인지 확인)
SELECT id, student_name, student_class, set_id, status, created_at
FROM set_assignments
LIMIT 20;

-- 0-C. RLS 정책 확인
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'set_assignments';


-- ──────────────────────────────────────────────────────────────────
-- SECTION 1: DB 스키마 마이그레이션 (처음 한 번만 실행)
-- ──────────────────────────────────────────────────────────────────

-- word_sets: 분류 컬럼 추가
ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_sub_category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passage_number TEXT DEFAULT '';

-- set_assignments: 상태 및 완료 시각 컬럼 추가
ALTER TABLE set_assignments
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- 'active' | 'completed' | 'expired'
ALTER TABLE set_assignments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- ★ 배당현황 fix: sub_sub_category, passage_number join 대비 컬럼 보장
ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS sub_sub_category TEXT DEFAULT '';
ALTER TABLE word_sets
  ADD COLUMN IF NOT EXISTS passage_number TEXT DEFAULT '';

-- ★ RLS fix: set_assignments anon 읽기 허용 (배당현황 조회용)
-- 이미 있으면 DROP 후 재생성
DROP POLICY IF EXISTS "allow_anon_read_assignments" ON set_assignments;
CREATE POLICY "allow_anon_read_assignments"
  ON set_assignments FOR SELECT
  TO anon
  USING (true);

-- ★ RLS fix: set_assignments anon INSERT/UPDATE/DELETE 허용 (배당 저장용)
DROP POLICY IF EXISTS "allow_anon_write_assignments" ON set_assignments;
CREATE POLICY "allow_anon_write_assignments"
  ON set_assignments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- words: 출제 제어 컬럼 추가
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS is_for_test BOOLEAN DEFAULT true;

-- 수동 출제 제어: 유의어/반의어 각각 독립 플래그
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS test_synonym BOOLEAN DEFAULT false;
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS test_antonym BOOLEAN DEFAULT false;

-- 기존 데이터 마이그레이션
UPDATE word_sets
SET category = workbook, sub_category = chapter
WHERE category = '' AND workbook IS NOT NULL AND workbook != '';

UPDATE words SET is_for_test = true WHERE is_for_test IS NULL;
UPDATE words SET test_synonym = false WHERE test_synonym IS NULL;
UPDATE words SET test_antonym = false WHERE test_antonym IS NULL;



-- ──────────────────────────────────────────────────────────────────
-- SECTION 2: 테스트 데이터 리셋 (지문/단어/테스트 기록만 삭제)
--            학생 정보는 건드리지 않음!
-- ──────────────────────────────────────────────────────────────────

-- 테스트 기록 삭제 (없으면 무시)
DELETE FROM test_sessions   WHERE true;
DELETE FROM wrong_answers   WHERE true;

-- 배당·폴더 관계 삭제 (없으면 무시)
DELETE FROM set_assignments WHERE true;
DO $$ BEGIN
  DELETE FROM folder_passages;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  DELETE FROM folders;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 단어 및 지문 삭제
DELETE FROM words;
DELETE FROM word_sets;


-- ──────────────────────────────────────────────────────────────────
-- SECTION 3: GUEST 반 학생 추가
-- ──────────────────────────────────────────────────────────────────

-- 기존 GUEST 반 데이터가 있으면 먼저 삭제 후 재삽입
DELETE FROM students WHERE class_name = 'GUEST';

INSERT INTO students (name, class_name, school, grade, gender, password, notes, enrolled_at)
VALUES
  ('학부모',  'GUEST', '체험', 1, 'OTHER', 'guest1234', '학부모 체험 계정', NOW()),
  ('학생1',   'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정',  NOW()),
  ('학생2',   'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정',  NOW()),
  ('학생3',   'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정',  NOW()),
  ('학생4',   'GUEST', '체험', 1, 'OTHER', 'guest1234', '학생 체험 계정',  NOW());

