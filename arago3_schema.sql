-- ============================================================
-- arago3_schema.sql
-- 수업관리 대규모 개선: 기존 테이블 확장 + 신규 테이블
-- Supabase SQL 에디터에서 실행하세요
-- ============================================================

-- [1] homework_slots 확장 (배당일, 마감일, 단어테스트 전용 필드)
ALTER TABLE homework_slots
  ADD COLUMN IF NOT EXISTS assigned_at  DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date     DATE,
  ADD COLUMN IF NOT EXISTS test_range   TEXT,
  ADD COLUMN IF NOT EXISTS max_score    INT,
  ADD COLUMN IF NOT EXISTS pass_score   INT,
  ADD COLUMN IF NOT EXISTS is_pf        BOOLEAN DEFAULT FALSE;

-- [2] homework_slot_students: 학생별 과제 배당 (비어있으면 전체 학생)
CREATE TABLE IF NOT EXISTS homework_slot_students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      UUID REFERENCES homework_slots(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  due_date     DATE,
  UNIQUE(slot_id, student_name)
);
ALTER TABLE homework_slot_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON homework_slot_students;
CREATE POLICY "allow all" ON homework_slot_students FOR ALL TO public USING (true) WITH CHECK (true);

-- [3] homework_checks 확장 (이월 상세, 테스트 점수)
ALTER TABLE homework_checks
  ADD COLUMN IF NOT EXISTS delay_reason  TEXT,
  ADD COLUMN IF NOT EXISTS delay_note    TEXT,
  ADD COLUMN IF NOT EXISTS rollover_date DATE,
  ADD COLUMN IF NOT EXISTS score         INT,
  ADD COLUMN IF NOT EXISTS is_pass       BOOLEAN;

-- [4] lesson_notes: 수업내역 (session당 1개)
CREATE TABLE IF NOT EXISTS lesson_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE UNIQUE,
  note       TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON lesson_notes;
CREATE POLICY "allow all" ON lesson_notes FOR ALL TO public USING (true) WITH CHECK (true);

-- ✅ 확인 쿼리
SELECT 'homework_slots' AS tbl, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'homework_slots'
  AND column_name IN ('assigned_at','due_date','test_range','max_score','pass_score','is_pf')
UNION ALL
SELECT 'homework_checks', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'homework_checks'
  AND column_name IN ('delay_reason','delay_note','rollover_date','score','is_pass')
UNION ALL
SELECT table_name, 'table', 'exists'
FROM information_schema.tables
WHERE table_name IN ('homework_slot_students','lesson_notes');
