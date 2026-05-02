"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Plus, Check, X, ChevronLeft, ChevronRight,
  RefreshCw, Trash2, Settings, BarChart2, FileText,
} from "lucide-react";
import {
  getClasses, getClassStudents, addStudentToClass, removeStudentFromClass,
  getSessionsForWeek, createSession, deleteSession,
  getAttendanceForSessions, upsertAttendance, markAllPresent,
  getHomeworkSlotsForSessions, createHomeworkSlotBatch, deleteHomeworkSlot,
  setSlotStudents, getSlotStudents, getLessonNotes, upsertLessonNote,
  getHomeworkChecks, getRolloverChecksForWeek, upsertHomeworkCheck,
  getAttendanceSummaryForClass, getHomeworkSummaryForClass, updateClass,
  getMonday, addDays, toDateStr, getDateForDay, getWeekLabel,
  ClassRow, ClassStudent, ClassSession, AttendanceRow,
  HomeworkSlot, HomeworkCheck, AttendanceStatus, HwType, HwStatus, MakeupType,
  WeekColumn, WeekData, ClassScheduleItem, ClassColor,
} from "@/lib/class-service";
import { getStudents } from "@/lib/database-service";

// ─── Color + Style helpers ────────────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; border: string; badge: string; light: string }> = {
  indigo: { bg: "bg-indigo-950/30", text: "text-indigo-400", border: "border-indigo-500/30", badge: "bg-indigo-500", light: "bg-indigo-500/10" },
  rose:   { bg: "bg-rose-950/30",   text: "text-rose-400",   border: "border-rose-500/30",   badge: "bg-rose-500",   light: "bg-rose-500/10"   },
  teal:   { bg: "bg-teal-950/30",   text: "text-teal-400",   border: "border-teal-500/30",   badge: "bg-teal-500",   light: "bg-teal-500/10"   },
  amber:  { bg: "bg-amber-950/30",  text: "text-amber-400",  border: "border-amber-500/30",  badge: "bg-amber-500",  light: "bg-amber-500/10"  },
  violet: { bg: "bg-violet-950/30", text: "text-violet-400", border: "border-violet-500/30", badge: "bg-violet-500", light: "bg-violet-500/10" },
};

const ATT_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black",
  late:    "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black",
  absent:  "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black",
};
const ATT_LABEL: Record<AttendanceStatus, string> = {
  present: "출석", late: "지각", absent: "결석",
};
const ATT_SHORT: Record<AttendanceStatus, string> = {
  present: "출", late: "지", absent: "결",
};

// 과제 종류 (테스트는 테스트 버튼으로 별도 처리)
const HW_TYPES: { value: HwType; label: string }[] = [
  { value: 'general',      label: '문제풀이' },
  { value: 'passage_read', label: '워크북' },
  { value: 'test_prep',    label: '테스트준비' },
  { value: 'other',        label: '기타' },
];
const HW_TYPE_LABEL: Record<string, string> = {
  general: '문제풀이', passage_read: '워크북', test_prep: '테스트준비',
  essay: '지문복습', other: '기타', vocab_test: '단어테스트',
};

// ─── Attendance Quick Popup ───────────────────────────────────────────────────
type AttPopup = {
  date: string;
  studentName: string;
  session: ClassSession | null;
  expanded?: 'late' | 'absent';
  lateReason?: string;
  lateTime?: string;
  makeupType?: string;
  makeupDate?: string;
};

type AttRow = { late_reason: string; late_arrival_time: string; makeup_type: MakeupType; makeup_date: string | null; makeup_video_date: string | null };

