-- ============================================================
-- STEP 1: 기존 streak_recovery 세션 삭제 (재실행 안전)
-- ============================================================
DELETE FROM test_sessions
WHERE test_type = 'vocab'
  AND set_id IS NULL
  AND completed_at >= '2026-04-26 15:00:00+00';  -- 복구 세션만 삭제 (재실행 안전)

-- ============================================================
-- STEP 2: 4월 중 활동한 비GUEST 학생에게 streak 복구 세션 삽입
-- 4/27(KST) ~ 5/2(KST) 각 날짜, 하루 2개 (14개/학생)
-- set_id=NULL → 리더보드 제외, correct=1/1 → streak 계산 포함
-- ============================================================
WITH qualifying_students AS (
  -- 4/26 KST 이전 한 달 이내에 ANY 통과 세션이 있는 비GUEST 학생
  SELECT DISTINCT student_name
  FROM test_sessions
  WHERE completed_at IS NOT NULL
    AND completed_at < '2026-04-26 15:00:00+00'   -- KST 4/27 00:00 이전
    AND completed_at >= '2026-03-26 15:00:00+00'  -- 한 달 이내
    AND total_questions > 0
    AND correct_count::numeric / total_questions >= 0.9
    AND student_name NOT IN (
      SELECT name FROM students WHERE class_name ILIKE '%guest%'
    )
),
-- 4/27 KST ~ 5/2 KST → UTC로는 4/26 22:00 ~ 5/1 22:00 (하루 단위, 6일)
exam_days AS (
  SELECT gs AS day_offset
  FROM generate_series(0, 5) gs
),
base AS (
  SELECT
    qs.student_name,
    -- 각 KST 날짜의 오전 9시 (UTC 00:00)
    ('2026-04-27 00:00:00+00'::timestamptz + (ed.day_offset || ' days')::interval) AS t1,
    ('2026-04-27 01:00:00+00'::timestamptz + (ed.day_offset || ' days')::interval) AS t2
  FROM qualifying_students qs
  CROSS JOIN exam_days ed
)
INSERT INTO test_sessions (student_name, set_id, test_type, correct_count, total_questions, completed_at)
SELECT student_name, NULL::uuid, 'vocab', 1, 1, t1 FROM base
UNION ALL
SELECT student_name, NULL::uuid, 'vocab', 1, 1, t2 FROM base;

-- ============================================================
-- 확인 (set_id IS NULL + test_type='vocab' = 복구 세션)
-- ============================================================
SELECT student_name,
  COUNT(*) AS inserted,
  MIN(completed_at AT TIME ZONE 'Asia/Seoul')::date AS first_kst_date,
  MAX(completed_at AT TIME ZONE 'Asia/Seoul')::date AS last_kst_date
FROM test_sessions
WHERE test_type = 'vocab'
  AND set_id IS NULL
  AND completed_at >= '2026-04-26 15:00:00+00'
GROUP BY student_name
ORDER BY student_name;
