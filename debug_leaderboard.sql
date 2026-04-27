-- 김가연 리더보드 점수 내역 조사
-- Supabase SQL Editor에서 실행

-- 1. 이번 주 세션 목록 (점수에 포함된 것만)
SELECT
  id,
  student_name,
  correct_count,
  total_questions,
  ROUND(correct_count::numeric / NULLIF(total_questions,0) * 100, 1) AS pass_rate_pct,
  completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS completed_kst,
  created_at  AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' AS created_kst
FROM test_sessions
WHERE student_name = '김가연'
  AND completed_at IS NOT NULL
ORDER BY completed_at DESC;

-- 2. 90% 이상 통과 세션만 (점수 반영 기준)
SELECT
  COUNT(*)                    AS pass_session_count,
  SUM(correct_count)          AS total_score,
  MIN(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS first,
  MAX(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS last
FROM test_sessions
WHERE student_name = '김가연'
  AND completed_at IS NOT NULL
  AND correct_count::numeric / NULLIF(total_questions,0) >= 0.9;

-- 3. 날짜별 세션 수 & 점수 집계 (이상한 날 찾기)
SELECT
  (completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date AS ks_date,
  COUNT(*)                                                            AS sessions,
  SUM(correct_count)                                                  AS daily_score,
  SUM(total_questions)                                                AS daily_questions
FROM test_sessions
WHERE student_name = '김가연'
  AND completed_at IS NOT NULL
  AND correct_count::numeric / NULLIF(total_questions,0) >= 0.9
GROUP BY 1
ORDER BY 1 DESC;

-- 4. 비정상 의심: 같은 날 같은 set_id 반복 여부
SELECT
  set_id,
  COUNT(*)           AS repeat_count,
  SUM(correct_count) AS score_from_this_set,
  MIN(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS first_attempt,
  MAX(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS last_attempt
FROM test_sessions
WHERE student_name = '김가연'
  AND completed_at IS NOT NULL
  AND correct_count::numeric / NULLIF(total_questions,0) >= 0.9
GROUP BY set_id
HAVING COUNT(*) > 1
ORDER BY repeat_count DESC;
