"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Calendar, Users, Clock, Trash2, ChevronRight,
  BookOpen, X, Check, Settings, School
} from "lucide-react";
import {
  getClasses, createClass, updateClass, deleteClass, getClassStudents,
  ClassRow, ClassColor, ClassScheduleItem
} from "@/lib/class-service";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<ClassColor, { bg: string; text: string; border: string; badge: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badge: "bg-indigo-500" },
  rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   badge: "bg-rose-500"   },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   badge: "bg-teal-500"   },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  badge: "bg-amber-500"  },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-500" },
};

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const COLORS: ClassColor[] = ["indigo", "rose", "teal", "amber", "violet"];
const COLOR_LABELS: Record<ClassColor, string> = {
  indigo: "인디고", rose: "로즈", teal: "틸", amber: "앰버", violet: "바이올렛"
};

// ─── 시간표 입력 컴포넌트 ──────────────────────────────────────────────────────
function ScheduleBuilder({
  label, schedule, onChange, accent = "foreground"
}: {
  label: string;
  schedule: ClassScheduleItem[];
  onChange: (s: ClassScheduleItem[]) => void;
  accent?: string;
}) {
  const toggleDay = (day: string) => {
    if (schedule.some(s => s.day === day)) {
      onChange(schedule.filter(s => s.day !== day));
    } else {
      onChange([...schedule, { day: day as ClassScheduleItem['day'], time: "15:00", end_time: "17:00" }]);
    }
  };
  const update = (day: string, field: 'time' | 'end_time', val: string) =>
    onChange(schedule.map(s => s.day === day ? { ...s, [field]: val } : s));

  return (
    <div>
      <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block">{label}</label>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {DAYS.map(day => {
          const active = schedule.some(s => s.day === day);
          return (
            <button key={day} type="button" onClick={() => toggleDay(day)}
              className={`w-9 h-9 rounded-xl text-[12px] font-black border-2 transition-all ${active ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-accent hover:border-foreground/30'}`}>
              {day}
            </button>
          );
        })}
      </div>
      {schedule.map(s => (
        <div key={s.day} className="flex items-center gap-2 mb-2">
          <span className="w-8 text-[12px] font-black text-foreground shrink-0">{s.day}</span>
          <input type="time" value={s.time} onChange={e => update(s.day, 'time', e.target.value)}
            className="h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[11px] font-bold outline-none focus:border-foreground/30 w-28" />
          <span className="text-[10px] text-accent">~</span>
          <input type="time" value={s.end_time} onChange={e => update(s.day, 'end_time', e.target.value)}
            className="h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[11px] font-bold outline-none focus:border-foreground/30 w-28" />
        </div>
      ))}
      {schedule.length === 0 && (
        <p className="text-[10px] text-accent/50">요일을 선택하세요</p>
      )}
    </div>
  );
}

