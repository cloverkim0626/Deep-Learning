-- ================================================================
-- PARALLAX CLASS MANAGEMENT SETUP
-- Supabase SQL Editor에서 전체 실행하세요.
-- ================================================================

-- ── 1. 반 (classes) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                  -- e.g. "수능영어 월수금반"
  color       TEXT DEFAULT 'indigo',          -- indigo | rose | teal | amber | violet
  schedule    JSONB DEFAULT '[]',             -- [{day:"월", time:"15:00"}, ...]
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. 반-학생 매핑 (class_students) ────────────────────────────
CREATE TABLE IF NOT EXISTS class_students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,                 -- students.name 참조 (FK 없이 이름 기반)
  student_class TEXT DEFAULT '',              -- students.class_name (학년반 정보)
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_name)
);

-- ── 3. 수업 세션 (class_sessions) ───────────────────────────────
CREATE TABLE IF NOT EXISTS class_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, session_date)
);

-- ── 4. 출결 (attendance) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_name      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'present', -- present | late | absent
  late_reason       TEXT DEFAULT '',
  late_arrival_time TEXT DEFAULT '',           -- e.g. "15:20"
  makeup_type       TEXT DEFAULT '',           -- '' | direct | video
  makeup_date       DATE,                      -- 직접보강 날짜
  makeup_video_date DATE,                      -- 영상보강 배부 예정일
  note              TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_name)
);

-- ── 5. 과제 슬롯 (homework_slots) ───────────────────────────────
CREATE TABLE IF NOT EXISTS homework_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,                  -- 과제 제목
  hw_type      TEXT DEFAULT 'general',         -- general | vocab_test | passage_read | essay
  set_id       UUID,                           -- vocab_test인 경우 word_sets.id
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. 과제 체크 (homework_checks) ──────────────────────────────
CREATE TABLE IF NOT EXISTS homework_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id        UUID NOT NULL REFERENCES homework_slots(id) ON DELETE CASCADE,
  student_name   TEXT NOT NULL,
  status         TEXT DEFAULT 'pending',       -- pending | done | delayed | skipped
  delayed_to     DATE,                         -- 연기된 경우 목표 날짜
  delayed_from_session_id UUID,               -- 원래 세션 id (연기 추적)
  checked_at     TIMESTAMPTZ,
  note           TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id, student_name)
);

-- ── RLS: anon 전체 허용 (기존 패턴 통일) ────────────────────────
ALTER TABLE classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_checks ENABLE ROW LEVEL SECURITY;

-- classes
DROP POLICY IF EXISTS "anon_all_classes"        ON classes;
CREATE POLICY "anon_all_classes"        ON classes        FOR ALL TO anon USING (true) WITH CHECK (true);
-- class_students
DROP POLICY IF EXISTS "anon_all_class_students" ON class_students;
CREATE POLICY "anon_all_class_students" ON class_students FOR ALL TO anon USING (true) WITH CHECK (true);
-- class_sessions
DROP POLICY IF EXISTS "anon_all_class_sessions" ON class_sessions;
CREATE POLICY "anon_all_class_sessions" ON class_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
-- attendance
DROP POLICY IF EXISTS "anon_all_attendance"     ON attendance;
CREATE POLICY "anon_all_attendance"     ON attendance     FOR ALL TO anon USING (true) WITH CHECK (true);
-- homework_slots
DROP POLICY IF EXISTS "anon_all_hw_slots"       ON homework_slots;
CREATE POLICY "anon_all_hw_slots"       ON homework_slots FOR ALL TO anon USING (true) WITH CHECK (true);
-- homework_checks
DROP POLICY IF EXISTS "anon_all_hw_checks"      ON homework_checks;
CREATE POLICY "anon_all_hw_checks"      ON homework_checks FOR ALL TO anon USING (true) WITH CHECK (true);
