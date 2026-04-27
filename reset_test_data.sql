-- ================================================================
-- 테스트 결과 초기화 (배정 지문은 유지)
-- 삭제 대상: test_results, test_sessions, wrong_answers
-- 유지 대상: set_assignments, word_sets, words (배정 지문)
-- ================================================================

-- 1. 개별 문항 결과 삭제
TRUNCATE TABLE test_results RESTART IDENTITY CASCADE;

-- 2. 테스트 세션 삭제
TRUNCATE TABLE test_sessions RESTART IDENTITY CASCADE;

-- 3. 오답 노트 삭제
TRUNCATE TABLE wrong_answers RESTART IDENTITY CASCADE;

-- ================================================================
-- 확인용: 아래 쿼리로 각 테이블 건수가 0인지 확인하세요
-- ================================================================
SELECT 'test_sessions'  AS table_name, COUNT(*) FROM test_sessions
UNION ALL
SELECT 'test_results'   AS table_name, COUNT(*) FROM test_results
UNION ALL
SELECT 'wrong_answers'  AS table_name, COUNT(*) FROM wrong_answers
UNION ALL
SELECT 'set_assignments (유지됨)' AS table_name, COUNT(*) FROM set_assignments;
