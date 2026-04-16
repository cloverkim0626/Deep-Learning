-- ============================================================
--  Deep Learning — 데이터 리셋 SQL
--  Supabase SQL Editor에서 실행하세요.
--  ⚠️  학생 계정(students)과 AI 튜터 QnA는 유지됩니다.
-- ============================================================

-- ─── 1. 테스트 세션 · 결과 리셋 ────────────────────────────
TRUNCATE TABLE test_results  RESTART IDENTITY CASCADE;
TRUNCATE TABLE test_sessions RESTART IDENTITY CASCADE;

-- ─── 2. 오답 노트 리셋 ─────────────────────────────────────
TRUNCATE TABLE wrong_answers RESTART IDENTITY CASCADE;

-- ─── 3. 배당 기록 리셋 ─────────────────────────────────────
TRUNCATE TABLE set_assignments RESTART IDENTITY CASCADE;

-- ─── 4. 콘텐츠 라이브러리 리셋 (지문 + 단어 + 폴더) ──────
--  순서 중요: FK가 있는 하위 테이블부터 삭제
TRUNCATE TABLE folder_passages RESTART IDENTITY CASCADE;
TRUNCATE TABLE folders         RESTART IDENTITY CASCADE;
TRUNCATE TABLE words           RESTART IDENTITY CASCADE;
TRUNCATE TABLE word_sets       RESTART IDENTITY CASCADE;

-- ─── 확인 쿼리 ─────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM word_sets)       AS 지문수,
  (SELECT COUNT(*) FROM words)           AS 단어수,
  (SELECT COUNT(*) FROM set_assignments) AS 배당수,
  (SELECT COUNT(*) FROM test_sessions)   AS 세션수,
  (SELECT COUNT(*) FROM wrong_answers)   AS 오답수;

-- ============================================================
--  (선택) 테스트 기록·오답만 리셋하고 콘텐츠는 유지하려면
--  아래 블록만 실행하세요 (4번 블록 제외):
-- ============================================================
/*
TRUNCATE TABLE test_results    RESTART IDENTITY CASCADE;
TRUNCATE TABLE test_sessions   RESTART IDENTITY CASCADE;
TRUNCATE TABLE wrong_answers   RESTART IDENTITY CASCADE;
TRUNCATE TABLE set_assignments RESTART IDENTITY CASCADE;
*/
