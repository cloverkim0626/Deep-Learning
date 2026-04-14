import { supabase } from './supabase';

// ─── Word Sets & Words ────────────────────────────────────────────────────────
export async function getWordSets() {
  const { data, error } = await supabase
    .from('word_sets')
    .select('*, words(*)');
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

export async function upsertWord(wordData: any) {
  const { data, error } = await supabase
    .from('words')
    .upsert([wordData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveIngestedPassage(data: { workbook: string, chapter: string, label: string, full_text: string, sentences: any, words: any[] }) {
  // 1. Create the Word Set with hierarchy
  const { data: set, error: setError } = await supabase
    .from('word_sets')
    .insert([{ 
      workbook: data.workbook, 
      chapter: data.chapter, 
      label: data.label, 
      full_text: data.full_text, 
      sentences: data.sentences,
      status: 'published' 
    }])
    .select()
    .single();
  
  if (setError) throw setError;

  // 2. Batch insert the extracted words
  const wordsToInsert = data.words.map(w => ({
    set_id: set.id,
    word: w.word,
    pos_abbr: w.pos_abbr,
    korean: w.korean,
    context: w.context,
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    grammar_tip: w.grammar_tip
  }));

  const { error: wordsError } = await supabase
    .from('words')
    .insert(wordsToInsert);
  
  if (wordsError) throw wordsError;

  return set;
}

// ─── Q&A ──────────────────────────────────────────────────────────────────────
export async function getQnaPosts() {
  const { data, error } = await supabase
    .from('qna_posts')
    .select('*, profiles(full_name, role), qna_answers(*, profiles(full_name, role))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createQnaPost(author_id: string, passage_id: string, question: string) {
  const { data, error } = await supabase
    .from('qna_posts')
    .insert([{ author_id, passage_id, question }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addQnaAnswer(post_id: string, author_id: string, text: string, is_teacher: boolean) {
  const { data, error } = await supabase
    .from('qna_answers')
    .insert([{ post_id, author_id, text, is_teacher }])
    .select()
    .single();
  if (error) throw error;
  
  if (is_teacher) {
    await supabase.from('qna_posts').update({ status: 'answered' }).eq('id', post_id);
  }
  
  return data;
}

// ─── Essay ────────────────────────────────────────────────────────────────────
export async function getEssaySets() {
  const { data, error } = await supabase
    .from('essay_sets')
    .select('*, essay_items(*)');
  if (error) throw error;
  return data;
}
