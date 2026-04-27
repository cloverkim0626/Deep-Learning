"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, X, Check, Upload, Sparkles, Filter,
  Users, ChevronRight, Edit2, FolderOpen, FolderPlus,
  Trash2, Save, ChevronLeft, BookOpen, BarChart2, RefreshCw, Search
} from "lucide-react";
import {
  saveIngestedPassage, getWordSets, updateWordSet, updateWord, deleteWordSet,
  getFolders, createFolder, updateFolder, deleteFolder, addPassageToFolder, removePassageFromFolder,
  getStudents, getAllTestSessions
} from "@/lib/database-service";
import {
  assignSetToStudents, getAllAssignments, removeAssignment,
  updateAssignmentStatus, getAssignedStudentsForSet
} from "@/lib/assignment-service";
import * as XLSX from "xlsx";

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

// ─── Folder Category Taxonomy ──────────────────────────────────────────────────
// 대분류 → 중분류 → 소분류 구조. 새 항목은 직접 입력으로 추가 가능.
const FOLDER_TAXONOMY: Record<string, Record<string, string[]>> = {
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

const CUSTOM_INPUT = "__직접입력__";

type FolderCats = { large: string; mid: string; small: string };

// 폴더 계층 선택 공통 컴포넌트 (드롭다운 + 직접입력 병행)
function FolderCategoryPicker({
  value, onChange,
}: {
  value: FolderCats;
  onChange: (v: FolderCats) => void;
}) {
  const largeOptions = Object.keys(FOLDER_TAXONOMY);
  const midOptions   = value.large && FOLDER_TAXONOMY[value.large] ? Object.keys(FOLDER_TAXONOMY[value.large]) : [];
  const smallOptions = value.large && value.mid && FOLDER_TAXONOMY[value.large]?.[value.mid] ? FOLDER_TAXONOMY[value.large][value.mid] : [];

  const isCustomLarge = value.large !== '' && !largeOptions.includes(value.large);
  const isCustomMid   = value.mid !== '' && midOptions.length > 0 && !midOptions.includes(value.mid);
  const isCustomSmall = value.small !== '' && smallOptions.length > 0 && !smallOptions.includes(value.small);

  const [showCustomLarge, setShowCustomLarge] = useState(false);
  const [showCustomMid,   setShowCustomMid]   = useState(false);
  const [showCustomSmall, setShowCustomSmall] = useState(false);

  // 대분류가 커스텀이면 중분류/소분류도 자동으로 직접입력 모드
  const largeIsCustom = showCustomLarge || isCustomLarge;
  const midIsCustom   = showCustomMid   || isCustomMid   || (largeIsCustom && midOptions.length === 0);

  const selectStyle = "w-full h-9 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none focus:border-foreground/30 transition-colors appearance-none";
  const inputStyle  = "w-full h-9 px-3 rounded-xl border border-foreground/15 bg-foreground/5 text-[12px] font-bold outline-none focus:border-foreground/40 transition-colors";

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* 대분류 */}
      <div>
        <label className="text-[9px] font-black text-accent/60 uppercase tracking-widest mb-1 block">대분류</label>
        {largeIsCustom ? (
          <div className="flex gap-1">
            <input
              autoFocus={showCustomLarge}
              value={isCustomLarge ? value.large : ''}
              onChange={e => onChange({ large: e.target.value, mid: '', small: '' })}
              placeholder="직접 입력"
              className={inputStyle + " flex-1"}
            />
            <button type="button" title="목록으로"
              onClick={() => { setShowCustomLarge(false); onChange({ large: '', mid: '', small: '' }); }}
              className="px-1.5 text-accent hover:text-foreground text-[10px]">↩</button>
          </div>
        ) : (
          <select value={value.large} onChange={e => {
            const v = e.target.value;
            if (v === CUSTOM_INPUT) { setShowCustomLarge(true); return; }
            onChange({ large: v, mid: '', small: '' });
          }} className={selectStyle}>
            <option value="">전체/미분류</option>
            {largeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={CUSTOM_INPUT}>✏️ 직접입력...</option>
          </select>
        )}
      </div>

      {/* 중분류 — 대분류가 커스텀이거나 목록에 없으면 직접입력 */}
      <div>
        <label className="text-[9px] font-black text-accent/60 uppercase tracking-widest mb-1 block">중분류</label>
        {(largeIsCustom || showCustomMid || isCustomMid) ? (
          <div className="flex gap-1">
            <input
              autoFocus={showCustomMid && !largeIsCustom}
              value={value.mid}
              onChange={e => onChange({ ...value, mid: e.target.value, small: '' })}
              placeholder="직접 입력"
              disabled={!value.large}
              className={inputStyle + " flex-1 disabled:opacity-40"}
            />
            {!largeIsCustom && (
              <button type="button" title="목록으로"
                onClick={() => { setShowCustomMid(false); onChange({ ...value, mid: '', small: '' }); }}
                className="px-1.5 text-accent hover:text-foreground text-[10px]">↩</button>
            )}
          </div>
        ) : (
          <select value={value.mid} onChange={e => {
            const v = e.target.value;
            if (v === CUSTOM_INPUT) { setShowCustomMid(true); return; }
            onChange({ ...value, mid: v, small: '' });
          }} className={selectStyle} disabled={!value.large}>
            <option value="">—</option>
            {midOptions.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={CUSTOM_INPUT}>✏️ 직접입력...</option>
          </select>
        )}
      </div>

      {/* 소분류 — 중분류가 커스텀이거나 목록에 없으면 직접입력 */}
      <div>
        <label className="text-[9px] font-black text-accent/60 uppercase tracking-widest mb-1 block">소분류</label>
        {(midIsCustom || showCustomSmall || isCustomSmall) ? (
          <div className="flex gap-1">
            <input
              autoFocus={showCustomSmall && !midIsCustom}
              value={value.small}
              onChange={e => onChange({ ...value, small: e.target.value })}
              placeholder="직접 입력"
              disabled={!value.mid}
              className={inputStyle + " flex-1 disabled:opacity-40"}
            />
            {!midIsCustom && (
              <button type="button" title="목록으로"
                onClick={() => { setShowCustomSmall(false); onChange({ ...value, small: '' }); }}
                className="px-1.5 text-accent hover:text-foreground text-[10px]">↩</button>
            )}
          </div>
        ) : (
          <select value={value.small} onChange={e => {
            const v = e.target.value;
            if (v === CUSTOM_INPUT) { setShowCustomSmall(true); return; }
            onChange({ ...value, small: v });
          }} className={selectStyle} disabled={!value.mid}>
            <option value="">—</option>
            {smallOptions.map(o => <option key={o} value={o}>{o}</option>)}
            <option value={CUSTOM_INPUT}>✏️ 직접입력...</option>
          </select>
        )}
      </div>
    </div>
  );
}




// ─── Assignment View Tab ───────────────────────────────────────────────────────
type AssignmentRow = {
  id: string;
  student_name: string;
  student_class: string;
  set_id: string;
  created_at: string;
  status?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  word_sets: { id: string; label: string; workbook: string; chapter: string; passage_number?: string; sub_sub_category?: string } | null;
};

type TSess = {
  id: string; student_name: string; set_id: string | null;
  test_type: string | null; correct_count: number | null;
  total_questions: number | null; completed_at: string | null;
};

function AssignmentTab() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [sessions, setSessions] = useState<TSess[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState('전체');
  const [filterStudent, setFilterStudent] = useState('전체');
  const [statusFilter, setStatusFilter] = useState<'active'|'completed'|'expired'|'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id:string;student:string;label:string}|null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [data, sess] = await Promise.all([
        getAllAssignments(),
        getAllTestSessions().catch(() => []),
      ]);
      setAssignments((data || []) as unknown as AssignmentRow[]);
      setSessions((sess || []) as unknown as TSess[]);
    } catch (err) {
      setLoadError((err as Error).message || '로드 실패');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemoveConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await removeAssignment(deleteConfirm.id);
      setAssignments(prev => prev.filter(a => a.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setDeleting(false); }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'completed'|'expired') => {
    setUpdatingId(id);
    try {
      await updateAssignmentStatus(id, newStatus);
      setAssignments(prev => prev.map(a => a.id === id ? {...a, status: newStatus} : a));
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setUpdatingId(null); }
  };

  const allClasses = ['전체', ...Array.from(new Set(assignments.map(a => a.student_class).filter(Boolean))).sort()];
  const classFiltered = filterClass === '전체' ? assignments : assignments.filter(a => a.student_class === filterClass);
  const statusFiltered = statusFilter === 'all' ? classFiltered
    : statusFilter === 'active' ? classFiltered.filter(a => !a.status || a.status === 'active')
    : classFiltered.filter(a => a.status === statusFilter);
  const studentNames = ['전체', ...Array.from(new Set(statusFiltered.map(a => a.student_name)))];
  const filtered = filterStudent === '전체' ? statusFiltered : statusFiltered.filter(a => a.student_name === filterStudent);

  const grouped: Record<string, AssignmentRow[]> = {};
  filtered.forEach(a => {
    if (!grouped[a.student_name]) grouped[a.student_name] = [];
    grouped[a.student_name].push(a);
  });

  const passageFullLabel = (row: AssignmentRow) =>
    [row.word_sets?.workbook, row.word_sets?.chapter,
     row.word_sets?.sub_sub_category || '',
     row.word_sets?.passage_number ? `${row.word_sets.passage_number}번` : '',
     row.word_sets?.label || '알 수 없는 세트']
    .filter(Boolean).join(' · ');

  const getPassSess = (studentName: string, setId: string, type: 'vocab'|'synonym') =>
    sessions.find(s => s.student_name === studentName && s.set_id === setId && s.completed_at
      && (type === 'vocab' ? s.test_type === 'vocab' : (s.test_type === 'synonym' || s.test_type === 'card_game'))
      && (s.total_questions ?? 0) > 0 && ((s.correct_count ?? 0) / (s.total_questions ?? 1)) >= 0.9);

  const passBadge = (studentName: string, setId: string, type: 'vocab'|'synonym', label: string) => {
    const s = getPassSess(studentName, setId, type);
    if (!s) return <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-foreground/5 text-accent/40">{label} 미통과</span>;
    const c = s.correct_count ?? 0; const t = s.total_questions ?? 0;
    const pct = t > 0 ? Math.round(c/t*100) : 0;
    const kst = s.completed_at ? new Date(new Date(s.completed_at).getTime()+9*3600000) : null;
    const timeStr = kst ? `${kst.getUTCMonth()+1}/${kst.getUTCDate()} ${String(kst.getUTCHours()).padStart(2,'0')}:${String(kst.getUTCMinutes()).padStart(2,'0')}` : '';
    const cls = type === 'vocab' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700';
    return <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${cls}`}>{label} {c}/{t}({pct}%) ✓ {timeStr}</span>;
  };

  const statusBadge = (status?: string|null) => {
    if (!status || status === 'active') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-sky-100 text-sky-600">진행중</span>;
    if (status === 'completed') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-success/10 text-success">완료</span>;
    if (status === 'expired') return <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-600">기간만료</span>;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 반별 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        {allClasses.map(cls => (
          <button key={cls} onClick={() => { setFilterClass(cls); setFilterStudent('전체'); }}
            className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all border ${filterClass === cls ? 'bg-foreground text-background border-foreground' : 'bg-white border-foreground/10 text-accent hover:text-foreground'}`}>
            {cls === '전체' ? '📋 전체' : `🏫 ${cls}`}
          </button>
        ))}
      </div>

      {/* 상단 컨트롤 */}
      <div className="glass rounded-[2rem] p-5 border border-foreground/5 flex flex-wrap items-center gap-2">
        <BarChart2 size={15} className="text-accent" />
        <span className="text-[13px] font-black text-foreground">배당 현황</span>
        <span className="text-[11px] text-accent bg-accent-light px-3 py-1 rounded-xl font-bold">{filtered.length}건</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {(['active','completed','expired','all'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${statusFilter === s ? 'bg-foreground text-background' : 'bg-white border border-foreground/10 text-accent hover:text-foreground'}`}>
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
        <div className="py-12 text-center text-accent animate-pulse font-bold">불러오는 중...</div>
      ) : loadError ? (
        <div className="py-10 text-center glass rounded-[2.5rem] border border-red-100 bg-red-50">
          <p className="text-red-600 font-bold text-[13px]">⚠️ {loadError}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-[12px] font-black">다시 시도</button>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-12 text-center glass rounded-[2.5rem] border border-foreground/5">
          <Users size={28} className="text-accent mx-auto mb-2 opacity-30" />
          <p className="text-accent font-bold opacity-50">해당 항목이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([studentName, rows]) => (
            <div key={studentName} className="glass rounded-[2rem] border border-foreground/5 overflow-hidden">
              <div className="flex items-center gap-4 px-6 py-4 bg-accent-light/30 border-b border-foreground/5">
                <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-[13px]">{studentName[0]}</div>
                <div>
                  <div className="text-[15px] font-black text-foreground">{studentName}</div>
                  <div className="text-[11px] text-accent font-medium">{rows[0]?.student_class} · {rows.length}개 세트</div>
                </div>
              </div>
              <div className="divide-y divide-foreground/5">
                {rows.map(row => (
                  <div key={row.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-accent-light/20 transition-colors ${row.status === 'completed' ? 'opacity-60' : row.status === 'expired' ? 'opacity-50' : ''}`}>
                    <BookOpen size={14} className="text-accent shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-bold text-foreground">{passageFullLabel(row)}</span>
                        {statusBadge(row.status)}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {passBadge(studentName, row.set_id, 'vocab', '뜻고르기')}
                        {passBadge(studentName, row.set_id, 'synonym', '유반의어')}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-accent/50">배당: {new Date(row.created_at).toLocaleDateString('ko-KR', {month:'short',day:'numeric'})}</span>
                        {row.due_date && <span className="text-[10px] text-amber-600 font-bold">마감: {row.due_date}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(!row.status || row.status === 'active') && (<>
                        <button onClick={() => handleStatusUpdate(row.id, 'completed')} disabled={updatingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-success border border-success/30 bg-success/5 hover:bg-success/10 transition-all disabled:opacity-30">
                          <Check size={10} strokeWidth={3} /> 완료
                        </button>
                        <button onClick={() => handleStatusUpdate(row.id, 'expired')} disabled={updatingId === row.id}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-30">
                          만료
                        </button>
                      </>)}
                      <button onClick={() => setDeleteConfirm({id:row.id, student:studentName, label:passageFullLabel(row)})}
                        className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
            <div className="p-7 border-b border-red-50">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 size={20} className="text-red-500" /></div>
              <h3 className="text-[16px] font-black text-foreground">배당 제거 확인</h3>
              <p className="text-[12px] text-accent font-medium mt-1.5">{deleteConfirm.student} 학생</p>
              <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">{deleteConfirm.label}</p>
              <p className="text-[11px] text-accent/70 mt-3">배당 현황에서만 제거됩니다. 라이브러리 지문은 유지됩니다.</p>
            </div>
            <div className="p-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">취소</button>
              <button onClick={handleRemoveConfirm} disabled={deleting} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black hover:bg-red-600 transition-all disabled:opacity-40">
                {deleting ? '제거 중...' : '제거 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Move to Folder Modal ─────────────────────────────────────────────────────
function MoveFolderModal({ setIds, setLabels, onClose, onDone }: {
  setIds: string[]; setLabels: string[]; onClose: () => void; onDone: () => void;
}) {
  const [folders, setFolders] = useState<{ id: string; name: string; large_category?: string; mid_category?: string; small_category?: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'select' | 'new'>('select');
  // 새 폴더 만들기
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderCats, setNewFolderCats] = useState<FolderCats>({ large: '', mid: '', small: '' });
  const [creating, setCreating] = useState(false);

  const loadFolderList = async () => {
    try {
      const data = await getFolders();
      setFolders((data || []) as { id: string; name: string }[]);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadFolderList(); }, []);

  const handleConfirm = async () => {
    if (!selectedFolderId || setIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(setIds.map(id => addPassageToFolder(selectedFolderId, id).catch(() => {})));
      onDone();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        large_category: newFolderCats.large,
        mid_category:   newFolderCats.mid,
        small_category: newFolderCats.small,
      });
      // 생성 후 폴더 목록 새로고침 + 해당 폴더 자동 선택
      const freshData = await getFolders();
      const freshFolders = (freshData || []) as { id: string; name: string }[];
      setFolders(freshFolders);
      // 방금 만든 폴더 찾기 (이름으로)
      const created = freshFolders.find(f => f.name === newFolderName.trim());
      if (created) {
        setSelectedFolderId(created.id);
        setActiveTab('select'); // 선택 탭으로 이동
      }
      setNewFolderName('');
      setNewFolderDesc('');
      setNewFolderCats({ large: '', mid: '', small: '' });
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="glass w-full max-w-md rounded-[2rem] border border-foreground/10 shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b border-foreground/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-foreground">폴더로 이동</h3>
              <p className="text-[11px] text-accent mt-0.5">{setIds.length}개 지문 선택됨</p>
            </div>
          </div>
          {/* 선택된 지문 목록 */}
          <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
            {setLabels.map((label, i) => (
              <div key={i} className="text-[10px] text-foreground font-medium bg-foreground/5 px-3 py-1.5 rounded-lg">{label}</div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-foreground/5">
          <button onClick={() => setActiveTab('select')}
            className={`flex-1 py-3 text-[12px] font-black transition-all ${activeTab === 'select' ? 'text-foreground border-b-2 border-foreground' : 'text-accent hover:text-foreground'}`}>
            📁 폴더 선택
          </button>
          <button onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-[12px] font-black transition-all ${activeTab === 'new' ? 'text-foreground border-b-2 border-foreground' : 'text-accent hover:text-foreground'}`}>
            ＋ 새 폴더 만들기
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── 폴더 선택 탭 ── */}
          {activeTab === 'select' && (
            <>
              {loading ? (
                <p className="text-[12px] text-accent animate-pulse py-4 text-center">폴더 불러오는 중...</p>
              ) : folders.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[12px] text-accent/50 font-bold">생성된 폴더가 없습니다.</p>
                  <button onClick={() => setActiveTab('new')} className="mt-2 text-[12px] font-black text-foreground hover:underline">
                    + 새 폴더 만들기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {folders.map(f => (
                    <button key={f.id} onClick={() => setSelectedFolderId(f.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedFolderId === f.id ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 hover:border-foreground/30 text-foreground'}`}>
                      {/* 분류 breadcrumb */}
                      {(f.large_category || f.mid_category || f.small_category) && (
                        <div className={`flex items-center gap-1 mb-0.5 text-[9px] font-bold ${selectedFolderId === f.id ? 'text-background/60' : 'text-accent/50'}`}>
                          {[f.large_category, f.mid_category, f.small_category].filter(Boolean).join(' › ')}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold">📁 {f.name}</span>
                        {selectedFolderId === f.id && <span className="text-[10px] opacity-70">✓ 선택됨</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">취소</button>
                <button onClick={handleConfirm} disabled={!selectedFolderId || saving}
                  className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                  {saving ? '추가 중...' : '이 폴더에 추가'}
                </button>
              </div>
            </>
          )}

          {/* ── 새 폴더 만들기 탭 ── */}
          {activeTab === 'new' && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">분류 (선택)</label>
                  <FolderCategoryPicker value={newFolderCats} onChange={setNewFolderCats} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">폴더 이름 *</label>
                  <input
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder(); }}
                    placeholder="예: 수능특강 3강 세트"
                    autoFocus
                    className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">설명 (선택)</label>
                  <input
                    value={newFolderDesc}
                    onChange={e => setNewFolderDesc(e.target.value)}
                    placeholder="선택 사항"
                    className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/30 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-accent/60">폴더를 만들면 자동으로 선택 탭으로 돌아가 바로 추가할 수 있습니다.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setActiveTab('select')} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">← 돌아가기</button>
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creating}
                  className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                  {creating ? '생성 중...' : '폴더 생성'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
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

// ─── Library Word Panel (오른쪽 슬라이드 패널 — 전체저장 + 재분석) ─────────────────
type DraftWord = {
  word: string; pos_abbr: string; korean: string;
  context: string; context_korean: string; structure: string;
  synonyms: string; antonyms: string; grammar_tip: string;
  test_synonym: boolean; test_antonym: boolean;
  _deleted?: boolean;
};

function LibraryWordPanel({
  set, onClose, onSaved
}: {
  set: {
    id: string; label: string; full_text?: string;
    category?: string; sub_category?: string; sub_sub_category?: string; passage_number?: string;
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

  // 탭 상태: 'words' | 'passage' | 'reanalyze' | 'essay'
  const [tab, setTab] = useState<'words' | 'passage' | 'reanalyze' | 'essay'>('words');

  // 지문편집 상태
  const [editLabel, setEditLabel] = useState(set.label);
  const [editWorkbook, setEditWorkbook] = useState((set as { workbook?: string }).workbook || '');
  const [editChapter, setEditChapter] = useState((set as { chapter?: string }).chapter || '');
  const [editSubSub, setEditSubSub] = useState(set.sub_sub_category || '');
  const [editPassNum, setEditPassNum] = useState(set.passage_number || '');
  const [editFullText, setEditFullText] = useState(set.full_text || '');
  const [savingPassage, setSavingPassage] = useState(false);

  // 재분석 모드 상태
  const [reanalyzeText, setReanalyzeText] = useState(set.full_text || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [draftWords, setDraftWords] = useState<DraftWord[] | null>(null);
  const [draftEssaySentences, setDraftEssaySentences] = useState<{idx:number;text:string;korean:string}[] | null>(null);
  const [replacing, setReplacing] = useState(false);

  const synCount = words.filter(w => w.test_synonym).length;
  const antCount = words.filter(w => w.test_antonym).length;
  const draftSynCount = draftWords?.filter(w => !w._deleted && w.test_synonym).length ?? 0;
  const draftAntCount = draftWords?.filter(w => !w._deleted && w.test_antonym).length ?? 0;

  const setWordField = (id: string, field: string, val: string | boolean) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
    setDirty(true);
  };
  const setDraftField = (idx: number, field: keyof DraftWord, val: string | boolean) => {
    setDraftWords(prev => prev ? prev.map((w, i) => i === idx ? { ...w, [field]: val } : w) : prev);
  };

  // ── 전체저장 (단어 필드) ───────────────────────────────────────────────────
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

  // ── 지문 정보 저장 ─────────────────────────────────────────────────────────
  const handleSavePassage = async () => {
    setSavingPassage(true);
    try {
      await updateWordSet(set.id, {
        label: editLabel,
        full_text: editFullText,
      });
      // category/workbook/chapter/sub_sub_category/passage_number 업데이트
      // updateWordSet는 현재 label, full_text만 지원하므로 추가 필드는 supabase 직접 호출
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await sb.from('word_sets').update({
        label: editLabel,
        workbook: editWorkbook,
        chapter: editChapter,
        sub_sub_category: editSubSub,
        passage_number: editPassNum,
        full_text: editFullText,
      }).eq('id', set.id);
      onSaved();
      alert('지문 정보가 저장되었습니다.');
    } catch (err: unknown) { alert('저장 오류: ' + (err as Error).message); }
    finally { setSavingPassage(false); }
  };

  // ── AI 재분석 ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!reanalyzeText.trim()) return;
    setAnalyzing(true); setDraftWords(null);
    try {
      const res = await fetch('/api/ai-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: reanalyzeText,
          category: set.category || '',
          sub_category: set.sub_category || '',
          sub_sub_category: editSubSub || set.sub_sub_category || '',
          passage_number: editPassNum || set.passage_number || '',
          passageLabel: editLabel,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const draft: DraftWord[] = (data.words || []).map((w: Partial<DraftWord>) => ({
        word: w.word || '', pos_abbr: w.pos_abbr || 'n',
        korean: w.korean || '', context: w.context || '',
        context_korean: w.context_korean || '', structure: w.structure || '',
        synonyms: w.synonyms || '', antonyms: w.antonyms || '',
        grammar_tip: w.grammar_tip || '',
        test_synonym: false, test_antonym: false,
      }));
      setDraftWords(draft);
      // essay_sentences 저장 (교체 저장 시 DB에 반영)
      if (Array.isArray(data.essay_sentences)) {
        setDraftEssaySentences(data.essay_sentences);
      }
    } catch (err: unknown) { alert('분석 오류: ' + (err as Error).message); }
    finally { setAnalyzing(false); }
  };

  // ── 교체 저장 ───────────────────────────────────────────────────────────────
  const handleReplaceWords = async () => {
    if (!draftWords) return;
    const active = draftWords.filter(w => !w._deleted);
    if (!confirm(`기존 단어 ${words.length}개를 새로 추출한 ${active.length}개로 교체하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setReplacing(true);
    try {
      const { replaceWordsInSet } = await import('@/lib/database-service');
      await replaceWordsInSet(set.id, reanalyzeText, active, draftEssaySentences || undefined);
      setTab('words'); setDraftWords(null); setDraftEssaySentences(null);
      onSaved(); onClose();
    } catch (err: unknown) { alert('저장 오류: ' + (err as Error).message); }
    finally { setReplacing(false); }
  };

  return (
    <div className="fixed top-0 right-0 w-[460px] h-screen bg-background border-l border-foreground/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-foreground/5 bg-accent-light/20 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-foreground truncate">{editLabel || set.label}</h3>
            <p className="text-[10px] text-accent mt-0.5">
              {[editSubSub, editPassNum ? `${editPassNum}번` : ''].filter(Boolean).join(' · ')} · 단어 {words.length}개 · 유 {synCount} · 반 {antCount}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5 text-accent shrink-0"><X size={16} /></button>
        </div>
        {/* 3-tab 버튼 */}
        <div className="flex gap-1 flex-wrap">
          {([['words','단어편집'],['passage','지문편집'],['reanalyze','재분석'],['essay','서술형']] as [typeof tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 h-8 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                tab === key
                  ? key === 'reanalyze' ? 'bg-amber-500 text-white'
                    : key === 'essay' ? 'bg-indigo-500 text-white'
                    : 'bg-foreground text-background'
                  : 'bg-foreground/5 text-accent hover:bg-foreground/10'
              }`}>
              {key === 'reanalyze' && <Sparkles size={10} />}
              {key === 'essay' && <span>✏️</span>}
              {label}
            </button>
          ))}
        </div>
        {/* 단어편집 탭인 경우에만 전체저장 버튼 */}
        {tab === 'words' && (
          <button onClick={handleSaveAll} disabled={saving || !dirty}
            className={`mt-2 w-full h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
              dirty ? 'bg-foreground text-background hover:-translate-y-0.5 shadow' : 'bg-foreground/8 text-accent/40 cursor-not-allowed'
            } disabled:opacity-50`}>
            <Save size={12} strokeWidth={2.5} />
            {saving ? '저장 중...' : dirty ? `전체저장 (유${synCount}·반${antCount})` : '변경없음'}
          </button>
        )}
      </div>

      {/* ══ 단어편집 탭 ══════════════════════════════════════════════════════ */}
      {tab === 'words' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          <p className="text-[9px] text-accent/50 text-center pb-1">유/반 버튼 · 필드 수정 후 전체저장 클릭</p>
          {words.map((w, idx) => (
            <div key={w.id} className={`rounded-xl border transition-all ${
              (w.test_synonym || w.test_antonym) ? 'border-foreground/10 bg-white shadow-sm' : 'border-foreground/5 opacity-60'
            }`}>
              <div className="flex items-center gap-1.5 px-3 py-2.5 flex-wrap">
                <span className="w-5 h-5 rounded-md bg-foreground/10 text-foreground flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span>
                <span className="text-[14px] font-black text-foreground serif">{w.word}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${w.pos_abbr==='phr'?'bg-purple-100 text-purple-700':'bg-accent-light text-accent'}`}>{w.pos_abbr}</span>
                <span className="text-[10px] text-foreground/50 flex-1 truncate">{w.korean}</span>
                <button onClick={() => setWordField(w.id, 'test_synonym', !w.test_synonym)}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                    w.test_synonym ? 'bg-sky-500 text-white border-sky-500' : 'bg-white border-sky-200 text-sky-400'
                  }`}>유</button>
                <button onClick={() => setWordField(w.id, 'test_antonym', !w.test_antonym)}
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
      )}

      {/* ══ 지문편집 탭 ══════════════════════════════════════════════════════ */}
      {tab === 'passage' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div>
            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">제목 (label)</label>
            <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] font-bold outline-none focus:border-foreground/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">교재</label>
              <input value={editWorkbook} onChange={e => setEditWorkbook(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] outline-none focus:border-foreground/30" />
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">파트/단원</label>
              <input value={editChapter} onChange={e => setEditChapter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] outline-none focus:border-foreground/30" />
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">강</label>
              <input value={editSubSub} onChange={e => setEditSubSub(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] outline-none focus:border-foreground/30" />
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">지문번호</label>
              <input value={editPassNum} onChange={e => setEditPassNum(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-foreground/10 bg-white text-[12px] outline-none focus:border-foreground/30" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">지문 원문 (full text)</label>
            <textarea value={editFullText} onChange={e => setEditFullText(e.target.value)}
              rows={12}
              className="w-full p-3 rounded-2xl border border-foreground/10 bg-white text-[11.5px] leading-relaxed font-serif outline-none resize-none focus:border-foreground/30 transition-colors" />
          </div>
          <button onClick={handleSavePassage} disabled={savingPassage}
            className="w-full h-11 bg-foreground text-background rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40">
            <Save size={14} /> {savingPassage ? '저장 중...' : '지문 정보 저장'}
          </button>
          <p className="text-[9px] text-accent/50 text-center">저장된 정보는 탐색기 카드 및 학생 배당 목록에 즉시 반영됩니다</p>
        </div>
      )}

      {/* ══ 재분석 탭 ════════════════════════════════════════════════════════ */}
      {tab === 'reanalyze' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-foreground/5">
            <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block">재분석할 지문 원문</label>
            <textarea value={reanalyzeText} onChange={e => setReanalyzeText(e.target.value)} rows={5}
              className="w-full p-3 rounded-2xl border border-amber-200 bg-amber-50/30 text-[11.5px] leading-relaxed font-serif outline-none resize-none focus:border-amber-400 transition-colors" />
            <button onClick={handleAnalyze} disabled={analyzing || !reanalyzeText.trim()}
              className="w-full mt-2 h-10 bg-foreground text-background rounded-xl text-[12px] font-black flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all disabled:opacity-30">
              {analyzing
                ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> AI 분석 중...</>
                : <><Sparkles size={13} /> AI 재분석 실행 (Parallax v2.1)</>
              }
            </button>
          </div>
          {draftWords !== null ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 pt-2.5 pb-2 shrink-0 flex items-center justify-between">
                <p className="text-[10px] font-black text-foreground">
                  추출된 단어 <span className="text-blue-600">{draftWords.filter(w=>!w._deleted).length}개</span>
                  <span className="text-sky-500 ml-2">유{draftSynCount}</span>
                  <span className="text-rose-500 ml-1">반{draftAntCount}</span>
                </p>
                <p className="text-[9px] text-accent/60">유/반 체크 후 교체 저장</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-2 pb-2">
                {draftWords.map((w, idx) => (
                  <div key={idx} className={`rounded-xl border transition-all ${
                    w._deleted ? 'opacity-25 border-red-100'
                    : (w.test_synonym || w.test_antonym) ? 'border-foreground/10 bg-white shadow-sm'
                    : 'border-foreground/5'
                  }`}>
                    <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-foreground/10 text-foreground flex items-center justify-center text-[9px] font-black shrink-0">{idx+1}</span>
                      <span className="text-[13px] font-black text-foreground serif">{w.word}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${w.pos_abbr==='phr'?'bg-purple-100 text-purple-700':'bg-accent-light text-accent'}`}>{w.pos_abbr}</span>
                      <span className="text-[10px] text-foreground/50 flex-1 truncate">{w.korean}</span>
                      <button onClick={() => setDraftField(idx, 'test_synonym', !w.test_synonym)} disabled={!!w._deleted}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${w.test_synonym&&!w._deleted?'bg-sky-500 text-white border-sky-500':'bg-white border-sky-200 text-sky-400'}`}>유</button>
                      <button onClick={() => setDraftField(idx, 'test_antonym', !w.test_antonym)} disabled={!!w._deleted}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${w.test_antonym&&!w._deleted?'bg-rose-500 text-white border-rose-500':'bg-white border-rose-200 text-rose-400'}`}>반</button>
                      {w._deleted
                        ? <button onClick={() => setDraftField(idx, '_deleted', false)} className="text-[9px] font-black text-blue-500 px-1.5 py-0.5 border border-blue-200 rounded-lg bg-blue-50">복원</button>
                        : <button onClick={() => setDraftField(idx, '_deleted', true)} className="p-1 text-red-200 hover:text-red-500 transition-all"><Trash2 size={11} /></button>
                      }
                    </div>
                    {!w._deleted && (
                      <div className="px-3 pb-2 space-y-1">
                        {w.pos_abbr==='phr' && (
                          <div className="flex items-center gap-2">
                            <label className="text-[8px] font-black text-purple-500 uppercase shrink-0 w-10">구조</label>
                            <input value={w.structure||''} onChange={e=>setDraftField(idx,'structure',e.target.value)}
                              className="flex-1 h-6 px-2 rounded-lg border border-purple-100 bg-purple-50/50 text-[10px] text-purple-700 outline-none font-mono" />
                          </div>
                        )}
                        {([{key:'korean',label:'한글'},{key:'synonyms',label:'유의어'},{key:'antonyms',label:'반의어'}] as {key:keyof DraftWord;label:string}[]).map(f=>(
                          <div key={f.key as string} className="flex items-center gap-2">
                            <label className="text-[8px] font-black text-accent uppercase shrink-0 w-10">{f.label}</label>
                            <input value={(w[f.key] as string)||''} onChange={e=>setDraftField(idx,f.key,e.target.value)}
                              className="flex-1 h-6 px-2 rounded-lg border border-foreground/8 bg-transparent text-[10px] outline-none focus:border-foreground/30"/>
                          </div>
                        ))}
                        <div className="flex items-start gap-2">
                          <label className="text-[8px] font-black text-accent uppercase shrink-0 w-10 mt-0.5">팁</label>
                          <textarea value={w.grammar_tip||''} onChange={e=>setDraftField(idx,'grammar_tip',e.target.value)} rows={2}
                            className="flex-1 px-2 py-1 rounded-lg border border-foreground/8 bg-transparent text-[9px] outline-none resize-none leading-relaxed" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-foreground/5 shrink-0">
                <button onClick={handleReplaceWords} disabled={replacing}
                  className="w-full h-12 bg-amber-500 text-white rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-40">
                  {replacing ? '저장 중...' : <><Check size={14} /> 기존 단어 교체 저장 ({draftWords.filter(w=>!w._deleted).length}개)</>}
                </button>
                <p className="text-[9px] text-accent/50 text-center mt-1.5">⚠ 기존 단어 {words.length}개가 삭제되고 새 단어로 교체됩니다</p>
              </div>
            </div>
          ) : !analyzing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-accent/40">
              <Sparkles size={28} className="mb-3 opacity-30" />
              <p className="text-[12px] font-bold">지문 편집 후 AI 재분석을 실행하세요</p>
              <p className="text-[10px] mt-1">새로 추출된 단어를 검토하고 유/반 체크 후 교체 저장</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── 서술형 탭 ────────────────────────────────────────────────── */}
      {tab === 'essay' && (
        <EssayTab setId={set.id} essaySentences={(set as {essay_sentences?: {idx:number;text:string;korean:string}[]}).essay_sentences || []} />
      )}
    </div>
  );
}

// ── 서술형 문항 제작 탭 ──────────────────────────────────────────────────────
type EssaySentence = { idx: number; text: string; korean: string };
type EssayTemplate = { id: string; type_key: string; display_name: string; question_prompt: string; scoring_prompt: string };
type EssayQRow = { id: string; sentence_idx: number; question_type: string; question_text: string; model_answer: string; is_active: boolean };
type EssayFormState = { type_key: string; extra_condition: string; question_text: string; model_answer: string; genQ: boolean; genA: boolean; saving: boolean };

function EssayTab({ setId, essaySentences }: { setId: string; essaySentences: EssaySentence[] }) {
  const [templates, setTemplates] = useState<EssayTemplate[]>([]);
  const [questions, setQuestions] = useState<EssayQRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<number, EssayFormState>>({});

  const patchForm = (idx: number, patch: Partial<EssayFormState>) =>
    setForm(p => ({ ...p, [idx]: { ...p[idx], ...patch } }));

  const getForm = (idx: number): EssayFormState => form[idx] || {
    type_key: templates[0]?.type_key || '', extra_condition: '',
    question_text: '', model_answer: '', genQ: false, genA: false, saving: false
  };

  const load = async () => {
    setLoading(true);
    try {
      const [t, q] = await Promise.all([
        import('@/lib/database-service').then(m => m.getEssayPromptTemplates()),
        import('@/lib/database-service').then(m => m.getEssayQuestionsByPassage(setId)),
      ]);
      setTemplates(t as EssayTemplate[]);
      setQuestions(q as EssayQRow[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [setId]);
  useEffect(() => {
    if (templates.length > 0) {
      setForm(prev => {
        const next = { ...prev };
        essaySentences.forEach(s => {
          if (!next[s.idx]) next[s.idx] = { type_key: templates[0].type_key, extra_condition: '', question_text: '', model_answer: '', genQ: false, genA: false, saving: false };
        });
        return next;
      });
    }
  }, [templates]);

  const genQuestion = async (sent: EssaySentence) => {
    const f = getForm(sent.idx);
    const tpl = templates.find(t => t.type_key === f.type_key);
    if (!tpl?.question_prompt) { alert('해당 유형의 문제생성 프롬프트가 없습니다. 관리자 → 서술형 프롬프트에서 설정하세요.'); return; }
    patchForm(sent.idx, { genQ: true });
    try {
      const res = await fetch('/api/essay-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: sent.text, extra_condition: f.extra_condition, question_prompt: tpl.question_prompt }),
      }).then(r => r.json());
      patchForm(sent.idx, { question_text: res.question_text || '', genQ: false });
    } catch { patchForm(sent.idx, { genQ: false }); }
  };

  const genAnswer = async (sent: EssaySentence) => {
    const f = getForm(sent.idx);
    if (!f.question_text) return;
    patchForm(sent.idx, { genA: true });
    try {
      const res = await fetch('/api/essay-answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: sent.text, question_text: f.question_text }),
      }).then(r => r.json());
      patchForm(sent.idx, { model_answer: res.model_answer || '', genA: false });
    } catch { patchForm(sent.idx, { genA: false }); }
  };

  const saveQuestion = async (sent: EssaySentence) => {
    const f = getForm(sent.idx);
    if (!f.question_text.trim()) { alert('문제를 먼저 입력하거나 생성하세요'); return; }
    patchForm(sent.idx, { saving: true });
    try {
      const { saveEssayQuestion } = await import('@/lib/database-service');
      await saveEssayQuestion({
        passage_id: setId, sentence_idx: sent.idx, sentence_text: sent.text,
        question_type: f.type_key, extra_condition: f.extra_condition,
        question_text: f.question_text, model_answer: f.model_answer, is_active: true,
      });
      patchForm(sent.idx, { question_text: '', model_answer: '', extra_condition: '', saving: false });
      await load();
    } catch (e: unknown) { alert((e as Error).message); patchForm(sent.idx, { saving: false }); }
  };

  const toggleActive = async (qId: string, current: boolean) => {
    const { toggleEssayQuestionActive } = await import('@/lib/database-service');
    await toggleEssayQuestionActive(qId, !current); await load();
  };

  const delQ = async (qId: string) => {
    if (!confirm('삭제?')) return;
    const { deleteEssayQuestion } = await import('@/lib/database-service');
    await deleteEssayQuestion(qId); await load();
  };

  if (loading) return <div className="flex justify-center py-10"><span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" /></div>;
  if (essaySentences.length === 0) return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-6 text-accent/40 py-12">
      <span className="text-3xl mb-3">📝</span>
      <p className="text-[13px] font-bold">서술형 문장이 없습니다</p>
      <p className="text-[11px] mt-1">재분석 탭 → AI 재분석 실행 → 교체저장 하면 3개가 자동 추출됩니다.</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-5 pt-3">
      {essaySentences.map(sent => {
        const f = getForm(sent.idx);
        const existingQs = questions.filter(q => q.sentence_idx === sent.idx);
        return (
          <div key={sent.idx} className="bg-indigo-50/40 border border-indigo-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-indigo-100/50 border-b border-indigo-100">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">문장 {sent.idx}</p>
              <p className="text-[12px] font-medium text-foreground leading-relaxed">{sent.text}</p>
              <p className="text-[10px] text-indigo-400/70 mt-1">{sent.korean}</p>
            </div>
            {existingQs.length > 0 && (
              <div className="px-4 py-2 space-y-1.5 border-b border-indigo-100">
                {existingQs.map(q => (
                  <div key={q.id} className="flex items-start gap-2 bg-white rounded-xl p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-indigo-400 mb-0.5">{q.question_type}</p>
                      <p className="text-[11px] text-foreground leading-snug line-clamp-2">{q.question_text}</p>
                    </div>
                    <button onClick={() => toggleActive(q.id, q.is_active)}
                      className={`shrink-0 text-[9px] font-black px-2 py-1 rounded-lg transition-all ${q.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-foreground/5 text-accent/40'}`}>
                      {q.is_active ? '활성' : '비활'}
                    </button>
                    <button onClick={() => delQ(q.id)} className="shrink-0 text-red-300 hover:text-red-500 p-1"><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-3 space-y-2.5">
              <select value={f.type_key} onChange={e => patchForm(sent.idx, { type_key: e.target.value })}
                className="w-full h-8 px-2 rounded-lg border border-indigo-200 bg-white text-[11px] font-bold outline-none">
                {templates.map(t => <option key={t.type_key} value={t.type_key}>{t.display_name}</option>)}
              </select>
              <input value={f.extra_condition} onChange={e => patchForm(sent.idx, { extra_condition: e.target.value })}
                placeholder="추가 조건 (예: 10단어 이내, 특정 어휘 활용)"
                className="w-full h-8 px-3 rounded-lg border border-indigo-100 bg-white text-[11px] outline-none focus:border-indigo-300" />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">문제</label>
                  <button onClick={() => genQuestion(sent)} disabled={f.genQ}
                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-40">
                    {f.genQ ? <span className="animate-spin inline-block w-3 h-3 border border-indigo-400 border-t-transparent rounded-full" /> : '✨'} AI 초안
                  </button>
                </div>
                <textarea value={f.question_text} onChange={e => patchForm(sent.idx, { question_text: e.target.value })}
                  rows={3} placeholder="직접 입력하거나 AI 초안 클릭"
                  className="w-full px-3 py-2 rounded-xl border border-indigo-100 bg-white text-[11px] outline-none focus:border-indigo-300 resize-none leading-relaxed" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">모범답안</label>
                  <button onClick={() => genAnswer(sent)} disabled={f.genA || !f.question_text}
                    className="text-[9px] font-black text-amber-500 hover:text-amber-700 flex items-center gap-1 disabled:opacity-40">
                    {f.genA ? <span className="animate-spin inline-block w-3 h-3 border border-amber-400 border-t-transparent rounded-full" /> : '✨'} AI 초안
                  </button>
                </div>
                <textarea value={f.model_answer} onChange={e => patchForm(sent.idx, { model_answer: e.target.value })}
                  rows={2} placeholder="직접 입력 또는 AI 초안 (비워두면 채점 시 미제공)"
                  className="w-full px-3 py-2 rounded-xl border border-amber-100 bg-white text-[11px] outline-none focus:border-amber-300 resize-none" />
              </div>
              <button onClick={() => saveQuestion(sent)} disabled={f.saving || !f.question_text.trim()}
                className="w-full h-8 bg-indigo-500 text-white rounded-xl text-[11px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30 flex items-center justify-center gap-1.5">
                {f.saving ? '저장 중...' : <><Save size={11} /> 문항 저장</>}
              </button>
            </div>
          </div>
        );
      })}
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
        {/* Passage preview - full label */}
        <div className="px-6 py-3 bg-accent-light/20 border-b border-foreground/5 flex flex-wrap gap-2">
          {passages.slice(0, 5).map(fp => (
            <span key={fp.set_id} className="text-[10px] font-bold bg-white border border-foreground/10 px-2.5 py-1 rounded-lg text-foreground">
              {[fp.word_sets?.workbook, fp.word_sets?.chapter, (fp.word_sets as { sub_sub_category?: string })?.sub_sub_category,
                (fp.word_sets as { passage_number?: string })?.passage_number ? `${(fp.word_sets as { passage_number?: string }).passage_number}번` : '',
                fp.word_sets?.label].filter(Boolean).join(' · ')}
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
  wordSets: { id: string; label: string; workbook: string; chapter: string; sub_sub_category?: string; passage_number?: string }[];
  students: { name: string; class: string }[];
}) {
  type FolderType = {
    id: string; name: string; description: string;
    large_category?: string; mid_category?: string; small_category?: string;
    folder_passages: {
      set_id: string;
      word_sets: {
        id: string; label: string; workbook: string; chapter: string;
        sub_sub_category?: string; passage_number?: string; full_text?: string;
        category?: string; sub_category?: string;
        words: { id: string; word: string; pos_abbr: string; korean: string; context: string;
          synonyms: string; antonyms: string; grammar_tip: string;
          test_synonym?: boolean; test_antonym?: boolean; }[];
      }
    }[]
  };
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCats, setNewCats] = useState<FolderCats>({ large: '', mid: '', small: '' });
  const [creating, setCreating] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [addingSetId, setAddingSetId] = useState<string>('');
  const [removingPassageKey, setRemovingPassageKey] = useState<string | null>(null);

  // Partial-passage assign
  const [partialAssignFolder, setPartialAssignFolder] = useState<FolderType | null>(null);
  const [selectedPassageIds, setSelectedPassageIds] = useState<string[]>([]);

  // Delete modals
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [removePassageTarget, setRemovePassageTarget] = useState<{ folderId: string; setId: string; label: string } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 폴더 편집 모달
  const [editFolderTarget, setEditFolderTarget] = useState<FolderType | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDesc, setEditFolderDesc] = useState('');
  const [editFolderCats, setEditFolderCats] = useState<FolderCats>({ large: '', mid: '', small: '' });
  const [savingFolderEdit, setSavingFolderEdit] = useState(false);

  // 지문 편집 패널 (탐색기 편집 기능 동일)
  const [editingPassageSet, setEditingPassageSet] = useState<FolderType['folder_passages'][0]['word_sets'] | null>(null);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await getFolders();
      setFolders((data || []) as FolderType[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadFolders(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createFolder({
        name: newName.trim(),
        description: newDesc.trim(),
        large_category: newCats.large,
        mid_category:   newCats.mid,
        small_category: newCats.small,
      });
      setNewName(''); setNewDesc(''); setNewCats({ large: '', mid: '', small: '' });
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setCreating(false); }
  };

  // 폴더 편집 열기
  const openEditFolder = (folder: FolderType) => {
    setEditFolderTarget(folder);
    setEditFolderName(folder.name);
    setEditFolderDesc(folder.description || '');
    setEditFolderCats({
      large: folder.large_category || '',
      mid:   folder.mid_category   || '',
      small: folder.small_category || '',
    });
  };

  // 폴더 편집 저장
  const handleSaveFolderEdit = async () => {
    if (!editFolderTarget || !editFolderName.trim()) return;
    setSavingFolderEdit(true);
    try {
      await updateFolder(editFolderTarget.id, {
        name: editFolderName.trim(),
        description: editFolderDesc.trim(),
        large_category: editFolderCats.large,
        mid_category:   editFolderCats.mid,
        small_category: editFolderCats.small,
      });
      setEditFolderTarget(null);
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setSavingFolderEdit(false); }
  };


  const handleDeleteFolderConfirm = async () => {
    if (!deleteFolderTarget) return;
    setModalLoading(true);
    try { await deleteFolder(deleteFolderTarget.id); await loadFolders(); setDeleteFolderTarget(null); }
    catch (err: unknown) { alert((err as Error).message); }
    finally { setModalLoading(false); }
  };

  const handleAddPassage = async (folderId: string) => {
    if (!addingSetId) return;
    try {
      await addPassageToFolder(folderId, addingSetId);
      setAddingSetId('');
      await loadFolders();
    } catch (err: unknown) { alert((err as Error).message); }
  };

  const handleRemovePassageConfirm = async () => {
    if (!removePassageTarget) return;
    const key = `${removePassageTarget.folderId}_${removePassageTarget.setId}`;
    setRemovingPassageKey(key);
    try {
      await removePassageFromFolder(removePassageTarget.folderId, removePassageTarget.setId);
      await loadFolders();
      setRemovePassageTarget(null);
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setRemovingPassageKey(null); }
  };

  const fpLabel = (fp: FolderType['folder_passages'][0]) =>
    [fp.word_sets?.workbook, fp.word_sets?.chapter, fp.word_sets?.sub_sub_category,
     fp.word_sets?.passage_number ? `${fp.word_sets.passage_number}번` : '', fp.word_sets?.label]
    .filter(Boolean).join(' · ');

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
        <div className="mb-5">
          <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">분류 체계 (선택)</label>
          <FolderCategoryPicker value={newCats} onChange={setNewCats} />
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
                    {/* 분류 배지 */}
                    {(folder.large_category || folder.mid_category || folder.small_category) && (
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        {folder.large_category && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600">{folder.large_category}</span>
                        )}
                        {folder.mid_category && (
                          <><span className="text-[9px] text-accent/30">›</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-foreground/5 text-accent">{folder.mid_category}</span></>
                        )}
                        {folder.small_category && (
                          <><span className="text-[9px] text-accent/30">›</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-foreground/5 text-accent/70">{folder.small_category}</span></>
                        )}
                      </div>
                    )}
                    <div className="text-[16px] font-black text-foreground">{folder.name}</div>
                    {folder.description && <div className="text-[12px] text-accent">{folder.description}</div>}
                    <div className="text-[11px] text-accent/50 font-bold mt-0.5">지문 {passages.length}개</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {passages.length > 0 && (
                      <button
                        onClick={() => { setPartialAssignFolder(folder); setSelectedPassageIds(passages.map(fp => fp.set_id)); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black bg-foreground text-background hover:opacity-90 transition-all shadow-sm"
                      >
                        <Users size={12} strokeWidth={3} /> 배당
                      </button>
                    )}
                    <button onClick={() => openEditFolder(folder)}
                      className="p-2 text-accent hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all" title="폴더 편집">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setExpandedFolderId(isExpanded ? null : folder.id)}
                      className="px-4 py-2 rounded-xl text-[12px] font-black border border-foreground/10 hover:bg-foreground/5 transition-all">
                      {isExpanded ? '접기 ▲' : '지문 관리 ▼'}
                    </button>
                    <button onClick={() => setDeleteFolderTarget({ id: folder.id, name: folder.name })}
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
                              <span className="text-[12px] font-bold text-foreground flex-1">{fpLabel(fp)}</span>
                              {/* 편집 버튼 — 탐색기 편집과 동일 */}
                              <button
                                onClick={() => setEditingPassageSet(fp.word_sets)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-accent hover:text-foreground hover:bg-foreground/8 rounded-lg transition-colors text-[10px] font-black"
                                title="단어 편집"
                              >
                                <Edit2 size={11} /> 편집
                              </button>
                              <button
                                onClick={() => setRemovePassageTarget({ folderId: folder.id, setId: fp.set_id, label: fpLabel(fp) })}
                                disabled={removingPassageKey === key}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 text-[10px] font-black"
                                title="이 폴더에서 지문 제거"
                              >
                                <Trash2 size={12} /> 제거
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <select value={addingSetId} onChange={e => setAddingSetId(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-xl border border-foreground/10 bg-white text-[13px] font-medium outline-none">
                        <option value="">지문 선택 (추가)...</option>
                        {wordSets.filter(s => !passages.some(fp => fp.set_id === s.id)).map(s => (
                          <option key={s.id} value={s.id}>{[s.workbook, s.chapter, s.sub_sub_category, s.passage_number ? `${s.passage_number}번` : '', s.label].filter(Boolean).join(' · ')}</option>
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

    {/* 폴더 편집 모달 */}
    {editFolderTarget && (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="glass w-full max-w-md rounded-[2rem] border border-foreground/10 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-foreground/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center">
              <Edit2 size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-foreground">폴더 편집</h3>
              <p className="text-[11px] text-accent mt-0.5">{editFolderTarget.name}</p>
            </div>
            <button onClick={() => setEditFolderTarget(null)} className="ml-auto p-2 hover:bg-foreground/5 rounded-xl text-accent">
              <X size={18} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">분류 체계</label>
              <FolderCategoryPicker value={editFolderCats} onChange={setEditFolderCats} />
            </div>
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">폴더 이름 *</label>
              <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30" />
            </div>
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-1.5 block">설명 (선택)</label>
              <input value={editFolderDesc} onChange={e => setEditFolderDesc(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none focus:border-foreground/30" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditFolderTarget(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground">취소</button>
              <button onClick={handleSaveFolderEdit} disabled={!editFolderName.trim() || savingFolderEdit}
                className="flex-1 h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                {savingFolderEdit ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* 지문 편집 패널 — LibraryWordPanel 재사용 */}
    {editingPassageSet && (
      <LibraryWordPanel
        set={{
          id: editingPassageSet.id,
          label: editingPassageSet.label,
          full_text: editingPassageSet.full_text,
          category: editingPassageSet.category,
          sub_category: editingPassageSet.sub_category,
          sub_sub_category: editingPassageSet.sub_sub_category,
          passage_number: editingPassageSet.passage_number,
          words: editingPassageSet.words || [],
        } as Parameters<typeof LibraryWordPanel>[0]['set']}
        onClose={() => setEditingPassageSet(null)}
        onSaved={() => { setEditingPassageSet(null); loadFolders(); }}
      />
    )}

    {/* 폴더 일부 선택 배당 모달 */}
    {partialAssignFolder && (
      <PartialFolderAssignModal
        folder={partialAssignFolder}
        selectedPassageIds={selectedPassageIds}
        setSelectedPassageIds={setSelectedPassageIds}
        students={students}
        onClose={() => { setPartialAssignFolder(null); setSelectedPassageIds([]); }}
      />
    )}

    {/* 폴더 삭제 모달 */}
    {deleteFolderTarget && (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
          <div className="p-7 border-b border-red-50">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="text-[16px] font-black text-foreground">폴더 삭제</h3>
            <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">📁 {deleteFolderTarget.name}</p>
            <p className="text-[11px] text-accent/70 mt-3">폴더만 삭제됩니다. 라이브러리 지문은 유지됩니다.</p>
          </div>
          <div className="p-5 flex gap-3">
            <button onClick={() => setDeleteFolderTarget(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
            <button onClick={handleDeleteFolderConfirm} disabled={modalLoading} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black hover:bg-red-600 transition-all disabled:opacity-40">
              {modalLoading ? '삭제 중...' : '삭제 확인'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 지문 제거 모달 */}
    {removePassageTarget && (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
          <div className="p-7 border-b border-red-50">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="text-[16px] font-black text-foreground">폴더에서 지문 제거</h3>
            <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">{removePassageTarget.label}</p>
            <p className="text-[11px] text-accent/70 mt-3">이 폴더에서만 제거됩니다. 라이브러리 지문은 유지됩니다.</p>
          </div>
          <div className="p-5 flex gap-3">
            <button onClick={() => setRemovePassageTarget(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
            <button onClick={handleRemovePassageConfirm} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black hover:bg-red-600 transition-all">
              제거 확인
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


// ─── Partial Folder Assign Modal ─────────────────────────────────────────────
function PartialFolderAssignModal({ folder, selectedPassageIds, setSelectedPassageIds, students, onClose }: {
  folder: {
    id: string; name: string;
    folder_passages: { set_id: string; word_sets: { id: string; label: string; workbook: string; chapter: string; sub_sub_category?: string; passage_number?: string } }[];
  };
  selectedPassageIds: string[];
  setSelectedPassageIds: (ids: string[]) => void;
  students: { name: string; class: string }[];
  onClose: () => void;
}) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState('전체');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  const passages = folder.folder_passages || [];
  const classes = ['전체', ...Array.from(new Set(students.map(s => s.class).filter(Boolean)))];
  const visibleStudents = filterClass === '전체' ? students : students.filter(s => s.class === filterClass);

  const fpLabel = (fp: typeof passages[0]) =>
    [fp.word_sets?.workbook, fp.word_sets?.chapter, fp.word_sets?.sub_sub_category,
     fp.word_sets?.passage_number ? `${fp.word_sets.passage_number}번` : '', fp.word_sets?.label]
    .filter(Boolean).join(' · ');

  const togglePassage = (setId: string) => {
    setSelectedPassageIds(selectedPassageIds.includes(setId)
      ? selectedPassageIds.filter(id => id !== setId)
      : [...selectedPassageIds, setId]);
  };

  const toggleStudent = (name: string) => {
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleAssign = async () => {
    if (selectedNames.length === 0 || selectedPassageIds.length === 0) return;
    setIsAssigning(true);
    const studentObjs = students.filter(s => selectedNames.includes(s.name));
    try {
      for (const setId of selectedPassageIds) {
        await assignSetToStudents(setId, studentObjs);
      }
      onClose();
    } catch (err: unknown) { alert((err as Error).message); }
    finally { setIsAssigning(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass w-full max-w-lg rounded-[2rem] border border-foreground/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-foreground/5 shrink-0">
          <h3 className="text-[16px] font-black text-foreground">📁 {folder.name} — 선택 배당</h3>
          <p className="text-[12px] text-accent mt-1">배당할 지문과 학생을 선택하세요</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* 지문 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-accent uppercase tracking-widest">지문 선택</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPassageIds(passages.map(fp => fp.set_id))} className="text-[10px] font-black text-foreground hover:underline">전체</button>
                <button onClick={() => setSelectedPassageIds([])} className="text-[10px] font-black text-accent hover:underline">해제</button>
              </div>
            </div>
            <div className="space-y-2">
              {passages.map(fp => (
                <label key={fp.set_id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selectedPassageIds.includes(fp.set_id) ? 'bg-foreground/5 border-foreground/20' : 'bg-white border-foreground/5'}`}>
                  <input type="checkbox" checked={selectedPassageIds.includes(fp.set_id)}
                    onChange={() => togglePassage(fp.set_id)}
                    className="w-4 h-4 rounded accent-foreground" />
                  <span className="text-[12px] font-bold text-foreground">{fpLabel(fp)}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 학생 선택 */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <p className="text-[11px] font-black text-accent uppercase tracking-widest mr-1">학생 선택</p>
              {classes.map(cls => (
                <button key={cls} onClick={() => setFilterClass(cls)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${filterClass === cls ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-accent hover:text-foreground'}`}>
                  {cls}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {visibleStudents.map(s => {
                const isAlready = assignedStudents.includes(s.name);
                return (
                  <label key={s.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedNames.includes(s.name) ? 'bg-foreground/5 border-foreground/20' : 'bg-white border-foreground/5'}`}>
                    <input type="checkbox" checked={selectedNames.includes(s.name)} onChange={() => toggleStudent(s.name)} className="w-4 h-4 rounded accent-foreground" />
                    <div className="flex-1">
                      <span className="text-[13px] font-bold text-foreground">{s.name}</span>
                      <span className="text-[10px] text-accent ml-2">{s.class}</span>
                    </div>
                    {isAlready && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">기배당</span>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-foreground/5 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
          <button onClick={handleAssign} disabled={isAssigning || selectedNames.length === 0 || selectedPassageIds.length === 0}
            className="flex-1 h-12 bg-foreground text-background rounded-xl text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
            {isAssigning ? '배당 중...' : `${selectedNames.length}명 · ${selectedPassageIds.length}개 배당`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Smart AI Ingest ───────────────────────────────────────────────────────────
type ReviewWord = {
  word: string; pos_abbr: string; korean: string; context: string; context_korean: string;
  structure: string; // collocation 구조 (e.g. "result in + 명사")
  synonyms: string; antonyms: string; grammar_tip: string;
  test_synonym: boolean;
  test_antonym: boolean;
  _deleted?: boolean;
};

type PassageEntry = {
  id: string; rawText: string; category: string; subCategory: string;
  subSubCategory: string; passageNumber: string; label: string;
  status: "draft" | "scanning" | "ready" | "saving" | "saved";
  words: ReviewWord[]; sentences: unknown;
  essay_sentences?: { idx: number; text: string; korean: string }[];
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
          <span className="text-sky-500 font-black">유</span> = 유의어 출제&nbsp;|&nbsp;<span className="text-rose-500 font-black">반</span> = 반의어 출제 | <span className="text-purple-500 font-black">phr</span> = collocation
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
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${
                w.pos_abbr === 'phr' ? 'bg-purple-100 text-purple-700' : 'bg-accent-light text-accent'
              }`}>{w.pos_abbr}</span>
              <span className="text-[10px] text-foreground/50 flex-1 truncate">{w.korean}</span>
              <button
                onClick={() => onUpdateWord(idx, "test_synonym", !w.test_synonym)}
                disabled={!!w._deleted} title="유의어 문제 출제"
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_synonym && !w._deleted ? "bg-sky-500 text-white border-sky-500" : "bg-white border-sky-200 text-sky-400"
                }`}
              >유</button>
              <button
                onClick={() => onUpdateWord(idx, "test_antonym", !w.test_antonym)}
                disabled={!!w._deleted} title="반의어 문제 출제"
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all shrink-0 ${
                  w.test_antonym && !w._deleted ? "bg-rose-500 text-white border-rose-500" : "bg-white border-rose-200 text-rose-400"
                }`}
              >반</button>
              {w._deleted
                ? <button onClick={() => onUpdateWord(idx, "_deleted", false)} className="text-[9px] font-black text-blue-500 px-1.5 py-0.5 border border-blue-200 rounded-lg bg-blue-50">복원</button>
                : <button onClick={() => onUpdateWord(idx, "_deleted", true)} className="p-1 text-red-200 hover:text-red-500 transition-all"><Trash2 size={11} /></button>
              }
            </div>
            {!w._deleted && (
              <div className="px-3 pb-2.5 space-y-1.5">
                {/* 단일 필드 */}
                {([
                  { key: "korean", label: "한글 의미" },
                  { key: "synonyms", label: "유의어" },
                  { key: "antonyms", label: "반의어" },
                ] as { key: keyof ReviewWord; label: string }[]).map(f => (
                  <div key={f.key as string} className="flex items-center gap-2">
                    <label className="text-[8px] font-black text-accent uppercase shrink-0 w-12">{f.label}</label>
                    <input value={(w[f.key] as string) || ""} onChange={e => onUpdateWord(idx, f.key, e.target.value)}
                      className="flex-1 h-7 px-2 rounded-lg border border-foreground/8 bg-transparent text-[11px] outline-none focus:border-foreground/30" />
                  </div>
                ))}
                {/* structure: collocation일 때만 표시 */}
                {w.pos_abbr === 'phr' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[8px] font-black text-purple-500 uppercase shrink-0 w-12">구조</label>
                    <input value={w.structure || ""} onChange={e => onUpdateWord(idx, "structure", e.target.value)}
                      placeholder="e.g. result in + 명사/동명사"
                      className="flex-1 h-7 px-2 rounded-lg border border-purple-100 bg-purple-50/50 text-[11px] text-purple-700 outline-none focus:border-purple-300 font-mono" />
                  </div>
                )}
                {/* grammar_tip: 넓은 textarea */}
                <div className="flex items-start gap-2">
                  <label className="text-[8px] font-black text-accent uppercase shrink-0 w-12 mt-1">비고/팁</label>
                  <textarea value={w.grammar_tip || ""} onChange={e => onUpdateWord(idx, "grammar_tip", e.target.value)}
                    rows={2}
                    className="flex-1 px-2 py-1 rounded-lg border border-foreground/8 bg-transparent text-[10px] outline-none focus:border-foreground/30 resize-none leading-relaxed" />
                </div>
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
  const [showTextEdit, setShowTextEdit] = useState(false);
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
          <div className="mb-2">
            <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">분류</label>
            <FolderCategoryPicker
              value={{ large: entry.category, mid: entry.subCategory, small: entry.subSubCategory }}
              onChange={v => {
                onUpdate("category", v.large);
                onUpdate("subCategory", v.mid);
                onUpdate("subSubCategory", v.small);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">지문번호</label>
              <input value={entry.passageNumber} onChange={e => onUpdate("passageNumber", e.target.value)} placeholder="예: 18번"
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[11px] font-medium outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-accent uppercase tracking-widest mb-1 block">제목 (자동추출)</label>
              <input value={entry.label} onChange={e => onUpdate("label", e.target.value)} placeholder="AI가 자동 추출"
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none" />
            </div>
          </div>

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
        <div className="space-y-2">
          {/* 지문 원문 편집 (ready 상태에서도 펼칠 수 있음) */}
          <button
            onClick={() => setShowTextEdit(v => !v)}
            className="w-full flex items-center justify-between h-8 px-3 rounded-xl border border-foreground/8 text-[10px] font-black text-accent hover:text-foreground hover:border-foreground/20 transition-all"
          >
            <span className="flex items-center gap-1.5"><Edit2 size={11} /> 지문 원문 편집</span>
            <span>{showTextEdit ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>
          {showTextEdit && (
            <div className="space-y-2">
              <textarea value={entry.rawText} onChange={e => onUpdate("rawText", e.target.value)} rows={5}
                className="w-full p-3 rounded-2xl border border-amber-200 bg-amber-50/30 text-[12px] leading-relaxed font-serif outline-none resize-none focus:border-amber-400 transition-colors" />
              <div className="flex gap-2">
                <button onClick={() => { setShowTextEdit(false); onUpdate("status", "draft"); }}
                  className="flex-1 h-9 rounded-xl bg-foreground text-background text-[11px] font-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5">
                  <Sparkles size={12} /> 수정 후 재분석
                </button>
                <button onClick={() => setShowTextEdit(false)}
                  className="h-9 px-4 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground transition-all">
                  취소
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onOpenReview}
              className={`flex-1 h-10 rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${isReviewing ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-blue-600 text-white"}`}>
              <Edit2 size={13} /> {isReviewing ? "검토 패널 열려있음" : "단어 검토 & 체크 →"}
            </button>
            <button onClick={() => onUpdate("status", "draft")} className="h-10 px-3 rounded-xl border border-foreground/10 text-[11px] font-black text-accent hover:text-foreground transition-all">재분석</button>
          </div>
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
  // 저장 또는 폴더 실달 모달
  const [saveModeModal, setSaveModeModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [existingFolders, setExistingFolders] = useState<{ id: string; name: string }[]>([]);
  const [selectedExistingFolderId, setSelectedExistingFolderId] = useState('');
  const [savingToExisting, setSavingToExisting] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // ── 엑셀 업로드 상태 ──────────────────────────────────────────────────────────
  const [excelErrors, setExcelErrors] = useState<string[]>([]);
  const [showExcelErrorModal, setShowExcelErrorModal] = useState(false);

  // 엑셀 파싱 & 유효성 검사
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // 동일 파일 재업로드 허용

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

        if (rows.length < 2) {
          setExcelErrors(['엑셀 파일에 데이터가 없습니다. 첫 행은 헤더, 2행부터 데이터를 입력해주세요.']);
          setShowExcelErrorModal(true);
          return;
        }

        // 헤더 행 파싱 (대소문자/공백 무시)
        const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/\s/g, ''));
        const findCol = (...aliases: string[]) => {
          for (const a of aliases) {
            const idx = headers.indexOf(a.toLowerCase().replace(/\s/g, ''));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const colWorkbook    = findCol('대분류', 'workbook', '교재', '교재명');
        const colChapter     = findCol('중분류', 'chapter', 'part', '파트');
        const colSubSub      = findCol('소분류', 'sub', 'sub_sub', '소', 'test');
        const colPassNum     = findCol('지문번호', 'number', 'no', '번호', 'passagenumber', 'passage_number');
        const colContent     = findCol('지문내용', 'content', '내용', '지문', 'text', 'passage');

        if (colContent === -1) {
          setExcelErrors(['[헤더 오류] 지문 내용 열을 찾을 수 없습니다.\n"지문내용" 또는 "content" 열이 필요합니다.']);
          setShowExcelErrorModal(true);
          return;
        }

        const errors: string[] = [];
        const newEntries: PassageEntry[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;
          const workbook  = colWorkbook  !== -1 ? String(row[colWorkbook]  || '').trim() : Object.keys(TAXONOMY)[0];
          const chapter   = colChapter   !== -1 ? String(row[colChapter]   || '').trim() : '';
          const subSub    = colSubSub    !== -1 ? String(row[colSubSub]    || '').trim() : '';
          const passNum   = colPassNum   !== -1 ? String(row[colPassNum]   || '').trim() : '';
          const content   = String(row[colContent] || '').trim();

          // 유효성 검사
          if (!content) { errors.push(`${rowNum}행: 지문 내용이 비어있습니다.`); continue; }
          if (workbook && !TAXONOMY[workbook]) {
            errors.push(`${rowNum}행: 대분류 '${workbook}'은(는) 등록된 교재가 아닙니다.\n(가능한 값: ${Object.keys(TAXONOMY).join(', ')})`);
            continue;
          }
          if (chapter && workbook && TAXONOMY[workbook] && !TAXONOMY[workbook][chapter]) {
            errors.push(`${rowNum}행: 중분류 '${chapter}'는 '${workbook}'의 분류가 아닙니다.\n(가능한 값: ${Object.keys(TAXONOMY[workbook]).join(', ')})`);
            continue;
          }

          newEntries.push({
            ...makeEntry(),
            category: workbook || Object.keys(TAXONOMY)[0],
            subCategory: chapter,
            subSubCategory: subSub,
            passageNumber: passNum,
            rawText: content,
          });
        }

        if (errors.length > 0) {
          setExcelErrors(errors);
          setShowExcelErrorModal(true);
          if (newEntries.length === 0) return; // 전부 오류면 중단
        }

        if (newEntries.length > 0) {
          setPassages(prev => {
            // 빈 초기 draft만 있으면 교체, 아니면 추가
            const hasOnlyBlankDraft = prev.length === 1 && !prev[0].rawText.trim() && prev[0].status === 'draft';
            return hasOnlyBlankDraft ? newEntries : [...prev, ...newEntries];
          });
        }
      } catch (err) {
        setExcelErrors([`파일 파싱 오류: ${(err as Error).message}`]);
        setShowExcelErrorModal(true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
          essay_sentences: Array.isArray(data.essay_sentences) ? data.essay_sentences : [],
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

  const handleSaveAll = async (folderId?: string) => {
    const toSave = passages.filter(p => p.status === "ready");
    if (toSave.length === 0) {
      alert("저장할 수 있는 지문이 없습니다. \nAI 분석 완료한 지문을 먼저 비정해 주세요.");
      return;
    }
    setSaveModeModal(false);
    setReviewingId(null);
    let savedCount = 0;
    const savedSetIds: string[] = [];
    for (const entry of toSave) {
      updateEntry(entry.id, "status", "saving");
      try {
        const activeWords = entry.words.filter(w => !w._deleted);
        const result = await saveIngestedPassage({
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
          essay_sentences: entry.essay_sentences || [],
        });
        // saveIngestedPassage가 생성된 set id를 반환하는지 확인
        if (result?.id) savedSetIds.push(result.id);
        updateEntry(entry.id, "status", "saved");
        savedCount++;
      } catch (err: unknown) {
        alert(`"${entry.label}" 저장 실패: ` + (err as Error).message);
        updateEntry(entry.id, "status", "ready");
      }
    }
    // 폴더에 추가
    if (folderId && savedSetIds.length > 0) {
      try {
        await Promise.all(savedSetIds.map(sid => addPassageToFolder(folderId, sid).catch(() => {})));
      } catch { /* noop */ }
    }
    if (savedCount > 0) {
      setTimeout(() => { onComplete(); }, 800);
    }
  };

  const handleSaveModeExplorer = () => handleSaveAll();

  const handleOpenSaveModal = async () => {
    setSaveModeModal(true);
    setLoadingFolders(true);
    setExistingFolders([]);          // ← 기존 상태 초기화
    setSelectedExistingFolderId(''); // ← 기존 선택 초기화
    try {
      const data = (await getFolders() || []) as { id: string; name: string }[];
      setExistingFolders(data);
      if (data.length > 0) setSelectedExistingFolderId(data[0].id);
    } catch (e) {
      console.error('[폴더 로드 실패]', e);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleSaveToExistingFolder = async () => {
    if (!selectedExistingFolderId) return;
    setSavingToExisting(true);
    try { await handleSaveAll(selectedExistingFolderId); }
    finally { setSavingToExisting(false); }
  };

  const handleCreateFolderAndSave = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await createFolder({ name: newFolderName.trim(), description: newFolderDesc.trim() });
      // 방금 만든 폴더 id 가져오기
      const folders = (await getFolders() || []) as { id: string; name: string }[];
      const created = folders.find(f => f.name === newFolderName.trim());
      await handleSaveAll(created?.id);
      setNewFolderName(''); setNewFolderDesc('');
    } catch (err: unknown) { alert('폴더 생성 오류: ' + (err as Error).message); }
    finally { setCreatingFolder(false); }
  };


  const addPassage = () => setPassages(prev => {
    const last = prev[prev.length - 1];
    return [...prev, {
      ...makeEntry(),
      category: last?.category || Object.keys(TAXONOMY)[0],
      subCategory: last?.subCategory || '',
      subSubCategory: last?.subSubCategory || '',
    }];
  });
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
          <div className="flex items-center gap-2 shrink-0">
            {/* 엑셀 업로드 버튼 */}
            <label className="flex items-center gap-2 h-10 px-4 bg-emerald-600 text-white rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all cursor-pointer shrink-0">
              <Upload size={14} /> 엑셀 업로드
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
            </label>
            <button onClick={addPassage} className="flex items-center gap-2 h-10 px-4 bg-foreground text-background rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all shrink-0">
              <Plus size={14} /> 지문 추가
            </button>
          </div>
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
            <p className="text-[11px] text-accent mt-0.5">저장 방식을 선택하세요</p>
          </div>
          <button
            onClick={() => setSaveModeModal(true)}
            disabled={passages.some(p => p.status === "saving")}
            className="flex items-center gap-2 h-12 px-6 bg-foreground text-background rounded-2xl text-[13px] font-black hover:-translate-y-0.5 disabled:opacity-30 transition-all shadow-xl shrink-0"
          >
            <Save size={15} />
            전체저장 ({passages.filter(p => p.status === "ready").length}개)
          </button>
        </div>
      )}

      {/* ── 저장 방식 선택 모달 ── */}
      {saveModeModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-[2rem] border border-foreground/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-foreground/5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center">
                  <Save size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-foreground">저장 방식 선택</h3>
                  <p className="text-[11px] text-accent">{passages.filter(p => p.status === "ready").length}개 지문</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* 1. 탐색기에만 저장 */}
              <button onClick={handleSaveModeExplorer}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-accent" />
                </div>
                <div>
                  <div className="text-[13px] font-black text-foreground">탐색기에만 저장</div>
                  <div className="text-[11px] text-accent mt-0.5">폴더 없이 탐색기에 바로 추가됩니다</div>
                </div>
              </button>

              {/* 2. 기존 폴더에 저장 */}
              <div className="rounded-2xl border border-foreground/10 overflow-hidden">
                <div className="flex items-center gap-4 p-4 border-b border-foreground/5">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                    <FolderOpen size={18} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-foreground">기존 폴더에 저장</div>
                    <div className="text-[11px] text-accent mt-0.5">만들어진 폴더를 선택합니다</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {loadingFolders ? (
                    <p className="text-[12px] text-accent animate-pulse text-center py-2">폴더 불러오는 중...</p>
                  ) : existingFolders.length === 0 ? (
                    <p className="text-[12px] text-accent/60 text-center py-2">생성된 폴더가 없습니다</p>
                  ) : (
                    <select
                      value={selectedExistingFolderId}
                      onChange={e => setSelectedExistingFolderId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-white text-[13px] font-bold outline-none focus:border-foreground/30 transition-colors"
                    >
                      {existingFolders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handleSaveToExistingFolder}
                    disabled={!selectedExistingFolderId || savingToExisting || existingFolders.length === 0}
                    className="w-full h-10 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                    {savingToExisting ? '저장 중...' : '이 폴더에 저장'}
                  </button>
                </div>
              </div>

              {/* 3. 새 폴더 만들어 저장 */}
              <div className="rounded-2xl border border-foreground/10 overflow-hidden">
                <div className="flex items-center gap-4 p-4 border-b border-foreground/5">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                    <FolderPlus size={18} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-foreground">새 폴더 만들어 저장</div>
                    <div className="text-[11px] text-accent mt-0.5">지문들이 폴더에 자동 추가됩니다</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름 *"
                    className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30 transition-colors" />
                  <input value={newFolderDesc} onChange={e => setNewFolderDesc(e.target.value)}
                    placeholder="설명 (선택)"
                    className="w-full h-10 px-3 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-medium outline-none focus:border-foreground/30 transition-colors" />
                  <button onClick={handleCreateFolderAndSave}
                    disabled={!newFolderName.trim() || creatingFolder}
                    className="w-full h-10 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30">
                    {creatingFolder ? '저장 중...' : '폴더 생성 후 저장'}
                  </button>
                </div>
              </div>

              <button onClick={() => setSaveModeModal(false)}
                className="w-full h-10 rounded-xl border border-foreground/10 text-[13px] font-black text-accent hover:text-foreground transition-all">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 엑셀 오류 모달 ─────────────────────────────────────────────────────── */}
      {showExcelErrorModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[400] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-lg rounded-[2rem] border border-rose-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-rose-100 bg-rose-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <X size={16} />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-foreground">엑셀 업로드 오류</h3>
                <p className="text-[11px] text-accent mt-0.5">{excelErrors.length}건의 문제가 발견됐습니다</p>
              </div>
            </div>
            <div className="p-5 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {excelErrors.map((err, i) => (
                <div key={i} className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5">
                  <p className="text-[12px] font-bold text-rose-700 whitespace-pre-line">{err}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-rose-100 bg-rose-50/50">
              <p className="text-[11px] text-accent/70 mb-3 text-center">
                오류 행은 건너뛰고 정상 행만 가져왔습니다. 엑셀을 수정 후 다시 업로드하세요.
              </p>
              <button onClick={() => setShowExcelErrorModal(false)}
                className="w-full h-11 rounded-xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all">
                확인
              </button>
            </div>
          </div>
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
    category?: string; sub_category?: string;
    full_text?: string;
    words: { id: string; word: string; pos_abbr: string; korean: string; context: string; synonyms: string; antonyms: string; grammar_tip: string; test_synonym?: boolean; test_antonym?: boolean }[]
  }[]>([]);
  const [students, setStudents] = useState<{ name: string; class: string }[]>([]);
  const [assignTarget, setAssignTarget] = useState<{ id: string; workbook: string; chapter: string; label: string } | null>(null);
  const [editTarget, setEditTarget] = useState<typeof wordSets[0] | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [moveFolderModal, setMoveFolderModal] = useState(false);
  const [deleteSetConfirm, setDeleteSetConfirm] = useState<{ id: string; label: string } | null>(null);
  const [deletingSet, setDeletingSet] = useState(false);
  const [filterChapter, setFilterChapter] = useState('전체');
  const [filterSubSub, setFilterSubSub] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [sets, studs] = await Promise.all([getWordSets(), getStudents()]);
      setWordSets(sets || []);
      setStudents((studs || []).map((s: { name: string; class_name: string }) => ({ name: s.name, class: s.class_name })));
    } catch (err) { console.error(err); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteSet = (setId: string, label: string) => {
    setDeleteSetConfirm({ id: setId, label });
  };

  const handleDeleteSetConfirm = async () => {
    if (!deleteSetConfirm) return;
    setDeletingSet(true);
    try { await deleteWordSet(deleteSetConfirm.id); await loadData(); setDeleteSetConfirm(null); }
    catch (err: unknown) { alert((err as Error).message); }
    finally { setDeletingSet(false); }
  };

  // 정렬: 교재 필터 후 강 오름차순 → 같은 강 내 지문번호 오름차순
  const parseLessonNum = (s: string) => { const m = s?.match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
  // 체인드 필터: workbook → chapter → sub_sub_category
  const byWorkbook = filterWorkbook === '전체' ? wordSets : wordSets.filter(s => s.workbook === filterWorkbook);
  const chaptersForFilter = ['전체', ...Array.from(new Set(byWorkbook.map(s => s.chapter).filter(Boolean))).sort()];
  const byChapter = filterChapter === '전체' ? byWorkbook : byWorkbook.filter(s => s.chapter === filterChapter);
  const subSubsForFilter = ['전체', ...Array.from(new Set(byChapter.map(s => s.sub_sub_category || '').filter(Boolean))).sort((a, b) => parseLessonNum(a) - parseLessonNum(b))];
  const bySubSub = filterSubSub === '전체' ? byChapter : byChapter.filter(s => (s.sub_sub_category || '') === filterSubSub);
  // 검색: 라벨, 지문본문, 단어어(word), 한국어의미(korean) 포함
  const q = searchQuery.trim().toLowerCase();
  const bySearch = !q ? bySubSub : bySubSub.filter(s => {
    const inLabel = s.label?.toLowerCase().includes(q);
    const inText = s.full_text?.toLowerCase().includes(q);
    const inWords = s.words?.some(w =>
      w.word?.toLowerCase().includes(q) ||
      w.korean?.toLowerCase().includes(q)
    );
    return inLabel || inText || inWords;
  });
  const filteredSets = bySearch.slice().sort((a, b) => {
    const la = parseLessonNum(a.sub_sub_category || '') - parseLessonNum(b.sub_sub_category || '');
    if (la !== 0) return la;
    return parseInt(a.passage_number || '0', 10) - parseInt(b.passage_number || '0', 10);
  });
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
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-foreground/5 rounded-xl text-[11px] font-black text-accent uppercase tracking-widest border border-foreground/5">
                <Filter size={13} /> 필터
              </div>
              {/* 교재 */}
              <select value={filterWorkbook} onChange={e => { setFilterWorkbook(e.target.value); setFilterChapter('전체'); setFilterSubSub('전체'); }}
                className="h-9 px-3 rounded-xl border border-foreground/5 bg-white text-[12px] font-bold outline-none shadow-sm">
                <option value="전체">전체 교재</option>
                {WORKBOOKS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {/* 중분류 (Part) */}
              {chaptersForFilter.length > 1 && (
                <select value={filterChapter} onChange={e => { setFilterChapter(e.target.value); setFilterSubSub('전체'); }}
                  className="h-9 px-3 rounded-xl border border-foreground/5 bg-white text-[12px] font-bold outline-none shadow-sm">
                  {chaptersForFilter.map(c => <option key={c} value={c}>{c === '전체' ? '전체 파트' : c}</option>)}
                </select>
              )}
              {/* 소분류 (강) */}
              {subSubsForFilter.length > 1 && (
                <select value={filterSubSub} onChange={e => setFilterSubSub(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-foreground/5 bg-white text-[12px] font-bold outline-none shadow-sm">
                  {subSubsForFilter.map(s => <option key={s} value={s}>{s === '전체' ? '전체 강' : s}</option>)}
                </select>
              )}
              <span className="ml-auto text-[12px] font-black text-accent">{filteredSets.length}개 지문</span>
            </div>
            {/* 검색 바 */}
            <div className="relative mb-5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="단어, 한국어 뜻, 제목으로 검색… (예: confound, 혼란)"
                className="w-full h-10 pl-9 pr-10 rounded-xl border border-foreground/10 bg-white text-[12px] font-medium outline-none focus:border-foreground/30 transition-colors shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* 선택 헬퍼 바 */}
              {selectedSetIds.length > 0 && (
                <div className="col-span-full glass rounded-2xl p-4 border border-blue-200 bg-blue-50/60 flex items-center gap-3">
                  <span className="text-[13px] font-black text-blue-700">{selectedSetIds.length}개 선택됨</span>
                  <button onClick={() => setMoveFolderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-[12px] font-black hover:-translate-y-0.5 transition-all">
                    <FolderPlus size={13} />
                    폴더로 이동
                  </button>
                  <button onClick={() => setSelectedSetIds([])} className="ml-auto text-[11px] font-black text-accent hover:text-foreground">선택 취소</button>
                </div>
              )}
              {filteredSets.map(set => (
                <div key={set.id} className={`relative glass rounded-[1.5rem] p-4 border transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-white/50 flex flex-col ${selectedSetIds.includes(set.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-foreground/5 hover:border-foreground/10'}`}>
                  <input type="checkbox" checked={selectedSetIds.includes(set.id)}
                    onChange={e => setSelectedSetIds(prev => e.target.checked ? [...prev, set.id] : prev.filter(id => id !== set.id))}
                    className="absolute top-3 left-3 w-3.5 h-3.5 rounded cursor-pointer accent-foreground" />
                  <div className="pl-5 mb-2">
                    <span className="text-[8px] font-black text-accent/70 bg-accent-light px-2 py-0.5 rounded-md uppercase tracking-tight line-clamp-1">
                      {[set.workbook, set.chapter, set.sub_sub_category, set.passage_number ? `${set.passage_number}번` : ''].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-bold text-foreground mb-1 line-clamp-1 pl-1">{set.label}</h4>
                  <p className="text-[11px] text-accent/60 line-clamp-1 leading-relaxed mb-3 serif italic pl-1">
                    {set.full_text?.slice(0, 60) || '내용 없음'}…
                  </p>
                  <div className="flex items-center justify-between pt-2.5 border-t border-foreground/5 mt-auto">
                    <span className="text-[10px] font-bold text-accent">{set.words?.length || 0}단어</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setAssignTarget(set)} className="text-[9px] font-black text-foreground hover:bg-foreground hover:text-background border border-foreground/10 px-2 py-1 rounded-lg transition-all flex items-center gap-0.5">
                        <Users size={9} strokeWidth={3} /> 배당
                      </button>
                      <button onClick={() => setEditTarget(set)} className="text-[9px] font-black text-accent hover:bg-foreground hover:text-background border border-foreground/10 px-2 py-1 rounded-lg transition-all">
                        편집
                      </button>
                      <button onClick={() => handleDeleteSet(set.id, set.label)} className="p-1 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
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
      {moveFolderModal && (
        <MoveFolderModal
          setIds={selectedSetIds}
          setLabels={selectedSetIds.map(id => wordSets.find(s => s.id === id)?.label || id)}
          onClose={() => setMoveFolderModal(false)}
          onDone={() => { setMoveFolderModal(false); setSelectedSetIds([]); }}
        />
      )}
      {deleteSetConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
            <div className="p-7 border-b border-red-50">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 size={20} className="text-red-500" /></div>
              <h3 className="text-[16px] font-black text-foreground">지문 완전 삭제</h3>
              <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">{deleteSetConfirm.label}</p>
              <p className="text-[11px] text-accent/70 mt-3">라이브러리에서 완전히 삭제되며, 해당 지문의 배당 기록도 제거됩니다.</p>
            </div>
            <div className="p-5 flex gap-3">
              <button onClick={() => setDeleteSetConfirm(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
              <button onClick={handleDeleteSetConfirm} disabled={deletingSet} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black hover:bg-red-600 transition-all disabled:opacity-40">
                {deletingSet ? '삭제 중...' : '완전 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-20 pt-10 border-t border-foreground/5 text-center">
        <p className="text-[12px] font-black text-accent tracking-[0.3em] uppercase opacity-40">
          Managed by Team Parallax Adaptive Engine
        </p>
      </div>
    </div>
  );
}