// ─── 반 생성/편집 폼 ───────────────────────────────────────────────────────────
function ClassFormModal({
  initial, onClose, onSaved, mode
}: {
  initial?: ClassRow;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSaved: (c: ClassRow) => void;
}) {
  const [academyName, setAcademyName] = useState(initial?.academy_name || "");
  const [name, setName]   = useState(initial?.name || "");
  const [color, setColor] = useState<ClassColor>(initial?.color || "indigo");
  const [desc, setDesc]   = useState(initial?.description || "");
  const [schedule, setSchedule] = useState<ClassScheduleItem[]>(initial?.schedule || []);
  const [clinicSchedule, setClinicSchedule] = useState<ClassScheduleItem[]>(initial?.clinic_schedule || []);
  const [openedAt, setOpenedAt] = useState(initial?.opened_at || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        const c = await createClass({
          academy_name: academyName.trim(),
          name: name.trim(),
          color, schedule, clinic_schedule: clinicSchedule,
          description: desc.trim(), opened_at: openedAt,
        });
        onSaved(c);
      } else if (initial) {
        await updateClass(initial.id, {
          academy_name: academyName.trim(),
          name: name.trim(),
          color, schedule, clinic_schedule: clinicSchedule,
          description: desc.trim(), opened_at: openedAt,
        });
        onSaved({ ...initial, academy_name: academyName.trim(), name: name.trim(),
          color, schedule, clinic_schedule: clinicSchedule,
          description: desc.trim(), opened_at: openedAt });
      }
    } catch (e) { alert("저장 실패: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-lg rounded-[2rem] border border-foreground/10 shadow-2xl flex flex-col max-h-[92vh]">
        {/* 헤더 */}
        <div className="p-6 border-b border-foreground/5 flex items-center justify-between shrink-0">
          <h3 className="text-[16px] font-black text-foreground">
            {mode === 'create' ? '새 반 만들기' : '반 설정 편집'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent"><X size={16} /></button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

          {/* 학원명 */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">학원명</label>
            <input value={academyName} onChange={e => setAcademyName(e.target.value)} placeholder="예: 패럴랙스 어학원"
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/40 transition-colors" />
          </div>

          {/* 반명 */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">반명 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 수능영어 심화반"
              autoFocus={mode === 'create'}
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/40 transition-colors" />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">설명</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="선택 사항"
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/40 transition-colors" />
          </div>

          {/* 개설 일자 */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">개설 일자</label>
            <input type="date" value={openedAt} onChange={e => setOpenedAt(e.target.value)}
              className="h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/40 transition-colors" />
          </div>

          {/* 색상 */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block">색상 태그</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all ${color === c ? `${COLOR_MAP[c].badge} text-white border-transparent` : `${COLOR_MAP[c].bg} ${COLOR_MAP[c].text} ${COLOR_MAP[c].border}`}`}>
                  {color === c && <Check size={10} strokeWidth={3} />}
                  {COLOR_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* 수업 시간표 */}
          <div className="p-4 rounded-2xl bg-foreground/3 border border-foreground/8">
            <ScheduleBuilder
              label="📚 수업 요일 / 시간"
              schedule={schedule}
              onChange={setSchedule}
            />
          </div>

          {/* 클리닉 시간표 */}
          <div className="p-4 rounded-2xl bg-foreground/3 border border-foreground/8">
            <ScheduleBuilder
              label="🏥 클리닉 요일 / 시간 (선택)"
              schedule={clinicSchedule}
              onChange={setClinicSchedule}
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="p-5 border-t border-foreground/5 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">취소</button>
          <button onClick={handle} disabled={!name.trim() || saving}
            className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {saving ? "저장 중..." : mode === 'create' ? "반 생성" : "변경 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 반 카드 ───────────────────────────────────────────────────────────────────
function ClassCard({
  cls, studentCount, onClick, onEdit, onDelete
}: {
  cls: ClassRow; studentCount: number;
  onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const c = COLOR_MAP[cls.color] || COLOR_MAP.indigo;
  const schedLabel = cls.schedule?.map(s => `${s.day} ${s.time}${s.end_time ? '~' + s.end_time : ''}`).join(' · ') || '일정 미설정';
  const clinicLabel = cls.clinic_schedule?.map(s => `${s.day} ${s.time}~${s.end_time}`).join(' · ');

  return (
    <div className={`glass rounded-[2rem] border-2 ${c.border} overflow-hidden hover:shadow-xl transition-all group`}>
      {/* 상단 클릭 영역 */}
      <div className="p-6 cursor-pointer" onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-3 h-3 rounded-full ${c.badge} shrink-0`} />
            <div className="min-w-0">
              {cls.academy_name && (
                <p className="text-[10px] font-black text-accent/70 truncate">{cls.academy_name}</p>
              )}
              <h3 className="text-[15px] font-black text-foreground truncate">{cls.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg text-accent hover:text-foreground hover:bg-foreground/5 transition-all">
              <Settings size={13} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {cls.description && <p className="text-[11px] text-accent mb-3">{cls.description}</p>}

        {/* 통계 */}
        <div className="flex items-center gap-3 mb-3">
          <span className={`flex items-center gap-1.5 text-[11px] font-bold ${c.text}`}>
            <Users size={11} /> {studentCount}명
          </span>
          {cls.opened_at && (
            <span className="flex items-center gap-1.5 text-[11px] text-accent">
              <Calendar size={11} /> {cls.opened_at.slice(0, 7)} 개설
            </span>
          )}
        </div>

        {/* 수업 시간 */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-black text-accent/60 w-10 shrink-0 mt-0.5">수업</span>
            <div className="flex gap-1.5 flex-wrap">
              {cls.schedule?.map(s => (
                <span key={s.day} className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${c.bg} ${c.text}`}>
                  {s.day} {s.time}{s.end_time ? `~${s.end_time}` : ''}
                </span>
              ))}
              {(!cls.schedule || cls.schedule.length === 0) && (
                <span className="text-[10px] text-accent/40">미설정</span>
              )}
            </div>
          </div>
          {cls.clinic_schedule && cls.clinic_schedule.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-black text-accent/60 w-10 shrink-0 mt-0.5">클리닉</span>
              <div className="flex gap-1.5 flex-wrap">
                {cls.clinic_schedule.map(s => (
                  <span key={s.day} className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-50 text-teal-700">
                    {s.day} {s.time}{s.end_time ? `~${s.end_time}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className={`px-6 py-3 border-t ${c.border} ${c.bg} flex items-center justify-between`}
        onClick={onClick} style={{ cursor: 'pointer' }}>
        <span className={`text-[11px] font-black ${c.text} flex items-center gap-1.5`}>
          <Calendar size={11} /> 주간 현황 열기
        </span>
        <ChevronRight size={14} className={c.text} />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses]     = useState<ClassRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<ClassRow | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClasses();
      setClasses(data);
      const counts = await Promise.all(
        data.map(c => getClassStudents(c.id).then(s => [c.id, s.length] as [string, number]))
      );
      setStudentCounts(Object.fromEntries(counts));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteClass(deleteConfirm.id);
      setClasses(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (e) { alert("삭제 실패: " + (e as Error).message); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-black text-foreground">수업 관리</h1>
          <p className="text-[13px] text-accent mt-1">반별 주간 출결·과제·리포트를 한 눈에 관리하세요</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-11 px-5 bg-foreground text-background rounded-2xl text-[13px] font-black hover:-translate-y-0.5 transition-all shadow-xl">
          <Plus size={15} /> 새 반 만들기
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="glass rounded-[2.5rem] border border-foreground/5 p-16 text-center">
          <School size={36} className="text-accent/30 mx-auto mb-4" />
          <p className="text-[15px] font-black text-foreground mb-1">아직 반이 없습니다</p>
          <p className="text-[12px] text-accent mb-6">새 반을 만들어 학생 출결과 과제를 관리하세요</p>
          <button onClick={() => setCreating(true)}
            className="h-11 px-6 bg-foreground text-background rounded-2xl text-[13px] font-black hover:-translate-y-0.5 transition-all">
            <Plus size={14} className="inline mr-1.5" /> 첫 번째 반 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map(cls => (
            <ClassCard
              key={cls.id}
              cls={cls}
              studentCount={studentCounts[cls.id] ?? 0}
              onClick={() => router.push(`/admin/dashboard/classes/${cls.id}`)}
              onEdit={() => setEditTarget(cls)}
              onDelete={() => setDeleteConfirm(cls)}
            />
          ))}
        </div>
      )}

      {/* 생성 모달 */}
      {creating && (
        <ClassFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={c => {
            setClasses(prev => [...prev, c]);
            setStudentCounts(prev => ({ ...prev, [c.id]: 0 }));
            setCreating(false);
          }}
        />
      )}

      {/* 편집 모달 */}
      {editTarget && (
        <ClassFormModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={updated => {
            setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditTarget(null);
          }}
        />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-[2rem] border border-rose-200 shadow-2xl p-7 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="text-[16px] font-black text-foreground mb-2">&apos;{deleteConfirm.name}&apos; 삭제</h3>
            <p className="text-[12px] text-accent mb-6">이 반의 세션, 출결, 과제 데이터가 모두 삭제됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
