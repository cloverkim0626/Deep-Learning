-- ================================================================
-- CLASSES TABLE UPDATE — 안전한 컬럼 추가만 (기존 데이터 손상 없음)
-- ADD COLUMN IF NOT EXISTS 로 기존 데이터 보호
-- ================================================================

-- classes 테이블: 신규 컬럼 추가
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS academy_name    TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS opened_at       DATE    DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS clinic_schedule JSONB   DEFAULT '[]';

-- class_sessions 테이블: 수업/클리닉 구분
ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'class'; -- 'class' | 'clinic'

-- 기존 schedule JSONB는 그대로 사용 (end_time 추가는 클라이언트 측에서 처리)

-- 확인 쿼리 (선택)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('classes', 'class_sessions')
ORDER BY table_name, ordinal_position;