function AttendancePopup({ popup, onClose, onSave, onQuickSave }: {
  popup: AttPopup;
  onClose: () => void;
  onSave: (status: AttendanceStatus, extra: Partial<AttRow>) => Promise<void>;
  onQuickSave: (status: AttendanceStatus) => Promise<void>;
}) {
  const [state, setState] = useState<AttPopup>(popup);
  const [saving, setSaving] = useState(false);

  const save = async (status: AttendanceStatus) => {
    setSaving(true);
    try {
      if (status === 'present') { await onQuickSave('present'); return; }
      await onSave(status, {
        late_reason: state.lateReason || '',
        late_arrival_time: state.lateTime || '',
        makeup_type: (state.makeupType as MakeupType) || '',
        makeup_date: state.makeupType === 'direct' ? (state.makeupDate || null) : null,
        makeup_video_date: state.makeupType === 'video' ? (state.makeupDate || null) : null,
      } as Partial<AttRow>);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        glass w-72 rounded-2xl border border-foreground/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-foreground/5 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-black text-foreground">{state.studentName}</p>
            <p className="text-[10px] text-accent">{state.date}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-foreground/5 text-accent"><X size={14} /></button>
        </div>
        {/* 3-버튼 */}
        <div className="p-3 grid grid-cols-3 gap-2">
          <button onClick={() => save('present')} disabled={saving}
            className="py-2.5 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all">
            ✅ 출석
          </button>
          <button onClick={() => setState(s => ({ ...s, expanded: state.expanded === 'late' ? undefined : 'late' }))}
            className={`py-2.5 rounded-xl text-[11px] font-black border transition-all ${state.expanded === 'late' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-500 hover:text-white'}`}>
            ⏰ 지각
          </button>
          <button onClick={() => setState(s => ({ ...s, expanded: state.expanded === 'absent' ? undefined : 'absent' }))}
            className={`py-2.5 rounded-xl text-[11px] font-black border transition-all ${state.expanded === 'absent' ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-500 hover:text-white'}`}>
            ❌ 결석
          </button>
        </div>
        {/* 지각 상세 */}
        {state.expanded === 'late' && (
          <div className="px-3 pb-3 space-y-2 border-t border-foreground/5 pt-3">
            <input placeholder="지각 사유" value={state.lateReason || ''} onChange={e => setState(s => ({ ...s, lateReason: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-accent font-bold shrink-0">등원시각</label>
              <input type="time" value={state.lateTime || ''} onChange={e => setState(s => ({ ...s, lateTime: e.target.value }))}
                className="flex-1 h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
            </div>
            <button onClick={() => save('late')} disabled={saving}
              className="w-full h-9 rounded-xl bg-amber-500 text-white text-[12px] font-black hover:-translate-y-0.5 transition-all">
              {saving ? "..." : "지각으로 저장"}
            </button>
          </div>
        )}
        {/* 결석 상세 */}
        {state.expanded === 'absent' && (
          <div className="px-3 pb-3 space-y-2 border-t border-foreground/5 pt-3">
            <div className="grid grid-cols-3 gap-1.5">
              {[['', '미설정'], ['direct', '직접보강'], ['video', '영상보강']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setState(s => ({ ...s, makeupType: val }))}
                  className={`py-1.5 rounded-lg text-[10px] font-black border transition-all ${state.makeupType === val ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-accent'}`}>
                  {label}
                </button>
              ))}
            </div>
            {(state.makeupType === 'direct' || state.makeupType === 'video') && (
              <input type="date" value={state.makeupDate || ''} onChange={e => setState(s => ({ ...s, makeupDate: e.target.value }))}
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none" />
            )}
            <button onClick={() => save('absent')} disabled={saving}
              className="w-full h-9 rounded-xl bg-rose-500 text-white text-[12px] font-black hover:-translate-y-0.5 transition-all">
              {saving ? "..." : "결석으로 저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 과제 모달 (학생×세션) ────────────────────────────────────────────────────
function HomeworkModal({ session, studentName, slots, checks, onClose, onCheckChange }: {
  session: ClassSession; studentName: string; slots: HomeworkSlot[];
  checks: Record<string, HomeworkCheck>; // slot_id → check
  onClose: () => void;
  onCheckChange: (slotId: string, status: HwStatus, delayedTo?: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const STATUS_ORDER: HwStatus[] = ['pending', 'done', 'delayed', 'skipped'];
  const STATUS_STYLE: Record<HwStatus, string> = {
    pending: "border-foreground/20 text-foreground/40",
    done:    "bg-emerald-500 border-emerald-500 text-white",
    delayed: "bg-amber-400 border-amber-400 text-white",
    skipped: "bg-slate-200 border-slate-200 text-slate-500",
  };
  const STATUS_LABEL: Record<HwStatus, string> = {
    pending: "미제출", done: "완료 ✓", delayed: "연기", skipped: "면제",
  };

  const toggle = async (slotId: string, current?: HwStatus) => {
    const cur = current || 'pending';
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setSaving(slotId);
    try {
      await upsertHomeworkCheck({ slot_id: slotId, student_name: studentName, status: next });
      onCheckChange(slotId, next);
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-sm rounded-2xl border border-foreground/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-foreground/5 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-black text-foreground">{studentName}</p>
            <p className="text-[10px] text-accent">{session.session_date} 과제현황</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent"><X size={15} /></button>
        </div>
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {slots.length === 0 ? (
            <p className="text-[12px] text-accent text-center py-4">이 세션에 과제가 없습니다</p>
          ) : slots.map(slot => {
            const check = checks[slot.id];
            const status: HwStatus = check?.status || 'pending';
            return (
              <div key={slot.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-foreground/3 border border-foreground/5">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-foreground truncate">{slot.title}</p>
                  <p className="text-[9px] text-accent">{HW_TYPE_LABEL[slot.hw_type]}</p>
                </div>
                <button onClick={() => toggle(slot.id, status)} disabled={saving === slot.id}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${STATUS_STYLE[status]} hover:-translate-y-0.5`}>
                  {saving === slot.id ? "..." : STATUS_LABEL[status]}
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-foreground/5">
          <button onClick={onClose} className="w-full h-10 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all">닫기</button>
        </div>
      </div>
    </div>
  );
}

// ─── 과제 추가 모달 (다중 + 학생배당 + 날짜) ──────────────────────────────────
type HwDraft = {
  id: number; title: string; hw_type: HwType;
  assigned_at: string; due_date: string;
  test_range: string; max_score: string; pass_score: string; is_pf: boolean;
};

function AddHomeworkModal({ session, allStudents, onClose, onAdded }: {
  session: ClassSession;
  allStudents: ClassStudent[];
  onClose: () => void;
  onAdded: (slots: HomeworkSlot[]) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<HwDraft[]>([{
    id: 1, title: '', hw_type: 'general', assigned_at: today, due_date: '', test_range: '', max_score: '', pass_score: '', is_pf: false,
  }]);
  const [targetAll, setTargetAll] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const nextId = useRef(2);

  const addItem = () => {
    const last = items[items.length - 1];
    setItems(prev => [...prev, { id: nextId.current++, title: '', hw_type: last.hw_type, assigned_at: last.assigned_at, due_date: last.due_date, test_range: '', max_score: '', pass_score: '', is_pf: false }]);
  };
  const removeItem = (id: number) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: number, patch: Partial<HwDraft>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const toggleStudent = (name: string) => setSelectedStudents(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const handleSave = async () => {
    const valid = items.filter(i => i.title.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const slots = await createHomeworkSlotBatch(valid.map((item, idx) => ({
        session_id: session.id, title: item.title.trim(), hw_type: item.hw_type,
        assigned_at: item.assigned_at, due_date: item.due_date || null,
        test_range: item.hw_type === 'vocab_test' ? (item.test_range || null) : null,
        max_score: item.hw_type === 'vocab_test' && item.max_score ? Number(item.max_score) : null,
        pass_score: item.hw_type === 'vocab_test' && item.pass_score ? Number(item.pass_score) : null,
        is_pf: item.hw_type === 'vocab_test' ? item.is_pf : false, sort_order: idx,
      })));
      if (!targetAll && selectedStudents.length > 0)
        await Promise.all(slots.map(slot => setSlotStudents(slot.id, selectedStudents)));
      onAdded(slots);
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const HW_COLORS: Record<string, string> = {
    general: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    passage_read: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    test_prep: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    other: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-2xl max-h-[92vh] rounded-3xl border border-foreground/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/8 shrink-0">
          <div>
            <h3 className="text-[15px] font-black text-foreground">📝 과제 배당</h3>
            <p className="text-[11px] text-accent mt-0.5">{session.session_date} · 한 번에 여러 과제 등록</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/8 text-accent"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/2 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">과제 {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="ml-auto p-1 text-red-300 hover:text-red-500"><X size={12} /></button>}
              </div>
              <input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })} placeholder="과제 제목" autoFocus={idx === 0}
                className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30" />
              <div className="flex gap-1.5 flex-wrap">
                {HW_TYPES.map(({ value: t, label }) => (
                  <button key={t} onClick={() => updateItem(item.id, { hw_type: t })}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black border-2 transition-all ${item.hw_type === t ? 'bg-foreground text-background border-foreground' : `${HW_COLORS[t] ?? 'bg-foreground/8 text-foreground/50'} border-transparent`}`}>{label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">배당일</label>
                  <input type="date" value={item.assigned_at} onChange={e => updateItem(item.id, { assigned_at: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">마감일 (선택)</label>
                  <input type="date" value={item.due_date} onChange={e => updateItem(item.id, { due_date: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
                </div>
              </div>
              {item.hw_type === 'vocab_test' && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 space-y-2">
                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest block">🎯 단어테스트 설정</label>
                  <input value={item.test_range} onChange={e => updateItem(item.id, { test_range: e.target.value })}
                    placeholder="범위 (예: L1-5 동의어)" className="w-full h-9 px-3 rounded-xl border border-amber-200 bg-white text-[12px] outline-none" />
                  <div className="flex gap-2">
                    <input type="number" value={item.max_score} onChange={e => updateItem(item.id, { max_score: e.target.value })}
                      placeholder="만점" className="flex-1 h-9 px-3 rounded-xl border border-amber-200 bg-white text-[12px] outline-none" />
                    {!item.is_pf && <input type="number" value={item.pass_score} onChange={e => updateItem(item.id, { pass_score: e.target.value })}
                      placeholder="통과기준" className="flex-1 h-9 px-3 rounded-xl border border-amber-200 bg-white text-[12px] outline-none" />}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={item.is_pf} onChange={e => updateItem(item.id, { is_pf: e.target.checked })} className="rounded" />
                    <span className="text-[11px] font-bold text-amber-700">P/F 방식으로 기록</span>
                  </label>
                </div>
              )}
            </div>
          ))}
          <button onClick={addItem} className="w-full h-10 rounded-2xl border-2 border-dashed border-foreground/15 text-[12px] font-black text-accent hover:border-foreground/30 hover:text-foreground transition-all flex items-center justify-center gap-1.5">
            <Plus size={13} /> 과제 항목 추가
          </button>
          <div className="rounded-2xl border border-foreground/10 bg-foreground/2 p-4">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">📌 배당 학생</p>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={targetAll} onChange={e => { setTargetAll(e.target.checked); if (e.target.checked) setSelectedStudents([]); }} className="w-4 h-4 rounded" />
              <span className="text-[13px] font-black text-foreground">전체 학생 ({allStudents.length}명)</span>
            </label>
            {!targetAll && (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                {allStudents.map(s => (
                  <label key={s.student_name} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-xl hover:bg-foreground/5">
                    <input type="checkbox" checked={selectedStudents.includes(s.student_name)} onChange={() => toggleStudent(s.student_name)} className="w-4 h-4 rounded" />
                    <span className="text-[12px] font-bold text-foreground">{s.student_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-foreground/8 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
          <button onClick={handleSave} disabled={items.every(i => !i.title.trim()) || saving}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {saving ? '저장 중...' : `과제 ${items.filter(i => i.title.trim()).length}개 등록`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── 학생 추가 모달 ───────────────────────────────────────────────────────────
function AddStudentModal({ classId, className, existingNames, onClose, onAdded }: {
  classId: string;
  className: string; // 수업관리 반 이름 → students.class_name 동기화
  existingNames: string[];
  onClose: () => void;
  onAdded: (s: ClassStudent) => void;
}) {
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [all, setAll] = useState<{ name: string; class_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("1234");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    getStudents().then(d => setAll((d || []) as { name: string; class_name: string }[])).catch(() => {});
  }, []);

  const filtered = all.filter(s =>
    !existingNames.includes(s.name) &&
    (s.name.includes(search) || s.class_name.includes(search))
  );

  // 새 학생 직접 등록 (students + class_students 동시 생성)
  const handleAddNew = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(name);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      // 1) students 테이블에 없으면 생성, 있으면 class_name 업데이트
      const { data: existing } = await sb.from('students').select('id').eq('name', name).maybeSingle();
      if (!existing) {
        const { error: insErr } = await sb.from('students').insert({ name, class_name: className, password: newPw });
        if (insErr) throw insErr;
      } else {
        await sb.from('students').update({ class_name: className }).eq('name', name);
      }
      // 2) class_students에 추가
      await addStudentToClass(classId, name, className);
      onAdded({ id: "", class_id: classId, student_name: name, student_class: className, enrolled_at: "" });
      setNewName("");
      onClose();
    } catch (e) { alert((e as Error).message); }
    finally { setAdding(null); }
  };

  // 기존 students 중 선택하여 추가
  const handleAddExisting = async (s: { name: string; class_name: string }) => {
    setAdding(s.name);
    try {
      // 1) class_students에 추가
      await addStudentToClass(classId, s.name, className);
      // 2) students.class_name 동기화 (수강생관리 필터 반영용)
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await sb.from('students').update({ class_name: className }).eq('name', s.name);
      onAdded({ id: "", class_id: classId, student_name: s.name, student_class: className, enrolled_at: "" });
    } catch (e) { alert((e as Error).message); }
    finally { setAdding(null); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-sm rounded-2xl border border-foreground/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-foreground/5 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-black text-foreground">학생 추가</h3>
            <p className="text-[10px] text-accent mt-0.5">{className}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent"><X size={15} /></button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-foreground/5">
          {(['new', 'existing'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[12px] font-black border-b-2 transition-all ${
                tab === t ? 'text-foreground border-foreground' : 'text-accent border-transparent'
              }`}>
              {t === 'new' ? '✏️ 새 학생 등록' : '📋 기존 학생 선택'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'new' ? (
            <div className="space-y-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                placeholder="학생 이름"
                autoFocus
                className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-accent whitespace-nowrap">초기 비밀번호</span>
                <input
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30"
                />
              </div>
              <p className="text-[10px] text-accent/60">→ students 테이블 자동 생성 + 로그인 화면에 즉시 반영</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-foreground/10 text-[12px] font-black text-accent">취소</button>
                <button
                  onClick={handleAddNew}
                  disabled={!newName.trim() || !!adding}
                  className="flex-1 h-10 rounded-xl bg-foreground text-background text-[12px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30"
                >
                  {adding ? '추가 중...' : '등록 + 추가'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 반 검색..."
                autoFocus
                className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30 mb-3" />
              <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                {filtered.length === 0 ? (
                  <p className="text-[12px] text-accent text-center py-6">추가할 학생이 없습니다</p>
                ) : filtered.map(s => (
                  <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-foreground/5">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-accent">{s.class_name}</p>
                    </div>
                    <button onClick={() => handleAddExisting(s)} disabled={adding === s.name}
                      className="h-8 px-3 rounded-xl bg-foreground text-background text-[11px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                      {adding === s.name ? '...' : '추가'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <button onClick={onClose} className="w-full h-10 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">닫기</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 리포트 패널 ──────────────────────────────────────────────────────────────
function ReportPanel({ classId }: { classId: string }) {
  const [attSummary, setAttSummary] = useState<{ student_name: string; present: number; late: number; absent: number; total: number }[]>([]);
  const [hwSummary, setHwSummary] = useState<{ student_name: string; done: number; pending: number; delayed: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([getAttendanceSummaryForClass(classId), getHomeworkSummaryForClass(classId)]);
      setAttSummary(a);
      setHwSummary(h);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-black text-foreground">종합 리포트</h2>
        <button onClick={load} className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground transition-all">
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {/* 출결 */}
      <div>
        <h3 className="text-[14px] font-black text-foreground mb-3">📋 출결 현황</h3>
        {attSummary.length === 0 ? <p className="text-[12px] text-accent">데이터 없음</p> : (
          <div className="glass rounded-2xl border border-foreground/5 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-foreground/5">
                <th className="text-left px-4 py-2.5 font-black text-foreground/40">학생</th>
                <th className="text-center px-3 py-2.5 font-black text-emerald-600">출석</th>
                <th className="text-center px-3 py-2.5 font-black text-amber-600">지각</th>
                <th className="text-center px-3 py-2.5 font-black text-rose-600">결석</th>
                <th className="text-center px-3 py-2.5 font-black text-foreground/40">출석률</th>
              </tr></thead>
              <tbody className="divide-y divide-foreground/5">
                {attSummary.map(r => {
                  const rate = r.total > 0 ? Math.round(r.present / r.total * 100) : 0;
                  return (
                    <tr key={r.student_name} className="hover:bg-foreground/3">
                      <td className="px-4 py-2.5 font-bold text-foreground">{r.student_name}</td>
                      <td className="text-center px-3 py-2.5 font-black text-emerald-600">{r.present}</td>
                      <td className="text-center px-3 py-2.5 font-black text-amber-600">{r.late}</td>
                      <td className="text-center px-3 py-2.5 font-black text-rose-600">{r.absent}</td>
                      <td className="text-center px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${rate >= 90 ? "bg-emerald-100 text-emerald-700" : rate >= 70 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 과제 */}
      <div>
        <h3 className="text-[14px] font-black text-foreground mb-3">📝 과제 완료율</h3>
        {hwSummary.length === 0 ? <p className="text-[12px] text-accent">데이터 없음</p> : (
          <div className="glass rounded-2xl border border-foreground/5 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-foreground/5">
                <th className="text-left px-4 py-2.5 font-black text-foreground/40">학생</th>
                <th className="text-center px-3 py-2.5 font-black text-emerald-600">완료</th>
                <th className="text-center px-3 py-2.5 font-black text-foreground/40">미제출</th>
                <th className="text-center px-3 py-2.5 font-black text-amber-600">연기</th>
                <th className="text-center px-3 py-2.5 font-black text-foreground/40">완료율</th>
              </tr></thead>
              <tbody className="divide-y divide-foreground/5">
                {hwSummary.map(r => {
                  const rate = r.total > 0 ? Math.round(r.done / r.total * 100) : 0;
                  return (
                    <tr key={r.student_name} className="hover:bg-foreground/3">
                      <td className="px-4 py-2.5 font-bold text-foreground">{r.student_name}</td>
                      <td className="text-center px-3 py-2.5 font-black text-emerald-600">{r.done}</td>
                      <td className="text-center px-3 py-2.5 text-foreground/40">{r.pending}</td>
                      <td className="text-center px-3 py-2.5 font-black text-amber-600">{r.delayed}</td>
                      <td className="text-center px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 테스트 모달 (다중 탭 + 자동 P/F + FAIL 재시험) ────────────────────
type TestEntry = {
  included: boolean;
  score: string;
  resultCode: string; // pass|fail|absent|unattempted|unmemorized|other|verbal_retest
  retryDate: string;
};
type TestConfig = { id: string; name: string; range: string; maxScore: string; passScore: string; };

function mkConfig(n=1): TestConfig {
  return { id: crypto.randomUUID(), name: n===1?'단어테스트':'', range:'', maxScore:'', passScore:'' };
}

function TestSessionModal({ session, students, existingSlot, existingChecks, onClose, onSaved }: {
  session: ClassSession; students: ClassStudent[];
  existingSlot: HomeworkSlot | null; existingChecks: Record<string,HomeworkCheck>;
  onClose: ()=>void; onSaved:(slot:HomeworkSlot,checks:Record<string,HomeworkCheck>)=>void;
}) {
  const [tests, setTests] = useState<TestConfig[]>([mkConfig(1)]);
  const [activeTest, setActiveTest] = useState(0);
  // entries[testIdx][studentName]
  const [allEntries, setAllEntries] = useState<Record<number,Record<string,TestEntry>>>(()=>({
    0: Object.fromEntries(students.map(s=>[s.student_name,{included:true,score:"",resultCode:"",retryDate:""}]))
  }));
  const [saving, setSaving] = useState(false);

  const entries = allEntries[activeTest] || {};
  const cfg = tests[activeTest];

  const upd = (name:string, patch:Partial<TestEntry>) =>
    setAllEntries(prev=>({...prev,[activeTest]:{...prev[activeTest],[name]:{...prev[activeTest][name],...patch}}}));

  const updCfg = (patch:Partial<TestConfig>) =>
    setTests(prev=>prev.map((t,i)=>i===activeTest?{...t,...patch}:t));

  const addTest = () => {
    const idx = tests.length;
    setTests(p=>[...p,mkConfig(idx+1)]);
    setAllEntries(p=>({...p,[idx]:Object.fromEntries(students.map(s=>[s.student_name,{included:true,score:"",resultCode:"",retryDate:""}]))}));
    setActiveTest(idx);
  };

  const getAutoResult = (e:TestEntry):string => {
    if (!e.included) return "excluded";
    // already explicitly set (absent/late/etc.)
    if (["absent","unattempted","unmemorized_retry","late","other","verbal_retest","fail_retry"].includes(e.resultCode)) return e.resultCode;
    if (!e.score) return "";
    const ps = cfg?.passScore ? Number(cfg.passScore) : null;
    if (ps===null) return "";
    return Number(e.score) >= ps ? "pass" : "fail";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let ti=0; ti<tests.length; ti++) {
        const c = tests[ti];
        const ents = allEntries[ti] || {};
        const [slot] = await createHomeworkSlotBatch([{
          session_id: session.id, title: c.name||'테스트', hw_type:'vocab_test',
          test_range: c.range||null, max_score: c.maxScore?Number(c.maxScore):null,
          pass_score: c.passScore?Number(c.passScore):null, is_pf:false,
        }]);
        const newChecks:Record<string,HomeworkCheck>={};
        await Promise.all(students.map(async s=>{
          const e = ents[s.student_name];
          if (!e?.included) return;
          const res = getAutoResult(e);
          const FAIL_CODES=["fail","verbal_retest","fail_retry"];
          const ABSENT_CODES=["absent","unattempted","unmemorized_retry","late","other"];
          const isPassRes = res==="pass"||res==="verbal_retest";
          const isFailRes = FAIL_CODES.includes(res);
          const isSkipped = ABSENT_CODES.includes(res);
          const payload = {
            slot_id:slot.id, student_name:s.student_name,
            status:(isSkipped?"skipped":"done") as HwStatus,
            score: e.score?Number(e.score):null,
            is_pass: isSkipped?null:(isPassRes?true:isFailRes?false:null),
            delay_reason: res==="absent"?"결석":res==="late"?"지각":res==="unattempted"?"미응시":res==="unmemorized_retry"?"미암기재시":res==="other"?"기타":res==="verbal_retest"?"구두재시후귀가":res==="fail_retry"?"추후재응시":null,
            rollover_date: e.retryDate||null,
          };
          await upsertHomeworkCheck(payload);
          newChecks[s.student_name]={...(existingChecks[s.student_name]||{}as HomeworkCheck),...payload};
        }));
        if (ti===0) onSaved(slot,newChecks);
      }
      onClose();
    } catch(err){alert((err as Error).message);}
    finally{setSaving(false);}
  };

  const includedCount = students.filter(s=>entries[s.student_name]?.included).length;
  const doneCount = students.filter(s=>{ const e=entries[s.student_name]; return e?.included && (e.score||e.resultCode); }).length;
  const BG="#ffffff"; const BD="#e2e8f0"; const TXT="#1e293b";

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-[350] flex items-center justify-center p-3"
      style={{background:"rgba(0,0,0,0.65)"}}>
      <div className="w-full max-w-2xl max-h-[94vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        style={{background:'#fff',border:'1.5px solid #e0e7ff'}}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{borderBottom:`1px solid ${BD}`,background:'#eef2ff'}}>
          <div>
            <h3 className="text-[15px] font-black" style={{color:'#4f46e5'}}>🎯 테스트 결과 기록</h3>
            <p className="text-[10px] mt-0.5 font-bold" style={{color:'#6366f1'}}>{session.session_date} · {includedCount}명 해당 · {doneCount}명 입력완료</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{background:'#f1f5f9',color:'#64748b'}}><X size={14}/></button>
        </div>

        {/* 테스트 탭 */}
        <div className="flex items-center gap-1 px-4 pt-2 shrink-0 overflow-x-auto"
          style={{borderBottom:`1px solid ${BD}`}}>
          {tests.map((t,i)=>(
            <button key={t.id} onClick={()=>setActiveTest(i)}
              className="shrink-0 px-3 py-1.5 rounded-t-lg text-[11px] font-black whitespace-nowrap transition-all"
              style={{
                background: activeTest===i?'#eef2ff':'#f8fafc',
                borderBottom: activeTest===i?"2px solid #6366f1":"2px solid transparent",
                color: activeTest===i?'#4f46e5':'#94a3b8',
              }}>
              {t.name||`테스트${i+1}`}
            </button>
          ))}
          <button onClick={addTest}
            className="shrink-0 px-2.5 py-1.5 rounded-t-lg text-[11px] font-black transition-all"
            style={{color:'#4f46e5',background:'#eef2ff'}}>
            + 추가
          </button>
        </div>

        {/* 현재 테스트 설정 */}
        {cfg && (
          <div className="px-4 py-2.5 shrink-0 flex gap-2 items-center flex-wrap"
            style={{borderBottom:`1px solid ${BD}`,background:'#f8fafc'}}>
            <input value={cfg.name} onChange={e=>updCfg({name:e.target.value})} placeholder="테스트명"
              className="h-8 px-3 rounded-lg text-[12px] font-bold outline-none w-32"
              style={{background:'#eef2ff',border:'1px solid #c7d2fe',color:'#4f46e5'}}/>
            <input value={cfg.range} onChange={e=>updCfg({range:e.target.value})} placeholder="범위 (예: L1~5)"
              className="h-8 px-3 rounded-lg text-[12px] outline-none flex-1 min-w-[100px]"
              style={{background:'#f8fafc',border:'1px solid #e2e8f0',color:'#475569'}}/>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black" style={{color:'#6366f1'}}>만점</span>
              <input type="number" value={cfg.maxScore} onChange={e=>updCfg({maxScore:e.target.value})} placeholder="100"
                className="w-14 h-8 px-2 rounded-lg text-[12px] font-bold outline-none text-center"
                style={{background:'#f8fafc',border:'1px solid #e2e8f0',color:TXT}}/>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black" style={{color:'#d97706'}}>합격기준</span>
              <input type="number" value={cfg.passScore} onChange={e=>updCfg({passScore:e.target.value})} placeholder="70"
                className="w-14 h-8 px-2 rounded-lg text-[12px] font-bold outline-none text-center"
                style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'}}/>
              {cfg.maxScore&&cfg.passScore&&(
                <span className="text-[10px] font-bold" style={{color:'#94a3b8'}}>
                  ({Math.round(Number(cfg.passScore)/Number(cfg.maxScore)*100)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 학생 목록 헤더 */}
        <div className="grid px-4 py-1.5 shrink-0 text-[9px] font-black uppercase tracking-widest"
          style={{gridTemplateColumns:"20px 90px 1fr 100px 95px",gap:"8px",borderBottom:`1px solid ${BD}`,color:"#475569",background:'#f8fafc'}}>
          <div/><div>학생</div><div className="text-center">점수</div>
          <div className="text-center">테스트결과</div><div className="text-center">재응시일</div>
        </div>

        {/* 학생 목록 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-1"
          style={{background:'#f8fafc'}}>
          {students.map(stu=>{
            const e=entries[stu.student_name]||{included:true,score:"",resultCode:"",retryDate:""};
            const autoRes = getAutoResult(e);
            const isFail = ["fail","verbal_retest","fail_retry"].includes(autoRes);
            const isPass = autoRes==="pass";
            const isLate = autoRes==="late";
            const isAbsent = ["absent","unattempted","unmemorized_retry","other","late"].includes(autoRes);

            return (
              <div key={stu.student_name}
                className="grid items-center rounded-xl px-2 py-1.5 transition-all"
                style={{
                  gridTemplateColumns:"20px 90px 1fr 100px 95px",gap:"8px",
                  background: !e.included?'#f8fafc':isPass?'#f0fdf4':isFail?'#fef2f2':isAbsent?'#fffbeb':'#ffffff',
                  opacity:e.included?1:0.4,
                  border: isPass?'1px solid #bbf7d0':isFail?'1px solid #fecaca':isAbsent?'1px solid #fde68a':'1px solid #f1f5f9',
                }}>

                {/* 해당자 체크 */}
                <input type="checkbox" checked={e.included} onChange={()=>upd(stu.student_name,{included:!e.included})}
                  className="w-4 h-4 rounded cursor-pointer accent-indigo-500"/>

                {/* 이름 + 결과 뱃지 */}
                <div>
                  <p className="text-[12px] font-black truncate" style={{color:e.included?'#1e293b':'#94a3b8'}}>{stu.student_name}</p>
                  {e.included && autoRes && (
                    <p className="text-[9px] font-black" style={{color:isPass?'#16a34a':isFail?'#dc2626':isAbsent?'#d97706':'#94a3b8'}}>
                      {isPass?"✅ PASS":autoRes==="verbal_retest"?"🗣 구두재시후귀가":autoRes==="fail_retry"?"🔁 추후재응시":autoRes==="fail"?"❌ FAIL":autoRes==="late"?"⏰ 지각":autoRes==="unmemorized_retry"?"📚 미암기재시":""}
                    </p>
                  )}
                </div>

                {/* 점수 입력 */}
                <div className="flex items-center justify-center gap-1">
                  {e.included && !isAbsent && (
                    <>
                      <input type="number" value={e.score}
                        onChange={ev=>upd(stu.student_name,{score:ev.target.value,resultCode:""})}
                        placeholder="0" min={0} max={cfg?.maxScore||undefined}
                        className="w-16 h-7 rounded-lg text-[13px] font-black outline-none text-center"
                        style={{background:e.score?'#eef2ff':'#f8fafc',border:e.score?'1px solid #a5b4fc':'1px solid #e2e8f0',color:'#4f46e5'}}/>
                      {cfg?.maxScore&&<span className="text-[9px]" style={{color:'#94a3b8'}}>/{cfg.maxScore}</span>}
                    </>
                  )}
                </div>

                {/* 테스트결과: 미응시/결석 등 OR FAIL 처리 */}
                <div className="flex justify-center">
                  {e.included && (
                    !e.score && !isAbsent && !isFail ? (
                      <select value={e.resultCode} onChange={ev=>upd(stu.student_name,{resultCode:ev.target.value,score:""})}
                        className="w-full h-7 px-1 rounded-lg text-[9px] font-bold outline-none cursor-pointer"
                        style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'}}>
                        <option value="">— 선택</option>
                        <option value="absent">결석</option>
                        <option value="late">지각</option>
                        <option value="unattempted">미응시</option>
                        <option value="unmemorized_retry">미암기 (추후재시)</option>
                        <option value="other">기타</option>
                      </select>
                    ) : isFail ? (
                      <select value={["fail"].includes(e.resultCode)?"":e.resultCode}
                        onChange={ev=>upd(stu.student_name,{resultCode:ev.target.value||"fail"})}
                        className="w-full h-7 px-1 rounded-lg text-[9px] font-bold outline-none cursor-pointer"
                        style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626'}}>
                        <option value="fail">❌ FAIL — 처리 선택</option>
                        <option value="verbal_retest">🗣 구두재시 후 귀가</option>
                        <option value="fail_retry">🔁 추후 재응시</option>
                      </select>
                    ) : isAbsent ? (
                      <button onClick={()=>upd(stu.student_name,{resultCode:"",score:""})}
                        className="text-[9px] font-black px-2 py-1 rounded-lg transition-all"
                        style={{background:'#fffbeb',color:'#92400e',border:'1px solid #fde68a'}}>
                        ✕ 취소
                      </button>
                    ) : null
                  )}
                </div>

                {/* 재응시일 (추후재응시만) */}
                <div className="flex justify-center">
                  {e.included && (e.resultCode==="fail_retry"||e.resultCode==="unmemorized_retry") && (
                    <input type="date" value={e.retryDate}
                      onChange={ev=>upd(stu.student_name,{retryDate:ev.target.value})}
                      className="w-full h-7 px-1 rounded-lg text-[9px] outline-none"
                      style={{background:'#eef2ff',border:"1px solid rgba(99,102,241,0.25)",color:"#a5b4fc",colorScheme:"dark"}}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 저장 */}
        <div className="px-5 py-3 flex gap-3 shrink-0"
          style={{borderTop:`1px solid ${BD}`,background:'#f8fafc'}}>
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[13px] font-black"
            style={{border:'1px solid #e2e8f0',color:'#64748b'}}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl text-[13px] font-black disabled:opacity-30 transition-all"
            style={{background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white"}}>
            {saving?"저장 중...":"전체 저장 ("+tests.length+"개 테스트)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RolloverPopup({ slotId, studentName, slotTitle, existingCheck, onClose, onSaved }: {
  slotId: string; studentName: string; slotTitle: string;
  existingCheck: HomeworkCheck | null;
  onClose: () => void; onSaved: (check: HomeworkCheck) => void;
}) {
  const [reason, setReason] = useState(existingCheck?.delay_reason || '전체미완');
  const [note, setNote] = useState(existingCheck?.delay_note || '');
  const [rolloverDate, setRolloverDate] = useState(existingCheck?.rollover_date || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertHomeworkCheck({ slot_id: slotId, student_name: studentName, status: 'delayed', delay_reason: reason, delay_note: note, rollover_date: rolloverDate || null });
      onSaved({ ...(existingCheck || {} as HomeworkCheck), slot_id: slotId, student_name: studentName, status: 'delayed', delay_reason: reason, delay_note: note, rollover_date: rolloverDate || null });
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-sm rounded-2xl border border-orange-200 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-black text-foreground">⏩ 이월 처리</h3>
            <p className="text-[11px] text-accent">{studentName} · {slotTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-foreground/5 text-accent"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1.5">미완 사유</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['전체미완', '일부미완', '결석', '기타'].map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`py-2 rounded-xl text-[11px] font-black border-2 transition-all ${reason === r ? 'bg-orange-500 text-white border-orange-500' : 'border-orange-200 text-orange-600'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">메모</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="추가 메모 (선택)"
              className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
          </div>
          <div>
            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">이월 일자</label>
            <input type="date" value={rolloverDate} onChange={e => setRolloverDate(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none focus:border-foreground/30" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-foreground/10 text-[12px] font-black text-accent">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl bg-orange-500 text-white text-[12px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {saving ? '저장 중...' : '이월 확정'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 테스트 결과 팝업 ─────────────────────────────────────────────────────────
function TestResultPopup({ slot, studentName, existingCheck, onClose, onSaved }: {
  slot: HomeworkSlot; studentName: string;
  existingCheck: HomeworkCheck | null;
  onClose: () => void; onSaved: (check: HomeworkCheck) => void;
}) {
  const [score, setScore] = useState(existingCheck?.score?.toString() || '');
  const [isPass, setIsPass] = useState<boolean | null>(existingCheck?.is_pass ?? null);
  const [absent, setAbsent] = useState(existingCheck?.status === 'skipped');
  const [absentReason, setAbsentReason] = useState(existingCheck?.delay_reason || '결석');
  const [rolloverDate, setRolloverDate] = useState(existingCheck?.rollover_date || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = absent
        ? { slot_id: slot.id, student_name: studentName, status: 'skipped' as HwStatus, delay_reason: absentReason, rollover_date: rolloverDate || null }
        : { slot_id: slot.id, student_name: studentName, status: 'done' as HwStatus, score: score ? Number(score) : null, is_pass: slot.is_pf ? isPass : (slot.pass_score && score ? Number(score) >= slot.pass_score : null) };
      await upsertHomeworkCheck(payload);
      onSaved({ ...(existingCheck || {} as HomeworkCheck), ...payload });
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-sm rounded-2xl border border-blue-200 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-black text-foreground">🎯 테스트 결과 기록</h3>
            <p className="text-[11px] text-accent">{studentName} · {slot.title}</p>
            {slot.test_range && <p className="text-[10px] text-accent/70">범위: {slot.test_range}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-foreground/5 text-accent"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={absent} onChange={e => setAbsent(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-[12px] font-bold text-rose-600">미응시</span>
          </label>
          {absent ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {['결석', '미암기', '기타'].map(r => (
                  <button key={r} onClick={() => setAbsentReason(r)}
                    className={`py-1.5 rounded-xl text-[11px] font-black border-2 ${absentReason === r ? 'bg-rose-500 text-white border-rose-500' : 'border-rose-200 text-rose-600'}`}>{r}</button>
                ))}
              </div>
              <input type="date" value={rolloverDate} onChange={e => setRolloverDate(e.target.value)} placeholder="이월 일자"
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] outline-none" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="number" value={score} onChange={e => setScore(e.target.value)}
                  placeholder="점수" max={slot.max_score || undefined}
                  className="flex-1 h-10 px-3 rounded-xl border border-blue-200 bg-white text-[13px] font-bold outline-none text-center" />
                {slot.max_score && <span className="text-[13px] font-black text-accent">/ {slot.max_score}</span>}
              </div>
              {slot.is_pf && (
                <div className="flex gap-2">
                  <button onClick={() => setIsPass(true)} className={`flex-1 py-2 rounded-xl text-[12px] font-black border-2 ${isPass === true ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-200 text-emerald-600'}`}>Pass</button>
                  <button onClick={() => setIsPass(false)} className={`flex-1 py-2 rounded-xl text-[12px] font-black border-2 ${isPass === false ? 'bg-rose-500 text-white border-rose-500' : 'border-rose-200 text-rose-600'}`}>Fail</button>
                </div>
              )}
              {slot.pass_score && !slot.is_pf && score && (
                <p className={`text-[11px] font-black text-center ${Number(score) >= slot.pass_score ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Number(score) >= slot.pass_score ? '✅ 통과' : `❌ 미통과 (기준: ${slot.pass_score}점)`}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-foreground/10 text-[12px] font-black text-accent">취소</button>
          <button onClick={handleSave} disabled={saving || (!absent && !score && isPass === null)}
            className="flex-1 h-10 rounded-xl bg-blue-600 text-white text-[12px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {saving ? '저장 중...' : '기록 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ViewTab = 'weekly' | 'report';

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params);
  const router = useRouter();

  const [cls, setCls] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [tab, setTab] = useState<ViewTab>('weekly');

  // 열린 모달
  const [attPopup, setAttPopup] = useState<AttPopup | null>(null);
  const [hwModal, setHwModal] = useState<{ col: WeekColumn; studentName: string } | null>(null);
  const [addHwModal, setAddHwModal] = useState<WeekColumn | null>(null);
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolloverPopup, setRolloverPopup] = useState<{ slotId: string; studentName: string; slotTitle: string; existingCheck: HomeworkCheck | null } | null>(null);
  const [testResultPopup, setTestResultPopup] = useState<{ slot: HomeworkSlot; studentName: string; existingCheck: HomeworkCheck | null } | null>(null);
  const [addTestModal, setAddTestModal] = useState<WeekColumn | null>(null);

  // ── 초기 로드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [allClasses, stuData] = await Promise.all([getClasses(), getClassStudents(classId)]);
        const found = allClasses.find(c => c.id === classId);
        if (!found) { router.push("/admin/dashboard/classes"); return; }
        setCls(found);
        setStudents(stuData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [classId, router]);

  // ── 주간 데이터 로드 ────────────────────────────────────────────────────────
  const loadWeekData = useCallback(async (wStart: Date, clsData: ClassRow) => {
    setWeekLoading(true);
    try {
      // 수업 + 클리닉 컬럼 빌드
      const schedItems = [
        ...(clsData.schedule || []).map(s => ({ ...s, is_clinic: false })),
        ...(clsData.clinic_schedule || []).map(s => ({ ...s, is_clinic: true })),
      ];
      const rawCols = schedItems.map(s => ({
        ...s, date: toDateStr(getDateForDay(wStart, s.day)),
      })).sort((a, b) => a.date.localeCompare(b.date));

      const weekDates = rawCols.map(c => c.date);
      const sessions = weekDates.length > 0 ? await getSessionsForWeek(classId, weekDates) : [];
      const sessionByDate: Record<string, ClassSession> = {};
      for (const s of sessions) sessionByDate[s.session_date] = s;

      const columns: WeekColumn[] = rawCols.map(c => ({
        date: c.date, dayName: c.day, time: c.time, end_time: c.end_time,
        is_clinic: c.is_clinic, session: sessionByDate[c.date] || null,
      }));

      // 출결
      const sessionIds = sessions.map(s => s.id);
      const attRows = sessionIds.length > 0 ? await getAttendanceForSessions(sessionIds) : [];
      const attMap: Record<string, Record<string, AttendanceRow>> = {};
      for (const r of attRows) {
        const ses = sessions.find(s => s.id === r.session_id);
        if (!ses) continue;
        if (!attMap[ses.session_date]) attMap[ses.session_date] = {};
        attMap[ses.session_date][r.student_name] = r;
      }

      // 과제
      const allSlots = sessionIds.length > 0 ? await getHomeworkSlotsForSessions(sessionIds) : [];
      const slotMap: Record<string, HomeworkSlot[]> = {};
      for (const slot of allSlots) {
        if (!slotMap[slot.session_id]) slotMap[slot.session_id] = [];
        slotMap[slot.session_id].push(slot);
      }
      const allChecks = allSlots.length > 0 ? await getHomeworkChecks(allSlots.map(s => s.id)) : [];
      const checkMap: Record<string, Record<string, HomeworkCheck>> = {};
      for (const c of allChecks) {
        if (!checkMap[c.slot_id]) checkMap[c.slot_id] = {};
        checkMap[c.slot_id][c.student_name] = c;
      }

      // 학생별 배당 정보
      const allSlotStudents = allSlots.length > 0 ? await getSlotStudents(allSlots.map(s => s.id)) : [];
      const slotStudentsMap: Record<string, string[]> = {};
      for (const ss of allSlotStudents) {
        if (!slotStudentsMap[ss.slot_id]) slotStudentsMap[ss.slot_id] = [];
        slotStudentsMap[ss.slot_id].push(ss.student_name);
      }

      // 수업내역 노트
      const noteRows = sessionIds.length > 0 ? await getLessonNotes(sessionIds) : [];
      const lessonNotesMap: Record<string, string> = {};
      for (const n of noteRows) lessonNotesMap[n.session_id] = n.note;

      // 이월 과제: rollover_date가 이번 주에 해당하는 delayed checks
      const rolloverRaws = weekDates.length > 0 ? await getRolloverChecksForWeek(weekDates) : [];
      const rolloverMap: Record<string, HomeworkCheck[]> = {};
      for (const r of rolloverRaws) {
        const d = r.rollover_date!;
        if (!rolloverMap[d]) rolloverMap[d] = [];
        rolloverMap[d].push(r);
      }

      setWeekData({ columns, attMap, slots: slotMap, checks: checkMap, slotStudents: slotStudentsMap, lessonNotes: lessonNotesMap, rolloverChecks: rolloverMap });
    } catch (e) { console.error(e); }
    finally { setWeekLoading(false); }
  }, [classId]);

  useEffect(() => {
    if (cls && tab === 'weekly') loadWeekData(weekStart, cls);
  }, [cls, weekStart, tab, loadWeekData]);

  // ── 세션 생성 ───────────────────────────────────────────────────────────────
  const handleCreateSession = async (col: WeekColumn) => {
    if (!cls) return;
    try {
      const session = await createSession(classId, col.date, col.is_clinic ? 'clinic' : 'class');
      setWeekData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(c => c.date === col.date ? { ...c, session } : c),
        };
      });
    } catch (e) { alert("세션 생성 실패: " + (e as Error).message); }
  };

  // ── 전체 출석 ───────────────────────────────────────────────────────────────
  const handleMarkAllPresent = async (col: WeekColumn, ses: ClassSession) => {
    const names = students.map(s => s.student_name);
    try {
      await markAllPresent(ses.id, names);
      setWeekData(prev => {
        if (!prev) return prev;
        const newAttMap = { ...prev.attMap, [col.date]: { ...(prev.attMap[col.date] || {}) } };
        for (const n of names) {
          newAttMap[col.date][n] = {
            id: '', session_id: ses.id, student_name: n, status: 'present',
            late_reason: '', late_arrival_time: '', makeup_type: '',
            makeup_date: null, makeup_video_date: null, note: '', created_at: '',
          };
        }
        return { ...prev, attMap: newAttMap };
      });
    } catch (e) { alert("설정 실패: " + (e as Error).message); }
  };

  // ── 출결 저장 ───────────────────────────────────────────────────────────────
  const saveAttendance = async (
    popup: AttPopup, status: AttendanceStatus,
    extra: Partial<{ late_reason: string; late_arrival_time: string; makeup_type: MakeupType; makeup_date: string | null; makeup_video_date: string | null }>
  ) => {
    if (!popup.session) { alert("수업 기록을 먼저 시작해주세요."); return; }
    await upsertAttendance({ session_id: popup.session.id, student_name: popup.studentName, status, ...extra });
    setWeekData(prev => {
      if (!prev || !popup.session) return prev;
      const map = { ...prev.attMap, [popup.date]: { ...(prev.attMap[popup.date] || {}) } };
      map[popup.date][popup.studentName] = {
        id: '', session_id: popup.session.id, student_name: popup.studentName, status,
        late_reason: extra.late_reason || '', late_arrival_time: extra.late_arrival_time || '',
        makeup_type: extra.makeup_type || '', makeup_date: extra.makeup_date || null,
        makeup_video_date: extra.makeup_video_date || null, note: '', created_at: '',
      };
      return { ...prev, attMap: map };
    });
    setAttPopup(null);
  };

  // ── 학생 제거 ───────────────────────────────────────────────────────────────
  const handleRemoveStudent = async (name: string) => {
    try {
      await removeStudentFromClass(classId, name);
      setStudents(prev => prev.filter(s => s.student_name !== name));
      setRemoveConfirm(null);
    } catch (e) { alert((e as Error).message); }
  };

  const c = C[cls?.color || 'indigo'];
  const isToday = (date: string) => date === toDateStr(new Date());

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
    </div>
  );
  if (!cls) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b shrink-0" style={{borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,12,18,0.8)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => router.push("/admin/dashboard/classes")}
              className="flex items-center gap-1 text-[11px] font-black text-accent hover:text-foreground transition-all shrink-0">
              <ArrowLeft size={14} /> 반 목록
            </button>
            <div className="min-w-0">
              {cls.academy_name && (
                <p className="text-[10px] font-black text-accent/60 truncate">{cls.academy_name}</p>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${c.badge} shrink-0`} />
                <h1 className="text-[18px] font-black text-foreground truncate">{cls.name}</h1>
              </div>
              {/* 수업/클리닉 시간 표시 */}
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {cls.schedule?.length > 0 && (
                  <span className="text-[10px] text-accent font-bold">
                    📚 {cls.schedule.map(s => `${s.day} ${s.time}${s.end_time ? '~' + s.end_time : ''}`).join(' · ')}
                  </span>
                )}
                {cls.clinic_schedule?.length > 0 && (
                  <span className="text-[10px] text-teal-600 font-bold">
                    🏥 클리닉 {cls.clinic_schedule.map(s => `${s.day} ${s.time}${s.end_time ? '~' + s.end_time : ''}`).join(' · ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setAddStudentModal(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground hover:border-foreground/30 transition-all">
              <Users size={12} /> {students.length}명
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-0 mt-3">
          {(['weekly', 'report'] as ViewTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[12px] font-black border-b-2 transition-all ${tab === t ? `${c.text} border-current` : 'text-accent border-transparent hover:text-foreground'}`}>
              {t === 'weekly' ? '📅 주간 현황' : '📊 리포트'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 리포트 탭 ──────────────────────────────────────────────────────── */}
      {tab === 'report' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ReportPanel classId={classId} />
        </div>
      )}

      {/* ── 주간 뷰 ────────────────────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 주간 네비게이션 */}
          <div className="px-5 py-2 border-b flex items-center justify-between shrink-0" style={{borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,10,14,0.6)'}}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              className="flex items-center gap-1 h-8 px-3 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:border-foreground/30 transition-all">
              <ChevronLeft size={14} /> 이전 주
            </button>
            <div className="text-center">
              <p className="text-[13px] font-black text-foreground">{getWeekLabel(weekStart)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart(getMonday(new Date()))}
                className="h-8 px-3 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground transition-all">
                이번 주
              </button>
              <button onClick={() => setWeekStart(d => addDays(d, 7))}
                className="flex items-center gap-1 h-8 px-3 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:border-foreground/30 transition-all">
                다음 주 <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {weekLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
            </div>
          ) : !weekData || weekData.columns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div>
                <p className="text-[15px] font-black text-foreground/50 mb-2">수업 일정이 없습니다</p>
                <p className="text-[12px] text-accent">반 설정에서 수업 요일을 추가하세요</p>
              </div>
            </div>
          ) : (
            /* ── 주간 그리드 ── */
            <div className="flex-1 overflow-auto custom-scrollbar" style={{background: '#0d0f14'}}>
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20" style={{background: '#0d0f14'}}>
                  <tr>
                    {/* 학생 컬럼 헤더 */}
                    <th className="sticky left-0 z-30 border-b border-r px-2 py-2 text-left min-w-[80px] max-w-[100px]" style={{background: '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}>
                      <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">학생</p>
                      <p className="text-[9px] text-foreground/25">{students.length}명</p>
                    </th>
                    {/* 날짜별 컬럼 헤더 */}
                    {weekData.columns.map(col => {
                      const today = isToday(col.date);
                      const hasSes = !!col.session;
                      const colColor = col.is_clinic ? 'text-teal-600' : c.text;
                      return (
                        <th key={col.date}
                          className="border-b border-r px-2 py-2 min-w-[140px]" style={{background: today ? 'rgba(99,102,241,0.08)' : '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}>
                          {/* 날짜 제목 */}
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className={`text-[11px] font-black ${today ? colColor : 'text-foreground/70'}`}>
                                {col.dayName} {col.date.slice(5).replace('-', '/')}
                                {col.is_clinic && <span className="ml-1 text-[8px] bg-teal-500/20 text-teal-400 px-1 py-0.5 rounded font-black">클리닉</span>}
                                {today && <span className="ml-1 text-[8px] bg-foreground/80 text-background px-1 py-0.5 rounded font-black">오늘</span>}
                              </p>
                              <p className="text-[9px] text-foreground/30">{col.time}{col.end_time ? `~${col.end_time}` : ''}</p>
                            </div>
                          </div>
                          {/* 세션 액션 버튼들 */}
                          {hasSes ? (
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => handleMarkAllPresent(col, col.session!)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-emerald-500/80 text-white rounded-md text-[9px] font-black hover:bg-emerald-500 transition-all">
                                <Check size={8} /> 전체출석
                              </button>
                              <button onClick={() => setAddHwModal(col)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md text-[9px] font-black hover:bg-blue-500/25 transition-all">
                                <Plus size={8} /> 과제
                              </button>
                              <button onClick={() => setAddTestModal(col)}
                                className="flex items-center gap-1 h-5 px-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-black hover:bg-amber-500/25 transition-all">
                                🎯 테스트
                              </button>
                              <button onClick={async () => {
                                if (!confirm("이 세션을 삭제할까요?")) return;
                                await deleteSession(col.session!.id);
                                setWeekData(prev => prev ? {
                                  ...prev,
                                  columns: prev.columns.map(cc => cc.date === col.date ? { ...cc, session: null } : cc),
                                } : null);
                              }} className="h-5 px-1 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all">
                                <Trash2 size={8} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleCreateSession(col)}
                              className={`h-5 px-2 rounded-md text-[9px] font-black border transition-all hover:-translate-y-0.5 ${col.date <= toDateStr(new Date()) ? 'border-foreground/20 text-foreground/60 bg-foreground/5 hover:bg-foreground/10' : 'border-foreground/8 text-foreground/20'}`}>
                              {col.date <= toDateStr(new Date()) ? '+ 수업 기록' : '예정'}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={weekData.columns.length + 1} className="text-center py-12 text-[13px] text-accent">
                        학생이 없습니다.
                        <button onClick={() => setAddStudentModal(true)} className="ml-2 font-black text-foreground hover:underline">
                          + 학생 추가
                        </button>
                      </td>
                    </tr>
                  ) : students.map((stu, si) => (
                    <tr key={stu.student_name} className={si % 2 === 0 ? '' : 'bg-foreground/1.5'}>
                      {/* 학생 이름 셀 */}
                      <td className="sticky left-0 border-b border-r px-2 py-1.5 z-10 min-w-[80px] max-w-[100px]"
                        style={{ background: si % 2 === 0 ? '#0d0f14' : '#0f1117', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between group">
                          <p className="text-[11px] font-black text-foreground/90 leading-tight truncate">{stu.student_name}</p>
                          <button onClick={() => setRemoveConfirm(stu.student_name)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-300 hover:text-red-500 transition-all shrink-0 ml-0.5">
                            <X size={9} />
                          </button>
                        </div>
                      </td>

                      {/* 날짜별 셀 */}
                      {weekData.columns.map(col => {
                        const att = col.session ? weekData.attMap[col.date]?.[stu.student_name] : undefined;
                        const sessionSlots = col.session ? (weekData.slots[col.session.id] || []) : [];
                        // 이 학생에게 배당된 슬롯만 (slotStudents 비어있으면 전체)
                        const mySlots = sessionSlots.filter(slot => {
                          const assigned = weekData.slotStudents[slot.id];
                          return !assigned || assigned.length === 0 || assigned.includes(stu.student_name);
                        });
                        const myGeneral = mySlots.filter(s => s.hw_type !== 'vocab_test');
                        const myTests = mySlots.filter(s => s.hw_type === 'vocab_test');
                        const doneCount = myGeneral.filter(slot => weekData.checks[slot.id]?.[stu.student_name]?.status === 'done').length;

                        return (
                          <td key={col.date}
                            className="border-b border-r px-1.5 py-1 align-top" style={{borderColor: 'rgba(255,255,255,0.05)', background: isToday(col.date) ? 'rgba(99,102,241,0.05)' : (si % 2 === 0 ? '#0d0f14' : '#0f1117')}}>
                            {col.session ? (
                              <div className="flex flex-col gap-0.5 min-w-[130px]">
                                {/* 출결 버튼 - 컴팩트 */}
                                <button
                                  onClick={() => setAttPopup({ date: col.date, studentName: stu.student_name, session: col.session })}
                                  className={`w-full text-center px-1.5 py-1 rounded-lg text-[10px] font-black transition-all hover:opacity-80 ${att ? ATT_STYLE[att.status] : 'border border-dashed border-foreground/15 text-foreground/20 hover:border-foreground/30'}`}>
                                  {att ? (<>
                                    <span>{ATT_SHORT[att.status]}</span>
                                    {att.status === 'late' && att.late_arrival_time && <span className="ml-1 text-[8px] opacity-60">{att.late_arrival_time.slice(0,5)}</span>}
                                    {att.status === 'absent' && att.makeup_type && <span className="ml-1 text-[8px] opacity-60">{att.makeup_type === 'direct' ? '보강' : '영상'}</span>}
                                  </>) : '—'}
                                </button>

                                {/* 일반과제 체크 */}
                                {myGeneral.map(slot => {
                                  const chk = weekData.checks[slot.id]?.[stu.student_name];
                                  const status = chk?.status || 'pending';
                                  return (
                                    <div key={slot.id} className="flex items-center gap-0.5">
                                      <button
                                        onClick={async () => {
                                          const newStatus: HwStatus = status === 'done' ? 'pending' : 'done';
                                          await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: newStatus });
                                          setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: newStatus } as HomeworkCheck } } } : prev);
                                        }}
                                        className={`flex-1 text-left px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all truncate ${
                                          status === 'done' ? 'bg-emerald-500/15 text-emerald-400 line-through opacity-70' :
                                          status === 'delayed' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :
                                          'bg-foreground/5 text-foreground/50 hover:bg-foreground/10 border border-foreground/8'
                                        }`}>
                                        {status === 'done' ? '✓' : status === 'delayed' ? '⏩' : '○'} {slot.title}
                                      </button>
                                      {status !== 'done' && (
                                        <>
                                          <button onClick={async () => {
                                            await upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: 'done' });
                                            setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id] || {}), [stu.student_name]: { ...(chk || {}), slot_id: slot.id, student_name: stu.student_name, status: 'done' } as HomeworkCheck } } } : prev);
                                          }}
                                            className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all border border-emerald-500/20"
                                            title="완료 처리">
                                            ✓완
                                          </button>
                                          <button onClick={() => setRolloverPopup({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk || null })}
                                            className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-all border border-orange-500/20"
                                            title="이월 처리">
                                            ⏩이
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* 단어테스트 */}
                                {myTests.map(slot => {
                                  const chk = weekData.checks[slot.id]?.[stu.student_name];
                                  return (
                                    <div key={slot.id} className="flex items-center gap-1">
                                      <div className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold truncate ${
                                        chk?.score != null ? 'bg-blue-50 text-blue-700' : 'bg-amber-50/80 text-amber-700'
                                      }`}>
                                        🎯 {slot.title}
                                        {chk?.score != null && <span className="ml-1 font-black">{chk.score}{slot.max_score ? `/${slot.max_score}` : ''}{slot.is_pf ? (chk.is_pass ? ' P' : ' F') : ''}</span>}
                                      </div>
                                      <button onClick={() => setTestResultPopup({ slot, studentName: stu.student_name, existingCheck: chk || null })}
                                        className="shrink-0 px-1.5 py-1 rounded-lg text-[9px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-200">
                                        {chk?.score != null ? '수정' : '기록'}
                                      </button>
                                    </div>
                                  );
                                })}

                                {mySlots.length === 0 && sessionSlots.length > 0 && (
                                  <p className="text-[9px] text-foreground/25 text-center py-0.5">배당없음</p>
                                )}
                                {/* 이월된 과제 표시 */}
                                {(weekData.rolloverChecks[col.date] || [])
                                  .filter(rc => rc.student_name === stu.student_name)
                                  .map(rc => (
                                    <div key={rc.id || rc.slot_id + rc.student_name} className="flex items-center gap-0.5">
                                      <div className="flex-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 truncate">
                                        ⏩ 이월과제
                                      </div>
                                      <button onClick={async () => {
                                        await upsertHomeworkCheck({ slot_id: rc.slot_id, student_name: stu.student_name, status: 'done', rollover_date: null });
                                        setWeekData(prev => {
                                          if (!prev) return prev;
                                          const newRollovers = { ...prev.rolloverChecks };
                                          newRollovers[col.date] = (newRollovers[col.date] || []).filter(r => !(r.slot_id === rc.slot_id && r.student_name === stu.student_name));
                                          return { ...prev, rolloverChecks: newRollovers, checks: { ...prev.checks, [rc.slot_id]: { ...(prev.checks[rc.slot_id] || {}), [stu.student_name]: { ...(rc as HomeworkCheck), status: 'done', rollover_date: null } } } };
                                        });
                                      }}
                                        className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20">
                                        ✓완
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center text-[10px] text-foreground/20 py-1">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* 수업내역 + 과제목록 행 */}
                  <tr>
                    <td className="sticky left-0 border-t border-b border-r px-4 py-2 z-10" style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.08)'}}>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest">📋 수업내역</p>
                    </td>
                    {weekData.columns.map(col => {
                      const sessionNote = col.session ? (weekData.lessonNotes[col.session.id] || '') : '';
                      const slots = col.session ? (weekData.slots[col.session.id] || []) : [];
                      return (
                        <td key={col.date} className="border-t border-b border-r px-2 py-2 align-top" style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.07)'}}>
                          {col.session ? (
                            <div className="space-y-1.5 min-w-[150px]">
                              <textarea
                                defaultValue={sessionNote}
                                onBlur={async e => {
                                  const val = e.target.value;
                                  await upsertLessonNote(col.session!.id, val);
                                  setWeekData(prev => prev ? { ...prev, lessonNotes: { ...prev.lessonNotes, [col.session!.id]: val } } : prev);
                                }}
                                rows={2}
                                placeholder="수업 내용 메모..."
                                className="w-full px-2 py-1.5 rounded-lg border border-white/8 bg-white/3 text-[10px] outline-none focus:border-white/20 resize-none text-white/60"
                              />
                              {slots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-background border border-foreground/8">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold text-foreground truncate block">{slot.title}</span>
                                    {slot.due_date && <span className="text-[9px] text-accent">마감 {slot.due_date.slice(5).replace('-','/')}</span>}
                                    {(weekData.slotStudents[slot.id] || []).length > 0 && (
                                      <span className="text-[9px] text-violet-500"> ({(weekData.slotStudents[slot.id] || []).join(', ')})</span>
                                    )}
                                  </div>
                                  <button onClick={async () => {
                                    if (!confirm(`"${slot.title}" 과제를 삭제할까요?`)) return;
                                    await deleteHomeworkSlot(slot.id);
                                    setWeekData(prev => {
                                      if (!prev || !col.session) return prev;
                                      return { ...prev, slots: { ...prev.slots, [col.session.id]: (prev.slots[col.session.id] || []).filter(s => s.id !== slot.id) } };
                                    });
                                  }} className="p-0.5 text-red-200 hover:text-red-500 transition-colors shrink-0"><X size={9} /></button>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-[9px] text-foreground/20 text-center">—</p>}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 모달들 ──────────────────────────────────────────────────────────── */}

      {attPopup && (
        <AttendancePopup
          popup={attPopup}
          onClose={() => setAttPopup(null)}
          onQuickSave={async (status) => {
            await saveAttendance(attPopup, status, {});
          }}
          onSave={async (status, extra) => {
            await saveAttendance(attPopup, status, extra as Parameters<typeof saveAttendance>[2]);
          }}
        />
      )}

      {hwModal && hwModal.col.session && (
        <HomeworkModal
          session={hwModal.col.session}
          studentName={hwModal.studentName}
          slots={weekData?.slots[hwModal.col.session.id] || []}
          checks={Object.fromEntries(
            (weekData?.slots[hwModal.col.session.id] || []).map(slot => [
              slot.id, weekData?.checks[slot.id]?.[hwModal.studentName]
            ]).filter(([, v]) => v) as [string, HomeworkCheck][]
          )}
          onClose={() => setHwModal(null)}
          onCheckChange={(slotId, status) => {
            setWeekData(prev => {
              if (!prev) return prev;
              const prevCheck = prev.checks[slotId]?.[hwModal.studentName];
              return {
                ...prev,
                checks: {
                  ...prev.checks,
                  [slotId]: {
                    ...(prev.checks[slotId] || {}),
                    [hwModal.studentName]: { ...(prevCheck || {}), slot_id: slotId, student_name: hwModal.studentName, status } as HomeworkCheck,
                  },
                },
              };
            });
          }}
        />
      )}

      {addHwModal && addHwModal.session && (
        <AddHomeworkModal
          session={addHwModal.session}
          allStudents={students}
          onClose={() => setAddHwModal(null)}
          onAdded={slots => {
            setWeekData(prev => {
              if (!prev || !addHwModal.session) return prev;
              const sid = addHwModal.session.id;
              return { ...prev, slots: { ...prev.slots, [sid]: [...(prev.slots[sid] || []), ...slots] } };
            });
            setAddHwModal(null);
          }}
        />
      )}

      {addStudentModal && cls && (
        <AddStudentModal
          classId={classId}
          className={cls.name}
          existingNames={students.map(s => s.student_name)}
          onClose={() => setAddStudentModal(false)}
          onAdded={s => setStudents(prev => [...prev, s])}
        />
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-xs rounded-2xl border border-rose-200 shadow-2xl p-6 text-center">
            <p className="text-[14px] font-black text-foreground mb-2">&apos;{removeConfirm}&apos; 제거</p>
            <p className="text-[11px] text-accent mb-5">이 반에서 제거합니다. 학생 계정은 유지됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveConfirm(null)}
                className="flex-1 h-10 rounded-xl border border-foreground/10 text-[12px] font-black text-accent transition-all">취소</button>
              <button onClick={() => handleRemoveStudent(removeConfirm)}
                className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-[12px] font-black hover:-translate-y-0.5 transition-all">제거</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 이월 팝업 ─────────────────────────────────────────────────── */}
      {rolloverPopup && (
        <RolloverPopup
          slotId={rolloverPopup.slotId}
          studentName={rolloverPopup.studentName}
          slotTitle={rolloverPopup.slotTitle}
          existingCheck={rolloverPopup.existingCheck}
          onClose={() => setRolloverPopup(null)}
          onSaved={(check) => {
            setWeekData(prev => prev ? {
              ...prev,
              checks: { ...prev.checks, [rolloverPopup.slotId]: { ...(prev.checks[rolloverPopup.slotId] || {}), [rolloverPopup.studentName]: check } }
            } : prev);
            setRolloverPopup(null);
          }}
        />
      )}

      {/* ─── 테스트 결과 팝업 ──────────────────────────────────────────── */}
      {testResultPopup && (
        <TestResultPopup
          slot={testResultPopup.slot}
          studentName={testResultPopup.studentName}
          existingCheck={testResultPopup.existingCheck}
          onClose={() => setTestResultPopup(null)}
          onSaved={(check) => {
            setWeekData(prev => prev ? {
              ...prev,
              checks: { ...prev.checks, [testResultPopup.slot.id]: { ...(prev.checks[testResultPopup.slot.id] || {}), [testResultPopup.studentName]: check } }
            } : prev);
            setTestResultPopup(null);
          }}
        />
      )}

      {/* ─── 테스트 추가 모달 (헤더 버튼) ─────────────────────────────── */}
      {addTestModal && addTestModal.session && (
        <TestSessionModal
          session={addTestModal.session}
          students={students}
          existingSlot={null}
          existingChecks={{}}
          onClose={() => setAddTestModal(null)}
          onSaved={(slot, checks) => {
            setWeekData(prev => {
              if (!prev || !addTestModal.session) return prev;
              const sid = addTestModal.session.id;
              const newChecks = { ...prev.checks };
              newChecks[slot.id] = checks;
              return {
                ...prev,
                slots: { ...prev.slots, [sid]: [...(prev.slots[sid] || []), slot] },
                checks: newChecks,
              };
            });
            setAddTestModal(null);
          }}
        />
      )}
    </div>
  );
}
