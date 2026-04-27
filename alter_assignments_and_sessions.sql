-- ──────────────────────────────────────────────────────────────────
-- 1. test_sessions: 멀티세트 추적을 위한 set_ids_json 컬럼 추가
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS set_ids_json TEXT DEFAULT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 2. set_assignments: 기간 만료일(due_date) 컬럼 추가
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE set_assignments
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

-- 완료:
-- test_sessions.set_ids_json  → 멀티세트 테스트 시 set_id 목록 JSON 저장
-- set_assignments.due_date    → 배당 기간 만료일 (null=무기한)
