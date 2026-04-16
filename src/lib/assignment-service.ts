import { supabase } from './supabase';

/**
 * Assign a specific Word Set (Passage) to a list of students
 * students: array of { name, class } objects
 */
export async function assignSetToStudents(setId: string, students: { name: string; class: string }[]) {
  const inserts = students.map(s => ({
    student_name: s.name,
    student_class: s.class,
    set_id: setId,
    status: 'active',
  }));

  const { error } = await supabase
    .from('set_assignments')
    .upsert(inserts, { onConflict: 'student_name,set_id' });

  if (error) throw error;
  return { success: true };
}

/**
 * Get all ACTIVE Word Sets assigned to a specific student (by name)
 * Excludes completed/expired assignments from student view.
 */
export async function getAssignmentsByStudent(studentName: string) {
  const { data, error } = await supabase
    .from('set_assignments')
    .select('*, word_sets(*, words(*))')
    .eq('student_name', studentName)
    .or('status.eq.active,status.is.null'); // backward compat: null = active

  if (error) throw error;
  return data
    .filter(d => d.word_sets) // skip orphan assignments
    .map(d => ({ ...d.word_sets, passage_number: d.word_sets?.passage_number || '' }));
}

/**
 * Log a wrong answer for a student (name-based)
 */
export async function logWrongAnswer(
  studentName: string,
  wordId: string,
  mode: string = 'vocab'
) {
  const { data: existing } = await supabase
    .from('wrong_answers')
    .select('*')
    .eq('student_id', studentName)  // student_id column stores name as TEXT
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
        student_id: studentName,  // student_id column stores name as TEXT
        word_id: wordId,
        mode,
        wrong_count: 1
      }]);
    if (error) throw error;
  }
  return { success: true };
}

export type TimeFilter = '1d' | '3d' | '1w' | '1m' | 'all';

/**
 * Get wrong answers for a student (name-based) with optional time filter
 */
export async function getWrongAnswers(studentName: string, timeFilter: TimeFilter = 'all') {
  let query = supabase
    .from('wrong_answers')
    .select('*, words(*)')
    .eq('student_id', studentName)
    .order('wrong_count', { ascending: false });

  if (timeFilter !== 'all') {
    const now = new Date();
    const filterMap: Record<string, number> = {
      '1d': 1,
      '3d': 3,
      '1w': 7,
      '1m': 30,
    };
    const days = filterMap[timeFilter] || 0;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get all assignments grouped by student (for admin view)
 * Includes status field for filtering
 */
export async function getAllAssignments() {
  const { data, error } = await supabase
    .from('set_assignments')
    .select('id, student_name, student_class, set_id, created_at, status, word_sets(id, label, workbook, chapter, passage_number)')
    .order('student_name')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Update assignment status: 'active' | 'completed' | 'expired'
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  status: 'active' | 'completed' | 'expired'
) {
  const { error } = await supabase
    .from('set_assignments')
    .update({ status, completed_at: status !== 'active' ? new Date().toISOString() : null })
    .eq('id', assignmentId);
  if (error) throw error;
}

/**
 * Remove a single assignment (does NOT delete the word set)
 */
export async function removeAssignment(assignmentId: string) {
  const { error } = await supabase
    .from('set_assignments')
    .delete()
    .eq('id', assignmentId);
  if (error) throw error;
}

/**
 * Get which students already have a specific set assigned (active)
 */
export async function getAssignedStudentsForSet(setId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('set_assignments')
    .select('student_name')
    .eq('set_id', setId)
    .or('status.eq.active,status.is.null');
  if (error) throw error;
  return (data || []).map(d => d.student_name);
}
