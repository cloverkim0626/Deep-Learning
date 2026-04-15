"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Users, Key, Edit2, Trash2,
  X, Check, GraduationCap, SortAsc, Phone, Calendar, BookOpen
} from "lucide-react";
import {
  getStudents, createStudent, updateStudent,
  deleteStudent, resetStudentPassword, type StudentData
} from "@/lib/database-service";

// ─── Constants ─────────────────────────────────────────────────────────────────
const CLASSES = ["전체", "고3 금토반", "고2 아라고반", "고1 아라원당 연합반"];
const GRADES = [1, 2, 3];
const GENDERS = [
  { value: 'M', label: '남' },
  { value: 'F', label: '여' },
  { value: 'OTHER', label: '기타' }
];
const CLASS_COLORS: Record<string, string> = {
  "고3 금토반": "bg-violet-100 text-violet-700 border-violet-200",
  "고2 아라고반": "bg-sky-100 text-sky-700 border-sky-200",
  "고1 아라원당 연합반": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

type Student = {
  id: string; name: string; class_name: string;
  school?: string; grade?: number; phone?: string;
  gender?: string; enrolled_at?: string; notes?: string;
  password?: string; created_at?: string;
};
type SortField = 'name' | 'class_name' | 'enrolled_at' | 'school';

// ─── Student Form Modal ───────────────────────────────────────────────────────
function StudentModal({
  student, onClose, onSave
}: {
  student: Partial<Student> | null;
  onClose: () => void;
  onSave: (data: StudentData) => Promise<void>;
}) {
  const isEdit = !!student?.id;
  const [form, setForm] = useState<StudentData & { password: string }>({
    name: student?.name || '',
    class_name: student?.class_name || CLASSES[1],
    school: student?.school || '',
    grade: student?.grade || 3,
    phone: student?.phone || '',
    gender: (student?.gender as 'M' | 'F' | 'OTHER') || 'F',
    enrolled_at: student?.enrolled_at || new Date().toISOString().split('T')[0],
    notes: student?.notes || '',
    password: '1234',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.class_name) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      alert("저장 실패: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center bg-accent-light/30">
          <div>
            <h3 className="text-[18px] font-black text-foreground tracking-tight">
              {isEdit ? '학생 정보 수정' : '새 학생 추가'}
            </h3>
            <p className="text-[12px] text-accent font-bold mt-0.5">
              {isEdit ? `${student?.name} 학생의 정보를 수정합니다.` : '모든 변경 사항은 DB에 즉시 반영됩니다.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar">
          {/* Name */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">이름 *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-transparent text-[14px] font-bold outline-none focus:border-foreground/40 transition-colors"
              placeholder="학생 이름"
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">반 *</label>
            <select
              value={form.class_name}
              onChange={e => set('class_name', e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[14px] font-bold outline-none"
            >
              {CLASSES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* School */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">학교</label>
              <input
                value={form.school || ''}
                onChange={e => set('school', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-transparent text-[14px] font-bold outline-none focus:border-foreground/40 transition-colors"
                placeholder="예: 백석고"
              />
            </div>
            {/* Grade */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">학년</label>
              <select
                value={form.grade}
                onChange={e => set('grade', Number(e.target.value))}
                className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[14px] font-bold outline-none"
              >
                {GRADES.map(g => <option key={g} value={g}>고{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">연락처</label>
              <input
                value={form.phone || ''}
                onChange={e => set('phone', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-transparent text-[14px] font-bold outline-none focus:border-foreground/40 transition-colors"
                placeholder="010-0000-0000"
              />
            </div>
            {/* Gender */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">성별</label>
              <div className="flex gap-2 h-12 items-center">
                {GENDERS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => set('gender', g.value)}
                    className={`flex-1 h-10 rounded-xl text-[13px] font-black border transition-all ${
                      form.gender === g.value
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-foreground/10 text-accent hover:border-foreground/30'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Enrolled At */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">입학일</label>
            <input
              type="date"
              value={form.enrolled_at || ''}
              onChange={e => set('enrolled_at', e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-transparent text-[14px] font-bold outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">특이사항</label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full p-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/40 transition-colors resize-none"
              placeholder="학생에 관한 특이사항 메모..."
            />
          </div>

          {!isEdit && (
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-2 block px-1">초기 비밀번호</label>
              <input
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-foreground/10 bg-transparent text-[14px] font-bold outline-none focus:border-foreground/40"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-foreground/5 bg-accent-light/10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="w-full h-14 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:-translate-y-1 active:translate-y-0.5 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {saving ? '저장 중...' : isEdit ? '변경 사항 저장' : '학생 추가 완료'}
            {!saving && <Check size={16} strokeWidth={3} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('전체');
  const [sortField, setSortField] = useState<SortField>('name');
  // undefined = modal closed, null = add new, Student = edit
  const [modalStudent, setModalStudent] = useState<Partial<Student> | null | undefined>(undefined);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStudents();
      setStudents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleSave = async (data: StudentData) => {
    if (modalStudent?.id) {
      await updateStudent(modalStudent.id, data);
    } else {
      await createStudent(data);
    }
    await loadStudents();
  };

  const handleReset = async (student: Student) => {
    if (!confirm(`${student.name} 학생의 비밀번호를 '1234'로 초기화하시겠습니까?`)) return;
    setResettingId(student.id);
    try {
      await resetStudentPassword(student.id);
      alert(`${student.name} 학생의 비밀번호가 초기화되었습니다.`);
    } catch (err: unknown) {
      alert("초기화 실패: " + (err as Error).message);
    } finally {
      setResettingId(null);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`${student.name} 학생을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeletingId(student.id);
    try {
      await deleteStudent(student.id);
      await loadStudents();
    } catch (err: unknown) {
      alert("삭제 실패: " + (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter + Sort
  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        (s.school || '').toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        (s.phone || '').includes(q);
      const matchClass = filterClass === '전체' || s.class_name === filterClass;
      return matchSearch && matchClass;
    })
    .sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortField === 'school') return (a.school || '').localeCompare(b.school || '', 'ko');
      if (sortField === 'enrolled_at') return (b.enrolled_at || '').localeCompare(a.enrolled_at || '');
      return a.class_name.localeCompare(b.class_name, 'ko');
    });

  const genderLabel = (g?: string) => g === 'M' ? '남' : g === 'F' ? '여' : '';

  // Group by class for rendering
  const displayClasses = filterClass === '전체' ? CLASSES.slice(1) : [filterClass];

  return (
    <div className="p-8 md:p-12 pb-24 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-foreground/5 text-accent border border-foreground/5">
              <Users size={18} />
            </div>
            <h1 className="text-4xl text-foreground serif font-black tracking-tight">Student Roster</h1>
          </div>
          <p className="text-[15px] text-accent font-medium pl-1">
            학급별 수강생 명단 및 계정 권한을 중앙 제어합니다.
            <span className="ml-3 text-[13px] font-black text-foreground/30">총 {students.length}명</span>
          </p>
        </div>
        <button
          onClick={() => setModalStudent(null)}
          className="h-14 px-8 bg-foreground text-background text-[14px] font-black tracking-widest rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={3} /> ADD STUDENT
        </button>
      </div>

      {/* Controls */}
      <div className="glass rounded-[2.5rem] border border-foreground/5 p-6 md:p-8 shadow-sm mb-8">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-accent" size={18} strokeWidth={2.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름·학교·반·연락처로 검색..."
            className="w-full h-14 pl-12 pr-5 bg-accent-light rounded-2xl border border-transparent focus:border-foreground/20 focus:bg-white transition-all text-[15px] font-bold"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-black text-accent uppercase tracking-widest">반 필터:</span>
          {CLASSES.map(c => {
            const count = c === '전체' ? students.length : students.filter(s => s.class_name === c).length;
            return (
              <button
                key={c}
                onClick={() => setFilterClass(c)}
                className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                  filterClass === c
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-white border border-foreground/5 text-accent hover:text-foreground'
                }`}
              >
                {c === '전체' ? '전체' : c.replace('[WOODOK] ', '')} ({count})
              </button>
            );
          })}
          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <SortAsc size={14} className="text-accent" />
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] font-bold outline-none"
            >
              <option value="name">이름순</option>
              <option value="class_name">반순</option>
              <option value="school">학교순</option>
              <option value="enrolled_at">최근 입학순</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-20 text-center text-accent font-bold animate-pulse">학생 데이터를 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center glass rounded-[3rem] border border-foreground/5">
          <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4 text-accent">
            <Search size={24} />
          </div>
          <p className="text-accent font-bold mb-2">검색 결과가 없습니다.</p>
          <p className="text-[12px] text-accent/50">다른 검색어를 시도하거나, 학생을 새로 추가하세요.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayClasses.map(cls => {
            const clsStudents = filtered.filter(s => s.class_name === cls);
            if (clsStudents.length === 0) return null;
            const colorClass = CLASS_COLORS[cls] || 'bg-gray-100 text-gray-600 border-gray-200';
            return (
              <div key={cls}>
                {/* Class Header */}
                <div className="flex items-center gap-3 mb-4 px-2">
                  <GraduationCap size={16} className="text-accent" />
                  <h2 className="text-[13px] font-black text-foreground tracking-wider">{cls}</h2>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${colorClass}`}>
                    {clsStudents.length}명
                  </span>
                </div>

                {/* Students */}
                <div className="space-y-3">
                  {clsStudents.map(student => (
                    <div
                      key={student.id}
                      className="glass rounded-[2rem] border border-foreground/5 hover:border-foreground/15 hover:shadow-xl hover:-translate-y-0.5 transition-all group bg-white/50 overflow-hidden"
                    >
                      <div className="flex items-center gap-5 px-6 py-5">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center text-[16px] font-black shadow-lg shrink-0">
                          {student.name[0]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[16px] font-black text-foreground">{student.name}</span>
                            {student.school && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-accent bg-accent-light px-2.5 py-0.5 rounded-lg font-bold">
                                <BookOpen size={10} strokeWidth={3} /> {student.school}
                              </span>
                            )}
                            {student.gender && (
                              <span className="text-[10px] font-black text-accent/50">{genderLabel(student.gender)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                            {student.phone && (
                              <span className="inline-flex items-center gap-1 text-[12px] text-accent font-medium">
                                <Phone size={10} /> {student.phone}
                              </span>
                            )}
                            {student.enrolled_at && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-accent/50 font-bold">
                                <Calendar size={10} /> {student.enrolled_at}
                              </span>
                            )}
                            {student.notes && (
                              <span className="text-[11px] text-accent/40 italic truncate max-w-[200px]">
                                {student.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setModalStudent(student)}
                            className="flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-foreground border border-foreground/5 bg-background px-3 py-2 rounded-xl active:scale-95 transition-all"
                          >
                            <Edit2 size={12} strokeWidth={2.5} /> 편집
                          </button>
                          <button
                            onClick={() => handleReset(student)}
                            disabled={resettingId === student.id}
                            className="flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-foreground border border-foreground/5 bg-background px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Key size={12} strokeWidth={2.5} />
                            {resettingId === student.id ? '초기화 중...' : 'PW 초기화'}
                          </button>
                          <button
                            onClick={() => handleDelete(student)}
                            disabled={deletingId === student.id}
                            className="flex items-center gap-1.5 text-[11px] font-black text-red-400 hover:text-red-600 border border-red-100 bg-red-50 px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Trash2 size={12} strokeWidth={2.5} />
                            {deletingId === student.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Modal */}
      {modalStudent !== undefined && (
        <StudentModal
          student={modalStudent}
          onClose={() => setModalStudent(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
