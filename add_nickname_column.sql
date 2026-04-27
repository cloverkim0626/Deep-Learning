-- Supabase에서 실행: students 테이블에 nickname 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT NULL;

-- 확인
SELECT name, nickname FROM students LIMIT 5;
