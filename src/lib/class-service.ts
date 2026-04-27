import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClassColor = 'indigo' | 'rose' | 'teal' | 'amber' | 'violet';

export type ClassScheduleItem = {
  day: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string;     // "HH:mm" — 시작
  end_time: string; // "HH:mm" — 종료 (NEW)
};

export type ClassRow = {
  id: string;
  academy_name: string;          // NEW
  name: string;
  color: ClassColor;
  schedule: ClassScheduleItem[];
  clinic_schedule: ClassScheduleItem[]; // NEW
  description: string;
  opened_at: string;             // NEW — "YYYY-MM-DD"
  created_at: string;
};

export type ClassStudent = {
  id: string;
  class_id: string;
  student_name: string;
  student_class: string;
  enrolled_at: string;
};

export type ClassSession = {
  id: string;
  class_id: string;
  session_date: string; // "YYYY-MM-DD"
  session_type: string; // "class" | "clinic"
  note: string;
  created_at: string;
};

export type AttendanceStatus = 'present' | 'late' | 'absent';
export type MakeupType = '' | 'direct' | 'video';

export type AttendanceRow = {
  id: string;
  session_id: string;
  student_name: string;
  status: AttendanceStatus;
  late_reason: string;
  late_arrival_time: string;
  makeup_type: MakeupType;
  makeup_date: string | null;
  makeup_video_date: string | null;
  note: string;
  created_at: string;
};

export type HwType = 'general' | 'vocab_test' | 'passage_read' | 'essay';

export type HomeworkSlot = {
  id: string;
  session_id: string;
  title: string;
  hw_type: HwType;
  set_id: string | null;
  sort_order: number;
  created_at: string;
};

export type HwStatus = 'pending' | 'done' | 'delayed' | 'skipped';

export type HomeworkCheck = {
  id: string;
  slot_id: string;
  student_name: string;
  status: HwStatus;
  delayed_to: string | null;
  delayed_from_session_id: string | null;
  checked_at: string | null;
  note: string;
  created_at: string;
};

// ─── Weekly View Type ─────────────────────────────────────────────────────────

export type WeekColumn = {
  date: string;      // "YYYY-MM-DD"
  dayName: string;   // '월'|...
  time: string;
  end_time: string;
  is_clinic: boolean;
  session: ClassSession | null;
};

export type WeekData = {
  columns: WeekColumn[];
  attMap: Record<string, Record<string, AttendanceRow>>; // date → student → row
  slots:  Record<string, HomeworkSlot[]>;                // session_id → slots
  checks: Record<string, Record<string, HomeworkCheck>>; // slot_id → student → check
};

// ─── Helper: Date Utils ───────────────────────────────────────────────────────

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_OFFSET: Record<string, number> = {
  '월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6,
};

export function getDateForDay(weekStart: Date, dayName: string): Date {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + (DAY_OFFSET[dayName] ?? 0));
  return d;
}

