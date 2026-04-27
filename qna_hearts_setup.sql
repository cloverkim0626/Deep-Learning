-- ─── qna_hearts 테이블 생성 ───────────────────────────────────────────────────
-- post 또는 answer에 하트를 누른 기록을 저장
-- 같은 사람이 같은 대상에 중복 하트 불가 (UNIQUE)

CREATE TABLE IF NOT EXISTS qna_hearts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id   text NOT NULL,          -- qna_posts.id 또는 qna_answers.id
  target_type text NOT NULL CHECK (target_type IN ('post', 'answer')),
  author_name text NOT NULL,          -- 하트 누른 사람
  created_at  timestamptz DEFAULT now(),
  UNIQUE(target_id, author_name)      -- 한 사람이 한 대상에 하트 1개만
);

-- RLS 활성화
ALTER TABLE qna_hearts ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "qna_hearts_select" ON qna_hearts
  FOR SELECT USING (true);

-- 누구나 추가 가능
CREATE POLICY "qna_hearts_insert" ON qna_hearts
  FOR INSERT WITH CHECK (true);

-- 누구나 삭제 가능 (자기 하트 취소용)
CREATE POLICY "qna_hearts_delete" ON qna_hearts
  FOR DELETE USING (true);
