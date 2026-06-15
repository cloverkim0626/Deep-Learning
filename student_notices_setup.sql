-- 학생 공지사항 테이블 생성
CREATE TABLE IF NOT EXISTS student_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  class_name TEXT DEFAULT '전체', -- '전체' 또는 특정 반 이름 (예: '고3금토반')
  author_name TEXT NOT NULL DEFAULT '선생님',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화 및 권한 설정
ALTER TABLE student_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snotice_all" ON student_notices;
CREATE POLICY "snotice_all" ON student_notices FOR ALL TO public USING (true) WITH CHECK (true);
