import { supabase } from './supabase';

/**
 * Assign a specific Word Set (Passage) to a list of students
 */
export async function assignSetToStudents(setId: string, studentIds: string[]) {
  const inserts = studentIds.map(studentId => ({
    student_id: studentId,
    set_id: setId
  }));

  const { error } = await supabase
    .from('set_assignments')
    .upsert(inserts, { onConflict: 'student_id,set_id' });

  if (error) throw error;
  return { success: true };
}

/**
 * Get all Word Sets assigned to a specific student
 */
export async function getAssignmentsByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('set_assignments')
    .select('*, word_sets(*, words(*))')
    .eq('student_id', studentId);

  if (error) throw error;
  return data.map(d => d.word_sets);
}

/**
 * Log a wrong answer for a student (Vocabulary, Essay, etc.)
 */
export async function logWrongAnswer(studentId: string, wordId: string, mode: string = 'vocab') {
  const { data: existing } = await supabase
    .from('wrong_answers')
    .select('*')
    .eq('student_id', studentId)
    .eq('word_id', wordId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('wrong_answers')
      .update({ 
        wrong_count: (existing.wrong_count || 0) + 1,
        last_attempt: new Date().toISOString()
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('wrong_answers')
      .insert([{
        student_id: studentId,
        word_id: wordId,
        mode,
        wrong_count: 1
      }]);
    if (error) throw error;
  }
  return { success: true };
}

/**
 * Get all words a student has missed
 */
export async function getWrongAnswers(studentId: string) {
  const { data, error } = await supabase
    .from('wrong_answers')
    .select('*, words(*)')
    .eq('student_id', studentId)
    .order('wrong_count', { ascending: false });

  if (error) throw error;
  return data;
}
