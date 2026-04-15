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
import { assignSetToStudents, getAllAssignments, removeAssignment } from "@/lib/assignment-service";

// ─── Constants ─────────────────────────────────────────────────────────────────
const WORKBOOKS = ["수능특강", "수능완성", "교과서 (고난도)", "기타 모의고사"];
const CHAPTERS = Array.from({ length: 30 }, (_, i) => `${i + 1}강`);


// ─── Assignment View Tab ───────────────────────────────────────────────────────
type AssignmentRow = {
  id: string;
  student_name: string;
  student_class: string;
  set_id: string;
  created_at: string;
  word_sets: { id: string; label: string; workbook: string; chapter: string } | null;
};

function AssignmentTab() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState("전체");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllAssignments();
      setAssignments((data || []) as unknown as AssignmentRow[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id: string, studentName: string, setLabel: string) => {
    if (!confirm(`"${studentName}"의 "${setLabel}" 배당을 삭제하시겠습니까?\n라이브러리에서는 삭제되지 않습니다.`)) return;
    setRemovingId(id);
    try {
      await removeAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setRemovingId(null); }
  };

  // Group by student
  const studentNames = ["전체", ...Array.from(new Set(assignments.map(a => a.student_name)))];
  const filtered = filterStudent === "전체" ? assignments : assignments.filter(a => a.student_name === filterStudent);

  // Group filtered assignments by student
  const grouped: Record<string, AssignmentRow[]> = {};
  filtered.forEach(a => {
    if (!grouped[a.student_name]) grouped[a.student_name] = [];
    grouped[a.student_name].push(a);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass rounded-[2.5rem] p-6 border border-foreground/5 flex flex-wrap items-center gap-3">
        <BarChart2 size={16} className="text-accent" />
        <span className="text-[13px] font-black text-foreground">학생별 배당 현황</span>
        <span className="text-[11px] text-accent bg-accent-light px-3 py-1 rounded-xl font-bold ml-1">총 {assignments.length}건</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
            className="h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] font-bold outline-none"
          >
            {studentNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={load} className="h-9 px-3 rounded-xl border border-foreground/10 text-accent hover:text-foreground hover:bg-foreground/5 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-accent animate-pulse font-bold">배당 현황을 불러오는 중...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center glass rounded-[2.5rem] border border-foreground/5">
          <Users size={32} className="text-accent mx-auto mb-3 opacity-30" />
          <p className="text-accent font-bold opacity-50">배당된 세트가 없습니다.</p>
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
                  <div key={row.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent-light/20 transition-colors">
                    <BookOpen size={14} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate">{row.word_sets?.label || "알 수 없는 세트"}</div>
                      <div className="text-[11px] text-accent">{row.word_sets?.workbook} · {row.word_sets?.chapter}</div>
                    </div>
                    <span className="text-[10px] text-accent/50 font-bold shrink-0">
                      {new Date(row.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={() => handleRemove(row.id, studentName, row.word_sets?.label || "")}
                      disabled={removingId === row.id}
                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 shrink-0"
                      title="배당 삭제 (라이브러리는 유지됨)"
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
  const uniqueClasses = ["전체", ...Array.from(new Set(students.map(s => s.class)))];
  const visibleStudents = filterClass === "전체" ? students : students.filter(s => s.class === filterClass);
  const toggle = (name: string) => setSelectedNames(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  const selectAll = () => setSelectedNames(visibleStudents.map(s => s.name));

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
          {visibleStudents.map(student => (
            <button key={student.name} onClick={() => toggle(student.name)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedNames.includes(student.name) ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-white border-foreground/5 text-foreground hover:border-foreground/20'}`}>
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
          <button onClick={handleAssign} disabled={isAssigning || selectedNames.length === 0}
            className="w-full h-14 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:-translate-y-1 disabled:opacity-20 transition-all">
            {isAssigning ? "배당 중..." : `${selectedNames.length}명에게 배당`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Word Edit Panel ───────────────────────────────────────────────────────────
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
function SmartAIIngest({ onComplete }: { onComplete: () => void }) {
  const [rawText, setRawText] = useState("");
  const [workbook, setWorkbook] = useState(WORKBOOKS[0]);
  const [chapter, setChapter] = useState(CHAPTERS[0]);
  const [label, setLabel] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<{ workbook: string; chapter: string; label: string; words: unknown[]; sentences: unknown } | null>(null);

  const handleScan = async () => {
    if (!rawText.trim() || !label.trim()) return;
    setIsScanning(true);
    try {
      const res = await fetch("/api/ai-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, workbook, chapter, passageLabel: label }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (err: unknown) {
      alert("AI 스캔 실패: " + (err as Error).message);
    } finally { setIsScanning(false); }
  };

  const handleSave = async () => {
    if (!preview) return;
    try {
      await saveIngestedPassage({
        workbook: preview.workbook, chapter: preview.chapter, label: preview.label,
        full_text: rawText, sentences: preview.sentences,
        words: preview.words as { word: string; pos_abbr: string; korean: string; context: string; synonyms: string; antonyms: string; grammar_tip: string }[]
      });
      alert("성공적으로 저장! 탐색기에서 배당하거나 편집하세요.");
      setPreview(null); setRawText(""); setLabel("");
      onComplete();
    } catch (err: unknown) { alert("저장 실패: " + (err as Error).message); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass rounded-[2.5rem] p-8 border border-foreground/5 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center"><Sparkles size={18} strokeWidth={2} /></div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">AI 스마트 인제스트</h3>
            <p className="text-[12px] text-accent font-medium">지문 원문을 넣으면 AI가 모든 정보를 자동으로 추출합니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">교재 선택</label>
            <select value={workbook} onChange={e => setWorkbook(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[13px] font-medium outline-none">
              {WORKBOOKS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">강/챕터</label>
            <select value={chapter} onChange={e => setChapter(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[13px] font-medium outline-none">
              {CHAPTERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">지문 번호/라벨</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="예: 3번 지문"
              className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none" />
          </div>
        </div>
        <div className="mb-6">
          <textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder="지문 원문을 이곳에 붙여넣으세요..."
            className="w-full min-h-[200px] p-6 rounded-2xl border border-foreground/10 bg-transparent text-[14px] leading-relaxed font-serif outline-none" />
        </div>
        <button onClick={handleScan} disabled={isScanning || !rawText.trim() || !label.trim()}
          className="w-full h-14 bg-foreground text-background rounded-2xl flex items-center justify-center gap-3 font-bold shadow-xl hover:-translate-y-0.5 disabled:opacity-20 transition-all">
          {isScanning ? "AI가 지문을 분석 중입니다..." : "지문 분석 및 데이터 추출 시작"}
          <Sparkles size={18} strokeWidth={2.5} />
        </button>
      </div>
      {preview && (
        <div className="glass rounded-[2rem] p-8 border border-success/20 bg-success/5 animate-in slide-in-from-bottom-5 duration-700">
          <h4 className="text-[15px] font-bold text-success mb-4 flex items-center gap-2">
            <Check size={18} strokeWidth={3} /> AI 분석 완료: {(preview.words as unknown[]).length}개 단어 추출됨
          </h4>
          <button onClick={handleSave} className="w-full h-14 bg-success text-white rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-success/20 transition-all">
            데이터 일괄 저장 및 배포 <ChevronRight size={18} />
          </button>
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
    id: string; label: string; workbook: string; chapter: string; full_text?: string;
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
                      {set.workbook} · {set.chapter}
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
      {editTarget && <WordEditPanel set={editTarget} onClose={() => setEditTarget(null)} onSaved={loadData} />}

      <div className="mt-20 pt-10 border-t border-foreground/5 text-center">
        <p className="text-[12px] font-black text-accent tracking-[0.3em] uppercase opacity-40">
          Managed by Team Parallax Adaptive Engine
        </p>
      </div>
    </div>
  );
}
