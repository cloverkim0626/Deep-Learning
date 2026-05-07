"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Calendar, Users, Clock, Trash2, ChevronRight,
  BookOpen, X, Check, Settings, School, ArrowRight
} from "lucide-react";
import {
  getClasses, createClass, updateClass, deleteClass, getClassStudents,
  ClassRow, ClassColor, ClassScheduleItem
} from "@/lib/class-service";
import { supabase } from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<ClassColor, { accent: string; light: string; border: string; dot: string }> = {
  indigo: { accent: "#4f46e5", light: "#eef2ff", border: "#c7d2fe", dot: "#818cf8" },
  rose:   { accent: "#e11d48", light: "#fff1f2", border: "#fecdd3", dot: "#fb7185" },
  teal:   { accent: "#0f766e", light: "#f0fdfa", border: "#99f6e4", dot: "#2dd4bf" },
  amber:  { accent: "#b45309", light: "#fffbeb", border: "#fde68a", dot: "#fbbf24" },
  violet: { accent: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe", dot: "#a78bfa" },
};

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const COLORS: ClassColor[] = ["indigo", "rose", "teal", "amber", "violet"];
const COLOR_LABELS: Record<ClassColor, string> = {
  indigo: "인디고", rose: "로즈", teal: "틸", amber: "앰버", violet: "바이올렛"
};

// 수업 시간 분 차이 계산
function calcDurationMins(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

// ─── 시간표 입력 컴포넌트 ──────────────────────────────────────────────────────
function ScheduleBuilder({
  label, schedule, onChange
}: {
  label: string;
  schedule: ClassScheduleItem[];
  onChange: (s: ClassScheduleItem[]) => void;
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
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {DAYS.map(day => {
          const active = schedule.some(s => s.day === day);
          return (
            <button key={day} type="button" onClick={() => toggleDay(day)}
              className={`w-9 h-9 rounded-lg text-[12px] font-semibold transition-all ${active
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
              {day}
            </button>
          );
        })}
      </div>
      {schedule.map(s => (
        <div key={s.day} className="flex items-center gap-2 mb-2">
          <span className="w-7 text-[12px] font-semibold text-slate-600 shrink-0">{s.day}</span>
          <input type="time" value={s.time} onChange={e => update(s.day, 'time', e.target.value)}
            className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-[12px] outline-none focus:border-slate-400 w-28" />
          <span className="text-[10px] text-slate-400">~</span>
          <input type="time" value={s.end_time} onChange={e => update(s.day, 'end_time', e.target.value)}
            className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-[12px] outline-none focus:border-slate-400 w-28" />
        </div>
      ))}
      {schedule.length === 0 && (
        <p className="text-[11px] text-slate-400">요일을 선택하세요</p>
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
      const payload = {
        academy_name: academyName.trim(),
        name: name.trim(), color, description: desc.trim(),
        schedule, clinic_schedule: clinicSchedule, opened_at: openedAt,
      };
      let saved: ClassRow;
      if (mode === 'create') {
        saved = await createClass(payload);
      } else {
        await updateClass(initial!.id, payload);
        saved = { ...initial!, ...payload } as ClassRow;
      }
      onSaved(saved);
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-[15px] font-bold text-slate-900">
            {mode === 'create' ? '새 반 만들기' : '반 정보 수정'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 학원명 */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">학원명 (선택)</label>
            <input value={academyName} onChange={e => setAcademyName(e.target.value)}
              placeholder="예: 패럴렉스"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium outline-none focus:border-slate-400" />
          </div>

          {/* 반 이름 */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">반 이름 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="예: 아라고 2반"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium outline-none focus:border-slate-400" />
          </div>

          {/* 컬러 */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">컬러</label>
            <div className="flex gap-2">
              {COLORS.map(co => {
                const cm = COLOR_MAP[co];
                return (
                  <button key={co} onClick={() => setColor(co)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all ${color === co ? 'border-slate-900' : 'border-transparent hover:border-slate-200'}`}>
                    <div className="w-5 h-5 rounded-full" style={{ background: cm.dot }} />
                    <span className="text-[9px] font-semibold text-slate-500">{COLOR_LABELS[co]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 개설일 */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">개설일</label>
            <input type="date" value={openedAt} onChange={e => setOpenedAt(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 text-[13px] font-medium outline-none focus:border-slate-400 w-full" />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">메모</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="반 설명, 특이사항 등"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] font-medium outline-none focus:border-slate-400 resize-none" />
          </div>

          {/* 수업 시간표 */}
          <div className="border border-slate-100 rounded-xl p-4">
            <ScheduleBuilder label="📅 수업 시간표" schedule={schedule} onChange={setSchedule} />
          </div>

          {/* 클리닉 */}
          <div className="border border-slate-100 rounded-xl p-4">
            <ScheduleBuilder label="🩺 클리닉 시간표" schedule={clinicSchedule} onChange={setClinicSchedule} />
          </div>
        </div>

        {/* 버튼 */}
        <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 transition-all">
            취소
          </button>
          <button onClick={handle} disabled={!name.trim() || saving}
            className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-30">
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
  const cm = COLOR_MAP[cls.color] || COLOR_MAP.indigo;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"
      onClick={onClick}>
      {/* 상단 컬러 바 */}
      <div className="h-1 w-full" style={{ background: cm.dot }} />

      {/* 메인 콘텐츠 */}
      <div className="p-5 flex-1">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: cm.light }}>
              <School size={16} style={{ color: cm.accent }} />
            </div>
            <div className="min-w-0">
              {cls.academy_name && (
                <p className="text-[10px] font-medium text-slate-400 truncate">{cls.academy_name}</p>
              )}
              <h3 className="text-[15px] font-bold text-slate-900 truncate leading-tight">{cls.name}</h3>
            </div>
          </div>
          {/* 편집 버튼 - hover시 표시 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <Settings size={13} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {cls.description && (
          <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{cls.description}</p>
        )}

        {/* 통계 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: cm.light }}>
            <Users size={11} style={{ color: cm.accent }} />
            <span className="text-[11px] font-semibold" style={{ color: cm.accent }}>{studentCount}명</span>
          </div>
          {cls.opened_at && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-400" />
              <span className="text-[11px] text-slate-400">{cls.opened_at.slice(0, 7)}</span>
            </div>
          )}
        </div>

        {/* 수업 시간 */}
        <div className="space-y-2">
          {cls.schedule?.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest pt-0.5 w-10 shrink-0">수업</span>
              <div className="flex gap-1.5 flex-wrap">
                {cls.schedule.map(s => {
                  const mins = calcDurationMins(s.time, s.end_time);
                  return (
                    <span key={s.day}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{ background: cm.light, color: cm.accent }}>
                      {s.day} {s.time}{s.end_time ? `~${s.end_time}` : ''}{mins ? <span style={{opacity:0.6,marginLeft:'3px'}}>({mins}분)</span> : null}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {cls.clinic_schedule?.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest pt-0.5 w-10 shrink-0">클리닉</span>
              <div className="flex gap-1.5 flex-wrap">
                {cls.clinic_schedule.map(s => {
                  const mins = calcDurationMins(s.time, s.end_time);
                  return (
                    <span key={s.day} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-700">
                      {s.day} {s.time}{s.end_time ? `~${s.end_time}` : ''}{mins ? <span style={{opacity:0.6,marginLeft:'3px'}}>({mins}분)</span> : null}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 CTA - 항상 카드 맨 아래 고정 */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between mt-auto"
        style={{ background: cm.light }}>
        <span className="text-[11px] font-semibold" style={{ color: cm.accent }}>주간 현황 열기</span>
        <ArrowRight size={13} style={{ color: cm.accent }} />
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
  const [deleteOption, setDeleteOption] = useState<'ask' | 'students' | 'class_only' | null>(null);

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

  const handleDelete = async (withStudents: boolean) => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (withStudents) {
        const csRows = await getClassStudents(deleteConfirm.id);
        const names = csRows.map(r => r.student_name);
        if (names.length > 0) await supabase.from('students').delete().in('name', names);
      } else {
        const csRows = await getClassStudents(deleteConfirm.id);
        const names = csRows.map(r => r.student_name);
        if (names.length > 0) await supabase.from('students').update({ class_name: '' }).in('name', names);
      }
      await supabase.from('class_students').delete().eq('class_id', deleteConfirm.id);
      await deleteClass(deleteConfirm.id);
      setClasses(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setDeleteOption(null);
    } catch (e) { alert("삭제 실패: " + (e as Error).message); }
    finally { setDeleting(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#fafafa' }}>
      {/* 페이지 헤더 */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">My Class</p>
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">수업 관리</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">반별 주간 출결 · 과제 · 리포트를 관리합니다</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 h-10 px-5 bg-slate-900 text-white rounded-xl text-[12px] font-semibold hover:bg-slate-800 transition-all">
            <Plus size={14} /> 새 반 만들기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <School size={24} className="text-slate-400" />
            </div>
            <p className="text-[16px] font-bold text-slate-800 mb-1">아직 반이 없습니다</p>
            <p className="text-[12px] text-slate-400 mb-6">새 반을 만들어 학생 출결과 과제를 관리하세요</p>
            <button onClick={() => setCreating(true)}
              className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[13px] font-semibold hover:bg-slate-800 transition-all">
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
      </div>

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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Trash2 size={16} className="text-rose-500" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">반 삭제</h3>
              </div>
              <p className="text-[12px] text-slate-500 ml-12">
                <span className="font-semibold text-slate-700">'{deleteConfirm.name}'</span>을 삭제합니다.
                세션·출결·과제 데이터가 모두 삭제됩니다.
              </p>
            </div>

            <div className="p-5 space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">수강생 처리 방식 선택</p>
              <button
                onClick={() => setDeleteOption('students')}
                className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                  deleteOption === 'students'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <p className="text-[13px] font-semibold text-rose-600">수강생 목록에서도 제거</p>
                <p className="text-[10px] text-slate-400 mt-0.5">학생 계정 데이터가 완전히 삭제됩니다</p>
              </button>
              <button
                onClick={() => setDeleteOption('class_only')}
                className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                  deleteOption === 'class_only'
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <p className="text-[13px] font-semibold text-slate-800">반만 제거 (학생 유지)</p>
                <p className="text-[10px] text-slate-400 mt-0.5">학생은 '반 미배정' 상태로 유지됩니다</p>
              </button>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteOption(null); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                취소
              </button>
              <button
                onClick={() => deleteOption && handleDelete(deleteOption === 'students')}
                disabled={!deleteOption || deleting}
                className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[13px] font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-30">
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
