import { supabase } from './supabase';

// ─── Word Sets & Words ────────────────────────────────────────────────────────
export async function getWordSets() {
  const { data, error } = await supabase
    .from('word_sets')
    .select('*, words(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// AI 튜터용: 단어 미포함, 가벼운 쿼리 (전체 지문 메타데이터 + 원문)
export async function getAllPassagesForTutor() {
  const { data, error } = await supabase
    .from('word_sets')
    .select('id, label, workbook, chapter, sub_category, sub_sub_category, passage_number, full_text')
    .order('workbook', { ascending: true })
    .order('sub_category', { ascending: true })
    .order('passage_number', { ascending: true });
  if (error) throw error;
  return data || [];
}


export async function createWordSet(label: string, subtitle: string, workbook: string = "기타", chapter: string = "기타") {
  const { data, error } = await supabase
    .from('word_sets')
    .insert([{ label, subtitle, workbook, chapter, status: 'draft' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWordSet(id: string, data: { label?: string; full_text?: string; sentences?: any }) {
  const { error } = await supabase
    .from('word_sets')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWordSet(id: string) {
  // Remove from folders and assignments first (FK cascade safety)
  await supabase.from('folder_passages').delete().eq('set_id', id);
  await supabase.from('set_assignments').delete().eq('set_id', id);
  await supabase.from('words').delete().eq('set_id', id);
  const { error } = await supabase
    .from('word_sets')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function upsertWord(wordData: any) {
  const { data, error } = await supabase
    .from('words')
    .upsert([wordData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWord(id: string, data: {
  korean?: string; synonyms?: string; antonyms?: string;
  grammar_tip?: string; context?: string; word?: string; pos_abbr?: string;
  test_synonym?: boolean; test_antonym?: boolean;
}) {
  const { error } = await supabase
    .from('words')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWord(id: string) {
  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) throw error;
}

// 기존 단어 전체 삭제 후 새 단어 삽입 (재분석 교체용)
export async function replaceWordsInSet(
  setId: string,
  fullText: string | undefined,
  words: {
    word: string; pos_abbr: string; korean: string;
    context?: string; context_korean?: string; structure?: string;
    synonyms: string; antonyms: string; grammar_tip?: string;
    test_synonym?: boolean; test_antonym?: boolean;
  }[],
  essaySentences?: { idx: number; text: string; korean: string }[]
) {
  // 1. 기존 단어 전체 삭제
  const { error: delErr } = await supabase.from('words').delete().eq('set_id', setId);
  if (delErr) throw delErr;

  // 2. full_text + essay_sentences 업데이트
  const updatePayload: Record<string, unknown> = {};
  if (fullText !== undefined) updatePayload.full_text = fullText;
  if (essaySentences !== undefined) updatePayload.essay_sentences = essaySentences;
  if (Object.keys(updatePayload).length > 0) {
    const { error: setErr } = await supabase.from('word_sets').update(updatePayload).eq('id', setId);
    if (setErr) throw setErr;
  }

  // 3. 새 단어 삽입
  if (words.length === 0) return;
  const toInsert = words.map(w => ({
    set_id: setId,
    word: w.word,
    pos_abbr: w.pos_abbr,
    korean: w.korean,
    context: w.context || '',
    context_korean: w.context_korean || '',
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    grammar_tip: w.grammar_tip || '',
    test_synonym: w.test_synonym ?? false,
    test_antonym: w.test_antonym ?? false,
  }));
  const { error: insErr } = await supabase.from('words').insert(toInsert);
  if (insErr) throw insErr;
}

export async function saveIngestedPassage(data: {
  workbook: string; chapter: string; label: string; full_text: string; sentences: unknown; words: {
    word: string; pos_abbr: string; korean: string; context?: string; context_korean?: string;
    synonyms: string; antonyms: string; grammar_tip?: string;
    test_synonym?: boolean; test_antonym?: boolean;
  }[];
  category?: string; sub_category?: string; sub_sub_category?: string; passage_number?: string;
  essay_sentences?: { idx: number; text: string; korean: string }[];
}) {
  const { data: set, error: setError } = await supabase
    .from('word_sets')
    .insert([{
      workbook: data.workbook,
      chapter: data.chapter,
      label: data.label,
      full_text: data.full_text,
      sentences: data.sentences,
      status: 'published',
      category: data.category || data.workbook || '',
      sub_category: data.sub_category || data.chapter || '',
      sub_sub_category: data.sub_sub_category || '',
      passage_number: data.passage_number || '',
      essay_sentences: data.essay_sentences || [],
    }])
    .select()
    .single();

  if (setError) throw setError;

  const wordsToInsert = data.words.map(w => ({
    set_id: set.id,
    word: w.word,
    pos_abbr: w.pos_abbr,
    korean: w.korean,
    context: w.context || '',
    context_korean: w.context_korean || '',
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    grammar_tip: w.grammar_tip || '',
    test_synonym: w.test_synonym ?? false,
    test_antonym: w.test_antonym ?? false,
  }));

  const { error: wordsError } = await supabase.from('words').insert(wordsToInsert);
  if (wordsError) throw wordsError;

  return set;
}


// ─── Students ─────────────────────────────────────────────────────────────────
export type StudentData = {
  name: string;
  class_name: string;
  school?: string;
  grade?: number;
  phone?: string;
  gender?: 'M' | 'F' | 'OTHER';
  enrolled_at?: string;
  notes?: string;
  password?: string;
};

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('class_name', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createStudent(data: StudentData) {
  const { data: student, error } = await supabase
    .from('students')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return student;
}

export async function updateStudent(id: string, data: Partial<StudentData>) {
  const { error } = await supabase
    .from('students')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function resetStudentPassword(id: string, password: string = '1234') {
  const { error } = await supabase
    .from('students')
    .update({ password })
    .eq('id', id);
  if (error) throw error;
}

// ─── Folders ──────────────────────────────────────────────────────────────────
export async function getFolders() {
  const { data, error } = await supabase
    .from('passage_folders')
    .select('*, folder_passages(*, word_sets(id, label, workbook, chapter, sub_sub_category, passage_number, full_text, category, sub_category, words(*)))')
    .order('large_category', { ascending: true })
    .order('mid_category',   { ascending: true })
    .order('small_category', { ascending: true })
    .order('name',           { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFolder(payload: {
  name: string;
  description?: string;
  large_category?: string;
  mid_category?: string;
  small_category?: string;
}) {
  const { data, error } = await supabase
    .from('passage_folders')
    .insert([{
      name: payload.name,
      description: payload.description || '',
      large_category: payload.large_category || '',
      mid_category:   payload.mid_category || '',
      small_category: payload.small_category || '',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id: string, data: {
  name?: string;
  description?: string;
  large_category?: string;
  mid_category?: string;
  small_category?: string;
}) {
  const { error } = await supabase
    .from('passage_folders')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase
    .from('passage_folders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function addPassageToFolder(folderId: string, setId: string, orderIndex: number = 0) {
  const { error } = await supabase
    .from('folder_passages')
    .upsert([{ folder_id: folderId, set_id: setId, order_index: orderIndex }], {
      onConflict: 'folder_id,set_id'
    });
  if (error) throw error;
}

export async function removePassageFromFolder(folderId: string, setId: string) {
  const { error } = await supabase
    .from('folder_passages')
    .delete()
    .eq('folder_id', folderId)
    .eq('set_id', setId);
  if (error) throw error;
}

// ─── Test Sessions & Results ───────────────────────────────────────────────────
export async function createTestSession(data: {
  student_name: string;
  set_id?: string;
  folder_id?: string;
  total_questions: number;
  test_type?: 'synonym' | 'vocab' | 'card_game' | 'synonym_drill' | 'vocab_drill' | 'card_game_drill';
  set_ids_json?: string; // 멀티세트 세션 추적용
}) {
  const { data: session, error } = await supabase
    .from('test_sessions')
    .insert([{ ...data }])
    .select()
    .single();
  if (error) throw error;
  return session;
}

export async function completeTestSession(sessionId: string, correctCount: number) {
  const { error } = await supabase
    .from('test_sessions')
    .update({ correct_count: correctCount, completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function saveTestResult(data: {
  session_id: string;
  word_id: string;
  question_type: 'synonym' | 'antonym' | 'vocab_writing';
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
}) {
  const { error } = await supabase
    .from('test_results')
    .insert([data]);
  if (error) throw error;
}

export async function getTestSessionsByStudent(studentName: string) {
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, set_id, test_type, correct_count, total_questions, completed_at, created_at, test_results(*), word_sets(label, passage_number, sub_sub_category)')
    .eq('student_name', studentName)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function getAllTestSessions() {
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_name, set_id, test_type, correct_count, total_questions, completed_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Q&A ──────────────────────────────────────────────────────────────────────
export async function getQnaPosts() {
  const { data, error } = await supabase
    .from('qna_posts')
    .select('*, qna_answers(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createQnaPost(author_name: string, passage_id: string, question: string) {
  const { data, error } = await supabase
    .from('qna_posts')
    .insert([{ author_name, passage_id, question, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addQnaAnswer(post_id: string, author_name: string, text: string, is_teacher: boolean) {
  const { data, error } = await supabase
    .from('qna_answers')
    .insert([{ post_id, author_name, text, is_teacher }])
    .select()
    .single();
  if (error) throw error;
  
  if (is_teacher) {
    await supabase.from('qna_posts').update({ status: 'answered' }).eq('id', post_id);
  }
  
  return data;
}

// ─── Clinic ───────────────────────────────────────────────────────────────────
export async function getClinicQueue() {
  const { data, error } = await supabase
    .from('clinic_queue')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function joinClinicQueue(student_name: string, topic: string) {
  const { data, error } = await supabase
    .from('clinic_queue')
    .insert([{ student_name, topic, status: 'waiting' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClinicStatus(id: string, status: 'waiting' | 'in-progress' | 'completed') {
  const now = new Date().toISOString();
  const extra: Record<string, string> = {};
  if (status === 'in-progress') extra.started_at = now;
  if (status === 'completed') extra.completed_at = now;

  const { error } = await supabase
    .from('clinic_queue')
    .update({ status, ...extra })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteClinicEntry(id: string) {
  const { error } = await supabase
    .from('clinic_queue')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Q&A Delete ───────────────────────────────────────────────────────────────
export async function deleteQnaPost(id: string) {
  const { error } = await supabase
    .from('qna_posts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateQnaPost(id: string, question: string) {
  const { error } = await supabase
    .from('qna_posts')
    .update({ question })
    .eq('id', id);
  if (error) throw error;
}

export async function updateQnaAnswer(answerId: string, text: string) {
  const { error } = await supabase
    .from('qna_answers')
    .update({ text })
    .eq('id', answerId);
  if (error) throw error;
}

export async function deleteQnaAnswer(answerId: string) {
  const { error } = await supabase
    .from('qna_answers')
    .delete()
    .eq('id', answerId);
  if (error) throw error;
}

// ─── Q&A Hearts ───────────────────────────────────────────────────────────────
/** 주어진 target_id 목록의 하트 현황을 반환 { [target_id]: string[] } */
export async function getQnaHearts(targetIds: string[]): Promise<Record<string, string[]>> {
  if (!targetIds.length) return {};
  const { data, error } = await supabase
    .from('qna_hearts')
    .select('target_id, author_name')
    .in('target_id', targetIds);
  if (error) { console.warn('getQnaHearts error:', error.message); return {}; }
  const result: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!result[row.target_id]) result[row.target_id] = [];
    result[row.target_id].push(row.author_name);
  }
  return result;
}

/** 하트 토글 — 이미 누른 경우 취소, 안 누른 경우 추가 */
export async function toggleQnaHeart(
  targetId: string,
  targetType: 'post' | 'answer',
  authorName: string,
  currentLiked: boolean
): Promise<void> {
  if (currentLiked) {
    await supabase.from('qna_hearts')
      .delete()
      .eq('target_id', targetId)
      .eq('author_name', authorName);
  } else {
    await supabase.from('qna_hearts')
      .upsert([{ target_id: targetId, target_type: targetType, author_name: authorName }],
              { onConflict: 'target_id,author_name' });
  }
}

// ─── Essay Prompt Templates ───────────────────────────────────────────────────
export async function getEssayPromptTemplates() {
  const { data, error } = await supabase
    .from('essay_prompt_templates')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertEssayPromptTemplate(template: {
  id?: string; type_key: string; display_name: string;
  question_prompt: string; scoring_prompt: string;
  sort_order?: number; is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('essay_prompt_templates')
    .upsert({ ...template, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEssayPromptTemplate(id: string) {
  const { error } = await supabase.from('essay_prompt_templates').delete().eq('id', id);
  if (error) throw error;
}

// ─── Essay Questions ──────────────────────────────────────────────────────────
export async function getEssayQuestionsByPassage(passageId: string) {
  const { data, error } = await supabase
    .from('essay_questions')
    .select('*')
    .eq('passage_id', passageId)
    .order('sentence_idx', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveEssayQuestion(q: {
  id?: string; passage_id: string; sentence_idx: number; sentence_text: string;
  question_type: string; extra_condition?: string;
  question_text: string; model_answer?: string; is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('essay_questions')
    .upsert(q, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEssayQuestion(id: string) {
  const { error } = await supabase.from('essay_questions').delete().eq('id', id);
  if (error) throw error;
}

export async function updateEssayQuestionAnswer(id: string, model_answer: string) {
  const { error } = await supabase
    .from('essay_questions')
    .update({ model_answer })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleEssayQuestionActive(id: string, is_active: boolean) {
  const { error } = await supabase
    .from('essay_questions')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}

// ─── Essay Submissions ────────────────────────────────────────────────────────
export async function saveEssaySubmission(sub: {
  question_id: string; student_name: string; student_answer: string;
  ai_score?: number; ai_feedback?: string;
}) {
  const { data, error } = await supabase
    .from('essay_submissions')
    .insert(sub)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 즉석 생성 서술형 — question_id FK 없이 저장
export async function saveInstantEssaySubmission(sub: {
  student_name: string; student_answer: string; question_type: string;
  question_text: string; passage_label?: string;
  ai_score?: number; ai_feedback?: string;
}) {
  // essay_submissions 에 question_id 없이 저장 (nullable 컬럼 필요)
  // question_id 컬럼이 NOT NULL이면 무시하고 로컬 로그만 남김
  try {
    const { error } = await supabase
      .from('instant_essay_submissions')
      .insert(sub);
    if (error) console.warn('instant essay save skipped:', error.message);
  } catch { /* ignore */ }
}


export async function getEssaySubmissionsByStudent(studentName: string) {
  const { data, error } = await supabase
    .from('essay_submissions')
    .select('*, essay_questions(question_type, question_text, passage_id)')
    .eq('student_name', studentName)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Passages for Essay (student cascading filter) ────────────────────────────
// AI가 지문에서 직접 문장을 선정하므로 essay_sentences 유무와 무관하게 모든 지문 반환
export async function getAllPassagesForEssay() {
  const { data, error } = await supabase
    .from('word_sets')
    .select('id, label, workbook, chapter, sub_category, sub_sub_category, passage_number, essay_sentences, full_text')
    .order('workbook').order('chapter').order('passage_number');
  if (error) throw error;
  return data ?? [];
}

export async function getEssayQuestionsForStudent(passageId: string) {
  const { data, error } = await supabase
    .from('essay_questions')
    .select('id, question_type, extra_condition, question_text, model_answer, sentence_idx')
    .eq('passage_id', passageId)
    .eq('is_active', true)
    .order('sentence_idx');
  if (error) throw error;
  return data ?? [];
}

// ─── Student Password Change ──────────────────────────────────────────────────
export async function changeStudentPassword(
  name: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 현재 비밀번호 확인
  const { data, error } = await supabase
    .from('students')
    .select('id, password')
    .eq('name', name)
    .eq('password', currentPassword)
    .single();

  if (error || !data) {
    return { success: false, error: '현재 비밀번호가 맞지 않습니다.' };
  }

  // 2. 새 비밀번호로 업데이트
  const { error: updateError } = await supabase
    .from('students')
    .update({ password: newPassword })
    .eq('id', data.id);

  if (updateError) {
    return { success: false, error: '비밀번호 변경에 실패했습니다.' };
  }

  return { success: true };
}

// ─── Nickname ─────────────────────────────────────────────────────────────────
export async function updateStudentNickname(name: string, nickname: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('students')
    .update({ nickname: nickname.trim() || null })
    .eq('name', name);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getStudentNickname(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('students')
    .select('nickname')
    .eq('name', name)
    .single();
  return data?.nickname || null;
}
