-- ============================================================
-- WOODOK Student App - Supabase Full Fix
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Fix word_sets RLS - allow anon INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Only admins can manage word sets" ON word_sets;

CREATE POLICY "Allow all inserts on word_sets"
  ON word_sets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all updates on word_sets"
  ON word_sets FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow all deletes on word_sets"
  ON word_sets FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- STEP 2: Fix words table - allow anon write
-- ============================================================
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on words" ON words;
CREATE POLICY "Allow all access on words"
  ON words FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 3: Fix qna_posts - add author_name column, fix RLS
-- ============================================================
ALTER TABLE qna_posts ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '익명';
ALTER TABLE qna_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE qna_posts ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE qna_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on qna_posts" ON qna_posts;
CREATE POLICY "Allow all access on qna_posts"
  ON qna_posts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 4: Fix qna_answers - add author_name column, fix RLS
-- ============================================================
ALTER TABLE qna_answers ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT '익명';
ALTER TABLE qna_answers ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE qna_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on qna_answers" ON qna_answers;
CREATE POLICY "Allow all access on qna_answers"
  ON qna_answers FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 5: Create clinic_queue table (simple, no auth FK)
-- ============================================================
DROP TABLE IF EXISTS clinic_queue CASCADE;

CREATE TABLE clinic_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL DEFAULT '익명',
  topic TEXT NOT NULL DEFAULT '질문 없음',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clinic_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access on clinic_queue"
  ON clinic_queue FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 6: Create set_assignments table (name-based, no auth FK)
-- ============================================================
DROP TABLE IF EXISTS set_assignments CASCADE;

CREATE TABLE set_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  student_class TEXT NOT NULL DEFAULT '',
  set_id UUID NOT NULL REFERENCES word_sets(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_name, set_id)
);

ALTER TABLE set_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access on set_assignments"
  ON set_assignments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 7: essay_sets and essay_items - allow anon read/write
-- ============================================================
ALTER TABLE essay_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on essay_sets" ON essay_sets;
CREATE POLICY "Allow all access on essay_sets"
  ON essay_sets FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE essay_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on essay_items" ON essay_items;
CREATE POLICY "Allow all access on essay_items"
  ON essay_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
