"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronDown, GraduationCap, Clock, Phone, CheckCircle, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── 통합 상담 아이템 ─────────────────────────────────────────────────────────
type ConsultItem = {
  id: string;
  source: "inquiry" | "trial";
  created_at: string;
  name: string;
  school: string;
  grade: string;
  phone: string;
  status: string;
  admin_note: string;
  // inquiry fields
  inquiry_type?: string;
  detail_message?: string;
  audit_class_preference?: string;
  // trial fields
  applicant_type?: string;
  gender?: string;
  current_textbook?: string;
  vocab_difficulties?: string;
  desired_features?: string;
  wants_consultation?: boolean;
  wants_audit_class?: boolean;
  wants_trial_class?: boolean;
  trial_class_preference?: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  trial:          { label: "앱 체험",     color: "#6366f1", bg: "#eef2ff",  icon: "✨" },
  study:          { label: "공부법",      color: "#0ea5e9", bg: "#f0f9ff",  icon: "📖" },
  audit:          { label: "청강",        color: "#8b5cf6", bg: "#f5f3ff",  icon: "🏫" },
  material:       { label: "교재샘플",   color: "#10b981", bg: "#ecfdf5",  icon: "📄" },
  enrollment:     { label: "등록상담",   color: "#f59e0b", bg: "#fffbeb",  icon: "🎓" },
  career:         { label: "진로상담",   color: "#ef4444", bg: "#fef2f2",  icon: "🗺️" },
  premium:        { label: "유료문의",   color: "#64748b", bg: "#f8fafc",  icon: "💳" },
  trial_app:      { label: "체험신청",   color: "#7c3aed", bg: "#f5f3ff",  icon: "🎯" },
  report_comment: { label: "리포트 코멘트", color: "#16a34a", bg: "#f0fdf4", icon: "💬" },
};

const STATUS_OPTIONS = [
  { value: "pending",    label: "대기중",   color: "#f59e0b", bg: "#fffbeb" },
  { value: "contacted",  label: "연락완료", color: "#3b82f6", bg: "#eff6ff" },
  { value: "registered", label: "등록완료", color: "#10b981", bg: "#ecfdf5" },
  { value: "done",       label: "처리완료", color: "#6b7280", bg: "#f9fafb" },
];

