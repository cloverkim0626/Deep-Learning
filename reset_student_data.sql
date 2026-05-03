-- ================================================================
-- 📋 WOODOK 데이터 초기화 SQL 모음
-- 실행 위치: Supabase > SQL Editor
-- ⚠️  섹션별로 필요한 것만 복사해서 실행하세요
-- ================================================================


-- ================================================================
-- 1️⃣  특정 학생 테스트 데이터 초기화 (예: 한상혁)
-- ================================================================

DO $$
DECLARE
  target_name TEXT := '한상혁';  -- ← 이름 바꾸고 실행
BEGIN
  DELETE FROM test_results
  WHERE session_id IN (
    SELECT id FROM test_sessions WHERE student_name = target_name
  );
  DELETE FROM test_sessions WHERE student_name = target_name;
  DELETE FROM wrong_answers WHERE student_id = target_name;
  UPDATE set_assignments
  SET status = 'active', completed_at = NULL
  WHERE student_name = target_name AND status = 'completed';
  RAISE NOTICE '✅ % 초기화 완료', target_name;
END;
$$;


-- ================================================================
-- 2️⃣  GUEST 체험 계정 — 비밀번호 설정/변경
--     (students 테이블에 이미 있는 학생 기준)
-- ================================================================

-- 이미 있는 학생 비밀번호 + 반 설정
UPDATE students
SET class_name = 'GUEST', password = 'woodok24'
WHERE name = '학생1';  -- ← 이름과 비밀번호 변경

-- 여러 명 한번에
-- UPDATE students
-- SET class_name = 'GUEST', password = 'woodok24'
-- WHERE name IN ('학생1', '학생2', '학생3');

-- 새 학생 추가 (없는 경우)
-- INSERT INTO students (name, class_name, password)
-- VALUES ('새학생', 'GUEST', 'woodok24');

-- 체험 계정 삭제
-- DELETE FROM students WHERE class_name = 'GUEST' AND name = '학생1';

-- 현재 GUEST 계정 전체 확인
-- SELECT name, class_name, password FROM students WHERE class_name ILIKE '%guest%' ORDER BY name;


-- ================================================================
-- 3️⃣  classes 테이블에 GUEST 반 등록 (없는 경우에만)
-- ================================================================

INSERT INTO classes (name, academy_name)
SELECT 'GUEST', 'WOODOK'
WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = 'GUEST');


-- ================================================================
-- 4️⃣  선택: set_assignments만 초기화 (세션 기록 유지)
-- ================================================================

-- UPDATE set_assignments
-- SET status = 'active', completed_at = NULL
-- WHERE student_name = '한상혁';


-- ================================================================
-- 5️⃣  선택: 전체 GUEST 반 테스트 데이터 초기화
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
