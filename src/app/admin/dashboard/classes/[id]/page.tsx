"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Plus, Check, X, ChevronLeft, ChevronRight,
  RefreshCw, Trash2, Settings, BarChart2, FileText,
} from "lucide-react";
import {
  getClasses, getClassStudents, addStudentToClass, removeStudentFromClass,
  getSessionsForWeek, createSession, deleteSession,
  getAttendanceForSessions, upsertAttendance, markAllPresent,
  getHomeworkSlotsForSessions, createHomeworkSlot, deleteHomeworkSlot,
  getHomeworkChecks, upsertHomeworkCheck,
  getAttendanceSummaryForClass, getHomeworkSummaryForClass, updateClass,
  getMonday, addDays, toDateStr, getDateForDay, getWeekLabel,
  ClassRow, ClassStudent, ClassSession, AttendanceRow,
  HomeworkSlot, HomeworkCheck, AttendanceStatus, HwType, HwStatus, MakeupType,
  WeekColumn, WeekData, ClassScheduleItem, ClassColor,
} from "@/lib/class-service";
import { getStudents } from "@/lib/database-service";

// ─── Color + Style helpers ────────────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; border: string; badge: string; light: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badge: "bg-indigo-500", light: "bg-indigo-100" },
  rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   badge: "bg-rose-500",   light: "bg-rose-100"   },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   badge: "bg-teal-500",   light: "bg-teal-100"   },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  badge: "bg-amber-500",  light: "bg-amber-100"  },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-500", light: "bg-violet-100" },
};

const ATT_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  late:    "bg-amber-100 text-amber-700 border border-amber-200",
  absent:  "bg-rose-100 text-rose-700 border border-rose-200",
};
const ATT_LABEL: Record<AttendanceStatus, string> = {
  present: "✅ 출석", late: "⏰ 지각", absent: "❌ 결석",
};