function getStatus(v: string) { return STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0]; }
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function ConsultationsPage() {
  const [items, setItems] = useState<ConsultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState<"all" | "inquiry" | "trial">("all");
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: aData }, { data: iData }] = await Promise.all([
      supabase.from("trial_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }),
    ]);
    const combined: ConsultItem[] = [
      ...((iData ?? []) as ConsultItem[]).map(r => ({ ...r, source: "inquiry" as const })),
      ...((aData ?? []) as ConsultItem[]).map(r => ({ ...r, source: "trial" as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(combined);
    const notes: Record<string, string> = {};
    combined.forEach(r => { notes[r.id] = r.admin_note ?? ""; });
    setEditNote(notes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─ Supabase Realtime: contact_inquiries INSERT 실시간 구독 (WebSocket — API 비용 없음) ─
  const [newFlash, setNewFlash] = useState<string | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel("realtime-consultations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_inquiries" },
        (payload) => {
          const row = payload.new as ConsultItem;
          const newItem: ConsultItem = { ...row, source: "inquiry" as const };
          setItems(prev => [newItem, ...prev]);
          setEditNote(prev => ({ ...prev, [newItem.id]: "" }));
          // 신규 항목 진동 표시
          setNewFlash(newItem.id);
          setTimeout(() => setNewFlash(null), 4000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: string, source: "inquiry" | "trial") => {
    const table = source === "inquiry" ? "contact_inquiries" : "trial_applications";
    setItems(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) { alert("상태 저장 실패: " + error.message); load(); }
  };

  const saveNote = async (id: string, source: "inquiry" | "trial") => {
    setSavingId(id);
    const table = source === "inquiry" ? "contact_inquiries" : "trial_applications";
    const { error } = await supabase.from(table).update({ admin_note: editNote[id] ?? "" }).eq("id", id);
    if (error) alert("저장 실패: " + error.message);
    else setItems(prev => prev.map(a => a.id === id ? { ...a, admin_note: editNote[id] ?? "" } : a));
    setSavingId(null);
  };

  const deleteItem = async (item: ConsultItem) => {
    setDeleteError(null);
    const table = item.source === "inquiry" ? "contact_inquiries" : "trial_applications";
    // 서버 API 라우트를 통해 RLS 우회 삭제
    const res = await fetch('/api/admin-delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, table }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
      setDeleteError(`삭제 실패: ${error}\n(Supabase Service Role Key가 필요합니다 — .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가 필요)`);
      return;
    }
    setItems(prev => prev.filter(a => a.id !== item.id));
    setConfirmDeleteId(null);
    if (expandedId === item.id) setExpandedId(null);
  };


  const filtered = items.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterSource !== "all" && a.source !== filterSource) return false;
    const q = search.toLowerCase();
    return !q || a.name.includes(q) || (a.school || "").includes(q) || (a.phone || "").includes(q);
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = items.filter(a => a.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-800">상담 내역</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">문의·체험신청·리포트 코멘트 통합 관리</p>
        </div>
        <button onClick={load} disabled={loading}
          className="h-9 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-2 text-[12px] font-bold">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> 새로고침
        </button>
      </div>

      {/* 삭제 에러 배너 */}
      {deleteError && (
        <div className="mb-4 p-4 rounded-2xl flex items-start gap-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] font-bold text-red-700 whitespace-pre-wrap">{deleteError}</p>
          </div>
          <button onClick={() => setDeleteError(null)} className="text-red-300 hover:text-red-500">✕</button>
        </div>
      )}

      {/* 상태 카운트 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value === filterStatus ? "all" : s.value)}
            className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
            style={{ background: filterStatus === s.value ? s.bg : "#fff", border: filterStatus === s.value ? `2px solid ${s.color}` : "2px solid #f1f5f9" }}>
            <p className="text-[22px] font-black" style={{ color: s.color }}>{counts[s.value] ?? 0}</p>
            <p className="text-[11px] font-bold text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* 검색 + 소스 필터 */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름, 학교, 연락처 검색..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-indigo-400" />
        </div>
        <div className="flex gap-1.5">
          {([["all","전체"], ["inquiry","문의"], ["trial","체험신청"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilterSource(v)}
              className="h-10 px-3 rounded-xl text-[11px] font-black transition-all"
              style={{ background: filterSource === v ? "#1e293b" : "#f1f5f9", color: filterSource === v ? "#fff" : "#64748b" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 상태 필터 칩 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: "all", label: `전체 (${items.length})` }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: `${s.label} (${counts[s.value] ?? 0})` }))].map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className="px-3 py-1.5 rounded-full text-[11px] font-black transition-all"
            style={{ background: filterStatus === f.value ? "#1e293b" : "#f1f5f9", color: filterStatus === f.value ? "#fff" : "#64748b" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center"><p className="text-slate-400 font-bold">신청 내역이 없습니다.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const st = getStatus(item.status);
            const isExpanded = expandedId === item.id;
            const meta = item.source === "inquiry"
              ? (TYPE_LABELS[item.inquiry_type ?? ""] ?? { label: item.inquiry_type, color: "#64748b", bg: "#f8fafc", icon: "📋" })
              : TYPE_LABELS["trial_app"];
            const isNew = newFlash === item.id;
            return (
              <div key={item.id}
                className="bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-500"
                style={{
                  borderColor: isNew ? "#10b981" : "#f1f5f9",
                  boxShadow: isNew ? "0 0 0 2px rgba(16,185,129,0.2), 0 0 20px 4px rgba(16,185,129,0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
                }}>
                {/* 요약 행 */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: meta.bg }}>
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[14px] font-black text-slate-800">{item.name}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      {item.source === "trial" && item.wants_consultation && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#10b981" }}>+상담</span>
                      )}
                      {item.source === "trial" && item.wants_audit_class && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#8b5cf6" }}>+청강</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                      {item.school && <span>{item.school} {item.grade}</span>}
                      <span className="flex items-center gap-0.5"><Phone size={9} /> {item.phone}</span>
                      <span className="flex items-center gap-0.5"><Clock size={9} /> {formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <select value={item.status} onChange={e => updateStatus(item.id, e.target.value, item.source)}
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer outline-none"
                      style={{ borderColor: st.color, background: st.bg, color: st.color }}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown size={10} className="pointer-events-none -ml-6" style={{ color: st.color }} />
                  </div>
                  <ChevronDown size={14} className="text-slate-300 shrink-0" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </div>

                {/* 펼침 상세 */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-50 space-y-3">
                    {/* 리포트 코멘트 메타 (report_comment 타입) */}
                    {item.source === "inquiry" && item.inquiry_type === "report_comment" && item.audit_class_preference && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">📋 대상 정보</p>
                        <p className="text-[13px] font-bold text-slate-700">{item.audit_class_preference}</p>
                      </div>
                    )}
                    {/* 문의 내용 (inquiry) */}
                    {item.source === "inquiry" && item.detail_message && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc" }}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상담 내용</p>
                        <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap">{item.detail_message}</p>
                      </div>
                    )}
                    {item.source === "inquiry" && item.audit_class_preference && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">청강 희망 반</p>
                        <p className="text-[13px] font-bold text-slate-700">{item.audit_class_preference}</p>
                      </div>
                    )}
                    {/* 체험신청 상세 (trial) */}
                    {item.source === "trial" && item.current_textbook && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc" }}>
                        <div className="flex items-center gap-1.5 mb-1"><GraduationCap size={11} className="text-indigo-400" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">현재 교재</span></div>
                        <p className="text-[13px] font-bold text-slate-700">{item.current_textbook}</p>
                      </div>
                    )}
                    {item.source === "trial" && (item.wants_consultation || item.wants_audit_class || item.wants_trial_class) && (
                      <div className="flex gap-2 flex-wrap">
                        {item.wants_trial_class && <div className="rounded-xl px-3 py-2" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}><span className="text-[11px] font-black text-indigo-700">📱 앱 체험</span></div>}
                        {item.wants_consultation && <div className="rounded-xl px-3 py-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}><span className="text-[11px] font-black text-emerald-700">💬 수업 상담</span></div>}
                        {item.wants_audit_class && <div className="rounded-xl px-3 py-2" style={{ background: "rgba(131,58,180,0.06)", border: "1px solid rgba(131,58,180,0.2)" }}><span className="text-[11px] font-black text-purple-700">🏫 청강{item.trial_class_preference ? ` · ${item.trial_class_preference}` : ""}</span></div>}
                      </div>
                    )}
                    {item.source === "trial" && item.vocab_difficulties && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">단어 어려운 점</p>
                        <p className="text-[12px] text-slate-700">{item.vocab_difficulties}</p>
                      </div>
                    )}

                    {/* 메모 */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">관리 메모</label>
                      <div className="flex gap-2">
                        <textarea value={editNote[item.id] ?? ""} onChange={e => setEditNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="처리 내용, 연락 결과 등 메모..." rows={2}
                          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-indigo-400 resize-none" style={{ color: "#334155" }} />
                        <button onClick={() => saveNote(item.id, item.source)} disabled={savingId === item.id}
                          className="px-4 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-50 flex items-center gap-1"
                          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                          {savingId === item.id ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><CheckCircle size={11} /> 저장</>}
                        </button>
                      </div>
                    </div>

                    {/* 삭제 */}
                    <div className="pt-1 border-t border-slate-50">
                      {confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <p className="flex-1 text-[11px] font-black text-red-500">정말 삭제할까요?</p>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-200 text-slate-500 hover:bg-slate-50">취소</button>
                          <button onClick={() => deleteItem(item)} className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white" style={{ background: "#ef4444" }}>삭제 확인</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(item.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} /> 신청 삭제
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