export function getWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const m = weekStart.getMonth() + 1;
  const wNum = Math.ceil(weekStart.getDate() / 7);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${weekStart.getFullYear()}년 ${m}월 ${wNum}주차 (${fmt(weekStart)} - ${fmt(weekEnd)})`;
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function getClasses(): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('opened_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ClassRow[];
}

export async function createClass(payload: {
  academy_name: string;
  name: string;
  color: ClassColor;
  schedule: ClassScheduleItem[];
  clinic_schedule?: ClassScheduleItem[];
  description?: string;
  opened_at?: string;
}): Promise<ClassRow> {
  const { data, error } = await supabase
    .from('classes')
    .insert([{
      academy_name: payload.academy_name,
      name: payload.name,
      color: payload.color,
      schedule: payload.schedule,
      clinic_schedule: payload.clinic_schedule || [],
      description: payload.description || '',
      opened_at: payload.opened_at || toDateStr(new Date()),
    }])
    .select().single();
  if (error) throw error;
  return data as ClassRow;
}

export async function updateClass(id: string, payload: Partial<{
  academy_name: string;
  name: string;
  color: ClassColor;
  schedule: ClassScheduleItem[];
  clinic_schedule: ClassScheduleItem[];
  description: string;
  opened_at: string;
}>): Promise<void> {
  const { error } = await supabase.from('classes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Class Students ───────────────────────────────────────────────────────────

export async function getClassStudents(classId: string): Promise<ClassStudent[]> {
  const { data, error } = await supabase
    .from('class_students')
    .select('*')
    .eq('class_id', classId)
    .order('student_name', { ascending: true });
  if (error) throw error;
  return (data || []) as ClassStudent[];
}

export async function addStudentToClass(
  classId: string, studentName: string, studentClass: string
): Promise<void> {
  const { error } = await supabase
    .from('class_students')
    .upsert([{ class_id: classId, student_name: studentName, student_class: studentClass }],
      { onConflict: 'class_id,student_name' });
  if (error) throw error;
}

export async function removeStudentFromClass(classId: string, studentName: string): Promise<void> {
  const { error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_name', studentName);
  if (error) throw error;
}

// ─── Class Sessions ───────────────────────────────────────────────────────────

export async function getClassSessions(classId: string): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('class_id', classId)
    .order('session_date', { ascending: false });
  if (error) throw error;
  return (data || []) as ClassSession[];
}

/** 특정 날짜 목록에 해당하는 세션만 로드 (주간 뷰용) */
export async function getSessionsForWeek(classId: string, weekDates: string[]): Promise<ClassSession[]> {
  if (weekDates.length === 0) return [];
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('class_id', classId)
    .in('session_date', weekDates)
    .order('session_date', { ascending: true });
  if (error) throw error;
  return (data || []) as ClassSession[];
}

export async function createSession(
  classId: string, sessionDate: string, sessionType: string = 'class', note?: string
): Promise<ClassSession> {
  const { data, error } = await supabase
    .from('class_sessions')
    .upsert([{
      class_id: classId, session_date: sessionDate,
      session_type: sessionType, note: note || '',
    }], { onConflict: 'class_id,session_date' })
    .select().single();
  if (error) throw error;
  return data as ClassSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('class_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRow[]> {
  const { data, error } = await supabase
    .from('attendance').select('*').eq('session_id', sessionId);
  if (error) throw error;
  return (data || []) as AttendanceRow[];
}

/** 여러 세션 한 번에 조회 (주간 뷰용) */
export async function getAttendanceForSessions(sessionIds: string[]): Promise<AttendanceRow[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('attendance').select('*').in('session_id', sessionIds);
  if (error) throw error;
  return (data || []) as AttendanceRow[];
}

export async function upsertAttendance(row: {
  session_id: string;
  student_name: string;
  status: AttendanceStatus;
  late_reason?: string;
  late_arrival_time?: string;
  makeup_type?: MakeupType;
  makeup_date?: string | null;
  makeup_video_date?: string | null;
  note?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .upsert([{
      session_id: row.session_id,
      student_name: row.student_name,
      status: row.status,
      late_reason: row.late_reason || '',
      late_arrival_time: row.late_arrival_time || '',
      makeup_type: row.makeup_type || '',
      makeup_date: row.makeup_date || null,
      makeup_video_date: row.makeup_video_date || null,
      note: row.note || '',
    }], { onConflict: 'session_id,student_name' });
  if (error) throw error;
}

export async function markAllPresent(sessionId: string, studentNames: string[]): Promise<void> {
  if (studentNames.length === 0) return;
  const rows = studentNames.map(name => ({
    session_id: sessionId, student_name: name, status: 'present' as AttendanceStatus,
    late_reason: '', late_arrival_time: '', makeup_type: '' as MakeupType,
  }));
  const { error } = await supabase
    .from('attendance').upsert(rows, { onConflict: 'session_id,student_name' });
  if (error) throw error;
}

// ─── Homework Slots ───────────────────────────────────────────────────────────

export async function getHomeworkSlots(sessionId: string): Promise<HomeworkSlot[]> {
  const { data, error } = await supabase
    .from('homework_slots').select('*').eq('session_id', sessionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as HomeworkSlot[];
}

/** 여러 세션 한 번에 조회 (주간 뷰용) */
export async function getHomeworkSlotsForSessions(sessionIds: string[]): Promise<HomeworkSlot[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('homework_slots').select('*').in('session_id', sessionIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as HomeworkSlot[];
}

export async function createHomeworkSlot(payload: {
  session_id: string; title: string; hw_type: HwType; set_id?: string | null; sort_order?: number;
}): Promise<HomeworkSlot> {
  const { data, error } = await supabase
    .from('homework_slots')
    .insert([{ ...payload, set_id: payload.set_id || null, sort_order: payload.sort_order || 0 }])
    .select().single();
  if (error) throw error;
  return data as HomeworkSlot;
}

export async function deleteHomeworkSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('homework_slots').delete().eq('id', slotId);
  if (error) throw error;
}

// ─── Homework Checks ──────────────────────────────────────────────────────────

export async function getHomeworkChecks(slotIds: string[]): Promise<HomeworkCheck[]> {
  if (slotIds.length === 0) return [];
  const { data, error } = await supabase
    .from('homework_checks').select('*').in('slot_id', slotIds);
  if (error) throw error;
  return (data || []) as HomeworkCheck[];
}

export async function upsertHomeworkCheck(payload: {
  slot_id: string; student_name: string; status: HwStatus;
  delayed_to?: string | null; delayed_from_session_id?: string | null; note?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('homework_checks')
    .upsert([{
      slot_id: payload.slot_id,
      student_name: payload.student_name,
      status: payload.status,
      delayed_to: payload.delayed_to || null,
      delayed_from_session_id: payload.delayed_from_session_id || null,
      note: payload.note || '',
      checked_at: payload.status === 'done' ? new Date().toISOString() : null,
    }], { onConflict: 'slot_id,student_name' });
  if (error) throw error;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export async function getAttendanceSummaryForClass(classId: string): Promise<{
  student_name: string; present: number; late: number; absent: number; total: number;
}[]> {
  const { data: sessions } = await supabase
    .from('class_sessions').select('id').eq('class_id', classId);
  const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('attendance').select('student_name, status').in('session_id', sessionIds);
  if (error) throw error;

  const map: Record<string, { present: number; late: number; absent: number }> = {};
  for (const row of (data || [])) {
    if (!map[row.student_name]) map[row.student_name] = { present: 0, late: 0, absent: 0 };
    if (row.status === 'present') map[row.student_name].present++;
    else if (row.status === 'late') map[row.student_name].late++;
    else if (row.status === 'absent') map[row.student_name].absent++;
  }
  return Object.entries(map).map(([name, counts]) => ({
    student_name: name, ...counts, total: counts.present + counts.late + counts.absent,
  }));
}

export async function getHomeworkSummaryForClass(classId: string): Promise<{
  student_name: string; done: number; pending: number; delayed: number; total: number;
}[]> {
  const { data: sessions } = await supabase
    .from('class_sessions').select('id').eq('class_id', classId);
  const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
  if (sessionIds.length === 0) return [];

  const { data: slots } = await supabase
    .from('homework_slots').select('id').in('session_id', sessionIds);
  const slotIds = (slots || []).map((s: { id: string }) => s.id);
  if (slotIds.length === 0) return [];

  const { data, error } = await supabase
    .from('homework_checks').select('student_name, status').in('slot_id', slotIds);
  if (error) throw error;

  const map: Record<string, { done: number; pending: number; delayed: number }> = {};
  for (const row of (data || [])) {
    if (!map[row.student_name]) map[row.student_name] = { done: 0, pending: 0, delayed: 0 };
    if (row.status === 'done') map[row.student_name].done++;
    else if (row.status === 'delayed') map[row.student_name].delayed++;
    else map[row.student_name].pending++;
  }
  return Object.entries(map).map(([name, counts]) => ({
    student_name: name, ...counts, total: counts.done + counts.pending + counts.delayed,
  }));
}
