-- ============================================================
-- WOODOK — Full Library Reset
-- Deletes all passages, words, folders, assignments
-- Students are PRESERVED
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Clear test results & sessions
DELETE FROM test_results;
DELETE FROM test_sessions;

-- 2. Clear wrong answers
DELETE FROM wrong_answers;

-- 3. Clear assignments
DELETE FROM set_assignments;

-- 4. Clear folder contents
DELETE FROM folder_passages;

-- 5. Clear folders
DELETE FROM passage_folders;

-- 6. Clear words
DELETE FROM words;

-- 7. Clear word sets (passages)
DELETE FROM word_sets;

-- ✅ Done. Students and Q&A/Clinic data are preserved.
