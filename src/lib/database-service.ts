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

export async function saveIngestedPassage(data: {
  workbook: string; chapter: string; label: string; full_text: string; sentences: unknown; words: {
    word: string; pos_abbr: string; korean: string; context?: string; context_korean?: string;
    synonyms: string; antonyms: string; grammar_tip?: string; is_key?: boolean;
  }[];
  category?: string; sub_category?: string; sub_sub_category?: string; passage_number?: string;
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
    is_key: w.is_key ?? false,
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
    .select('*, folder_passages(*, word_sets(id, label, workbook, chapter, words(*)))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFolder(name: string, description: string = '') {
  const { data, error } = await supabase
    .from('passage_folders')
    .insert([{ name, description }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id: string, data: { name?: string; description?: string }) {
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
  question_type: 'synonym' | 'antonym';
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
    .select('*, test_results(*)')
    .eq('student_name', studentName)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
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

// ─── Essay ────────────────────────────────────────────────────────────────────
export async function getEssaySets() {
  const { data, error } = await supabase
    .from('essay_sets')
    .select('*, essay_items(*)');
  if (error) throw error;
  return data;
}
