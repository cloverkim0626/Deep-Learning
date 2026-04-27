-- ======================================================
-- 신규 테이블: word_etymology (어원 캐시)
-- ======================================================
CREATE TABLE IF NOT EXISTS word_etymology (
  word_id   UUID PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
  parts     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 누구나 읽기 가능, 서버만 쓰기 (anon key로 upsert 허용)
ALTER TABLE word_etymology ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etymology_read" ON word_etymology;
CREATE POLICY "etymology_read" ON word_etymology FOR SELECT USING (true);
DROP POLICY IF EXISTS "etymology_write" ON word_etymology;
CREATE POLICY "etymology_write" ON word_etymology FOR ALL USING (true);

-- ======================================================
-- 오답선지 캐시 초기화 (프롬프트 변경 후 재생성 필요)
-- ======================================================
TRUNCATE TABLE word_distractors;

-- ======================================================
-- 확인 쿼리
-- ======================================================
SELECT 'word_etymology' AS table_name, COUNT(*) FROM word_etymology
UNION ALL
SELECT 'word_distractors', COUNT(*) FROM word_distractors;
