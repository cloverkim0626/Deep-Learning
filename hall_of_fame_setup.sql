-- ═══════════════════════════════════════════════
-- Hall of Fame 테이블 생성 + 4월 MVP 데이터 입력
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hall_of_fame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL,
  rank int NOT NULL CHECK (rank IN (1, 2, 3)),
  student_name text NOT NULL,
  display_name text,
  score int NOT NULL DEFAULT 0,
  class_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (year, month, rank)
);

-- RLS: 학생 읽기 허용
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hall_of_fame_read" ON hall_of_fame FOR SELECT USING (true);

-- ── 4월 MVP 데이터 (실제 이름/점수로 수정 후 주석 해제하여 실행) ──
-- INSERT INTO hall_of_fame (year, month, rank, student_name, display_name, score, class_name)
-- VALUES
--   (2025, 4, 1, '학생이름1', '닉네임1', 0, '반이름'),
--   (2025, 4, 2, '학생이름2', '닉네임2', 0, '반이름'),
--   (2025, 4, 3, '학생이름3', '닉네임3', 0, '반이름');
