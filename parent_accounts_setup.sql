-- ===================================================
-- 학부모 계정 테이블 (parent_accounts)
-- ===================================================
CREATE TABLE IF NOT EXISTS parent_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_name, class_name)
);
ALTER TABLE parent_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parent_accounts_read" ON parent_accounts;
CREATE POLICY "parent_accounts_read" ON parent_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "parent_accounts_update" ON parent_accounts;
CREATE POLICY "parent_accounts_update" ON parent_accounts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "parent_accounts_insert" ON parent_accounts;
CREATE POLICY "parent_accounts_insert" ON parent_accounts FOR INSERT WITH CHECK (true);

-- ===================================================
-- 학부모 질의응답 테이블
-- ===================================================
CREATE TABLE IF NOT EXISTS parent_qna_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  class_name TEXT,
  passage_id TEXT DEFAULT '기타',
  question TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS parent_qna_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES parent_qna_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  is_teacher BOOLEAN DEFAULT false,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS parent_qna_hearts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(target_id, author_name)
);
ALTER TABLE parent_qna_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_qna_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_qna_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pqna_all" ON parent_qna_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pqna_ans_all" ON parent_qna_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pqna_hearts_all" ON parent_qna_hearts FOR ALL USING (true) WITH CHECK (true);
