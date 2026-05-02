-- ============================================================
-- Daily Report 시스템 스키마 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. attendance 테이블에 수업 태도 컬럼 추가
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attitude_grade TEXT DEFAULT NULL;
-- 가능한 값: 'A', 'B', 'C', 'D', 'E' (NULL = 미입력)

-- 2. clinic_queue에 튜터 이름 + 피드백 컬럼 추가
ALTER TABLE clinic_queue ADD COLUMN IF NOT EXISTS tutor_name TEXT DEFAULT '김효진T';
ALTER TABLE clinic_queue ADD COLUMN IF NOT EXISTS session_feedback TEXT DEFAULT NULL;
-- session_feedback: 클리닉 완료 시 해당 학생에 대한 짧은 코멘트

-- 3. daily_reports 테이블 생성 (HTML 리포트 저장)
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  session_date TEXT NOT NULL,         -- "YYYY-MM-DD"
  report_data JSONB,                  -- 리포트 원본 데이터 JSON (재생성/디버깅용)
  html_content TEXT NOT NULL,         -- 렌더링된 HTML 전체
  teacher_comment TEXT,               -- 강사 코멘트 (발행 전 입력)
  ai_insight JSONB,                   -- { improvement, praise, pattern }
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_name, session_date)
);

-- RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all" ON daily_reports FOR ALL USING (true) WITH CHECK (true);

-- 인덱스 (학부모 열람 시 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_daily_reports_student ON daily_reports(student_name, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_class ON daily_reports(class_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_published ON daily_reports(published, published_at DESC);
