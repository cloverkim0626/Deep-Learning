"use client";
import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Eye, Send, ChevronDown, ChevronUp, X, Search, ArrowUpDown, CheckSquare, Square, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ClassRow = { id: string; name: string };
type Report = {
  id: string; class_id: string; student_name: string; session_date: string;
  published: boolean; published_at?: string; html_content: string; teacher_comment?: string;
};

export default function AdminReportsPage() {
  // ── 데이터 ──────────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  // ── 필터 / 정렬 ────────────────────────────────────────────────────────────
  const [filterClass, setFilterClass] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [dateAsc, setDateAsc] = useState(false);

  // ── 생성 패널 ──────────────────────────────────────────────────────────────
  const [genClass, setGenClass] = useState<ClassRow | null>(null);
  const [genStudents, setGenStudents] = useState<string[]>([]);
  const [genSelectedStudents, setGenSelectedStudents] = useState<string[]>([]);
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState<string[]>([]); // generating student names
  const [genResults, setGenResults] = useState<Record<string, { status: "ok" | "error"; msg?: string }>>({});
  const [genError, setGenError] = useState("");

  // ── 미리보기 / 발행 ────────────────────────────────────────────────────────
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [comment, setComment] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  // ── 학생 이력 패널 ─────────────────────────────────────────────────────────
  const [historyStudent, setHistoryStudent] = useState<string | null>(null);
  const [historyReports, setHistoryReports] = useState<Report[]>([]);

  useEffect(() => {
    supabase.from("classes").select("id,name").order("opened_at").then(({ data }) => setClasses((data || []) as ClassRow[]));
  }, []);

  // 반 변경 시 학생 로드
  useEffect(() => {
    if (!genClass) { setGenStudents([]); setGenSelectedStudents([]); return; }
    supabase.from("students").select("name").eq("class_name", genClass.name).order("name")
      .then(({ data }) => {
        const names = (data || []).map((s: any) => s.name);
        setGenStudents(names);
        setGenSelectedStudents(names); // 기본 전체 선택
      });
  }, [genClass]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("daily_reports")
      .select("id,class_id,student_name,session_date,published,published_at,teacher_comment,html_content")
      .order("session_date", { ascending: dateAsc })
      .order("student_name", { ascending: true })
      .limit(200);
    if (filterClass) q = q.eq("class_id", filterClass);
    if (filterStudent) q = q.ilike("student_name", `%${filterStudent}%`);
    if (filterDateFrom) q = q.gte("session_date", filterDateFrom);
    if (filterDateTo) q = q.lte("session_date", filterDateTo);
    const { data } = await q;
    setReports((data || []) as Report[]);
    setLoading(false);
  }, [filterClass, filterStudent, filterDateFrom, filterDateTo, dateAsc]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // 일괄 생성
  const generateBatch = async () => {
    if (!genClass || genSelectedStudents.length === 0) return;
    setGenError(""); setGenResults({});
    setGenerating(genSelectedStudents);
    for (const stu of genSelectedStudents) {
      try {
        const res = await fetch("/api/report/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_name: stu, session_date: genDate, class_id: genClass.id }),
        });
        const json = await res.json();
        if (res.ok) {
          setGenResults(p => ({ ...p, [stu]: { status: "ok" } }));
        } else {
          setGenResults(p => ({ ...p, [stu]: { status: "error", msg: json.error } }));
        }
      } catch (e: any) {
        setGenResults(p => ({ ...p, [stu]: { status: "error", msg: e.message } }));
      }
      setGenerating(p => p.filter(n => n !== stu));
    }
    loadReports();
  };

  // 발행 / 발행취소
  const publish = async (r: Report, unpublish = false) => {
    setPublishing(true);
    if (unpublish) {
      await supabase.from("daily_reports").update({ published: false, published_at: null }).eq("id", r.id);
    } else {
      // html_content에 플레이스홀더 대신 teacher_comment 컨럼만 저장 (중복발행 시 코멘트 소실 방지)
      await supabase.from("daily_reports").update({
        published: true,
        published_at: new Date().toISOString(),
        teacher_comment: comment || r.teacher_comment || "",
      }).eq("id", r.id);
    }
    setPublishing(false);
    setPreviewReport(null); setComment("");
    loadReports();
  };

  const deleteReport = async (r: Report) => {
    if (!confirm(`${r.student_name} (${r.session_date}) 리포트를 삭제하시겠습니까?\n발행된 경우 학부모 페이지에서도 사라집니다.`)) return;
    await supabase.from("daily_reports").delete().eq("id", r.id);
    setPreviewReport(null);
    loadReports();
  };

  // 코멘트 저장 (발행 전 임시 저장)
  const saveComment = async (r: Report) => {
    await supabase.from("daily_reports").update({ teacher_comment: comment }).eq("id", r.id);
    setCommentSaved(true); setTimeout(() => setCommentSaved(false), 1500);
  };

  // 학생 이력 로드
  const loadHistory = async (studentName: string) => {
    const { data } = await supabase.from("daily_reports").select("id,class_id,student_name,session_date,published,html_content,teacher_comment")
      .eq("student_name", studentName).order("session_date", { ascending: false }).limit(30);
    setHistoryReports((data || []) as Report[]);
    setHistoryStudent(studentName);
  };

  // 필터된 보기용
  const groupedByStudent: Record<string, Report[]> = {};
  for (const r of reports) {
    if (!groupedByStudent[r.student_name]) groupedByStudent[r.student_name] = [];
    groupedByStudent[r.student_name].push(r);
  }
  const studentNames = Object.keys(groupedByStudent).sort();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 md:p-8 pb-20 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">일간 리포트 관리</h1>
          <p className="text-[13px] text-accent mt-1 font-medium">생성 · 조회 · 발행</p>
        </div>

        {/* ── 생성 패널 ── */}
        <div className="glass rounded-3xl border border-foreground/10 p-6 space-y-4">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest">📋 리포트 생성</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 반 */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1.5">반 선택</label>
              <div className="relative">
                <select value={genClass?.id || ""} onChange={e => { setGenClass(classes.find(x => x.id === e.target.value) || null); }}
                  className="w-full h-11 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30 appearance-none">
                  <option value="">반을 선택하세요</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-accent pointer-events-none"/>
              </div>
            </div>
            {/* 날짜 */}
            <div>
              <label className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1.5">수업 날짜</label>
              <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-bold outline-none focus:border-foreground/30"/>
            </div>
            {/* 학생 선택 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-accent uppercase tracking-widest">학생 선택</label>
                {genStudents.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => setGenSelectedStudents(genStudents)} className="text-[9px] font-black text-indigo-500 hover:underline">전체</button>
                    <button onClick={() => setGenSelectedStudents([])} className="text-[9px] font-black text-slate-400 hover:underline">해제</button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-foreground/10 divide-y divide-foreground/5 max-h-36 overflow-y-auto">
                {genStudents.length === 0 ? (
                  <p className="text-[11px] text-accent text-center py-3">반을 먼저 선택하세요</p>
                ) : genStudents.map(name => {
                  const sel = genSelectedStudents.includes(name);
                  const res = genResults[name];
                  const inProg = generating.includes(name);
                  return (
                    <label key={name} className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-foreground/3 ${sel ? 'bg-indigo-50/50' : ''}`}>
                      <input type="checkbox" checked={sel} onChange={e => setGenSelectedStudents(p => e.target.checked ? [...p, name] : p.filter(n => n !== name))} className="accent-indigo-500"/>
                      <span className="text-[12px] font-bold flex-1">{name}</span>
                      {inProg && <span className="text-[10px] text-indigo-400 animate-pulse">생성중...</span>}
                      {res?.status === "ok" && <span className="text-[10px] text-emerald-600">✓</span>}
                      {res?.status === "error" && (
                        <span className="text-[10px] text-red-500" title={res.msg}>✗ {res.msg?.includes("수업 내역") ? "수업없음" : "오류"}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          {genError && <p className="text-[12px] text-red-500 font-bold">{genError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={generateBatch} disabled={!genClass || genSelectedStudents.length === 0 || generating.length > 0}
              className="h-11 px-6 rounded-2xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all disabled:opacity-30 flex items-center gap-2">
              {generating.length > 0 ? <><RefreshCw size={14} className="animate-spin"/>{genSelectedStudents.length}명 생성 중...</> : <><FileText size={14}/>리포트 생성 ({genSelectedStudents.length}명)</>}
            </button>
            <p className="text-[11px] text-accent">{genClass?.name || ""} · {genDate}</p>
          </div>
        </div>

        {/* ── 조회 필터 ── */}
        <div className="glass rounded-3xl border border-foreground/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-accent uppercase tracking-widest">🔍 리포트 조회</p>
            <button onClick={loadReports} className="flex items-center gap-1.5 text-[11px] text-accent hover:text-foreground">
              <RefreshCw size={12}/>새로고침
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* 반 필터 */}
            <div className="relative">
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                className="w-full h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none appearance-none">
                <option value="">전체 반</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-2.5 text-accent pointer-events-none"/>
            </div>
            {/* 학생 검색 */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-accent pointer-events-none"/>
              <input value={filterStudent} onChange={e => setFilterStudent(e.target.value)} placeholder="학생 이름 검색"
                className="w-full h-9 pl-7 pr-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none"/>
            </div>
            {/* 시작 날짜 */}
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none"/>
            {/* 종료 날짜 */}
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="h-9 px-2 rounded-xl border border-foreground/10 bg-transparent text-[12px] font-bold outline-none"/>
            {/* 날짜 정렬 */}
            <button onClick={() => setDateAsc(a => !a)}
              className="h-9 px-3 rounded-xl border border-foreground/10 text-[11px] font-black flex items-center gap-1.5 hover:bg-foreground/5">
              <ArrowUpDown size={12}/>날짜 {dateAsc ? "오름차순↑" : "내림차순↓"}
            </button>
          </div>
        </div>

        {/* ── 리포트 목록 (학생별 그룹) ── */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin"/></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-accent opacity-40 font-bold">생성된 리포트가 없습니다</div>
        ) : (
          <div className="space-y-3">
            {studentNames.map(stu => {
              const reps = groupedByStudent[stu];
              return (
                <div key={stu} className="glass rounded-2xl border border-foreground/10 overflow-hidden">
                  {/* 학생 헤더 */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-foreground/3 border-b border-foreground/5 cursor-pointer"
                    onClick={() => loadHistory(stu)}>
                    <p className="font-black text-[14px] text-foreground flex-1">{stu}</p>
                    <p className="text-[11px] text-accent">{reps.length}개 리포트</p>
                    <button onClick={e => { e.stopPropagation(); loadHistory(stu); }}
                      className="text-[10px] text-indigo-500 hover:underline font-black">이력 전체 보기</button>
                  </div>
                  {/* 리포트 행 */}
                  <div className="divide-y divide-foreground/5">
                    {reps.map(r => (
                      <div key={r.id} className={`px-5 py-3 flex items-center gap-3 ${r.published ? "bg-emerald-50/30" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground">{r.session_date}</p>
                          <p className="text-[10px] text-accent">
                            {r.published ? "✅ 발행됨" : "○ 미발행"}
                            {r.teacher_comment && <span className="ml-2 opacity-60">· 코멘트 있음</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setPreviewReport(r); setComment(r.teacher_comment || ""); }}
                            className="h-8 px-3 rounded-xl border border-foreground/10 text-[11px] font-bold text-accent hover:text-foreground flex items-center gap-1">
                            <Eye size={12}/>미리보기
                          </button>
                          {!r.published ? (
                            <button onClick={() => { setPreviewReport(r); setComment(r.teacher_comment || ""); }}
                              className="h-8 px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:-translate-y-0.5 transition-all flex items-center gap-1">
                              <Send size={12}/>발행
                            </button>
                          ) : (
                            <button onClick={() => publish(r, true)}
                              className="h-8 px-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-black hover:bg-rose-100 transition-all flex items-center gap-1">
                              <XCircle size={12}/>발행취소
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 미리보기 / 발행 모달 ── */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-start gap-4 px-6 py-4 bg-white/10 backdrop-blur-md shrink-0">
            <div className="flex-1">
              <p className="text-white font-black text-[15px]">{previewReport.student_name} · {previewReport.session_date}</p>
              <p className="text-white/50 text-[11px]">{previewReport.published ? "✅ 발행됨" : "미발행"}</p>
            </div>
            {/* 코멘트 입력 */}
            <div className="flex-1 min-w-[280px]">
              <p className="text-white/60 text-[10px] font-black mb-1 uppercase tracking-widest">강사 코멘트</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                placeholder="강사 코멘트를 입력하세요..."
                className="w-full px-3 py-2 rounded-xl bg-white/20 text-white placeholder:text-white/40 text-[12px] font-medium outline-none resize-none"/>
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => saveComment(previewReport)}
                  className="h-7 px-3 rounded-lg bg-white/20 text-white text-[11px] font-bold hover:bg-white/30">
                  {commentSaved ? "✓ 저장됨" : "임시저장"}
                </button>
              {!previewReport.published && (
                  <button onClick={() => publish(previewReport)} disabled={publishing}
                    className="h-7 px-4 rounded-lg bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 disabled:opacity-40 flex items-center gap-1">
                    <Send size={11}/>발행
                  </button>
                )}
                {previewReport.published && (
                  <button onClick={() => publish(previewReport, true)} disabled={publishing}
                    className="h-7 px-3 rounded-lg bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 disabled:opacity-40 flex items-center gap-1">
                    <XCircle size={11}/>발행취소
                  </button>
                )}
                <button onClick={() => deleteReport(previewReport)}
                  className="h-7 px-3 rounded-lg bg-slate-200 text-slate-600 text-[11px] font-bold hover:bg-rose-100 hover:text-rose-700 transition-all">
                  삭제
                </button>
              </div>
            </div>
            <button onClick={() => { setPreviewReport(null); setComment(""); }}
              className="h-9 px-4 rounded-xl bg-white/20 text-white text-[13px] font-bold ml-2 shrink-0">닫기</button>
          </div>
          {/* iframe - 코멘트를 동적으로 치환하여 렌더링 */}
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={(previewReport.html_content || '').replace('{{TEACHER_COMMENT}}', comment || previewReport.teacher_comment || '')}
              className="w-full h-full border-0"
              title="리포트 미리보기"
            />
          </div>
        </div>
      )}

      {/* ── 학생 이력 패널 ── */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <p className="font-black text-[15px] text-slate-800">{historyStudent} 리포트 이력</p>
              <button onClick={() => setHistoryStudent(null)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <X size={14} className="text-slate-500"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {historyReports.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-[13px] font-bold">리포트 없음</p>
              ) : historyReports.map(r => (
                <div key={r.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-slate-800">{r.session_date}</p>
                    <p className="text-[10px] text-slate-400">{r.published ? "✅ 발행됨" : "미발행"}</p>
                  </div>
                  <button onClick={() => { setPreviewReport(r); setComment(r.teacher_comment || ""); setHistoryStudent(null); }}
                    className="h-8 px-3 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <Eye size={12}/>보기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
