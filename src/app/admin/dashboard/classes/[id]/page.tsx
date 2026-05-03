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
  present: "bg-emerald-100 text-emerald-700 border border-emerald-300 font-black",
  late:    "bg-amber-100 text-amber-700 border border-amber-300 font-black",
  absent:  "bg-rose-100 text-rose-700 border border-rose-300 font-black",
  'n/a':   "bg-slate-100 text-slate-400 border border-slate-200 font-black",
};
const ATT_LABEL: Record<AttendanceStatus, string> = {
  present: "출석", late: "지각", absent: "결석", 'n/a': "해당없음",
};
const ATT_SHORT: Record<AttendanceStatus, string> = {
  present: "출석", late: "지각", absent: "결석", 'n/a': "N/A",
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
      // 상태별 관련없는 필드는 null/빈값으로 명시 초기화
      await onSave(status, {
        late_reason:        status === 'late'   ? (state.lateReason || '') : '',
        late_arrival_time:  status === 'late'   ? (state.lateTime   || '') : '',
        makeup_type:        status === 'absent' ? ((state.makeupType as MakeupType) || '') : '',
        makeup_date:        status === 'absent' && state.makeupType === 'direct' ? (state.makeupDate || null) : null,
        makeup_video_date:  status === 'absent' && state.makeupType === 'video'  ? (state.makeupDate || null) : null,
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
  const STATUS_ORDER: HwStatus[] = ['pending', 'done', 'done_partial', 'delayed', 'skipped'];
  const STATUS_STYLE: Record<HwStatus, string> = {
    pending:      "border-foreground/20 text-foreground/40",
    done:         "bg-emerald-500 border-emerald-500 text-white",
    done_partial: "bg-sky-500 border-sky-500 text-white",
    delayed:      "bg-amber-400 border-amber-400 text-white",
    skipped:      "bg-slate-200 border-slate-200 text-slate-500",
  };
  const STATUS_LABEL: Record<HwStatus, string> = {
    pending: "미제출", done: "완료 ✓", done_partial: "귀가완료 ✓", delayed: "연기", skipped: "면제",
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
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">과제검사일 (다음 수업일)</label>
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

// ─── 출석부 모달 ────────────────────────────────────────────────────────────
type AttBoardEntry = {
  status: AttendanceStatus | '';
  lateTime: string;
  lateReason: string;
  makeupType: MakeupType;
  makeupDate: string;
  makeupTime: string; // 대면보강 시간
};

function AttendanceBoardModal({ session, students, existingAtt, onClose, onSaved }: {
  session: ClassSession;
  students: ClassStudent[];
  existingAtt: Record<string, AttendanceRow>;
  onClose: () => void;
  onSaved: (updated: Record<string, AttendanceRow>) => void;
}) {
  const [entries, setEntries] = useState<Record<string, AttBoardEntry>>(() => {
    const init: Record<string, AttBoardEntry> = {};
    for (const s of students) {
      const ex = existingAtt[s.student_name];
      init[s.student_name] = {
        status: (ex?.status || '') as AttendanceStatus | '',
        lateTime: ex?.late_arrival_time || '',
        lateReason: ex?.late_reason || '',
        makeupType: ex?.makeup_type || '',
        makeupDate: ex?.makeup_date || '',
        makeupTime: (ex as any)?.makeup_time || '',
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const upd = (name: string, patch: Partial<AttBoardEntry>) =>
    setEntries(p => ({ ...p, [name]: { ...p[name], ...patch } }));

  const setAllPresent = () =>
    setEntries(p => Object.fromEntries(Object.keys(p).map(k => [k, { ...p[k], status: 'present' as AttendanceStatus }])));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: Record<string, AttendanceRow> = { ...existingAtt };
      await Promise.all(students.map(async s => {
        const e = entries[s.student_name];
        if (!e.status) return;
        const payload = {
          session_id: session.id, student_name: s.student_name,
          status: e.status as AttendanceStatus,
          late_reason: e.lateReason, late_arrival_time: e.lateTime,
          makeup_type: e.makeupType as MakeupType,
          makeup_date: e.makeupDate || null, makeup_video_date: null,
          makeup_time: e.makeupType === 'direct' ? (e.makeupTime || null) : null,
        };
        await upsertAttendance(payload as any);
        updated[s.student_name] = { ...((existingAtt[s.student_name] || {}) as AttendanceRow), ...payload };
      }));
      onSaved(updated);
      onClose();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const ATT_BTN: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500 text-white border-emerald-500',
    late:    'bg-amber-400 text-white border-amber-400',
    absent:  'bg-rose-500 text-white border-rose-500',
    'n/a':   'bg-slate-400 text-white border-slate-400',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[88vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-slate-800">📋 출석부</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{session.session_date} · {students.length}명</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={setAllPresent}
              className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-all">
              전체출석 ✓
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 학생 목록 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
          {students.map((stu, si) => {
            const e = entries[stu.student_name];
            return (
              <div key={stu.student_name} className={`px-4 py-3 ${si % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-3">
                  {/* 이름 */}
                  <span className="text-[13px] font-bold text-slate-700 w-20 shrink-0">{stu.student_name}</span>
                  {/* 출결 버튼 */}
                  <div className="flex gap-1.5">
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map(st => (
                      <button key={st}
                        onClick={() => upd(stu.student_name, { status: e.status === st ? '' : st })}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                          e.status === st ? ATT_BTN[st] : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}>
                        {st === 'present' ? '출석' : st === 'late' ? '지각' : '결석'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 지각 세부 */}
                {e.status === 'late' && (
                  <div className="mt-2 flex gap-2 ml-23">
                    <input type="time" value={e.lateTime}
                      onChange={ev => upd(stu.student_name, { lateTime: ev.target.value })}
                      className="h-7 px-2 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 outline-none w-28" />
                    <input value={e.lateReason}
                      onChange={ev => upd(stu.student_name, { lateReason: ev.target.value })}
                      placeholder="사유 (선택)"
                      className="flex-1 h-7 px-2 rounded-lg border border-slate-200 text-[11px] text-slate-600 outline-none" />
                  </div>
                )}
                {/* 결석 세부 */}
                {e.status === 'absent' && (
                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <select value={e.makeupType}
                      onChange={ev => upd(stu.student_name, { makeupType: ev.target.value as MakeupType })}
                      className="h-7 px-2 rounded-lg border border-rose-200 bg-rose-50 text-[11px] text-rose-800 outline-none">
                      <option value="">보강없음</option>
                      <option value="direct">대면보강</option>
                      <option value="video">영상보강</option>
                    </select>
                    {e.makeupType && (
                      <input type="date" value={e.makeupDate}
                        onChange={ev => upd(stu.student_name, { makeupDate: ev.target.value })}
                        className="h-7 px-2 rounded-lg border border-slate-200 text-[11px] outline-none" />
                    )}
                    {e.makeupType === 'direct' && (
                      <input type="time" value={e.makeupTime}
                        onChange={ev => upd(stu.student_name, { makeupTime: ev.target.value })}
                        className="h-7 px-2 rounded-lg border border-blue-200 bg-blue-50 text-[11px] text-blue-800 outline-none" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 저장 */}
        <div className="px-5 py-3 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-500">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-2 h-10 px-8 rounded-xl bg-slate-800 text-white text-[13px] font-bold disabled:opacity-40">
            {saving ? '저장 중...' : '출석 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

type TestEntry = {
  included: boolean; score: string;
  resultCode: string; retryDate: string;
  pfResult: 'pass' | 'fail' | '';
};
type TestConfig = { id: string; name: string; range: string; maxScore: string; passScore: string; isPF: boolean; existingSlotId?: string; };

function mkConfig(n = 1): TestConfig {
  return { id: crypto.randomUUID(), name: n === 1 ? '단어테스트' : '', range: '', maxScore: '', passScore: '', isPF: false };
}
function mkEntryFromCheck(chk: HomeworkCheck | undefined, slot: HomeworkSlot): TestEntry {
  if (!chk) return { included: true, score: '', resultCode: '', retryDate: '', pfResult: '' };
  return {
    included: chk.status !== 'skipped',
    score: chk.score != null ? String(chk.score) : '',
    resultCode: chk.delay_reason || (chk.status === 'skipped' ? 'absent' : ''),
    retryDate: chk.rollover_date || '',
    pfResult: slot.is_pf ? (chk.is_pass === true ? 'pass' : chk.is_pass === false ? 'fail' : '') : '',
  };
}

function TestSessionModal({ session, students, existingSlots, existingChecks, onClose, onSaved, onSlotDeleted }: {
  session: ClassSession; students: ClassStudent[];
  existingSlots: HomeworkSlot[];
  existingChecks: Record<string, Record<string, HomeworkCheck>>;
  onClose: () => void;
  onSaved: (slot: HomeworkSlot, checks: Record<string, HomeworkCheck>) => void;
  onSlotDeleted?: (slotId: string) => void;
}) {
  const initConfigs = (): TestConfig[] => {
    if (existingSlots.length > 0) {
      return existingSlots.map(s => ({
        id: s.id, name: s.title, range: s.test_range || '', isPF: s.is_pf || false,
        maxScore: s.max_score != null ? String(s.max_score) : '',
        passScore: s.pass_score != null ? String(s.pass_score) : '',
        existingSlotId: s.id,
      }));
    }
    return [mkConfig(1)];
  };
  const initEntries = (cfgs: TestConfig[]): Record<number, Record<string, TestEntry>> => {
    const out: Record<number, Record<string, TestEntry>> = {};
    cfgs.forEach((cfg, i) => {
      const slotChecks = cfg.existingSlotId ? (existingChecks[cfg.existingSlotId] || {}) : {};
      const slot = existingSlots.find(s => s.id === cfg.existingSlotId);
      out[i] = Object.fromEntries(students.map(s => [
        s.student_name,
        slot ? mkEntryFromCheck(slotChecks[s.student_name], slot) : { included: true, score: '', resultCode: '', retryDate: '', pfResult: '' }
      ]));
    });
    return out;
  };

  const [tests, setTests] = useState<TestConfig[]>(initConfigs);
  const [activeTest, setActiveTest] = useState(0);
  const [allEntries, setAllEntries] = useState<Record<number, Record<string, TestEntry>>>(() => initEntries(initConfigs()));
  const [saving, setSaving] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null);

  const entries = allEntries[activeTest] || {};
  const cfg = tests[activeTest];

  const upd = (name: string, patch: Partial<TestEntry>) =>
    setAllEntries(prev => ({ ...prev, [activeTest]: { ...prev[activeTest], [name]: { ...prev[activeTest][name], ...patch } } }));
  const updCfg = (patch: Partial<TestConfig>) =>
    setTests(prev => prev.map((t, i) => i === activeTest ? { ...t, ...patch } : t));

  const addTest = () => {
    const idx = tests.length;
    setTests(p => [...p, mkConfig(idx + 1)]);
    setAllEntries(p => ({ ...p, [idx]: Object.fromEntries(students.map(s => [s.student_name, { included: true, score: '', resultCode: '', retryDate: '', pfResult: '' }])) }));
    setActiveTest(idx);
  };

  const deleteSlot = async (t: TestConfig, idx: number) => {
    if (!t.existingSlotId) {
      setTests(p => p.filter((_, i) => i !== idx));
      setAllEntries(p => { const n = { ...p }; delete n[idx]; return n; });
      setActiveTest(Math.max(0, idx - 1));
      return;
    }
    if (!confirm(`"${t.name}" 테스트를 삭제하시겠습니까?`)) return;
    setDeletingSlot(t.existingSlotId);
    try {
      const { supabase } = await import('@/lib/supabase');
      await (supabase as any).from('homework_checks').delete().eq('slot_id', t.existingSlotId);
      await (supabase as any).from('homework_slots').delete().eq('id', t.existingSlotId);
      onSlotDeleted?.(t.existingSlotId);
      setTests(p => p.filter((_, i) => i !== idx));
      setAllEntries(p => { const n = { ...p }; delete n[idx]; return n; });
      setActiveTest(Math.max(0, idx - 1));
    } catch (e) { alert((e as Error).message); }
    finally { setDeletingSlot(null); }
  };

  const getAutoResult = (e: TestEntry): string => {
    if (!e.included) return 'excluded';
    if (['absent','late','unattempted','unmemorized_retry'].includes(e.resultCode)) return e.resultCode;
    if (['verbal_retest','fail_retry'].includes(e.resultCode)) return e.resultCode;
    if (!e.score) return '';
    if (cfg?.isPF && cfg?.passScore) {
      return Number(e.score) >= Number(cfg.passScore) ? 'pass' : 'fail';
    }
    return 'scored'; // non-PF: just has a score
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let ti = 0; ti < tests.length; ti++) {
        const c = tests[ti];
        const ents = allEntries[ti] || {};
        let slot: HomeworkSlot;
        if (c.existingSlotId) {
          const { supabase } = await import('@/lib/supabase');
          const { data, error } = await (supabase as any).from('homework_slots').update({
            title: c.name || '테스트', test_range: c.range || null,
            max_score: c.maxScore ? Number(c.maxScore) : null,
            pass_score: c.passScore ? Number(c.passScore) : null, is_pf: c.isPF,
          }).eq('id', c.existingSlotId).select().single();
          if (error) throw error;
          slot = data as HomeworkSlot;
        } else {
          [slot] = await createHomeworkSlotBatch([{
            session_id: session.id, title: c.name || '테스트', hw_type: 'vocab_test',
            test_range: c.range || null, max_score: c.maxScore ? Number(c.maxScore) : null,
            pass_score: c.passScore ? Number(c.passScore) : null, is_pf: c.isPF,
          }]);
        }
        const newChecks: Record<string, HomeworkCheck> = {};
        await Promise.all(students.map(async s => {
          const e = ents[s.student_name];
          if (!e?.included) return;
          const res = getAutoResult(e);
          const ABSENT_CODES = ['absent','late','unattempted','unmemorized_retry'];
          const ps = c.passScore ? Number(c.passScore) : null;
          const scoreNum = e.score ? Number(e.score) : null;
          const isSkipped = ABSENT_CODES.includes(res);
          const isPassRes = c.isPF && ps !== null && scoreNum !== null && !isSkipped ? scoreNum >= ps : false;
          const isFailRes = c.isPF && ps !== null && scoreNum !== null && !isSkipped ? scoreNum < ps : false;
          const payload = {
            slot_id: slot.id, student_name: s.student_name,
            status: (isSkipped ? 'skipped' : 'done') as HwStatus,
            score: e.score ? Number(e.score) : null,
            is_pass: isSkipped ? null : (isPassRes ? true : (isFailRes ? false : null)),
            delay_reason:
              res === 'absent' ? '결석' :
              res === 'late' ? '지각' :
              res === 'unattempted' ? '미응시' :
              res === 'unmemorized_retry' ? '미암기재시' :
              res === 'verbal_retest' ? '구두재시후귀가' :
              res === 'fail_retry' ? '추후재응시' : null,
            rollover_date: e.retryDate || null,
          };
          await upsertHomeworkCheck(payload);
          newChecks[s.student_name] = { ...(existingChecks[slot.id]?.[s.student_name] || {} as HomeworkCheck), ...payload };
        }));
        onSaved(slot, newChecks);
      }
      onClose();
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  // 통계: 미응시자 제외
  const SKIP_CODES = ['absent','unattempted','unmemorized_retry','late','other'];
  const participating = students.filter(s => {
    const e = entries[s.student_name];
    return e?.included && !SKIP_CODES.includes(e.resultCode);
  });
  const scores = participating.map(stu2 => Number(entries[stu2.student_name]?.score)).filter((n, i) => !isNaN(n) && participating[i] && entries[participating[i].student_name]?.score !== '');
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const passCount = cfg?.isPF
    ? participating.filter(s => entries[s.student_name]?.pfResult === 'pass').length
    : (cfg?.passScore ? scores.filter(n => n >= Number(cfg.passScore)).length : null);
  const doneCount = students.filter(s => { const e = entries[s.student_name]; return e?.included && (e.score || e.resultCode || e.pfResult); }).length;

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-[350] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl rounded-2xl flex flex-col shadow-2xl overflow-hidden" style={{ background: '#fff', border: '2px solid #e0e7ff', maxHeight: '92vh' }}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #e0e7ff', background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)' }}>
          <div>
            <h3 className="text-[17px] font-black" style={{ color: '#4338ca' }}>🎯 테스트 관리</h3>
            <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#6366f1' }}>
              {session.session_date} · {students.length}명 등록 · {doneCount}명 입력완료
            </p>
          </div>
          <div className="flex items-center gap-3">
            {avg != null && <span className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: '#eef2ff', color: '#4338ca' }}>평균 {avg}점</span>}
            {cfg?.isPF && passCount != null && <span className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: '#f0fdf4', color: '#15803d' }}>합격 {passCount}명</span>}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f1f5f9', color: '#64748b' }}><X size={15} /></button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #e2e8f0', background: '#fafbff' }}>
          {tests.map((t, i) => (
            <div key={t.id} className="flex items-center shrink-0">
              <button onClick={() => setActiveTest(i)}
                className="px-4 py-2 rounded-t-xl text-[12px] font-bold whitespace-nowrap transition-all"
                style={{ background: activeTest === i ? '#fff' : '#f1f5f9', borderTop: activeTest === i ? '2px solid #6366f1' : '2px solid transparent', color: activeTest === i ? '#4338ca' : '#94a3b8', marginBottom: activeTest === i ? '-1px' : '0' }}>
                {t.name || `테스트${i + 1}`}
              </button>
              <button onClick={() => deleteSlot(t, i)} disabled={deletingSlot === t.existingSlotId}
                className="ml-0.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center hover:bg-rose-100 text-rose-400">✕</button>
            </div>
          ))}
          <button onClick={addTest} className="shrink-0 px-4 py-2 rounded-t-xl text-[12px] font-black" style={{ color: '#6366f1', background: '#eef2ff' }}>+ 추가</button>
        </div>

        {/* 설정 */}
        {cfg && (
          <div className="px-5 py-3 shrink-0 flex gap-3 items-center flex-wrap" style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <input value={cfg.name} onChange={e => updCfg({ name: e.target.value })} placeholder="테스트명"
              className="h-9 px-3 rounded-xl text-[13px] font-bold outline-none w-36"
              style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', color: '#4f46e5' }} />
            <input value={cfg.range} onChange={e => updCfg({ range: e.target.value })} placeholder="범위"
              className="h-9 px-3 rounded-xl text-[13px] outline-none flex-1 min-w-[100px]"
              style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569' }} />
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer"
              style={{ background: cfg.isPF ? '#eef2ff' : '#f1f5f9', border: `1.5px solid ${cfg.isPF ? '#a5b4fc' : '#e2e8f0'}` }}>
              <input type="checkbox" checked={cfg.isPF} onChange={e => updCfg({ isPF: e.target.checked })} className="w-4 h-4 accent-indigo-500" />
              <span className="text-[12px] font-black" style={{ color: cfg.isPF ? '#4f46e5' : '#94a3b8' }}>P/F 방식</span>
            </label>
            {/* 만점: P/F 여부 상관없이 항상 표시 */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black" style={{ color: '#6366f1' }}>만점</span>
              <input type="number" value={cfg.maxScore} onChange={e => updCfg({ maxScore: e.target.value })} placeholder="100"
                className="w-16 h-9 px-2 rounded-xl text-[13px] font-bold outline-none text-center"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
            </div>
            {/* 합격기준: P/F 모드일 때만 표시 */}
            {cfg.isPF && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black" style={{ color: '#d97706' }}>합격기준</span>
                <input type="number" value={cfg.passScore} onChange={e => updCfg({ passScore: e.target.value })} placeholder="70"
                  className="w-16 h-9 px-2 rounded-xl text-[13px] font-bold outline-none text-center"
                  style={{ background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e' }} />
                {cfg.maxScore && cfg.passScore && <span className="text-[11px]" style={{ color: '#94a3b8' }}>({Math.round(Number(cfg.passScore) / Number(cfg.maxScore) * 100)}%)</span>}
              </div>
            )}
          </div>
        )}

        {/* 헤더 행 */}
        <div className="grid px-5 py-2.5 shrink-0 text-[10px] font-black uppercase tracking-widest"
          style={{ gridTemplateColumns: '20px 1fr 130px 130px 100px', gap: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f1f5f9' }}>
          <div /><div>학생</div>
          <div className="text-center">{cfg?.isPF ? 'P / F' : '점수'}</div>
          <div className="text-center">상태</div><div className="text-center">재응시일</div>
        </div>

        {/* 학생 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5" style={{ background: '#f8fafc' }}>
          {students.map(stu => {
            const e = entries[stu.student_name] || { included: true, score: '', resultCode: '', retryDate: '', pfResult: '' };
            const autoRes = getAutoResult(e);
            const isFail = cfg?.isPF ? e.pfResult === 'fail' : ['fail','verbal_retest','fail_retry'].includes(autoRes);
            const isPass = cfg?.isPF ? e.pfResult === 'pass' : autoRes === 'pass';
            const isAbsent = SKIP_CODES.includes(autoRes);
            const myScore = e.score ? Number(e.score) : null;
            const rank = !cfg?.isPF && myScore != null && scores.length > 1 ? scores.filter(s => s > myScore).length + 1 : null;
            const pct = !cfg?.isPF && myScore != null && cfg?.maxScore ? Math.round(myScore / Number(cfg.maxScore) * 100) : null;
            return (
              <div key={stu.student_name} className="grid items-center rounded-xl px-4 py-3"
                style={{
                  gridTemplateColumns: '20px 1fr 130px 130px 100px', gap: '12px',
                  background: !e.included ? '#f8fafc' : isPass ? '#f0fdf4' : isFail ? '#fef2f2' : isAbsent ? '#fffbeb' : '#fff',
                  opacity: e.included ? 1 : 0.4,
                  border: isPass ? '1.5px solid #bbf7d0' : isFail ? '1.5px solid #fecaca' : isAbsent ? '1.5px solid #fde68a' : '1.5px solid #f1f5f9',
                }}>
                <input type="checkbox" checked={e.included} onChange={() => upd(stu.student_name, { included: !e.included })}
                  className="w-4 h-4 rounded cursor-pointer accent-indigo-500" />
                <div>
                  <p className="text-[13px] font-black truncate" style={{ color: e.included ? '#1e293b' : '#94a3b8' }}>{stu.student_name}</p>
                  {e.included && !cfg?.isPF && rank != null && <p className="text-[10px] font-bold" style={{ color: '#6366f1' }}>#{rank} · {pct}%</p>}
                  {e.included && cfg?.isPF && e.pfResult && <p className="text-[10px] font-black" style={{ color: isPass ? '#15803d' : '#dc2626' }}>{isPass ? '✅ PASS' : '❌ FAIL'}</p>}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  {e.included && !isAbsent && (
                    cfg?.isPF ? (
                      <select value={e.pfResult} onChange={ev => upd(stu.student_name, { pfResult: ev.target.value as 'pass' | 'fail' | '' })}
                        className="w-full h-9 px-2 rounded-xl text-[12px] font-black outline-none text-center cursor-pointer"
                        style={{ background: e.pfResult === 'pass' ? '#f0fdf4' : e.pfResult === 'fail' ? '#fef2f2' : '#f8fafc', border: '1.5px solid #e2e8f0', color: e.pfResult === 'pass' ? '#15803d' : e.pfResult === 'fail' ? '#dc2626' : '#94a3b8' }}>
                        <option value="">— 선택</option>
                        <option value="pass">✅ PASS</option>
                        <option value="fail">❌ FAIL</option>
                      </select>
                    ) : (
                      <>
                        <input type="number" value={e.score} onChange={ev => upd(stu.student_name, { score: ev.target.value, resultCode: '' })}
                          placeholder="0" className="w-20 h-9 rounded-xl text-[14px] font-black outline-none text-center"
                          style={{ background: e.score ? '#eef2ff' : '#f8fafc', border: '1.5px solid ' + (e.score ? '#a5b4fc' : '#e2e8f0'), color: '#4f46e5' }} />
                        {cfg?.maxScore && <span className="text-[11px]" style={{ color: '#94a3b8' }}>/{cfg.maxScore}</span>}
                      </>
                    )
                  )}
                </div>
                <div className="flex justify-center">
                  {e.included && (
                    !e.score && !isAbsent && !isFail && !cfg?.isPF ? (
                      <select value={e.resultCode} onChange={ev => upd(stu.student_name, { resultCode: ev.target.value, score: '' })}
                        className="w-full h-9 px-2 rounded-xl text-[11px] font-bold outline-none cursor-pointer"
                        style={{ background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e' }}>
                        <option value="">— 정상응시</option>
                        <option value="absent">결석 (추후재응시)</option>
                        <option value="late">지각 (추후재응시)</option>
                        <option value="unattempted">미비 (추후재응시)</option>
                      </select>
                    ) : isFail && !cfg?.isPF ? (
                      <select value={['fail'].includes(e.resultCode) ? '' : e.resultCode} onChange={ev => upd(stu.student_name, { resultCode: ev.target.value || 'fail' })}
                        className="w-full h-9 px-2 rounded-xl text-[11px] font-bold outline-none cursor-pointer"
                        style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626' }}>
                        <option value="">❌ FAIL</option>
                        <option value="verbal_retest">🗣 구두재시</option>
                        <option value="fail_retry">🔁 추후재응시</option>
                      </select>
                    ) : isAbsent ? (
                      <button onClick={() => upd(stu.student_name, { resultCode: '', score: '' })}
                        className="text-[11px] font-black px-3 py-1.5 rounded-xl"
                        style={{ background: '#fffbeb', color: '#92400e', border: '1.5px solid #fde68a' }}>✕ 취소</button>
                    ) : null
                  )}
                </div>
                <div className="flex justify-center">
                  {e.included && (e.resultCode === 'fail_retry' || e.resultCode === 'unmemorized_retry') && (
                    <input type="date" value={e.retryDate} onChange={ev => upd(stu.student_name, { retryDate: ev.target.value })}
                      className="w-full h-9 px-2 rounded-xl text-[11px] outline-none"
                      style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', color: '#4f46e5' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 저장 */}
        <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button onClick={onClose} className="flex-1 h-11 rounded-xl text-[13px] font-black" style={{ border: '1.5px solid #e2e8f0', color: '#64748b' }}>닫기</button>
          <button onClick={handleSave} disabled={saving}
            className="h-11 px-8 rounded-xl text-[13px] font-black disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4338ca)', color: '#fff', flex: 2 }}>
            {saving ? '저장 중...' : `💾 저장 (${tests.length}개)`}
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
  const [attBoardModal, setAttBoardModal] = useState<WeekColumn | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState<WeekColumn | null>(null);
  const [attDetailModal, setAttDetailModal] = useState<{ status: AttendanceStatus; lateTime?: string; reason?: string; makeupType?: string; makeupDate?: string } | null>(null);
  // 과제 완료 모달: 등원 후 완료 / 완료 후 등원
  const [hwCompleteModal, setHwCompleteModal] = useState<{ slotId: string; studentName: string; slotTitle: string; existingCheck: HomeworkCheck | null } | null>(null);

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
  const handleCreateSession = async (col: WeekColumn, isCancelled = false) => {
    if (!cls) return;
    try {
      const type = isCancelled ? 'cancelled' : (col.is_clinic ? 'clinic' : 'class');
      const session = await createSession(classId, col.date, type);
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
      <div className="px-5 py-3 border-b shrink-0" style={{borderColor:'#e2e8f0', background:'#ffffff'}}>
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
          <div className="px-5 py-2 border-b flex items-center justify-between shrink-0" style={{borderColor: '#e2e8f0', background: '#ffffff'}}>
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
            <div className="flex-1 overflow-auto custom-scrollbar apple-table" style={{background: '#f8fafc'}}>
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20" style={{background: '#f8fafc'}}>
                  <tr>
                    {/* 학생 컬럼 헤더 */}
                    <th className="sticky left-0 z-30 border-b border-r px-1.5 py-2 text-left min-w-[60px] max-w-[70px]" style={{background: '#f8fafc', borderColor: '#e2e8f0'}}>
                      <p style={{fontSize:'10px',fontWeight:500,color:'#86868b',letterSpacing:'0.04em',textTransform:'uppercase'}}>학생</p>
                      <p style={{fontSize:'10px',color:'#aeaeb2'}}>{students.length}명</p>
                    </th>
                    {/* 날짜별 컬럼 헤더 */}
                    {weekData.columns.map(col => {
                      const today = isToday(col.date);
                      const hasSes = !!col.session;
                      const colColor = col.is_clinic ? 'text-teal-600' : c.text;
                      return (
                        <th key={col.date}
                          className="border-b border-r px-2 py-2 min-w-[140px]" style={{background: today ? '#eef2ff' : '#f8fafc', borderColor: '#e2e8f0'}}>
                          {/* 날짜 제목 */}
                          <div className="flex flex-col items-center mb-1.5">
                            <p className={`col-date flex items-center gap-1 ${today ? colColor : ''}`}
                              style={{color: today ? undefined : '#1d1d1f'}}>
                              {col.dayName} {col.date.slice(5).replace('-', '/')}
                              {col.is_clinic && <span style={{fontSize:'9px',background:'#ccfbf1',color:'#0f766e',padding:'1px 5px',borderRadius:'4px',fontWeight:500}}>클리닉</span>}
                              {today && <span style={{fontSize:'9px',background:'#0071e3',color:'#fff',padding:'1px 5px',borderRadius:'4px',fontWeight:500}}>오늘</span>}
                            </p>
                            <p className="col-time">{col.time}{col.end_time ? ` ~ ${col.end_time}` : ''}</p>
                          </div>
                          {/* 세션 액션 버튼들 */}
                          {hasSes ? (
                            <div className="flex gap-1 flex-wrap justify-center">
                              <button onClick={() => setAttBoardModal(col)}
                                className="flex items-center gap-1 h-6 px-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-semibold hover:bg-slate-200 transition-all">
                                📋 출석
                              </button>
                              <button onClick={() => setAddHwModal(col)}
                                className="flex items-center gap-1 h-6 px-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-semibold hover:bg-blue-100 transition-all">
                                <Plus size={9} /> 과제
                              </button>
                              <button onClick={() => setAddTestModal(col)}
                                className="flex items-center gap-1 h-6 px-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-semibold hover:bg-amber-100 transition-all">
                                🎯 테스트
                              </button>
                              <button onClick={() => setDeleteSessionConfirm(col)}
                                className="h-6 px-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleCreateSession(col)}
                                className="h-7 px-3 bg-indigo-500 text-white rounded-lg text-[11px] font-semibold hover:bg-indigo-600 transition-all shadow-sm">
                                수업 시작
                              </button>
                              <button onClick={() => handleCreateSession(col, true)}
                                className="h-7 px-3 bg-rose-100 text-rose-500 border border-rose-200 rounded-lg text-[11px] font-semibold hover:bg-rose-200 transition-all">
                                휴강
                              </button>
                            </div>
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
                  ) : (
                    <>
                      {/* ── 수업 내용 입력 행 (학생 목록 위) ── */}
                      <tr>
                        <td className="sticky left-0 border-b border-r px-1.5 py-1.5 z-10" style={{ background: '#eef2ff', borderColor: '#e2e8f0' }}>
                          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">📝 수업내용</p>
                        </td>
                        {weekData.columns.map(col => (
                          <td key={col.date} className="border-b border-r px-1.5 py-1.5 align-top" style={{ background: '#eef2ff', borderColor: '#e2e8f0', minWidth: '140px' }}>
                            {col.session ? (
                              <textarea
                                key={col.session.id}
                                defaultValue={weekData.lessonNotes[col.session.id] || ''}
                                onBlur={async e => {
                                  const val = e.target.value;
                                  await upsertLessonNote(col.session!.id, val);
                                  setWeekData(prev => prev ? { ...prev, lessonNotes: { ...prev.lessonNotes, [col.session!.id]: val } } : prev);
                                }}
                                rows={2}
                                placeholder="수업 내용 입력..."
                                className="w-full px-1.5 py-1 rounded-lg border border-indigo-200 bg-white text-[10px] outline-none focus:border-indigo-400 resize-none text-slate-700 placeholder:text-slate-300"
                              />
                            ) : <span className="text-[9px] text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                      {/* ── 학생 목록 ── */}
                      {students.map((stu, si) => (
                        <tr key={stu.student_name} className={si % 2 === 0 ? '' : 'bg-foreground/1.5'}>
                      {/* 학생 이름 셀 */}
                      <td className="sticky left-0 border-b border-r px-2 py-2 z-10 min-w-[72px] max-w-[90px]"
                        style={{ background: si % 2 === 0 ? '#ffffff' : '#f8fafc', borderColor: '#e2e8f0' }}>
                        <div className="flex items-center justify-between group">
                          <p className="cell-name leading-tight truncate">{stu.student_name}</p>
                          <button onClick={() => setRemoveConfirm(stu.student_name)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-300 hover:text-red-500 transition-all shrink-0 ml-0.5">
                            <X size={9} />
                          </button>
                        </div>
                      </td>

                      {/* 날짜별 셀 */}
                      {weekData.columns.map(col => {
                        const att = col.session ? weekData.attMap[col.date]?.[stu.student_name] : undefined;
                        // 이 날 수업의 슬롯 (테스트용)
                        const sessionSlots = col.session ? (weekData.slots[col.session.id] || []) : [];
                        const mySessionSlots = sessionSlots.filter(slot => {
                          const assigned = weekData.slotStudents[slot.id];
                          return !assigned || assigned.length === 0 || assigned.includes(stu.student_name);
                        });
                        const myTests = mySessionSlots.filter(s => s.hw_type === 'vocab_test');
                        // ★ 핵심 수정: 과제는 전체 주간 슬롯에서 due_date === col.date인 것을 찾음
                        // (배당일이 달라도 검사일이 이 날이면 여기 표시)
                        const allWeekSlots = Object.values(weekData.slots).flat();
                        const checkSlots = allWeekSlots.filter(s => {
                          const assigned = weekData.slotStudents[s.id];
                          const isForMe = !assigned || assigned.length === 0 || assigned.includes(stu.student_name);
                          return isForMe && s.due_date === col.date && s.hw_type !== 'vocab_test' && s.hw_type !== 'test_prep';
                        });

                        return (
                        <td key={col.date}
                          className="border-b border-r align-top" style={{borderColor: '#e2e8f0', background: isToday(col.date) ? '#eef2ff' : (si % 2 === 0 ? '#ffffff' : '#f8fafc')}}>
                          {col.session ? (
                            <div className="flex min-w-[160px]">

                              {/* 왼쪽: 출결 + 태도 */}
                              <div className="shrink-0 border-r border-slate-100 flex flex-col items-center justify-start pt-1.5 pb-1 px-1 gap-1"
                                style={{ width: '20%', minWidth: '36px' }}>
                                <div
                                  onClick={() => { if (att) setAttDetailModal({ status: att.status, lateTime: att.late_arrival_time || undefined, reason: (att as any).absence_reason || undefined, makeupType: att.makeup_type || undefined, makeupDate: att.makeup_date || undefined }); }}
                                  className={`att-badge w-full text-center select-none leading-tight ${att ? `${ATT_STYLE[att.status]} cursor-pointer hover:opacity-80 transition-all` : 'text-slate-200'}`}>
                                  {att ? (<>
                                    <span className="block">{ATT_SHORT[att.status]}</span>
                                    {att.status === 'late' && att.late_arrival_time && <span className="block" style={{fontSize:'9px',opacity:0.75}}>{att.late_arrival_time.slice(0,5)}</span>}
                                    {att.status === 'absent' && att.makeup_type && (
                                      <span className="block" style={{fontSize:'9px',opacity:0.75}}>
                                        {att.makeup_type === 'direct' ? `보강${(att as any).makeup_date ? ' '+((att as any).makeup_date as string).slice(5).replace('-','/') : ''}` : '영상'}
                                      </span>
                                    )}
                                  </>) : '—'}
                                </div>
                                {col.session && (['A','B','C','D','E'] as const).map(g => {
                                  const cur = (att as any)?.attitude_grade;
                                  const active = cur === g;
                                  const gc = g==='A'?'emerald':g==='B'?'blue':g==='C'?'amber':g==='D'?'orange':'red';
                                  return (
                                    <button key={g} onClick={async () => {
                                      const next = active ? null : g;
                                      await import('@/lib/class-service').then(m => m.upsertAttitudeGrade(col.session!.id, stu.student_name, next));
                                      setWeekData(prev => {
                                        if (!prev) return prev;
                                        const am = { ...prev.attMap };
                                        am[col.date] = { ...(am[col.date]||{}), [stu.student_name]: { ...(am[col.date]?.[stu.student_name]||{}), attitude_grade: next } as AttendanceRow };
                                        return { ...prev, attMap: am };
                                      });
                                    }}
                                    className={`w-full text-center text-[10px] font-black rounded leading-tight py-0.5 transition-all ${active ? `bg-${gc}-500 text-white` : `text-${gc}-400 hover:bg-${gc}-50`}`}>
                                      {g}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* 오른쪽: 과제 + 테스트 */}
                              <div className="flex-1 min-w-0 py-1 px-1 space-y-0.5">

                                {/* 검사일이 오늘인 과제만 표시 (배당일만인 과제는 숨김) */}
                                {checkSlots.map(slot => {
                                  const chk = weekData.checks[slot.id]?.[stu.student_name];
                                  const isDone = chk?.status === 'done' || chk?.status === 'done_partial';
                                  const isDelayed = chk?.status === 'delayed';
                                  return (
                                    <div key={slot.id} className="flex items-center gap-0.5">
                                      <button
                                        onClick={() => {
                                          if (isDone) {
                                            upsertHomeworkCheck({ slot_id: slot.id, student_name: stu.student_name, status: 'pending' });
                                            setWeekData(prev => prev ? { ...prev, checks: { ...prev.checks, [slot.id]: { ...(prev.checks[slot.id]||{}), [stu.student_name]: { ...(chk||{}), slot_id: slot.id, student_name: stu.student_name, status: 'pending' } as HomeworkCheck } } } : prev);
                                          } else {
                                            setHwCompleteModal({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk||null });
                                          }
                                        }}
                                        className={`hw-item flex-1 text-left truncate ${
                                          isDone    ? 'done'    :
                                          chk?.status === 'done_partial' ? 'partial' :
                                          isDelayed ? 'delayed' : ''
                                        }`}>
                                        {isDone ? '✓ ' : isDelayed ? '⏩ ' : ''}{slot.title}
                                      </button>
                                      {!isDone && (
                                        <button onClick={() => setRolloverPopup({ slotId: slot.id, studentName: stu.student_name, slotTitle: slot.title, existingCheck: chk||null })}
                                          style={{flexShrink:0,width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'6px',fontSize:'11px',color:'#aeaeb2',transition:'all 0.15s'}}>
                                          →
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* 이월과제: 완료해도 줄긋기로 유지 */}
                                {(weekData.rolloverChecks[col.date]||[]).filter(rc=>rc.student_name===stu.student_name).map(rc=>{
                                  const rcDone = weekData.checks[rc.slot_id]?.[stu.student_name]?.status === 'done';
                                  return (
                                    <div key={rc.id||rc.slot_id+rc.student_name} className="flex items-center gap-0.5">
                                      <button
                                        onClick={async()=>{
                                          if (rcDone) {
                                            await upsertHomeworkCheck({slot_id:rc.slot_id,student_name:stu.student_name,status:'delayed',rollover_date:col.date});
                                            setWeekData(prev=>prev?{...prev,checks:{...prev.checks,[rc.slot_id]:{...(prev.checks[rc.slot_id]||{}),[stu.student_name]:{...(rc as HomeworkCheck),status:'delayed',rollover_date:col.date}}}}:prev);
                                          } else {
                                            await upsertHomeworkCheck({slot_id:rc.slot_id,student_name:stu.student_name,status:'done',rollover_date:col.date});
                                            setWeekData(prev=>prev?{...prev,checks:{...prev.checks,[rc.slot_id]:{...(prev.checks[rc.slot_id]||{}),[stu.student_name]:{...(rc as HomeworkCheck),status:'done',rollover_date:col.date}}}}:prev);
                                          }
                                        }}
                                        className={`flex-1 text-left px-1.5 py-1 rounded-lg text-[12px] font-semibold transition-all truncate border ${
                                          rcDone ? 'bg-emerald-50 text-emerald-600 line-through border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                                        }`}>
                                        {rcDone ? '✓ ' : '⏩ '}이월
                                      </button>
                                    </div>
                                  );
                                })}

                                {/* 테스트 */}
                                {myTests.map(slot=>{
                                  const chk=weekData.checks[slot.id]?.[stu.student_name];
                                  return(
                                    <div key={slot.id} className="flex items-center gap-0.5">
                                      <div className={`flex-1 px-1.5 py-0.5 rounded text-[12px] font-bold truncate ${chk?.score!=null||chk?.is_pass!=null?'bg-indigo-50 text-indigo-700':'bg-amber-50 text-amber-700'}`}>
                                        🎯{chk?.score!=null?` ${chk.score}${slot.max_score?`/${slot.max_score}`:''}`:slot.is_pf?(chk?.is_pass!=null?(chk.is_pass?' P':' F'):''): ''}
                                      </div>
                                      <button onClick={()=>setTestResultPopup({slot,studentName:stu.student_name,existingCheck:chk||null})}
                                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100">✎</button>
                                    </div>
                                  );
                                })}

                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-[10px] text-slate-200 py-2 min-w-[100px]">—</div>
                          )}

                        </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* 수업내역 + 과제목록 행 */}
                  <tr>
                    <td className="sticky left-0 border-t border-b border-r px-4 py-2 z-10" style={{background: '#f1f5f9', borderColor: '#e2e8f0'}}>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest">📋 수업내역</p>
                    </td>
                    {weekData.columns.map(col => {
                      const sessionNote = col.session ? (weekData.lessonNotes[col.session.id] || '') : '';
                      const slots = col.session ? (weekData.slots[col.session.id] || []) : [];
                      return (
                        <td key={col.date} className="border-t border-b border-r px-2 py-2 align-top" style={{background: '#f1f5f9', borderColor: '#e2e8f0'}}>
                          {col.session ? (
                            <div className="space-y-1.5 min-w-[150px]">
                              {/* 과제 목록 통합 박스 */}
                              {(() => {
                                const allSlots = slots.filter(s => s.hw_type !== 'test_prep');
                                const globalSlots = allSlots.filter(s => (weekData.slotStudents[s.id] || []).length === 0);
                                const indivSlots = allSlots.filter(s => (weekData.slotStudents[s.id] || []).length > 0);
                                if (allSlots.length === 0) return null;
                                return (
                                  <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                    {globalSlots.length > 0 && (
                                      <div className="px-2 py-1.5 border-b border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">전체 과제</p>
                                        {globalSlots.map(slot => (
                                          <div key={slot.id} className="flex items-start justify-between gap-1 py-0.5">
                                            <p className="text-[9px] text-slate-700 leading-tight flex-1 min-w-0">
                                              <span className="text-slate-400 mr-1">-</span>
                                              <span className="font-semibold">{slot.title}</span>
                                              {slot.due_date && <span className="text-slate-400 ml-1">{slot.due_date.slice(5).replace('-','/')}</span>}
                                            </p>
                                            <button onClick={async () => {
                                              if (!confirm(`"${slot.title}" 삭제?`)) return;
                                              await deleteHomeworkSlot(slot.id);
                                              setWeekData(prev => prev && col.session ? { ...prev, slots: { ...prev.slots, [col.session!.id]: (prev.slots[col.session!.id] || []).filter(s => s.id !== slot.id) } } : prev);
                                            }} className="p-0.5 text-slate-300 hover:text-rose-400 transition-colors shrink-0"><X size={8} /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {indivSlots.length > 0 && (
                                      <div className="px-2 py-1.5">
                                        <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest mb-1">개별 과제</p>
                                        {indivSlots.map(slot => (
                                          <div key={slot.id} className="flex items-start justify-between gap-1 py-0.5">
                                            <p className="text-[9px] leading-tight flex-1 min-w-0">
                                              <span className="text-slate-400 mr-1">-</span>
                                              <span className="font-semibold text-violet-700">{slot.title}</span>
                                              <span className="text-[8px] text-violet-400 ml-1">({(weekData.slotStudents[slot.id] || []).join(', ')})</span>
                                            </p>
                                            <button onClick={async () => {
                                              if (!confirm(`"${slot.title}" 삭제?`)) return;
                                              await deleteHomeworkSlot(slot.id);
                                              setWeekData(prev => prev && col.session ? { ...prev, slots: { ...prev.slots, [col.session!.id]: (prev.slots[col.session!.id] || []).filter(s => s.id !== slot.id) } } : prev);
                                            }} className="p-0.5 text-slate-300 hover:text-rose-400 transition-colors shrink-0"><X size={8} /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : <p className="text-[9px] text-slate-400 text-center">—</p>}
                        </td>
                      );
                    })}
                   </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 모달들 ──────────────────────────────────────────────────────────── */}

      {/* 세션 초기화 확인 모달 */}
      {deleteSessionConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🗑️</span>
              <h3 className="text-[15px] font-black text-slate-800">수업 내역 초기화</h3>
            </div>
            <p className="text-[13px] text-slate-600 mb-1">{deleteSessionConfirm.date} 수업 내역을</p>
            <p className="text-[13px] font-bold text-rose-600 mb-4">초기화하시겠습니까?</p>
            <p className="text-[11px] text-slate-400 mb-5">출결, 과제, 테스트 기록이 모두 삭제됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteSessionConfirm(null)}
                className="flex-1 h-10 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">취소</button>
              <button onClick={async () => {
                const col = deleteSessionConfirm;
                await deleteSession(col.session!.id);
                setWeekData(prev => prev ? { ...prev, columns: prev.columns.map(cc => cc.date === col.date ? { ...cc, session: null } : cc) } : null);
                setDeleteSessionConfirm(null);
              }} className="flex-1 h-10 rounded-xl text-[13px] font-black bg-rose-500 text-white hover:bg-rose-600 transition-all">초기화</button>
            </div>
          </div>
        </div>
      )}

      {/* 출결 상세 확인 모달 (읽기전용) */}
      {attDetailModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50" onClick={() => setAttDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[12px] font-black ${ATT_STYLE[attDetailModal.status]}`}>{ATT_LABEL[attDetailModal.status]}</span>
              </div>
              <button onClick={() => setAttDetailModal(null)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-slate-200"><X size={13} /></button>
            </div>
            {attDetailModal.lateTime && <div className="mb-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">도착시간</p><p className="text-[14px] font-bold text-slate-800">{attDetailModal.lateTime}</p></div>}
            {attDetailModal.makeupType && <div className="mb-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">보강방식</p><p className="text-[14px] font-bold text-slate-800">{attDetailModal.makeupType === 'direct' ? '직접 보강' : '영상 보강'}</p></div>}
            {attDetailModal.makeupDate && <div className="mb-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">보강일</p><p className="text-[14px] font-bold text-indigo-700">{attDetailModal.makeupDate.slice(5).replace('-','/')} 보강 예정</p></div>}
            {attDetailModal.reason && <div className="mb-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">사유</p><p className="text-[13px] text-slate-700">{attDetailModal.reason}</p></div>}
            {!attDetailModal.lateTime && !attDetailModal.makeupType && !attDetailModal.makeupDate && !attDetailModal.reason && (
              <p className="text-[12px] text-slate-400 text-center py-2">추가 정보 없음</p>
            )}
            <p className="text-[10px] text-slate-300 text-center mt-3">출석부에서 수정할 수 있습니다</p>
          </div>
        </div>
      )}

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

      {attBoardModal && attBoardModal.session && (
        <AttendanceBoardModal
          session={attBoardModal.session}
          students={students}
          existingAtt={weekData?.attMap[attBoardModal.date] || {}}
          onClose={() => setAttBoardModal(null)}
          onSaved={(updated) => {
            setWeekData(prev => prev ? {
              ...prev,
              attMap: { ...prev.attMap, [attBoardModal.date]: updated },
            } : prev);
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
      {addTestModal && addTestModal.session && (() => {
        const sid = addTestModal.session.id;
        const testSlots = (weekData?.slots[sid] || []).filter(s => s.hw_type === 'vocab_test');
        const testChecksMap: Record<string, Record<string, HomeworkCheck>> = {};
        for (const slot of testSlots) testChecksMap[slot.id] = weekData?.checks[slot.id] || {};
        return (
          <TestSessionModal
            session={addTestModal.session}
            students={students}
            existingSlots={testSlots}
            existingChecks={testChecksMap}
            onClose={() => setAddTestModal(null)}
            onSlotDeleted={slotId => {
              setWeekData(prev => {
                if (!prev) return prev;
                const newSlots = { ...prev.slots, [sid]: (prev.slots[sid] || []).filter(s => s.id !== slotId) };
                const newChecks = { ...prev.checks };
                delete newChecks[slotId];
                return { ...prev, slots: newSlots, checks: newChecks };
              });
            }}
            onSaved={(slot, checks) => {
              setWeekData(prev => {
                if (!prev) return prev;
                const existing = prev.slots[sid] || [];
                const isUpdate = existing.some(s => s.id === slot.id);
                return {
                  ...prev,
                  slots: { ...prev.slots, [sid]: isUpdate ? existing.map(s => s.id === slot.id ? slot : s) : [...existing, slot] },
                  checks: { ...prev.checks, [slot.id]: checks },
                };
              });
            }}
          />
        );
      })()}

      {/* ── 과제 완료 모달 ────────────────────────────────────────── */}
      {hwCompleteModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}}
          onClick={() => setHwCompleteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-72 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[14px] font-bold text-slate-800">{hwCompleteModal.slotTitle}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{hwCompleteModal.studentName} · 완료 방식 선택</p>
            </div>
            <div className="p-4 space-y-2">
              <button onClick={async()=>{
                await upsertHomeworkCheck({slot_id:hwCompleteModal.slotId,student_name:hwCompleteModal.studentName,status:'done'});
                setWeekData(prev=>prev?{...prev,checks:{...prev.checks,[hwCompleteModal.slotId]:{...(prev.checks[hwCompleteModal.slotId]||{}),[hwCompleteModal.studentName]:{...(hwCompleteModal.existingCheck||{}),slot_id:hwCompleteModal.slotId,student_name:hwCompleteModal.studentName,status:'done'} as HomeworkCheck}}}:prev);
                setHwCompleteModal(null);
              }} className="w-full py-3 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 transition-all">
                ✅ 등원 후 완료
              </button>
              <button onClick={async()=>{
                await upsertHomeworkCheck({slot_id:hwCompleteModal.slotId,student_name:hwCompleteModal.studentName,status:'done_partial'});
                setWeekData(prev=>prev?{...prev,checks:{...prev.checks,[hwCompleteModal.slotId]:{...(prev.checks[hwCompleteModal.slotId]||{}),[hwCompleteModal.studentName]:{...(hwCompleteModal.existingCheck||{}),slot_id:hwCompleteModal.slotId,student_name:hwCompleteModal.studentName,status:'done_partial'} as HomeworkCheck}}}:prev);
                setHwCompleteModal(null);
              }} className="w-full py-3 rounded-xl bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-600 transition-all">
                📋 완료 후 등원
              </button>
            </div>
            <div className="px-4 pb-4">
              <button onClick={()=>setHwCompleteModal(null)}
                className="w-full py-2 rounded-xl border border-slate-200 text-[12px] text-slate-400 hover:bg-slate-50">취소</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
