-- parent_accounts_setup.sql에 추가 (기존 테이블은 이미 생성된 경우 무시됨)

-- 학부모 공지사항 테이블
CREATE TABLE IF NOT EXISTS parent_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '선생님',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS parent_notice_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id UUID REFERENCES parent_notices(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  is_teacher BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parent_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notice_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pnotice_all" ON parent_notices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pnotice_comment_all" ON parent_notice_comments FOR ALL USING (true) WITH CHECK (true);
