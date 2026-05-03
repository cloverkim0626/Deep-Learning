"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronDown, GraduationCap, Clock, Phone, CheckCircle, Trash2, MessageCircle, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Application = {
  id: string; created_at: string; applicant_type: string; school: string; grade: string;
  name: string; gender: string; phone: string; current_textbook: string;
  vocab_difficulties: string; desired_features: string;
  wants_consultation: boolean; wants_audit_class: boolean;
  trial_class_preference: string | null; wants_trial_class: boolean;
  status: string; admin_note: string;
};

type Inquiry = {
  id: string; created_at: string; name: string; school: string; grade: string;
  phone: string; inquiry_type: string; detail_message: string;
  audit_class_preference: string | null; status: string; admin_note: string;
};

const INQUIRY_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  trial:      { label: "앱 체험 문의",        color: "#6366f1", bg: "#eef2ff",  icon: "✨" },
  study:      { label: "공부법 상담",          color: "#0ea5e9", bg: "#f0f9ff",  icon: "📖" },
  audit:      { label: "청강 신청",            color: "#8b5cf6", bg: "#f5f3ff",  icon: "🏫" },
  material:   { label: "교재 샘플 신청",       color: "#10b981", bg: "#ecfdf5",  icon: "📄" },
  enrollment: { label: "등록 상담",            color: "#f59e0b", bg: "#fffbeb",  icon: "🎓" },
  career:     { label: "진로 상담",            color: "#ef4444", bg: "#fef2f2",  icon: "🗺️" },
  premium:    { label: "계정 유료 이용 문의",  color: "#64748b", bg: "#f8fafc",  icon: "💳" },
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
  const [tab, setTab] = useState<"inquiries" | "trials">("inquiries");
  const [apps, setApps] = useState<Application[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: aData }, { data: iData }] = await Promise.all([
      supabase.from("trial_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }),
    ]);
    const appRows = (aData ?? []) as Application[];
    const inqRows = (iData ?? []) as Inquiry[];
    setApps(appRows);
    setInquiries(inqRows);
    const notes: Record<string, string> = {};
    [...appRows, ...inqRows].forEach(r => { notes[r.id] = r.admin_note ?? ""; });
    setEditNote(notes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string, isInquiry = false) => {
    const table = isInquiry ? "contact_inquiries" : "trial_applications";
    if (isInquiry) setInquiries(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    else setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await supabase.from(table).update({ status }).eq("id", id);
  };

  const saveNote = async (id: string, isInquiry = false) => {
    setSavingId(id);
    const table = isInquiry ? "contact_inquiries" : "trial_applications";
    await supabase.from(table).update({ admin_note: editNote[id] ?? "" }).eq("id", id);
    if (isInquiry) setInquiries(prev => prev.map(a => a.id === id ? { ...a, admin_note: editNote[id] ?? "" } : a));
    else setApps(prev => prev.map(a => a.id === id ? { ...a, admin_note: editNote[id] ?? "" } : a));
    setSavingId(null);
  };

  const deleteItem = async (id: string, isInquiry = false) => {
    const table = isInquiry ? "contact_inquiries" : "trial_applications";
    await supabase.from(table).delete().eq("id", id);
    if (isInquiry) setInquiries(prev => prev.filter(a => a.id !== id));
    else setApps(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
    if (expandedId === id) setExpandedId(null);
  };

  const isInquiryTab = tab === "inquiries";
  const activeList = isInquiryTab ? inquiries : apps;
  const filtered = activeList.filter(a => {
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.includes(q) || a.school.includes(q) || a.phone.includes(q);
    return matchStatus && matchSearch;
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = activeList.filter(a => a.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-[22px] font-black text-slate-800">상담 신청 내역</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">접수된 신청서 통합 관리</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => { setTab("inquiries"); setFilterStatus("all"); setExpandedId(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black transition-all"
          style={{ background: tab === "inquiries" ? "#1e293b" : "#f1f5f9", color: tab === "inquiries" ? "#fff" : "#64748b" }}>
          <MessageCircle size={13} /> 문의 상담 ({inquiries.length})
        </button>
        <button onClick={() => { setTab("trials"); setFilterStatus("all"); setExpandedId(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black transition-all"
          style={{ background: tab === "trials" ? "#1e293b" : "#f1f5f9", color: tab === "trials" ? "#fff" : "#64748b" }}>
          <ClipboardList size={13} /> 체험 신청 ({apps.length})
        </button>
      </div>
      {/* 상태별 카운트 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value === filterStatus ? "all" : s.value)}
            className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
            style={{
              background: filterStatus === s.value ? s.bg : "#fff",
              border: filterStatus === s.value ? `2px solid ${s.color}` : "2px solid #f1f5f9",
              boxShadow: filterStatus === s.value ? `0 4px 12px ${s.color}20` : "none",
            }}>
            <p className="text-[22px] font-black" style={{ color: s.color }}>{counts[s.value] ?? 0}</p>
            <p className="text-[11px] font-bold text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* 검색 & 필터 바 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름, 학교, 연락처 검색..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-indigo-400" />
        </div>
        <button onClick={load} disabled={loading}
          className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2 text-[12px] font-bold">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: "all", label: `전체 (${activeList.length})` }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: `${s.label} (${counts[s.value] ?? 0})` }))].map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className="px-3 py-1.5 rounded-full text-[11px] font-black transition-all"
            style={{ background: filterStatus === f.value ? "#1e293b" : "#f1f5f9", color: filterStatus === f.value ? "#fff" : "#64748b" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-slate-400 font-bold">신청 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const st = getStatus(item.status);
            const isExpanded = expandedId === item.id;
            // 문의 탭
            if (isInquiryTab) {
              const inq = item as Inquiry;
              const meta = INQUIRY_LABELS[inq.inquiry_type] ?? { label: inq.inquiry_type, color: "#64748b", bg: "#f8fafc", icon: "📋" };
              return (
                <div key={inq.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : inq.id)}>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: meta.bg }}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-black text-slate-800">{inq.name}</span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        {inq.school && <span>{inq.school} {inq.grade}</span>}
                        <span className="flex items-center gap-0.5"><Phone size={9} /> {inq.phone}</span>
                        <span className="flex items-center gap-0.5"><Clock size={9} /> {formatDate(inq.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <select value={inq.status} onChange={e => updateStatus(inq.id, e.target.value, true)}
                          className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer outline-none transition-all"
                          style={{ borderColor: st.color, background: st.bg, color: st.color }}>
                          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: st.color }} />
                      </div>
                      <ChevronDown size={14} className="text-slate-300 transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-50 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {inq.audit_class_preference && (
                        <div className="rounded-xl px-4 py-3" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">청강 희망 반</p>
                          <p className="text-[13px] font-bold text-slate-700">{inq.audit_class_preference}</p>
                        </div>
                      )}
                      {inq.detail_message && (
                        <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc" }}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상담 내용</p>
                          <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap">{inq.detail_message}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">관리 메모</label>
                        <div className="flex gap-2">
                          <textarea value={editNote[inq.id] ?? ""} onChange={e => setEditNote(prev => ({ ...prev, [inq.id]: e.target.value }))}
                            placeholder="처리 내용 메모..." rows={2}
                            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-indigo-400 resize-none" style={{ color: "#334155" }} />
                          <button onClick={() => saveNote(inq.id, true)} disabled={savingId === inq.id}
                            className="px-4 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-50 flex items-center gap-1"
                            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                            {savingId === inq.id ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><CheckCircle size={11} /> 저장</>}
                          </button>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-50">
                        {confirmDeleteId === inq.id ? (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <p className="flex-1 text-[11px] font-black text-red-500">정말 삭제할까요?</p>
                            <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">취소</button>
                            <button onClick={() => deleteItem(inq.id, true)} className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white transition-all" style={{ background: "#ef4444" }}>삭제 확인</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(inq.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-red-400 transition-colors">
                            <Trash2 size={12} /> 신청 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            // 체험신청 탭
            const app = item as Application;
            const isExpanded2 = expandedId === app.id;
            return (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all">
                {/* 요약 행 */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                  {/* 신청자 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-black text-slate-800">{app.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#f1f5f9", color: "#64748b" }}>
                        {app.applicant_type} · {app.gender}
                      </span>
                      {app.wants_consultation && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: "#10b981" }}>상담</span>
                      )}
                      {app.wants_trial_class && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: "#6366f1" }}>체험{app.trial_class_preference ? ` · ${app.trial_class_preference}` : ""}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span>{app.school} {app.grade}</span>
                      <span className="flex items-center gap-0.5"><Phone size={9} /> {app.phone}</span>
                      <span className="flex items-center gap-0.5"><Clock size={9} /> {formatDate(app.created_at)}</span>
                    </div>
                  </div>

                  {/* 상태 드롭다운 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer outline-none transition-all"
                        style={{ borderColor: st.color, background: st.bg, color: st.color }}>
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: st.color }} />
                    </div>
                    <ChevronDown size={14} className="text-slate-300 transition-transform"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </div>
                </div>

                {/* 펼침 상세 */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* 교재 */}
                    <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap size={12} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">현재 교재</span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-700 leading-relaxed">{app.current_textbook}</p>
                    </div>

                    {/* 신청 내역 */}
                    {(app.wants_consultation || app.wants_audit_class || app.wants_trial_class) && (
                      <div className="flex gap-2 flex-wrap">
                        {app.wants_trial_class && (
                          <div className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-[100px]"
                            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <span className="text-[11px] font-black text-indigo-700">📱 앱 체험</span>
                          </div>
                        )}
                        {app.wants_consultation && (
                          <div className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-[100px]"
                            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <span className="text-[11px] font-black text-emerald-700">💬 수업 상담</span>
                          </div>
                        )}
                        {app.wants_audit_class && (
                          <div className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-[100px]"
                            style={{ background: "rgba(131,58,180,0.06)", border: "1px solid rgba(131,58,180,0.2)" }}>
                            <span className="text-[11px] font-black text-purple-700">🏫 청강{app.trial_class_preference ? ` · ${app.trial_class_preference}` : ""}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 설문 결과 */}
                    {app.vocab_difficulties && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">단어 외울 때 힘든 점</p>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{app.vocab_difficulties}</p>
                      </div>
                    )}
                    {app.desired_features && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">원하는 앱 기능</p>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{app.desired_features}</p>
                      </div>
                    )}

                    {/* 메모 */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                        관리 메모
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          value={editNote[app.id] ?? ""}
                          onChange={e => setEditNote(prev => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="처리 내용, 연락 결과 등 메모..."
                          rows={2}
                          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-indigo-400 resize-none"
                          style={{ color: "#334155" }}
                        />
                        <button onClick={() => saveNote(app.id)} disabled={savingId === app.id}
                          className="px-4 rounded-xl text-[11px] font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-1"
                          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                          {savingId === app.id
                            ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            : <><CheckCircle size={11} /> 저장</>
                          }
                        </button>
                      </div>
                    </div>

                    {/* 삭제 */}
                    <div className="pt-1 border-t border-slate-50">
                      {confirmDeleteId === app.id ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <p className="flex-1 text-[11px] font-black text-red-500">정말 삭제할까요?</p>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                            취소
                          </button>
                          <button onClick={() => deleteItem(app.id)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white transition-all"
                            style={{ background: "#ef4444" }}>
                            삭제 확인
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(app.id)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-red-400 transition-colors">
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
