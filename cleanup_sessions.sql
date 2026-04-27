-- 중복 세션 정리 스크립트
-- 주의: 실행 전 반드시 백업 확인

-- 1. 중복 현황 전체 확인
SELECT
  student_name,
  set_id,
  COUNT(*) AS cnt,
  SUM(correct_count) AS total_correct
FROM test_sessions
WHERE completed_at IS NOT NULL
GROUP BY student_name, set_id
HAVING COUNT(*) > 1
ORDER BY total_correct DESC
LIMIT 30;

-- 2. 같은 (student_name, set_id, test_type) 조합에서 가장 오래된 것만 남기고 나머지 삭제
-- (먼저 아래 SELECT로 삭제 대상 확인 후 DELETE로 변경)
SELECT id, student_name, set_id, test_type, correct_count, completed_at
FROM test_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (student_name, set_id, test_type) id
  FROM test_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY student_name, set_id, test_type, completed_at ASC
)
AND completed_at IS NOT NULL
AND set_id IS NOT NULL
ORDER BY student_name, set_id;

-- 3. 확인 후 실제 삭제 (SELECT를 DELETE로 교체)
/*
DELETE FROM test_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (student_name, set_id, test_type) id
  FROM test_sessions
  WHERE completed_at IS NOT NULL
  ORDER BY student_name, set_id, test_type, completed_at ASC
)
AND completed_at IS NOT NULL
AND set_id IS NOT NULL;
*/

-- 4. set_id = null인 중복 세션 삭제 (최신 1개만 남김)
SELECT id, student_name, correct_count, created_at
FROM test_sessions
WHERE set_id IS NULL
  AND completed_at IS NOT NULL
ORDER BY student_name, created_at DESC;

-- set_id=null 중복 삭제 (같은 student_name에서 가장 최신 1개만 남김)
/*
DELETE FROM test_sessions
WHERE set_id IS NULL
  AND completed_at IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (student_name) id
    FROM test_sessions
    WHERE set_id IS NULL AND completed_at IS NOT NULL
    ORDER BY student_name, created_at DESC
  );
*/
