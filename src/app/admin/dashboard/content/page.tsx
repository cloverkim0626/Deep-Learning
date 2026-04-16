"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, X, Check, Upload, Sparkles, Filter,
  Users, ChevronRight, Edit2, FolderOpen, FolderPlus,
  Trash2, Save, ChevronLeft, BookOpen, BarChart2, RefreshCw
} from "lucide-react";
import {
  saveIngestedPassage, getWordSets, updateWordSet, updateWord, deleteWordSet,
  getFolders, createFolder, deleteFolder, addPassageToFolder, removePassageFromFolder,
  getStudents
} from "@/lib/database-service";
import {
  assignSetToStudents, getAllAssignments, removeAssignment,
  updateAssignmentStatus, getAssignedStudentsForSet
} from "@/lib/assignment-service";

// ─── Taxonomy ──────────────────────────────────────────────────────────────────
const TAXONOMY: Record<string, Record<string, string[]>> = {
  "수능특강 영어": {
    "Part1": ["1강","2강","3강","4강","5강","6강","7강","11강","12강","13강","14강","15강","16강"],
    "Part2": ["21강","22강","23강","24강","25강","26강","27강","28강","29강","30강"],
    "Part3": ["TEST1","TEST2","TEST3"],
  },
  "고3 평가원": {
    "2025년": ["3월","6월","9월","11월"],
    "2026년": ["3월","6월","9월"],
  },
  "고2 평가원": {
    "2025년": ["3월","6월","9월"],
    "2026년": ["3월","6월"],
  },
  "고1 평가원": {
    "2025년": ["3월","6월","9월"],
    "2026년": ["3월","6월"],
  },
  "기타": { "기타": [] },
};
const WORKBOOKS = [...Object.keys(TAXONOMY)];
const CHAPTERS: string[] = [];


// ─── Assignment View Tab ───────────────────────────────────────────────────────
type AssignmentRow = {
  id: string;
  student_name: string;
  student_class: string;
  set_id: string;
  created_at: string;
  status?: string | null; // 'active' | 'completed' | 'expired' | null
  completed_at?: string | null;
  word_sets: { id: string; label: string; workbook: string; chapter: string } | null;
};

