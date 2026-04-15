-- ============================================================
-- WOODOK Student App - Phase 2 Supabase Fix
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  school TEXT,
  grade INTEGER,
  phone TEXT,
  gender TEXT CHECK (gender IN ('M', 'F', 'OTHER')),
  enrolled_at DATE,
  notes TEXT,
  password TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, class_name)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on students"
  ON students FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 2. Create passage_folders table
CREATE TABLE IF NOT EXISTS passage_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE passage_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on passage_folders"
  ON passage_folders FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 3. Create folder_passages table
CREATE TABLE IF NOT EXISTS folder_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES passage_folders(id) ON DELETE CASCADE,
  set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(folder_id, set_id)
);

ALTER TABLE folder_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on folder_passages"
  ON folder_passages FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 4. Create test_sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  set_id UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES passage_folders(id) ON DELETE CASCADE,
  total_questions INTEGER,
  correct_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on test_sessions"
  ON test_sessions FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 5. Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  question_type TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on test_results"
  ON test_results FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 6. Add created_at to wrong_answers if not exists
ALTER TABLE wrong_answers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 7. Add missing policies for wrong_answers
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on wrong_answers" ON wrong_answers;
CREATE POLICY "Allow all access on wrong_answers"
  ON wrong_answers FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
