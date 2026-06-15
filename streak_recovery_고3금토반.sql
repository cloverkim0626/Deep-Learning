-- ============================================================
-- 고3 금토반 스트릭 복구 (휴강 기간: 2026-05-03 ~ 2026-05-08)
-- 각 날짜당 vocab 2세트 완료로 기록
-- 테이블명: set_assignments (assignments 아님)
-- ============================================================

-- STEP 1: 대상 학생 확인
SELECT name FROM students WHERE class_name ILIKE '%금토%' ORDER BY name;

-- STEP 2: 배정된 세트 확인
SELECT DISTINCT sa.set_id, ws.label
FROM set_assignments sa
JOIN word_sets ws ON ws.id = sa.set_id
WHERE sa.student_name IN (
  SELECT name FROM students WHERE class_name ILIKE '%금토%'
)
LIMIT 5;

-- ============================================================
-- STEP 3: 스트릭 복구 실행
-- ============================================================
DO $$
DECLARE
  v_student  TEXT;
  v_date     DATE;
  v_set_num  INT;
  v_set_ids  TEXT[];
  v_set_id   TEXT;
BEGIN
  FOR v_student IN
    SELECT name FROM students WHERE class_name ILIKE '%금토%' ORDER BY name
  LOOP
    -- 해당 학생의 배정 세트 중 2개
    SELECT ARRAY_AGG(set_id::TEXT ORDER BY set_id) INTO v_set_ids
    FROM (
      SELECT DISTINCT set_id
      FROM set_assignments
      WHERE student_name = v_student
      LIMIT 2
    ) sub;

    -- 배정 세트 없으면 word_sets에서 아무거나 2개
    IF v_set_ids IS NULL OR array_length(v_set_ids, 1) < 1 THEN
      SELECT ARRAY_AGG(id::TEXT ORDER BY id) INTO v_set_ids
      FROM (SELECT id FROM word_sets LIMIT 2) sub;
    END IF;

    -- 2026-05-03 ~ 2026-05-08
    FOR v_date IN
      SELECT gs::DATE
      FROM generate_series(
        '2026-05-03'::TIMESTAMPTZ,
        '2026-05-08'::TIMESTAMPTZ,
        '1 day'::INTERVAL
      ) gs
    LOOP
      FOR v_set_num IN 1..2
      LOOP
        IF array_length(v_set_ids, 1) >= v_set_num THEN
          v_set_id := v_set_ids[v_set_num];
        ELSE
          v_set_id := v_set_ids[1];
        END IF;

        -- 중복 방지
        IF NOT EXISTS (
          SELECT 1 FROM test_sessions
          WHERE student_name = v_student
            AND set_id = v_set_id::UUID
            AND DATE(completed_at AT TIME ZONE 'Asia/Seoul') = v_date
        ) THEN
          INSERT INTO test_sessions (
            student_name, set_id, total_questions, correct_count,
            test_type, completed_at, created_at
          ) VALUES (
            v_student,
            v_set_id::UUID,
            5, 5,
            'vocab',
            (v_date + INTERVAL '9 hours' + (v_set_num * INTERVAL '90 minutes'))::TIMESTAMPTZ,
            (v_date + INTERVAL '9 hours' + (v_set_num * INTERVAL '90 minutes'))::TIMESTAMPTZ
          );
          RAISE NOTICE '삽입: % | % | set %', v_student, v_date, v_set_num;
        ELSE
          RAISE NOTICE '스킵(중복): % | %', v_student, v_date;
        END IF;

      END LOOP;
    END LOOP;
    RAISE NOTICE '[완료] %', v_student;
  END LOOP;

  RAISE NOTICE '=== 스트릭 복구 완료 ===';
END $$;

-- ============================================================
-- STEP 4: 결과 확인
-- ============================================================
SELECT
  student_name,
  DATE(completed_at AT TIME ZONE 'Asia/Seoul') AS kst_date,
  COUNT(*) AS sessions
FROM test_sessions
WHERE student_name IN (
  SELECT name FROM students WHERE class_name ILIKE '%금토%'
)
AND DATE(completed_at AT TIME ZONE 'Asia/Seoul') BETWEEN '2026-05-03' AND '2026-05-08'
GROUP BY student_name, DATE(completed_at AT TIME ZONE 'Asia/Seoul')
ORDER BY student_name, kst_date;