function AssignmentTab() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterStudent, setFilterStudent] = useState("전체");
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'expired' | 'all'>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAllAssignments();
      setAssignments((data || []) as unknown as AssignmentRow[]);
    } catch (err) {
      console.error('[AssignmentTab] load error:', err);
      setLoadError((err as Error).message || '배당 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id: string, studentName: string, setLabel: string) => {
    if (!confirm(`"${studentName}"의 "${setLabel}" 배당을 완전 제거하시겠습니까?\n라이브러리에서는 삭제되지 않습니다.`)) return;
    setRemovingId(id);
    try {
      await removeAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setRemovingId(null); }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'completed' | 'expired') => {
    setUpdatingId(id);
    try {
      await updateAssignmentStatus(id, newStatus);
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setUpdatingId(null); }
  };

  const studentNames = ["전체", ...Array.from(new Set(assignments.map(a => a.student_name)))];
  const statusFiltered = statusFilter === 'all' ? assignments
    : statusFilter === 'active' ? assignments.filter(a => !a.status || a.status === 'active')
    : assignments.filter(a => a.status === statusFilter);
  const filtered = filterStudent === "전체" ? statusFiltered : statusFiltered.filter(a => a.student_name === filterStudent);

  const grouped: Record<string, AssignmentRow[]> = {};
  filtered.forEach(a => {
    if (!grouped[a.student_name]) grouped[a.student_name] = [];
    grouped[a.student_name].push(a);
  });

  const statusBadge = (status?: string | null) => {
    if (!status || status === 'active') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-sky-100 text-sky-600">진행중</span>;
    if (status === 'completed') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-success/10 text-success">완료</span>;
    if (status === 'expired') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-600">기간만료</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass rounded-[2.5rem] p-6 border border-foreground/5 flex flex-wrap items-center gap-3">
        <BarChart2 size={16} className="text-accent" />
        <span className="text-[13px] font-black text-foreground">학생별 배당 현황</span>
        <span className="text-[11px] text-accent bg-accent-light px-3 py-1 rounded-xl font-bold ml-1">총 {assignments.length}건</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Status filter tabs */}
          {(['active','completed','expired','all'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                statusFilter === s ? 'bg-foreground text-background' : 'bg-white border border-foreground/10 text-accent hover:text-foreground'
              }`}>
              {s === 'active' ? '진행중' : s === 'completed' ? '완료' : s === 'expired' ? '기간만료' : '전체'}
            </button>
          ))}
          <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)}
            className="h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] font-bold outline-none">
            {studentNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={load} className="h-9 px-3 rounded-xl border border-foreground/10 text-accent hover:text-foreground hover:bg-foreground/5 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-accent animate-pulse font-bold">배당 현황을 불러오는 중...</div>
      ) : loadError ? (
        <div className="py-12 text-center glass rounded-[2.5rem] border border-red-100 bg-red-50">
          <p className="text-red-600 font-bold text-[13px] mb-2">⚠️ 배당 데이터 로드 실패</p>
          <p className="text-red-400 text-[11px] font-medium">{loadError}</p>
          <button onClick={load} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-[12px] font-black hover:bg-red-700 transition-all">다시 시도</button>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center glass rounded-[2.5rem] border border-foreground/5">
          <Users size={32} className="text-accent mx-auto mb-3 opacity-30" />
          <p className="text-accent font-bold opacity-50">{statusFilter === 'active' ? '진행중인 배당이 없습니다.' : '해당 항목이 없습니다.'}</p>
          <p className="text-accent/50 text-[11px] font-medium mt-1">전체 필터로 변경해보세요.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([studentName, rows]) => (
            <div key={studentName} className="glass rounded-[2rem] border border-foreground/5 overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 bg-accent-light/30 border-b border-foreground/5">
                <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-[13px]">
                  {studentName[0]}
                </div>
                <div>
                  <div className="text-[15px] font-black text-foreground">{studentName}</div>
                  <div className="text-[11px] text-accent font-medium">{rows[0]?.student_class} · {rows.length}개 세트 배당됨</div>
                </div>
              </div>
              <div className="divide-y divide-foreground/5">
                {rows.map(row => (
                  <div key={row.id} className={`flex items-center gap-3 px-6 py-4 hover:bg-accent-light/20 transition-colors ${
                    row.status === 'completed' ? 'opacity-60' : row.status === 'expired' ? 'opacity-50' : ''
                  }`}>
                    <BookOpen size={14} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate flex items-center gap-2">
                        {row.word_sets?.label || "알 수 없는 세트"}
                        {statusBadge(row.status)}
                      </div>
                      <div className="text-[11px] text-accent">
                        {[row.word_sets?.workbook, row.word_sets?.chapter].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-[10px] text-accent/50 font-bold shrink-0">
                      {new Date(row.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                    {/* 완료/만료 버튼 — active 상태만 표시 */}
                    {(!row.status || row.status === 'active') && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(row.id, 'completed')}
                          disabled={updatingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-success border border-success/30 bg-success/5 hover:bg-success/10 transition-all disabled:opacity-30 shrink-0"
                          title="학생이 통과함 — 학생 실습 목록에서 제거"
                        >
                          <Check size={10} strokeWidth={3} /> 완료
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(row.id, 'expired')}
                          disabled={updatingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-30 shrink-0"
                          title="기간 만료 처리 — 미완료로 DB 저장"
                        >
                          기간만료
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleRemove(row.id, studentName, row.word_sets?.label || "")}
                      disabled={removingId === row.id}
                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 shrink-0"
                      title="배당 완전 제거 (라이브러리 유지)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({
  set, onClose, students
}: {
  set: { id: string; workbook: string; chapter: string; label: string };
  onClose: () => void;
  students: { name: string; class: string }[];
}) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("전체");
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  useEffect(() => {
    getAssignedStudentsForSet(set.id).then(setAssignedStudents).catch(() => {});
  }, [set.id]);

  const uniqueClasses = ["전체", ...Array.from(new Set(students.map(s => s.class)))];
  const visibleStudents = filterClass === "전체" ? students : students.filter(s => s.class === filterClass);
  const toggle = (name: string) => setSelectedNames(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  const selectAll = () => setSelectedNames(visibleStudents.filter(s => !assignedStudents.includes(s.name)).map(s => s.name));

  const handleAssign = async () => {
    if (selectedNames.length === 0) return;
    setIsAssigning(true);
    try {
      await assignSetToStudents(set.id, selectedNames.map(name => ({ name, class: students.find(s => s.name === name)?.class || "" })));
      alert(`${selectedNames.length}명의 학생에게 배당되었습니다.`);
      onClose();
    } catch (err: unknown) {
      alert("배당 실패: " + (err as Error).message);
    } finally { setIsAssigning(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center bg-accent-light/30">
          <div>
            <h3 className="text-[18px] font-black text-foreground">학습 세트 배당</h3>
            <p className="text-[12px] text-accent font-bold mt-0.5">{set.workbook} · {set.chapter} · {set.label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl"><X size={20} /></button>
        </div>
        <div className="px-6 pt-4 pb-3 flex gap-2 flex-wrap border-b border-foreground/5 bg-accent-light/20 items-center">
          {uniqueClasses.map(c => (
            <button key={c} onClick={() => setFilterClass(c)} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${filterClass === c ? 'bg-foreground text-background shadow-md' : 'bg-white/60 text-accent hover:bg-foreground/10'}`}>{c}</button>
          ))}
          <button onClick={selectAll} className="ml-auto text-[11px] font-black text-accent hover:text-foreground transition-colors px-2">전체 선택</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
          <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">{selectedNames.length > 0 ? `${selectedNames.length}명 선택됨` : '학생을 선택하세요'}</p>
          {visibleStudents.map(student => {
            const isAssigned = assignedStudents.includes(student.name);
            const isSelected = selectedNames.includes(student.name);
            return (
              <button key={student.name} onClick={() => !isAssigned && toggle(student.name)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isAssigned
                    ? 'bg-sky-50 border-sky-200 cursor-not-allowed'
                    : isSelected ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-white border-foreground/5 text-foreground hover:border-foreground/20'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px] ${
                    isAssigned ? 'bg-sky-100 text-sky-600'
                    : isSelected ? 'bg-background text-foreground' : 'bg-accent-light text-accent'
                  }`}>{student.name[0]}</div>
                  <div className="text-left">
                    <div className={`text-[14px] font-bold flex items-center gap-1.5 ${
                      isAssigned ? 'text-sky-700' : ''
                    }`}>
                      {student.name}
                      {isAssigned && <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-sky-200 text-sky-700">배당중</span>}
                    </div>
                    <div className={`text-[10px] font-bold ${
                      isAssigned ? 'text-sky-400'
                      : isSelected ? 'opacity-60' : 'text-accent'
                    }`}>{student.class}</div>
                  </div>
                </div>
                {isSelected && !isAssigned && <Check size={18} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        <div className="p-6 border-t border-foreground/5 bg-accent-light/10">
          <button onClick={handleAssign} disabled={isAssigning || selectedNames.length === 0}
            className="w-full h-14 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:-translate-y-1 disabled:opacity-20 transition-all">
            {isAssigning ? "배당 중..." : `${selectedNames.length}명에게 배당`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Library Word Panel (오른쪽 슬라이드 패널 — 전체저장) ──────────────────────
function LibraryWordPanel({
  set, onClose, onSaved
}: {
  set: {
    id: string; label: string; full_text?: string;
    words: {
      id: string; word: string; pos_abbr: string; korean: string;
      context: string; synonyms: string; antonyms: string; grammar_tip: string;
      test_synonym?: boolean; test_antonym?: boolean;
    }[];
  };
  onClose: () => void; onSaved: () => void;
}) {
  const [words, setWords] = useState(set.words.map(w => ({ ...w })));
  const [saving, setSaving] = useState(false);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const synCount = words.filter(w => w.test_synonym).length;
  const antCount = words.filter(w => w.test_antonym).length;

  const setWordField = (id: string, field: string, val: string | boolean) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
    setDirty(true);
  };

  // ── 전체저장 ──────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(words.map(w =>
        updateWord(w.id, {
          korean: w.korean, synonyms: w.synonyms, antonyms: w.antonyms,
          grammar_tip: w.grammar_tip, context: w.context,
          test_synonym: w.test_synonym, test_antonym: w.test_antonym,
        })
      ));
      setDirty(false);
      onSaved();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;
    setDeletingWordId(wordId);
    try {
      const { deleteWord } = await import('@/lib/database-service');
      await deleteWord(wordId);
      setWords(prev => prev.filter(w => w.id !== wordId));
      setDirty(true);
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setDeletingWordId(null); }
  };

  return (
    <div className="fixed top-0 right-0 w-[440px] h-screen bg-background border-l border-foreground/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-foreground/5 bg-accent-light/20 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-foreground truncate">{set.label}</h3>
            <p className="text-[10px] text-accent mt-0.5">
              {[(set as { sub_sub_category?: string; passage_number?: string }).sub_sub_category, (set as { sub_sub_category?: string; passage_number?: string }).passage_number ? `${(set as { sub_sub_category?: string; passage_number?: string }).passage_number}번` : ''].filter(Boolean).join(' · ')} · 단어 {words.length}개 · 유의어 {synCount} · 반의어 {antCount}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent shrink-0"><X size={16} /></button>
        </div>
        {/* 전체저장 버튼 */}
        <button
          onClick={handleSaveAll}
          disabled={saving || !dirty}
          className={`w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all ${
            dirty
              ? 'bg-foreground text-background hover:-translate-y-0.5 shadow-lg'
              : 'bg-foreground/10 text-accent/40 cursor-not-allowed'
          } disabled:opacity-50`}
        >
          <Save size={13} strokeWidth={2.5} />
          {saving ? '저장 중...' : dirty ? `전체저장 (유 ${synCount} · 반 ${antCount})` : '변경사항 없음'}
        </button>
        <p className="text-[9px] text-accent/50 mt-1.5 text-center">유/반 버튼 · 필드 수정 후 위 전체저장 클릭</p>
      </div>
      {/* Word list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {words.map((w, idx) => (
          <div key={w.id} className={`rounded-xl border transition-all ${
            (w.test_synonym || w.test_antonym) ? 'border-foreground/10 bg-white shadow-sm' : 'border-foreground/5 opacity-60'
          }`}>
            <div className="flex items-center gap-1.5 px-3 py-2.5 flex-wrap">
              <span className="w-5 h-5 rounded-md bg-foreground/10 text-foreground flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span>
              <span className="text-[14px] font-black text-foreground serif">{w.word}</span>
              <span className="text-[8px] text-accent bg-accent-light px-1.5 py-0.5 rounded font-bold">{w.pos_abbr}</span>
              <span className="text-[10px] text-foreground/50 flex-1 truncate">{w.korean}</span>
              <button
                onClick={() => setWordField(w.id, 'test_synonym', !w.test_synonym)}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_synonym ? 'bg-sky-500 text-white border-sky-500' : 'bg-white border-sky-200 text-sky-400'
                }`}>유</button>
              <button
                onClick={() => setWordField(w.id, 'test_antonym', !w.test_antonym)}
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_antonym ? 'bg-rose-500 text-white border-rose-500' : 'bg-white border-rose-200 text-rose-400'
                }`}>반</button>
              <button onClick={() => handleDeleteWord(w.id)} disabled={deletingWordId === w.id}
                className="p-1 text-red-200 hover:text-red-500 transition-all"><Trash2 size={11} /></button>
            </div>
            <div className="px-3 pb-2.5 space-y-1">
              {([
                { key: 'korean', label: '한글 의미' },
                { key: 'synonyms', label: '유의어' },
                { key: 'antonyms', label: '반의어' },
                { key: 'grammar_tip', label: '팁' },
              ] as { key: string; label: string }[]).map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-[8px] font-black text-accent uppercase shrink-0 w-12">{f.label}</label>
                  <input value={(w as Record<string, string | boolean>)[f.key] as string || ''}
                    onChange={e => setWordField(w.id, f.key, e.target.value)}
                    className="flex-1 h-7 px-2 rounded-lg border border-foreground/8 bg-transparent text-[11px] outline-none focus:border-foreground/30" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordEditPanel({ set, onClose, onSaved }: { set: { id: string; label: string; full_text?: string; words: { id: string; word: string; pos_abbr: string; korean: string; context: string; synonyms: string; antonyms: string; grammar_tip: string }[] }, onClose: () => void, onSaved: () => void }) {
  const [fullText, setFullText] = useState(set.full_text || '');
  const [words, setWords] = useState(set.words.map(w => ({ ...w })));
  const [savingSet, setSavingSet] = useState(false);
  const [savingWordId, setSavingWordId] = useState<string | null>(null);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  const handleSaveSet = async () => {
    setSavingSet(true);
    try {
      await updateWordSet(set.id, { full_text: fullText });
      alert('지문 텍스트 저장 완료!');
      onSaved();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setSavingSet(false); }
  };

  const handleSaveWord = async (w: typeof words[0]) => {
    setSavingWordId(w.id);
    try {
      await updateWord(w.id, { korean: w.korean, synonyms: w.synonyms, antonyms: w.antonyms, grammar_tip: w.grammar_tip, context: w.context });
      onSaved();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setSavingWordId(null); }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;
    setDeletingWordId(wordId);
    try {
      const { deleteWord } = await import('@/lib/database-service');
      await deleteWord(wordId);
      setWords(prev => prev.filter(w => w.id !== wordId));
      onSaved();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setDeletingWordId(null); }
  };

  const setWordField = (id: string, field: string, val: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-background border-l border-foreground/10 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-500">
        <div className="flex items-center justify-between px-8 py-6 border-b border-foreground/5 bg-accent-light/20 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors text-accent hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-[16px] font-black text-foreground">{set.label}</h2>
              <p className="text-[11px] text-accent font-bold mt-0.5">Human-in-the-Loop 편집 모드 · {words.length}개 단어</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <Edit2 size={11} className="text-amber-600" />
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">편집 중</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 border-b border-foreground/5">
            <h3 className="text-[12px] font-black text-accent uppercase tracking-widest mb-3">지문 원문</h3>
            <textarea value={fullText} onChange={e => setFullText(e.target.value)} rows={5}
              className="w-full p-5 rounded-2xl border border-foreground/10 bg-accent-light/30 text-[13px] leading-relaxed font-serif outline-none focus:border-foreground/30 transition-colors resize-none" />
            <button onClick={handleSaveSet} disabled={savingSet}
              className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-[12px] font-black disabled:opacity-40 hover:-translate-y-0.5 transition-all">
              <Save size={13} strokeWidth={2.5} />
              {savingSet ? '저장 중...' : '지문 텍스트 저장'}
            </button>
          </div>
          <div className="p-8 space-y-6">
            <h3 className="text-[12px] font-black text-accent uppercase tracking-widest">단어 목록 편집</h3>
            {words.map((w, idx) => (
              <div key={w.id} className="glass rounded-[2rem] border border-foreground/5 p-6 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-foreground text-background flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                    <span className="text-[20px] font-black text-foreground serif">{w.word}</span>
                    <span className="text-[11px] text-accent font-black bg-accent-light px-2 py-0.5 rounded-lg">{w.pos_abbr}</span>
                  </div>
                  <button onClick={() => handleDeleteWord(w.id)} disabled={deletingWordId === w.id}
                    className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                {[
                  { key: 'korean', label: '한글 의미' },
                  { key: 'synonyms', label: '유의어 (콤마 구분)' },
                  { key: 'antonyms', label: '반의어 (콤마 구분)' },
                  { key: 'grammar_tip', label: '문법/학습 팁' },
                  { key: 'context', label: '예문/문맥' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">{field.label}</label>
                    <input value={(w as Record<string, string>)[field.key] || ''} onChange={e => setWordField(w.id, field.key, e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-foreground/8 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/30 transition-colors" />
                  </div>
                ))}
                <button onClick={() => handleSaveWord(w)} disabled={savingWordId === w.id}
                  className="w-full h-10 bg-foreground/5 hover:bg-foreground hover:text-background rounded-xl text-[12px] font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  <Save size={12} strokeWidth={2.5} />
                  {savingWordId === w.id ? '저장 중...' : '이 단어 저장'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Folder Assign Modal ─────────────────────────────────────────────────────
function FolderAssignModal({
  folder, onClose, students
}: {
  folder: { id: string; name: string; folder_passages: { set_id: string; word_sets: { label: string; workbook: string; chapter: string } }[] };
  onClose: () => void;
  students: { name: string; class: string }[];
}) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState("전체");
  const [isAssigning, setIsAssigning] = useState(false);
  const uniqueClasses = ["전체", ...Array.from(new Set(students.map(s => s.class)))];
  const visibleStudents = filterClass === "전체" ? students : students.filter(s => s.class === filterClass);
  const toggle = (name: string) => setSelectedNames(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  const selectAll = () => setSelectedNames(visibleStudents.map(s => s.name));
  const passages = folder.folder_passages || [];

  const handleAssign = async () => {
    if (selectedNames.length === 0 || passages.length === 0) return;
    setIsAssigning(true);
    try {
      const studentList = selectedNames.map(name => ({ name, class: students.find(s => s.name === name)?.class || "" }));
      await Promise.all(passages.map(fp => assignSetToStudents(fp.set_id, studentList)));
      alert(`"${folder.name}" 폴더 내 ${passages.length}개 지문이 ${selectedNames.length}명에게 배당되었습니다.`);
      onClose();
    } catch (err: unknown) {
      alert("배당 실패: " + (err as Error).message);
    } finally { setIsAssigning(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center bg-accent-light/30">
          <div>
            <h3 className="text-[18px] font-black text-foreground">폴더 일괄 배당</h3>
            <p className="text-[12px] text-accent font-bold mt-0.5">📁 {folder.name} · {passages.length}개 지문 전체 배당</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl"><X size={20} /></button>
        </div>
        {/* Passage preview */}
        <div className="px-6 py-3 bg-accent-light/20 border-b border-foreground/5 flex flex-wrap gap-2">
          {passages.slice(0, 5).map(fp => (
            <span key={fp.set_id} className="text-[10px] font-bold bg-white border border-foreground/10 px-2.5 py-1 rounded-lg text-foreground">
              {fp.word_sets?.label}
            </span>
          ))}
          {passages.length > 5 && <span className="text-[10px] font-bold text-accent px-2 py-1">+{passages.length - 5}개 더</span>}
        </div>
        <div className="px-6 pt-4 pb-3 flex gap-2 flex-wrap border-b border-foreground/5 bg-accent-light/10 items-center">
          {uniqueClasses.map(c => (
            <button key={c} onClick={() => setFilterClass(c)} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${filterClass === c ? 'bg-foreground text-background shadow-md' : 'bg-white/60 text-accent hover:bg-foreground/10'}`}>{c}</button>
          ))}
          <button onClick={selectAll} className="ml-auto text-[11px] font-black text-accent hover:text-foreground transition-colors px-2">전체 선택</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
          <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">{selectedNames.length > 0 ? `${selectedNames.length}명 선택됨` : '학생을 선택하세요'}</p>
          {visibleStudents.map(student => (
            <button key={student.name} onClick={() => toggle(student.name)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedNames.includes(student.name) ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-white border-foreground/5 text-foreground hover:border-foreground/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px] ${selectedNames.includes(student.name) ? 'bg-background text-foreground' : 'bg-accent-light text-accent'}`}>{student.name[0]}</div>
                <div className="text-left">
                  <div className="text-[14px] font-bold">{student.name}</div>
                  <div className={`text-[10px] font-bold ${selectedNames.includes(student.name) ? 'opacity-60' : 'text-accent'}`}>{student.class}</div>
                </div>
              </div>
              {selectedNames.includes(student.name) && <Check size={18} strokeWidth={3} />}
            </button>
          ))}
        </div>
        <div className="p-6 border-t border-foreground/5 bg-accent-light/10">
          <button onClick={handleAssign} disabled={isAssigning || selectedNames.length === 0 || passages.length === 0}
            className="w-full h-14 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:-translate-y-1 disabled:opacity-20 transition-all">
            {isAssigning ? "배당 중..." : `${selectedNames.length}명에게 ${passages.length}개 지문 일괄 배당`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Folder Tab ────────────────────────────────────────────────────────────────
function FolderTab({ wordSets, students }: {
  wordSets: { id: string; label: string; workbook: string; chapter: string }[];
  students: { name: string; class: string }[];
}) {
  const [folders, setFolders] = useState<{
    id: string; name: string; description: string;
    folder_passages: { set_id: string; word_sets: { id: string; label: string; workbook: string; chapter: string } }[]
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [addingSetId, setAddingSetId] = useState<string>('');
  const [removingPassageKey, setRemovingPassageKey] = useState<string | null>(null);
  const [folderAssignTarget, setFolderAssignTarget] = useState<typeof folders[0] | null>(null);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await getFolders();
      setFolders((data || []) as typeof folders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadFolders(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createFolder(newName.trim(), newDesc.trim());
      setNewName(''); setNewDesc('');
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`폴더 "${name}"을 삭제하시겠습니까?\n폴더만 삭제되고, 지문은 라이브러리에 유지됩니다.`)) return;
    try { await deleteFolder(id); await loadFolders(); }
    catch (err: unknown) { alert((err as Error).message); }
  };

  const handleAddPassage = async (folderId: string) => {
    if (!addingSetId) return;
    try {
      await addPassageToFolder(folderId, addingSetId);
      setAddingSetId('');
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
  };

  const handleRemovePassage = async (folderId: string, setId: string, label: string) => {
    if (!confirm(`"${label}" 지문을 이 폴더에서 제거하시겠습니까?\n라이브러리에는 유지됩니다.`)) return;
    const key = `${folderId}_${setId}`;
    setRemovingPassageKey(key);
    try {
      await removePassageFromFolder(folderId, setId);
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setRemovingPassageKey(null); }
  };

  return (
    <>
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="glass rounded-[2.5rem] p-8 border border-foreground/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center">
            <FolderPlus size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">새 폴더 생성</h3>
            <p className="text-[12px] text-accent">여러 지문을 하나의 폴더로 묶어 배당합니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">폴더 이름 *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30"
              placeholder="예: 수능특강 1강 세트" />
          </div>
          <div>
            <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">설명</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/30"
              placeholder="선택 사항" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating || !newName.trim()}
          className="w-full h-12 bg-foreground text-background rounded-2xl font-black text-[13px] disabled:opacity-20 hover:-translate-y-0.5 transition-all">
          {creating ? '생성 중...' : '폴더 생성'}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-accent animate-pulse font-bold">폴더 목록을 불러오는 중...</div>
      ) : folders.length === 0 ? (
        <div className="py-16 text-center glass rounded-[2.5rem] border border-foreground/5">
          <FolderOpen size={32} className="text-accent mx-auto mb-3 opacity-40" />
          <p className="text-accent font-bold opacity-50">아직 생성된 폴더가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map(folder => {
            const isExpanded = expandedFolderId === folder.id;
            const passages = folder.folder_passages || [];
            return (
              <div key={folder.id} className="glass rounded-[2rem] border border-foreground/5 overflow-hidden">
                <div className="flex items-center gap-4 px-7 py-5">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-accent">
                    <FolderOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-black text-foreground">{folder.name}</div>
                    {folder.description && <div className="text-[12px] text-accent">{folder.description}</div>}
                    <div className="text-[11px] text-accent/50 font-bold mt-0.5">지문 {passages.length}개</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {passages.length > 0 && (
                      <button
                        onClick={() => setFolderAssignTarget(folder)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black bg-foreground text-background hover:opacity-90 transition-all shadow-sm"
                      >
                        <Users size={12} strokeWidth={3} /> 배당
                      </button>
                    )}
                    <button onClick={() => setExpandedFolderId(isExpanded ? null : folder.id)}
                      className="px-4 py-2 rounded-xl text-[12px] font-black border border-foreground/10 hover:bg-foreground/5 transition-all">
                      {isExpanded ? '접기' : '편집'}
                    </button>
                    <button onClick={() => handleDelete(folder.id, folder.name)}
                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-foreground/5 p-6 bg-accent-light/20 space-y-4">
                    {passages.length > 0 && (
                      <div className="space-y-2">
                        {passages.map(fp => {
                          const key = `${folder.id}_${fp.set_id}`;
                          return (
                            <div key={fp.set_id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-foreground/5">
                              <BookOpen size={14} className="text-accent shrink-0" />
                              <span className="text-[13px] font-bold text-foreground flex-1">{fp.word_sets?.label || '알 수 없음'}</span>
                              <span className="text-[10px] text-accent">{fp.word_sets?.workbook} · {fp.word_sets?.chapter}</span>
                              <button
                                onClick={() => handleRemovePassage(folder.id, fp.set_id, fp.word_sets?.label || '')}
                                disabled={removingPassageKey === key}
                                className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1"
                                title="이 폴더에서 지문 제거 (라이브러리 유지)"
                              >
                                <Trash2 size={13} />
                                <span className="text-[10px] font-black">제거</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <select value={addingSetId} onChange={e => setAddingSetId(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-xl border border-foreground/10 bg-white text-[13px] font-medium outline-none">
                        <option value="">지문 선택...</option>
                        {wordSets.filter(s => !passages.some(fp => fp.set_id === s.id)).map(s => (
                          <option key={s.id} value={s.id}>{s.workbook} · {s.chapter} · {s.label}</option>
                        ))}
                      </select>
                      <button onClick={() => handleAddPassage(folder.id)} disabled={!addingSetId}
                        className="h-11 px-5 bg-foreground text-background rounded-xl text-[12px] font-black disabled:opacity-30 transition-all">
                        추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    {folderAssignTarget && (
      <FolderAssignModal
        folder={folderAssignTarget}
        onClose={() => setFolderAssignTarget(null)}
        students={students}
      />
    )}
    </>
  );
}


// ─── Smart AI Ingest ───────────────────────────────────────────────────────────
type ReviewWord = {
  word: string; pos_abbr: string; korean: string; context: string; context_korean: string;
  synonyms: string; antonyms: string; grammar_tip: string;
  test_synonym: boolean; // 미렀색 버튼: 유의어 문제 출제
  test_antonym: boolean; // 난색 버튼: 반의어 문제 출제
  _deleted?: boolean;
};

type PassageEntry = {
  id: string; rawText: string; category: string; subCategory: string;
  subSubCategory: string; passageNumber: string; label: string;
  status: "draft" | "scanning" | "ready" | "saving" | "saved";
  words: ReviewWord[]; sentences: unknown;
};

function makeEntry(): PassageEntry {
  return {
    id: Math.random().toString(36).slice(2),
    rawText: "", category: Object.keys(TAXONOMY)[0], subCategory: "",
    subSubCategory: "", passageNumber: "", label: "",
    status: "draft", words: [], sentences: null,
  };
}

// ── Word Review Right Panel ──────────────────────────────────────────────────
function WordReviewPanel({ entry, onClose, onUpdateWord }: {
  entry: PassageEntry; onClose: () => void;
  onUpdateWord: (idx: number, field: keyof ReviewWord, val: string | boolean) => void;
}) {
  const activeCount = entry.words.filter(w => !w._deleted).length;
  const synCount = entry.words.filter(w => !w._deleted && w.test_synonym).length;
  const antCount = entry.words.filter(w => !w._deleted && w.test_antonym).length;
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-foreground/5 bg-accent-light/20 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-foreground truncate">{entry.label}</h3>
            <p className="text-[10px] text-accent mt-0.5">{entry.category}{entry.subCategory ? ` · ${entry.subCategory}` : ""}{entry.passageNumber ? ` · ${entry.passageNumber}` : ""}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent shrink-0"><X size={16} /></button>
        </div>
        <div className="flex gap-2 mt-2.5 flex-wrap">
          <span className="text-[10px] font-black px-2 py-0.5 bg-foreground/8 rounded-lg">전체 {activeCount}</span>
          <span className="text-[10px] font-black px-2 py-0.5 bg-sky-500 text-white rounded-lg">유의어 {synCount}개</span>
          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-lg">반의어 {antCount}개</span>
        </div>
        <p className="mt-1.5 text-[9px] text-accent/60 leading-snug">
          <span className="text-sky-500 font-black">유</span> = 유의어 출제&nbsp;|&nbsp;<span className="text-rose-500 font-black">반</span> = 반의어 출제 (독립 선택)
        </p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {entry.words.map((w, idx) => (
          <div key={idx} className={`rounded-xl border transition-all ${
            w._deleted ? "opacity-25 border-red-100"
            : (w.test_synonym || w.test_antonym) ? "border-foreground/10 bg-white shadow-sm"
            : "border-foreground/5 opacity-50"
          }`}>
            <div className="flex items-center gap-1.5 px-3 py-2.5 flex-wrap">
              <span className="w-5 h-5 rounded-md bg-foreground/10 text-foreground flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span>
              <span className="text-[14px] font-black text-foreground serif">{w.word}</span>
              <span className="text-[8px] text-accent bg-accent-light px-1.5 py-0.5 rounded font-bold">{w.pos_abbr}</span>
              <span className="text-[10px] text-foreground/50 flex-1 truncate">{w.korean}</span>
              <button
                onClick={() => onUpdateWord(idx, "test_synonym", !w.test_synonym)}
                disabled={!!w._deleted}
                title="유의어 문제 출제"
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_synonym && !w._deleted
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white border-sky-200 text-sky-400"
                }`}
              >유</button>
              <button
                onClick={() => onUpdateWord(idx, "test_antonym", !w.test_antonym)}
                disabled={!!w._deleted}
                title="반의어 문제 출제"
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_antonym && !w._deleted
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white border-rose-200 text-rose-400"
                }`}
              >반</button>
              {w._deleted
                ? <button onClick={() => onUpdateWord(idx, "_deleted", false)} className="text-[9px] font-black text-blue-500 px-1.5 py-0.5 border border-blue-200 rounded-lg bg-blue-50">복원</button>
                : <button onClick={() => onUpdateWord(idx, "_deleted", true)} className="p-1 text-red-200 hover:text-red-500 transition-all"><Trash2 size={11} /></button>
              }
            </div>
            {!w._deleted && (
              <div className="px-3 pb-2.5 space-y-1">
                {([
                  { key: "korean", label: "한글 의미" },
                  { key: "synonyms", label: "유의어" },
                  { key: "antonyms", label: "반의어" },
                  { key: "grammar_tip", label: "팁" },
                ] as { key: keyof ReviewWord; label: string }[]).map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <label className="text-[8px] font-black text-accent uppercase shrink-0 w-12">{f.label}</label>
                    <input value={(w[f.key] as string) || ""} onChange={e => onUpdateWord(idx, f.key, e.target.value)}
                      className="flex-1 h-7 px-2 rounded-lg border border-foreground/8 bg-transparent text-[11px] outline-none focus:border-foreground/30" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-foreground/5 shrink-0">
        <button onClick={onClose}
          className="w-full h-12 bg-foreground text-background rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-xl">
          <Check size={14} />
          편집 완료 — 닫기
        </button>
      </div>
    </div>
  );
}

// ── Passage Entry Card ────────────────────────────────────────────────────────
function PassageCard({ entry, idx, onUpdate, onScan, onOpenReview, onRemove, isReviewing }: {
  entry: PassageEntry; idx: number; isReviewing: boolean;
  onUpdate: (field: string, val: string) => void;
  onScan: () => void; onOpenReview: () => void; onRemove: () => void;
}) {
  const subCats = Object.keys(TAXONOMY[entry.category] || {});
  const subSubCats = TAXONOMY[entry.category]?.[entry.subCategory] || [];
  const isDraft = entry.status === "draft" || entry.status === "scanning";
  return (
    <div className={`glass rounded-[2rem] border p-5 transition-all ${isReviewing ? "border-blue-300 ring-2 ring-blue-100" : entry.status === "saved" ? "border-success/30" : "border-foreground/5"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</span>
          {entry.label && <span className="text-[13px] font-bold text-foreground truncate">{entry.label}</span>}
          {entry.status === "scanning" && <span className="text-[10px] font-black text-accent animate-pulse ml-1">분석 중...</span>}
          {entry.status === "ready" && <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">{entry.words.length}개 추출 · 검토 필요</span>}
          {entry.status === "saved" && <span className="text-[10px] font-black text-success bg-success/10 px-2 py-0.5 rounded-lg">✓ 저장 완료</span>}
        </div>
        <button onClick={onRemove} className="p-1.5 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"><X size={14} /></button>
      </div>
      {isDraft ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">대분류</label>
              <select value={entry.category} onChange={e => { onUpdate("category", e.target.value); onUpdate("subCategory", ""); onUpdate("subSubCategory", ""); }}
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-white text-[11px] font-medium outline-none">
                {Object.keys(TAXONOMY).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">중분류</label>
              <select value={entry.subCategory} onChange={e => { onUpdate("subCategory", e.target.value); onUpdate("subSubCategory", ""); }}
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-white text-[11px] font-medium outline-none">
                <option value="">선택</option>
                {subCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">소분류</label>
              <select value={entry.subSubCategory} onChange={e => onUpdate("subSubCategory", e.target.value)}
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-white text-[11px] font-medium outline-none">
                <option value="">선택</option>
                {subSubCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">지문번호</label>
              <input value={entry.passageNumber} onChange={e => onUpdate("passageNumber", e.target.value)} placeholder="예: 18번"
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[11px] font-medium outline-none" />
            </div>
          </div>
          <input value={entry.label} onChange={e => onUpdate("label", e.target.value)} placeholder="지문 제목 (비워두면 AI가 자동 추출)"
            className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none mb-2" />
          <textarea value={entry.rawText} onChange={e => onUpdate("rawText", e.target.value)} placeholder="지문 원문을 붙여넣으세요..." rows={4}
            className="w-full p-3 rounded-2xl border border-foreground/10 bg-transparent text-[12px] leading-relaxed font-serif outline-none resize-none mb-2" />
          <button onClick={onScan} disabled={entry.status === "scanning" || !entry.rawText.trim()}
            className="w-full h-10 bg-foreground text-background rounded-xl flex items-center justify-center gap-2 text-[12px] font-black disabled:opacity-20 hover:-translate-y-0.5 transition-all">
            {entry.status === "scanning" ? "AI 추출 중..." : <><Sparkles size={13} /> AI 분석 (20개 추출)</>}
          </button>
        </>
      ) : entry.status === "saved" ? (
        <p className="text-[12px] text-success font-bold flex items-center gap-1.5"><Check size={13} strokeWidth={3} /> 저장 완료 (유의어 {entry.words.filter(w => w.test_synonym && !w._deleted).length} · 반의어 {entry.words.filter(w => w.test_antonym && !w._deleted).length})</p>
      ) : (
        <div className="flex gap-2">
          <button onClick={onOpenReview}
            className={`flex-1 h-10 rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${isReviewing ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-blue-600 text-white"}`}>
            <Edit2 size={13} /> {isReviewing ? "검토 패널 열려있음" : "단어 검토 & 체크 →"}
          </button>
          <button onClick={() => onUpdate("status", "draft")} className="h-10 px-3 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground transition-all">재분석</button>
        </div>
      )}
    </div>
  );
}

// ── Main SmartAIIngest Component ─────────────────────────────────────────────
function SmartAIIngest({ onComplete }: { onComplete: () => void }) {
  const [passages, setPassages] = useState<PassageEntry[]>([makeEntry()]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const reviewEntry = passages.find(p => p.id === reviewingId) ?? null;

  const updateEntry = (id: string, field: string, val: unknown) =>
    setPassages(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));

  const updateReviewWord = (wordIdx: number, field: keyof ReviewWord, val: string | boolean) => {
    setPassages(prev => prev.map(p => {
      if (p.id !== reviewingId) return p;
      return { ...p, words: p.words.map((w, wi) => wi === wordIdx ? { ...w, [field]: val } : w) };
    }));
  };

  const handleScan = async (id: string) => {
    const entry = passages.find(p => p.id === id);
    if (!entry) return;
    updateEntry(id, "status", "scanning");
    try {
      const res = await fetch("/api/ai-ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: entry.rawText, category: entry.category,
          sub_category: entry.subCategory, sub_sub_category: entry.subSubCategory,
          passage_number: entry.passageNumber, passageLabel: entry.label,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const words: ReviewWord[] = (data.words || []).map((w: ReviewWord & { is_key?: boolean }) => ({
        ...w,
        // AI marks is_key for truly important words — pre-check both for them
        test_synonym: !!w.is_key,
        test_antonym: !!w.is_key,
        _deleted: false,
      }));
      setPassages(prev => prev.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: "ready",
          words,
          sentences: data.sentences,
          // Auto-fill label from AI if user didn't type one
          label: p.label.trim() ? p.label : (data.label || "미제목 지문"),
        };
      }));
      setReviewingId(id);
    } catch (err: unknown) {
      alert("AI 분석 실패: " + (err as Error).message);
      updateEntry(id, "status", "draft");
    }
  };

  const handleSaveAll = async () => {
    const toSave = passages.filter(p => p.status === "ready");
    if (toSave.length === 0) {
      alert("저장할 수 있는 지문이 없습니다. \nAI 분석 완료한 지문을 먼저 비정해 주세요.");
      return;
    }
    setReviewingId(null);
    let savedCount = 0;
    for (const entry of toSave) {
      updateEntry(entry.id, "status", "saving");
      try {
        const activeWords = entry.words.filter(w => !w._deleted);
        await saveIngestedPassage({
          workbook: entry.category, chapter: entry.subCategory, label: entry.label,
          full_text: entry.rawText, sentences: entry.sentences,
          words: activeWords.map(w => ({
            word: w.word, pos_abbr: w.pos_abbr, korean: w.korean,
            context: w.context, context_korean: w.context_korean,
            synonyms: w.synonyms, antonyms: w.antonyms, grammar_tip: w.grammar_tip,
            test_synonym: w.test_synonym, test_antonym: w.test_antonym,
          })),
          category: entry.category, sub_category: entry.subCategory,
          sub_sub_category: entry.subSubCategory, passage_number: entry.passageNumber,
        });
        updateEntry(entry.id, "status", "saved");
        savedCount++;
      } catch (err: unknown) {
        alert(`"${entry.label}" 저장 실패: ` + (err as Error).message);
        updateEntry(entry.id, "status", "ready");
      }
    }
    if (savedCount > 0) {
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  };

  const addPassage = () => setPassages(prev => [...prev, makeEntry()]);
  const removePassage = (id: string) => {
    setPassages(prev => prev.length === 1 ? [makeEntry()] : prev.filter(p => p.id !== id));
    if (reviewingId === id) setReviewingId(null);
  };

  return (
    <div className="relative animate-in fade-in duration-500">
      <div className={`space-y-4 transition-all duration-300 ${reviewEntry ? "mr-[416px]" : ""}`}>
        <div className="glass rounded-[2.5rem] p-6 border border-foreground/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center"><Sparkles size={18} strokeWidth={2} /></div>
            <div>
              <h3 className="text-[16px] font-bold text-foreground">AI 다중 지문 인제스트</h3>
              <p className="text-[12px] text-accent">여러 지문 동시 입력 · AI 20개 추출 · 오른쪽 패널에서 유/반 체크 후 <b>전체저장</b></p>
            </div>
          </div>
          <button onClick={addPassage} className="flex items-center gap-2 h-10 px-4 bg-foreground text-background rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all shrink-0">
            <Plus size={14} /> 지문 추가
          </button>
        </div>
        {passages.map((entry, idx) => (
          <PassageCard
            key={entry.id} entry={entry} idx={idx} isReviewing={reviewingId === entry.id}
            onUpdate={(field, val) => updateEntry(entry.id, field, val)}
            onScan={() => handleScan(entry.id)}
            onOpenReview={() => setReviewingId(entry.id)}
            onRemove={() => removePassage(entry.id)}
          />
        ))}
        <button onClick={addPassage} className="w-full h-14 rounded-[2rem] border-2 border-dashed border-foreground/10 flex items-center justify-center gap-2 text-accent hover:border-foreground/30 hover:text-foreground font-bold text-[13px] transition-all">
          <Plus size={18} /> 지문 추가
        </button>
      </div>

      {/* ── 전체저장 버튼 (ready 상태 지문이 하나 이상일 때 표시) ── */}
      {passages.some(p => p.status === "ready") && (
        <div className="glass rounded-[2rem] border border-foreground/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-black text-foreground">
              {passages.filter(p => p.status === "ready").length}개 지문 검토 완료
            </p>
            <p className="text-[11px] text-accent mt-0.5">모든 지문을 한번에 저장합니다</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={passages.some(p => p.status === "saving")}
            className="flex items-center gap-2 h-12 px-6 bg-foreground text-background rounded-2xl text-[13px] font-black hover:-translate-y-0.5 disabled:opacity-30 transition-all shadow-xl shrink-0"
          >
            <Save size={15} />
            전체저장 ({passages.filter(p => p.status === "ready").length}개)
          </button>
        </div>
      )}

      {reviewEntry && (
        <div className="fixed top-0 right-0 w-[400px] h-screen bg-background border-l border-foreground/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <WordReviewPanel
            entry={reviewEntry}
            onClose={() => setReviewingId(null)}
            onUpdateWord={updateReviewWord}
          />
        </div>
      )}
    </div>
  );
}





// ─── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"explorer" | "ingest" | "folders" | "assignments">("explorer");
  const [filterWorkbook, setFilterWorkbook] = useState("전체");
  const [wordSets, setWordSets] = useState<{
    id: string; label: string; workbook: string; chapter: string;
    sub_sub_category?: string; passage_number?: string;
    full_text?: string;
    words: { id: string; word: string; pos_abbr: string; korean: string; context: string; synonyms: string; antonyms: string; grammar_tip: string }[]
  }[]>([]);
  const [students, setStudents] = useState<{ name: string; class: string }[]>([]);
  const [assignTarget, setAssignTarget] = useState<{ id: string; workbook: string; chapter: string; label: string } | null>(null);
  const [editTarget, setEditTarget] = useState<typeof wordSets[0] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sets, studs] = await Promise.all([getWordSets(), getStudents()]);
      setWordSets(sets || []);
      setStudents((studs || []).map((s: { name: string; class_name: string }) => ({ name: s.name, class: s.class_name })));
    } catch (err) { console.error(err); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteSet = async (setId: string, label: string) => {
    if (!confirm(`지문 "${label}"을 라이브러리에서 완전 삭제하시겠습니까?\n이 지문의 배당 기록도 함께 제거됩니다.`)) return;
    try { await deleteWordSet(setId); await loadData(); }
    catch (err: unknown) { alert((err as Error).message); }
  };

  const filteredSets = filterWorkbook === "전체" ? wordSets : wordSets.filter(s => s.workbook === filterWorkbook);
  const tabs = [
    { key: "explorer", label: "탐색기" },
    { key: "ingest", label: "AI 인제스트" },
    { key: "folders", label: "폴더 관리" },
    { key: "assignments", label: "배당 현황" },
  ] as const;

  return (
    <div className="p-8 md:p-12 pb-24 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar bg-background">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl text-foreground serif font-black tracking-tight">콘텐츠 라이브러리</h1>
          <p className="text-[15px] text-accent mt-2 font-medium">학습 세트 관리 · 배당 · 편집 · 폴더 시스템</p>
        </div>
        <div className="flex gap-1 bg-accent-light p-1.5 rounded-[1.2rem] border border-foreground/5 shadow-inner flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all ${activeTab === tab.key ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === "ingest" && <SmartAIIngest onComplete={() => { setActiveTab("explorer"); loadData(); }} />}
        {activeTab === "folders" && <FolderTab wordSets={wordSets} students={students} />}
        {activeTab === "assignments" && <AssignmentTab />}

        {activeTab === "explorer" && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-xl text-[12px] font-black text-accent uppercase tracking-widest border border-foreground/5">
                <Filter size={14} /> 교재 필터
              </div>
              <select value={filterWorkbook} onChange={e => setFilterWorkbook(e.target.value)}
                className="h-10 px-4 rounded-xl border border-foreground/5 bg-white text-[13px] font-bold outline-none shadow-sm min-w-[150px]">
                <option value="전체">전체 교재</option>
                {WORKBOOKS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <span className="ml-auto text-[12px] font-black text-accent">{filteredSets.length}개 지문</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSets.map(set => (
                <div key={set.id} className="glass rounded-[2rem] p-7 border border-foreground/5 hover:border-foreground/10 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white/50 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <span className="text-[9px] font-black text-accent bg-accent-light px-2.5 py-1 rounded-lg uppercase tracking-tight">
                      {[set.workbook, set.chapter, set.sub_sub_category, set.passage_number ? `${set.passage_number}번` : ''].filter(Boolean).join(' · ')}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setAssignTarget(set)} className="text-[10px] font-black text-foreground hover:bg-foreground hover:text-background border border-foreground/10 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1">
                        <Users size={11} strokeWidth={3} /> 배당
                      </button>
                      <button onClick={() => setEditTarget(set)} className="text-[10px] font-black text-accent hover:bg-foreground hover:text-background border border-foreground/10 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1">
                        <Edit2 size={11} strokeWidth={3} /> 편집
                      </button>
                    </div>
                  </div>
                  <h4 className="text-[17px] font-bold text-foreground mb-2 line-clamp-1">{set.label}</h4>
                  <p className="text-[12px] text-accent line-clamp-3 leading-relaxed mb-6 flex-1 opacity-70 serif italic font-medium">
                    {set.full_text || "내용이 비어있는 지문입니다."}
                  </p>
                  <div className="flex items-center justify-between pt-5 border-t border-foreground/5">
                    <span className="text-[11px] font-bold text-accent">단어 {set.words?.length || 0}개</span>
                    <button onClick={() => handleDeleteSet(set.id, set.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-all">
                      <Trash2 size={12} /> 완전 삭제
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveTab("ingest")} className="rounded-[2.5rem] border-2 border-dashed border-foreground/10 flex flex-col items-center justify-center p-12 text-accent hover:border-foreground/30 hover:text-foreground transition-all group h-full min-h-[250px]">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="text-[14px] font-bold">새 학습 세트 추가</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {assignTarget && <AssignModal set={assignTarget} onClose={() => setAssignTarget(null)} students={students} />}
      {editTarget && <LibraryWordPanel set={editTarget} onClose={() => setEditTarget(null)} onSaved={loadData} />}

      <div className="mt-20 pt-10 border-t border-foreground/5 text-center">
        <p className="text-[12px] font-black text-accent tracking-[0.3em] uppercase opacity-40">
          Managed by Team Parallax Adaptive Engine
        </p>
      </div>
    </div>
  );
}
