-- ================================================================
-- 📋 WOODOK 데이터 초기화 SQL 모음
-- 실행 위치: Supabase > SQL Editor
-- ================================================================


-- ================================================================
-- 1️⃣  특정 학생 테스트 데이터 초기화 (예: 한상혁)
--     → test_sessions, test_results, wrong_answers, set_assignments 상태 초기화
-- ================================================================

-- 변수처럼 사용할 이름 (아래 '한상혁'을 원하는 이름으로 교체)
DO $$
DECLARE
  target_name TEXT := '한상혁';
BEGIN

  -- 1) test_results 삭제 (test_sessions에 속한 것들)
  DELETE FROM test_results
  WHERE session_id IN (
    SELECT id FROM test_sessions WHERE student_name = target_name
  );

  -- 2) test_sessions 삭제
  DELETE FROM test_sessions
  WHERE student_name = target_name;

  -- 3) wrong_answers 삭제
  DELETE FROM wrong_answers
  WHERE student_name = target_name;

  -- 4) set_assignments 상태를 active로 되돌리기 (completed → active)
  UPDATE set_assignments
  SET status = 'active', completed_at = NULL
  WHERE student_name = target_name
    AND status = 'completed';

  RAISE NOTICE '✅ % 테스트 데이터 초기화 완료', target_name;
END;
$$;


-- ================================================================
-- 2️⃣  GUEST 체험 계정 등록 / 비밀번호 설정
--     → students 테이블에 GUEST반 학생 추가 (password 컬럼 필요)
-- ================================================================

-- 체험 계정 추가 (이미 있으면 upsert)
INSERT INTO students (name, class_name, password)
VALUES
  ('체험학생1', 'GUEST', 'woodok24'),   -- ← 비밀번호 원하는 값으로 변경
  ('체험학생2', 'GUEST', 'woodok24')
ON CONFLICT (name) DO UPDATE
  SET class_name = EXCLUDED.class_name,
      password   = EXCLUDED.password;

-- 특정 체험 계정 비밀번호만 변경
-- UPDATE students SET password = '새비밀번호' WHERE name = '체험학생1';

-- 체험 계정 삭제
-- DELETE FROM students WHERE class_name = 'GUEST' AND name = '체험학생1';

-- GUEST 계정 전체 확인
-- SELECT name, class_name, password FROM students WHERE class_name ILIKE '%guest%' ORDER BY name;


-- ================================================================
-- 3️⃣  classes 테이블에 GUEST 반 등록 (없는 경우에만 실행)
-- ================================================================

INSERT INTO classes (name, academy_name)
VALUES ('GUEST', 'WOODOK')
ON CONFLICT (name) DO NOTHING;


-- ================================================================
-- 4️⃣  선택적: 학생의 set_assignments만 초기화 (테스트 세션은 유지)
-- ================================================================

-- UPDATE set_assignments
-- SET status = 'active', completed_at = NULL
-- WHERE student_name = '한상혁';


-- ================================================================
-- 5️⃣  선택적: 전체 GUEST 반 테스트 데이터 초기화
-- ================================================================

-- DELETE FROM test_results WHERE session_id IN (
--   SELECT ts.id FROM test_sessions ts
--   JOIN students s ON s.name = ts.student_name
--   WHERE s.class_name ILIKE '%guest%'
-- );
-- DELETE FROM test_sessions WHERE student_name IN (
--   SELECT name FROM students WHERE class_name ILIKE '%guest%'
-- );
-- UPDATE set_assignments SET status = 'active', completed_at = NULL
-- WHERE student_name IN (SELECT name FROM students WHERE class_name ILIKE '%guest%');
