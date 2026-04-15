-- ============================================================
-- WOODOK — GUEST Demo Data Insert
-- Run in Supabase SQL Editor
-- Creates: 1 student (게스트), 1 passage with 12 words, 1 assignment
-- ============================================================

-- 1. Insert 게스트 student (idempotent)
INSERT INTO students (name, class_name, password)
VALUES ('게스트', 'GUEST', '0000')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert demo word set
WITH inserted_set AS (
  INSERT INTO word_sets (label, workbook, chapter, full_text, status)
  VALUES (
    'The Power of Habit',
    'DEMO 지문',
    '1강',
    'Habits are powerful forces in our lives. They shape our daily routines and ultimately determine who we become. A habit is a behavior that has been repeated so many times that it becomes automatic. When we cultivate positive habits, we establish a foundation for success. Conversely, detrimental habits can undermine our potential and hinder progress. The key is to deliberately replace negative patterns with constructive ones through consistent effort and perseverance.',
    'published'
  )
  RETURNING id
),
-- 3. Insert 12 demo words
inserted_words AS (
  INSERT INTO words (set_id, word, pos_abbr, korean, context, synonyms, antonyms, grammar_tip)
  SELECT
    inserted_set.id,
    w.word, w.pos_abbr, w.korean, w.context, w.synonyms, w.antonyms, w.grammar_tip
  FROM inserted_set, (VALUES
    ('habit',       'n',   '습관',          'Habits are powerful forces in our lives.',                                        'custom, practice, routine',    'novelty, irregularity, deviation',   '수능에서 habit은 "반복된 행동 패턴"으로 자주 출제됨. custom과 혼용 주의.'),
    ('routine',     'n',   '일상적 절차',    'They shape our daily routines and ultimately determine who we become.',           'procedure, schedule, pattern', 'irregularity, chaos, spontaneity',   'daily routine은 빈출 표현. "벗어나다"는 break from routine.'),
    ('automatic',   'adj', '자동적인',       'it becomes automatic.',                                                           'instinctive, spontaneous, involuntary', 'deliberate, conscious, intentional', '반의어 deliberate와 세트로 출제 빈도 높음.'),
    ('cultivate',   'v',   '계발하다',       'When we cultivate positive habits, we establish a foundation for success.',       'develop, foster, nurture',     'neglect, abandon, suppress',         '수능 빈칸에서 cultivate는 "의도적 노력"의 뉘앙스. grow와 구별.'),
    ('establish',   'v',   '확립하다',       'we establish a foundation for success.',                                          'found, build, institute',      'dissolve, abolish, undermine',       'establish a foundation = 기반을 마련하다. 빈칸 추론 단골.'),
    ('foundation',  'n',   '토대',           'we establish a foundation for success.',                                          'basis, groundwork, cornerstone','obstacle, barrier, hindrance',      'lay/build a foundation 형태로 출제. basis와 유의어 관계.'),
    ('conversely',  'adv', '반대로',         'Conversely, detrimental habits can undermine our potential.',                    'on the contrary, however, oppositely', 'similarly, likewise, correspondingly', '역접 연결어. 빈칸/순서 문제에서 글의 흐름 전환 신호.'),
    ('detrimental', 'adj', '해로운',         'Conversely, detrimental habits can undermine our potential.',                    'harmful, damaging, destructive','beneficial, constructive, advantageous', 'harmful보다 격식체. beneficial과 반의어 세트 출제 빈도 높음.'),
    ('undermine',   'v',   '약화시키다',     'detrimental habits can undermine our potential and hinder progress.',             'weaken, erode, sabotage',      'strengthen, bolster, reinforce',     '건물 "기초를 파다"에서 유래. sap/erode와 함께 수능 빈출.'),
    ('hinder',      'v',   '방해하다',       'detrimental habits can undermine our potential and hinder progress.',             'obstruct, impede, hamper',     'facilitate, assist, accelerate',     'hinder vs. prevent 구분: hinder는 부분적 방해, prevent는 완전 차단.'),
    ('deliberately','adv', '의도적으로',     'The key is to deliberately replace negative patterns with constructive ones.',    'intentionally, consciously, purposely', 'accidentally, inadvertently, instinctively', 'on purpose와 동의어. 무의식(automatic)과 대조 문항 출제.'),
    ('perseverance','n',   '인내',           'through consistent effort and perseverance.',                                     'persistence, tenacity, endurance', 'giving up, surrender, indolence', '수능 주제어로 자주 등장. persist(v) → persistence(n) 파생어 주의.')
  ) AS w(word, pos_abbr, korean, context, synonyms, antonyms, grammar_tip)
  RETURNING set_id
)
-- 4. Assign to 게스트
INSERT INTO set_assignments (set_id, student_name, student_class)
SELECT DISTINCT set_id, '게스트', 'GUEST'
FROM inserted_words;