const HW_TYPE_LABEL: Record<HwType, string> = {
  general: "일반", vocab_test: "단어테스트", passage_read: "지문읽기", essay: "서술형",
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

// ─── 과제 추가 모달 ───────────────────────────────────────────────────────────
function AddHomeworkModal({ sessionId, onClose, onAdded }: {
  sessionId: string; onClose: () => void; onAdded: (slot: HomeworkSlot) => void;
}) {
  const [title, setTitle] = useState("");
  const [hwType, setHwType] = useState<HwType>("general");
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const slot = await createHomeworkSlot({ session_id: sessionId, title: title.trim(), hw_type: hwType });
      onAdded(slot);
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-xs rounded-2xl border border-foreground/10 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-black text-foreground">과제 추가</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-foreground/5 text-accent"><X size={14} /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="과제 제목" autoFocus
          onKeyDown={e => e.key === 'Enter' && handle()}
          className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none focus:border-foreground/30 mb-3" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(Object.keys(HW_TYPE_LABEL) as HwType[]).map(t => (
            <button key={t} onClick={() => setHwType(t)}
              className={`py-2 rounded-xl text-[11px] font-black border-2 transition-all ${hwType === t ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-accent'}`}>
              {HW_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-foreground/10 text-[12px] font-black text-accent transition-all">취소</button>
          <button onClick={handle} disabled={!title.trim() || saving}
            className="flex-1 h-10 rounded-xl bg-foreground text-background text-[12px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {saving ? "..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 학생 추가 모달 ───────────────────────────────────────────────────────────
function AddStudentModal({ classId, existingNames, onClose, onAdded }: {
  classId: string; existingNames: string[];
  onClose: () => void; onAdded: (s: ClassStudent) => void;
}) {
  const [all, setAll] = useState<{ name: string; class_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    getStudents().then(d => setAll((d || []) as { name: string; class_name: string }[])).catch(() => {});
  }, []);

  const filtered = all.filter(s =>
    !existingNames.includes(s.name) &&
    (s.name.includes(search) || s.class_name.includes(search))
  );

  const handleAdd = async (s: { name: string; class_name: string }) => {
    setAdding(s.name);
    try {
      await addStudentToClass(classId, s.name, s.class_name);
      onAdded({ id: "", class_id: classId, student_name: s.name, student_class: s.class_name, enrolled_at: "" });
    } catch (e) { alert((e as Error).message); }
    finally { setAdding(null); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-sm rounded-2xl border border-foreground/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-foreground/5 flex items-center justify-between">
          <h3 className="text-[14px] font-black text-foreground">학생 추가</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent"><X size={15} /></button>
        </div>
        <div className="p-4">
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
                <button onClick={() => handleAdd(s)} disabled={adding === s.name}
                  className="h-8 px-3 rounded-xl bg-foreground text-background text-[11px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                  {adding === s.name ? "..." : "추가"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-foreground/5">
          <button onClick={onClose} className="w-full h-10 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">닫기</button>
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

      setWeekData({ columns, attMap, slots: slotMap, checks: checkMap });
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
      <div className={`px-6 py-4 border-b border-foreground/10 glass shrink-0`}>
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
          <div className="px-6 py-3 border-b border-foreground/5 flex items-center justify-between shrink-0 bg-accent-light/10">
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
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-20">
                  <tr>
                    {/* 학생 컬럼 헤더 */}
                    <th className="sticky left-0 z-30 bg-background border-b border-r border-foreground/10 px-4 py-3 text-left min-w-[120px]">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">학생</p>
                      <p className="text-[10px] text-accent/50">{students.length}명</p>
                    </th>
                    {/* 날짜별 컬럼 헤더 */}
                    {weekData.columns.map(col => {
                      const today = isToday(col.date);
                      const hasSes = !!col.session;
                      const colColor = col.is_clinic ? 'text-teal-600' : c.text;
                      return (
                        <th key={col.date}
                          className={`border-b border-r border-foreground/10 px-3 py-2 min-w-[160px] ${today ? 'bg-foreground/4' : 'bg-background'}`}>
                          {/* 날짜 제목 */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <p className={`text-[12px] font-black ${today ? colColor : 'text-foreground'}`}>
                                {col.dayName} {col.date.slice(5).replace('-', '/')}
                                {col.is_clinic && <span className="ml-1 text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-black">클리닉</span>}
                                {today && <span className="ml-1 text-[9px] bg-foreground text-background px-1.5 py-0.5 rounded font-black">오늘</span>}
                              </p>
                              <p className="text-[10px] text-accent/60">{col.time}{col.end_time ? `~${col.end_time}` : ''}</p>
                            </div>
                          </div>
                          {/* 세션 액션 버튼들 */}
                          {hasSes ? (
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => handleMarkAllPresent(col, col.session!)}
                                className="flex items-center gap-1 h-6 px-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:-translate-y-0.5 transition-all">
                                <Check size={9} /> 전체출석
                              </button>
                              <button onClick={() => setAddHwModal(col)}
                                className="flex items-center gap-1 h-6 px-2 bg-foreground/10 text-foreground rounded-lg text-[10px] font-black hover:bg-foreground/20 transition-all">
                                <Plus size={9} /> 과제
                              </button>
                              <button onClick={async () => {
                                if (!confirm("이 세션을 삭제할까요?")) return;
                                await deleteSession(col.session!.id);
                                setWeekData(prev => prev ? {
                                  ...prev,
                                  columns: prev.columns.map(cc => cc.date === col.date ? { ...cc, session: null } : cc),
                                } : null);
                              }} className="h-6 px-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={9} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleCreateSession(col)}
                              className={`h-6 px-2 rounded-lg text-[10px] font-black border transition-all hover:-translate-y-0.5 ${col.date <= toDateStr(new Date()) ? 'border-foreground/20 text-foreground bg-foreground/5 hover:bg-foreground/10' : 'border-foreground/10 text-accent/40'}`}>
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
                      <td className="sticky left-0 bg-background border-b border-r border-foreground/8 px-4 py-2 z-10"
                        style={{ background: si % 2 === 0 ? undefined : 'hsl(var(--foreground)/0.015)' }}>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-[12px] font-black text-foreground">{stu.student_name}</p>
                            <p className="text-[9px] text-accent">{stu.student_class}</p>
                          </div>
                          <button onClick={() => setRemoveConfirm(stu.student_name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all">
                            <X size={10} />
                          </button>
                        </div>
                      </td>

                      {/* 날짜별 셀 */}
                      {weekData.columns.map(col => {
                        const att = col.session ? weekData.attMap[col.date]?.[stu.student_name] : undefined;
                        const sessionSlots = col.session ? (weekData.slots[col.session.id] || []) : [];
                        const doneCount = sessionSlots.filter(slot =>
                          weekData.checks[slot.id]?.[stu.student_name]?.status === 'done'
                        ).length;

                        return (
                          <td key={col.date}
                            className={`border-b border-r border-foreground/8 px-2 py-1.5 ${isToday(col.date) ? 'bg-foreground/3' : ''}`}>
                            {col.session ? (
                              <div className="flex flex-col gap-1">
                                {/* 출결 버튼 */}
                                <button
                                  onClick={() => setAttPopup({ date: col.date, studentName: stu.student_name, session: col.session })}
                                  className={`w-full text-center px-2 py-1.5 rounded-xl text-[11px] font-black transition-all hover:-translate-y-0.5 ${att ? ATT_STYLE[att.status] : 'border border-dashed border-foreground/20 text-foreground/30 hover:border-foreground/40'}`}>
                                  {att ? (
                                    <>
                                      {ATT_LABEL[att.status]}
                                      {att.status === 'late' && att.late_arrival_time && (
                                        <span className="block text-[9px] opacity-70">{att.late_arrival_time}</span>
                                      )}
                                      {att.status === 'absent' && att.makeup_type && (
                                        <span className="block text-[9px] opacity-70">
                                          {att.makeup_type === 'direct' ? '직접보강' : '영상보강'}
                                        </span>
                                      )}
                                    </>
                                  ) : '미기록'}
                                </button>
                                {/* 과제 뱃지 */}
                                {sessionSlots.length > 0 && (
                                  <button
                                    onClick={() => setHwModal({ col, studentName: stu.student_name })}
                                    className={`w-full px-2 py-1 rounded-lg text-[10px] font-black transition-all hover:-translate-y-0.5 ${doneCount === sessionSlots.length ? 'bg-emerald-100 text-emerald-700' : doneCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-foreground/8 text-foreground/50'}`}>
                                    📝 {doneCount}/{sessionSlots.length}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-[10px] text-foreground/20 py-1">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* 과제 목록 행 */}
                  {weekData.columns.some(col => col.session && (weekData.slots[col.session.id] || []).length > 0) && (
                    <tr className="bg-foreground/3">
                      <td className="sticky left-0 bg-foreground/5 border-t border-b border-r border-foreground/10 px-4 py-2 z-10">
                        <p className="text-[9px] font-black text-accent uppercase tracking-widest">과제 목록</p>
                      </td>
                      {weekData.columns.map(col => {
                        const slots = col.session ? (weekData.slots[col.session.id] || []) : [];
                        return (
                          <td key={col.date} className="border-t border-b border-r border-foreground/8 px-2 py-1.5">
                            <div className="flex flex-col gap-1">
                              {slots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-background border border-foreground/8">
                                  <span className="text-[10px] font-bold text-foreground truncate">{slot.title}</span>
                                  <button onClick={async () => {
                                    if (!confirm(`"${slot.title}" 과제를 삭제할까요?`)) return;
                                    await deleteHomeworkSlot(slot.id);
                                    setWeekData(prev => {
                                      if (!prev || !col.session) return prev;
                                      return {
                                        ...prev,
                                        slots: {
                                          ...prev.slots,
                                          [col.session.id]: (prev.slots[col.session.id] || []).filter(s => s.id !== slot.id),
                                        },
                                      };
                                    });
                                  }} className="p-0.5 text-red-200 hover:text-red-500 transition-colors shrink-0">
                                    <X size={9} />
                                  </button>
                                </div>
                              ))}
                              {slots.length === 0 && col.session && (
                                <p className="text-[9px] text-foreground/20 text-center">—</p>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
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
          sessionId={addHwModal.session.id}
          onClose={() => setAddHwModal(null)}
          onAdded={slot => {
            setWeekData(prev => {
              if (!prev || !addHwModal.session) return prev;
              const sid = addHwModal.session.id;
              return {
                ...prev,
                slots: { ...prev.slots, [sid]: [...(prev.slots[sid] || []), slot] },
              };
            });
            setAddHwModal(null);
          }}
        />
      )}

      {addStudentModal && (
        <AddStudentModal
          classId={classId}
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
    </div>
  );
}
