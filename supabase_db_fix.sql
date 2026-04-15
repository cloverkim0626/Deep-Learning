-- ============================================================
-- WOODOK Student App — DB Fix & Verification Script
-- Run this in Supabase SQL Editor AFTER supabase_phase2.sql
-- ============================================================

-- Ensure clinic_queue has correct columns (status column check)
ALTER TABLE clinic_queue
  ALTER COLUMN status SET DEFAULT 'waiting';

-- Add status check constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clinic_queue_status_check'
  ) THEN
    ALTER TABLE clinic_queue
      ADD CONSTRAINT clinic_queue_status_check
      CHECK (status IN ('waiting', 'in-progress', 'completed'));
  END IF;
END$$;

-- Ensure qna_posts has correct status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'qna_posts_status_check'
  ) THEN
    ALTER TABLE qna_posts
      ADD CONSTRAINT qna_posts_status_check
      CHECK (status IN ('pending', 'answered'));
  END IF;
END$$;

-- Ensure set_assignments has correct structure
DO $$
BEGIN
  -- Add student_class column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'set_assignments' AND column_name = 'student_class'
  ) THEN
    ALTER TABLE set_assignments ADD COLUMN student_class TEXT;
  END IF;
END$$;

-- Ensure wrong_answers uses TEXT for student_id (not UUID)
-- (이 테이블이 UUID 기반이면 TEXT로 변경 필요)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wrong_answers'
      AND column_name = 'student_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE wrong_answers ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
  END IF;
END$$;

-- Add wrong_count column to wrong_answers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wrong_answers' AND column_name = 'wrong_count'
  ) THEN
    ALTER TABLE wrong_answers ADD COLUMN wrong_count INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wrong_answers' AND column_name = 'last_attempt'
  ) THEN
    ALTER TABLE wrong_answers ADD COLUMN last_attempt TIMESTAMPTZ DEFAULT now();
  END IF;
END$$;

-- Add full_text column to word_sets if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'word_sets' AND column_name = 'full_text'
  ) THEN
    ALTER TABLE word_sets ADD COLUMN full_text TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'word_sets' AND column_name = 'workbook'
  ) THEN
    ALTER TABLE word_sets ADD COLUMN workbook TEXT DEFAULT '기타';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'word_sets' AND column_name = 'chapter'
  ) THEN
    ALTER TABLE word_sets ADD COLUMN chapter TEXT DEFAULT '기타';
  END IF;
END$$;

-- Ensure test_results columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'test_results' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE test_results ADD COLUMN question_type TEXT DEFAULT 'vocab';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'test_results' AND column_name = 'is_correct'
  ) THEN
    ALTER TABLE test_results ADD COLUMN is_correct BOOLEAN DEFAULT false;
  END IF;
END$$;

-- ============================================================
-- Verification: Check all tables exist
-- ============================================================
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'students', 'word_sets', 'words', 'set_assignments', 'wrong_answers',
    'clinic_queue', 'qna_posts', 'qna_answers',
    'passage_folders', 'folder_passages', 'test_sessions', 'test_results'
  )
ORDER BY table_name;
