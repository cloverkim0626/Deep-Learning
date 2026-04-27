ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS essay_sentences JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS essay_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id      UUID REFERENCES word_sets(id) ON DELETE CASCADE,
  sentence_idx    INT NOT NULL,
  sentence_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL,
  extra_condition TEXT DEFAULT '',
  question_text   TEXT NOT NULL DEFAULT '',
  model_answer    TEXT DEFAULT '',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS essay_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID REFERENCES essay_questions(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  student_answer  TEXT NOT NULL DEFAULT '',
  ai_score        INT,
  ai_feedback     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS essay_prompt_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key         TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  question_prompt  TEXT NOT NULL DEFAULT '',
  scoring_prompt   TEXT NOT NULL DEFAULT '',
  sort_order       INT DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE essay_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_essay_questions" ON essay_questions;
DROP POLICY IF EXISTS "allow_all_essay_submissions" ON essay_submissions;
DROP POLICY IF EXISTS "allow_all_essay_prompt_templates" ON essay_prompt_templates;

CREATE POLICY "allow_all_essay_questions" ON essay_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_essay_submissions" ON essay_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_essay_prompt_templates" ON essay_prompt_templates FOR ALL USING (true) WITH CHECK (true);

INSERT INTO essay_prompt_templates (type_key, display_name, sort_order, question_prompt, scoring_prompt)
VALUES
  ('조건부영작', '조건부 영작', 1, '프롬프트를 여기 입력하세요. 사용 가능한 placeholder: {sentence} {extra_condition}', '채점 프롬프트를 여기 입력하세요. 사용 가능한 placeholder: {question_text} {model_answer} {student_answer}'),
  ('배열영작', '배열 영작', 2, '프롬프트를 여기 입력하세요.', '채점 프롬프트를 여기 입력하세요.'),
  ('요약빈칸', '요약문 빈칸 영작', 3, '프롬프트를 여기 입력하세요.', '채점 프롬프트를 여기 입력하세요.'),
  ('전체요약', '요약문 전체 영작', 4, '프롬프트를 여기 입력하세요.', '채점 프롬프트를 여기 입력하세요.'),
  ('주제문영작', '주제문 영작', 5, '프롬프트를 여기 입력하세요.', '채점 프롬프트를 여기 입력하세요.')
ON CONFLICT (type_key) DO NOTHING;
