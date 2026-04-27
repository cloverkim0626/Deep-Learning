-- ================================================================
-- PARALLAX RLS FIX v2 — 컬럼 추가 포함 버전
-- ================================================================

-- ──────────────────────────────────────────────────────────────────
-- SECTION A: test_sessions 컬럼 추가 + RLS
-- ──────────────────────────────────────────────────────────────────

-- test_type 컬럼 없으면 추가
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS test_type TEXT
  CHECK (test_type IN ('synonym', 'vocab'));

-- RLS anon 정책
DROP POLICY IF EXISTS "allow_anon_all_test_sessions" ON test_sessions;
CREATE POLICY "allow_anon_all_test_sessions"
  ON test_sessions FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────
-- SECTION B: test_results RLS
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_anon_all_test_results" ON test_results;
CREATE POLICY "allow_anon_all_test_results"
  ON test_results FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────
-- SECTION C: wrong_answers RLS
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_anon_all_wrong_answers" ON wrong_answers;
CREATE POLICY "allow_anon_all_wrong_answers"
  ON wrong_answers FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────
-- SECTION D: word_distractors 캐시 테이블
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS word_distractors (
  word_id TEXT PRIMARY KEY,
  distractors TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE word_distractors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all_word_distractors" ON word_distractors;
CREATE POLICY "allow_anon_all_word_distractors"
  ON word_distractors FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────
-- SECTION E: 진단 (실행 후 결과 확인)
-- ──────────────────────────────────────────────────────────────────

-- 정책 확인
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('test_sessions','test_results','wrong_answers','word_distractors')
ORDER BY tablename;

-- test_sessions 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'test_sessions'
ORDER BY ordinal_position;

-- 최근 세션
SELECT student_name, test_type, correct_count, total_questions, completed_at
FROM test_sessions
ORDER BY created_at DESC
LIMIT 10;
