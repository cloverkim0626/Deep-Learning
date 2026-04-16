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
  // Step 1: 학생 배당 목록 조회 (join 없이)
  const { data: assignments, error: aErr } = await supabase
    .from('set_assignments')
    .select('id, set_id, status, student_name, student_class')
    .eq('student_name', studentName)
    .or('status.eq.active,status.is.null');

  if (aErr) throw aErr;
  if (!assignments || assignments.length === 0) return [];

  // Step 2: 해당 set_ids의 word_sets + words 조회
  const setIds = assignments.map((a: Record<string, unknown>) => a.set_id as string);
  const { data: wordSets, error: wErr } = await supabase
    .from('word_sets')
    .select('*, words(*)')
    .in('id', setIds);

  if (wErr) throw wErr;

  // Step 3: 수동 merge — word_sets 기준으로 반환
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wordSets || []).map((ws: any) => ({
    ...ws,
    passage_number: ws.passage_number || '',
    sub_sub_category: ws.sub_sub_category || '',
  }));
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
  // Step 1: set_assignments 전체 조회 (join 없이)
  const { data: assignments, error: aErr } = await supabase
    .from('set_assignments')
    .select('id, student_name, student_class, set_id, status, completed_at, created_at')
    .order('student_name', { ascending: true })
    .order('created_at', { ascending: false });

  if (aErr) {
    console.error('[getAllAssignments] DB error:', aErr);
    throw aErr;
  }

  if (!assignments || assignments.length === 0) return [];

  // Step 2: 관련 word_sets 조회
  const setIds = [...new Set(assignments.map((a: Record<string, unknown>) => a.set_id as string))];
  const { data: wordSets, error: wErr } = await supabase
    .from('word_sets')
    .select('id, label, workbook, chapter')
    .in('id', setIds);

  if (wErr) {
    console.error('[getAllAssignments] word_sets error:', wErr);
    // word_sets 조회 실패해도 배당 목록은 표시
  }

  // Step 3: 수동 merge
  const wsMap: Record<string, { id: string; label: string; workbook: string; chapter: string }> = {};
  (wordSets || []).forEach((ws: Record<string, unknown>) => {
    wsMap[ws.id as string] = ws as { id: string; label: string; workbook: string; chapter: string };
  });

  return (assignments as Record<string, unknown>[]).map((row) => ({
    ...row,
    created_at: row.created_at || new Date().toISOString(),
    word_sets: wsMap[row.set_id as string] || null,
  }));
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
