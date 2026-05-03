"use client";
import { useState } from "react";
import { X, MessageCircle, BookOpen, ArrowRight, ArrowLeft, CheckCircle, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { onClose: () => void; }

const GRADES = ["1학년", "2학년", "3학년", "N수생", "기타"];
const CLASSES = [
  { name: "아라고1", schedule: "월 오후 8~10시 · 수 오후 5~7시" },
  { name: "아라고2", schedule: "월 오후 6~8시 · 수 오후 7~9시" },
  { name: "고3반",   schedule: "금 오후 8:30~10:30" },
];

const INQUIRY_TYPES = [
  {
    id: "trial",
    label: "앱 체험 문의",
    icon: "✨",
    desc: "3일 무료 체험 계정 신청",
    color: "#6366f1",
    bg: "#eef2ff",
    needsDetail: false,
    needsClass: false,
  },
  {
    id: "study",
    label: "공부법 상담",
    icon: "📖",
    desc: "영어 학습 전략 · 어휘 공략법 (무료)",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    needsDetail: true,
    detailPlaceholder: "어떤 부분이 가장 어려우신가요?\n예) 어휘가 외워지지 않아요 / 독해 시간이 부족해요",
    needsClass: false,
  },
  {
    id: "audit",
    label: "청강 신청",
    icon: "🏫",
    desc: "실제 수업 직접 체험 (무료)",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    needsDetail: false,
    needsClass: true,
  },
  {
    id: "material",
    label: "교재 샘플 신청",
    icon: "📄",
    desc: "수업 교재 샘플 무료 제공",
    color: "#10b981",
    bg: "#ecfdf5",
    needsDetail: false,
    needsClass: false,
  },
  {
    id: "enrollment",
    label: "등록 상담",
    icon: "🎓",
    desc: "수강료 · 커리큘럼 · 등록 절차 (무료)",
    color: "#f59e0b",
    bg: "#fffbeb",
    needsDetail: true,
    detailPlaceholder: "궁금하신 점을 미리 적어주세요.\n예) 수강료, 반 배정 기준, 수업 레벨 등",
    needsClass: false,
  },
  {
    id: "career",
    label: "진로 상담",
    icon: "🗺️",
    desc: "입시 전문가 상담 연결 (무료)",
    color: "#ef4444",
    bg: "#fef2f2",
    needsDetail: true,
    detailPlaceholder: "상담 받고 싶은 내용을 미리 적어주세요.\n예) 수시/정시 전략, 대학 선택, 학생부 관리",
    needsClass: false,
    notice: "* 검단 우독학원 강사가 아닌 입시 전문가를 연결해 드립니다.",
  },
  {
    id: "premium",
    label: "계정 유료 이용 문의",
    icon: "💳",
    desc: "앱 유료 플랜 안내",
    color: "#64748b",
    bg: "#f8fafc",
    needsDetail: false,
    needsClass: false,
  },
] as const;

type InquiryId = typeof INQUIRY_TYPES[number]["id"];

type Screen = "menu" | "form" | "done";

export default function ContactModal({ onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryId | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState("");
  const [auditClass, setAuditClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inquiryMeta = INQUIRY_TYPES.find(t => t.id === selectedInquiry);
  const canSubmit = name && phone.length >= 10 && (!inquiryMeta?.needsClass || auditClass);

  const handleSelectType = (id: InquiryId) => {
    setSelectedInquiry(id);
    setScreen("form");
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const { error: dbErr } = await supabase.from("contact_inquiries").insert([{
        name, school, grade, phone,
        inquiry_type: selectedInquiry,
        detail_message: detail,
        audit_class_preference: inquiryMeta?.needsClass ? auditClass : null,
        status: "pending", admin_note: "",
      }]);
      if (dbErr) throw dbErr;
      setScreen("done");
    } catch { setError("제출 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={screen !== "done" ? onClose : undefined} />

      <div className="relative w-full max-w-sm max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-400"
        style={{ background: "#fff" }}>

        {/* ── 메뉴 화면 ── */}
        {screen === "menu" && (
          <>
            {/* 헤더 */}
            <div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between"
              style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <p className="text-[11px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: "#94a3b8" }}>Contact</p>
                <h2 className="text-[20px] font-black text-slate-900 leading-tight">무엇을 도와드릴까요?</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">모든 상담은 무료예요 😊</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors mt-0.5">
                <X size={15} className="text-slate-400" />
              </button>
            </div>

            {/* 소셜 링크 */}
            <div className="shrink-0 px-6 py-3 flex gap-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>, label: "인스타그램", href: "https://instagram.com/woodok_english", color: "#E1306C" },
                { icon: <MessageCircle size={14} />, label: "카카오톡", href: "https://open.kakao.com/", color: "#f59e0b" },
                { icon: <BookOpen size={14} />, label: "블로그", href: "https://blog.naver.com/", color: "#03c75a" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all hover:scale-[1.03] hover:shadow-md"
                  style={{ background: "#f8fafc", border: "1.5px solid #f1f5f9" }}>
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span className="text-[9px] font-black text-slate-500 tracking-wide">{s.label}</span>
                </a>
              ))}
            </div>

            {/* 상담 유형 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">상담 신청</p>
              {INQUIRY_TYPES.map(t => (
                <button key={t.id} onClick={() => handleSelectType(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all hover:scale-[1.01] group"
                  style={{ background: "#fafafa", border: "1.5px solid #f1f5f9" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.color; (e.currentTarget as HTMLElement).style.background = t.bg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f1f5f9"; (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
                    style={{ background: t.bg }}>{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800 leading-tight">{t.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{t.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>

            <div className="shrink-0 px-6 py-4" style={{ borderTop: "1px solid #f1f5f9" }}>
              <p className="text-[10px] text-center text-slate-300 font-medium">검단 우독학원 · Team Parallax</p>
            </div>
          </>
        )}

        {/* ── 폼 화면 ── */}
        {screen === "form" && inquiryMeta && (
          <>
            <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { setScreen("menu"); setDetail(""); setAuditClass(""); setError(""); }}
                  className="flex items-center gap-1 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-colors">
                  <ArrowLeft size={14} /> 돌아가기
                </button>
                <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <X size={13} className="text-slate-400" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px] flex-shrink-0"
                  style={{ background: inquiryMeta.bg }}>{inquiryMeta.icon}</span>
                <div>
                  <p className="text-[16px] font-black text-slate-900">{inquiryMeta.label}</p>
                  <p className="text-[10px] font-medium" style={{ color: inquiryMeta.color }}>{inquiryMeta.desc}</p>
                </div>
              </div>
              {"notice" in inquiryMeta && (
                <div className="mt-3 px-3 py-2 rounded-xl text-[10px] font-bold"
                  style={{ background: "#fff7ed", color: "#b45309", border: "1px solid #fed7aa" }}>
                  {inquiryMeta.notice}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
              {/* 이름 */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">이름</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  className="w-full h-11 px-4 rounded-xl border text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: name ? inquiryMeta.color : "#e2e8f0", color: "#1e293b" }} />
              </div>
              {/* 학교 */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">학교 <span className="font-medium normal-case text-slate-300">(선택)</span></label>
                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="OO고등학교"
                  className="w-full h-11 px-4 rounded-xl border text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: school ? inquiryMeta.color : "#e2e8f0", color: "#1e293b" }} />
              </div>
              {/* 학년 */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">학년 <span className="font-medium normal-case text-slate-300">(선택)</span></label>
                <div className="grid grid-cols-5 gap-1.5">
                  {GRADES.map(g => (
                    <button key={g} onClick={() => setGrade(g === grade ? "" : g)}
                      className="h-9 rounded-xl text-[10px] font-black transition-all border"
                      style={{ borderColor: grade === g ? inquiryMeta.color : "#e2e8f0", background: grade === g ? inquiryMeta.bg : "#fff", color: grade === g ? inquiryMeta.color : "#94a3b8" }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              {/* 연락처 */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">연락처</label>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="01012345678" type="tel" maxLength={11}
                  className="w-full h-11 px-4 rounded-xl border text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: phone.length >= 10 ? inquiryMeta.color : "#e2e8f0", color: "#1e293b" }} />
              </div>

              {/* 청강 반 선택 */}
              {inquiryMeta.needsClass && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    청강 희망 반 <span className="font-medium normal-case text-slate-300">(검단 우독학원)</span>
                  </label>
                  <div className="space-y-1.5">
                    {CLASSES.map(cls => (
                      <button key={cls.name} onClick={() => setAuditClass(cls.name)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                        style={{ borderColor: auditClass === cls.name ? inquiryMeta.color : "#e2e8f0", background: auditClass === cls.name ? inquiryMeta.bg : "#fff" }}>
                        <div>
                          <p className="text-[13px] font-black" style={{ color: auditClass === cls.name ? inquiryMeta.color : "#1e293b" }}>{cls.name}</p>
                          <p className="text-[10px] text-slate-400">{cls.schedule}</p>
                        </div>
                        {auditClass === cls.name && <CheckCircle size={14} style={{ color: inquiryMeta.color }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 상세 내용 */}
              {"needsDetail" in inquiryMeta && inquiryMeta.needsDetail && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    궁금하신 점 <span className="font-medium normal-case text-slate-300">(선택)</span>
                  </label>
                  <textarea value={detail} onChange={e => setDetail(e.target.value)}
                    placeholder={"detailPlaceholder" in inquiryMeta ? inquiryMeta.detailPlaceholder : ""}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border text-[12px] outline-none resize-none transition-all"
                    style={{ borderColor: detail ? inquiryMeta.color : "#e2e8f0", color: "#334155", lineHeight: 1.7 }} />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  <AlertCircle size={12} />{error}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 pb-6 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
              <button onClick={handleSubmit} disabled={!canSubmit || loading}
                className="w-full h-12 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: canSubmit ? `linear-gradient(135deg, ${inquiryMeta.color}, ${inquiryMeta.color}cc)` : "#e2e8f0" }}>
                {loading
                  ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <>{inquiryMeta.icon} 신청 완료하기 <ArrowRight size={14} /></>
                }
              </button>
              <p className="text-center text-[10px] text-slate-300 font-medium mt-2">모든 상담은 무료입니다.</p>
            </div>
          </>
        )}

        {/* ── 완료 화면 ── */}
        {screen === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 gap-5">
            <div className="text-[52px]">{inquiryMeta?.icon ?? "✅"}</div>
            <div>
              <p className="text-[20px] font-black text-slate-900">신청 완료!</p>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                <strong className="text-slate-700">{name}</strong>님의 <strong className="text-slate-700">{inquiryMeta?.label}</strong>을<br />
                접수했습니다. <strong className="text-slate-700">{phone}</strong>으로 연락드릴게요.
              </p>
            </div>
            <div className="w-full rounded-2xl p-4 text-left" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle size={13} style={{ color: inquiryMeta?.color }} className="flex-shrink-0" />
                <span className="text-slate-600">{inquiryMeta?.desc}</span>
              </div>
              {auditClass && (
                <div className="flex items-center gap-2 text-[11px] mt-1.5">
                  <CheckCircle size={13} className="text-purple-400 flex-shrink-0" />
                  <span className="text-slate-600">청강 희망 반: {auditClass}</span>
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="w-full h-12 rounded-2xl text-[13px] font-black text-white transition-all hover:-translate-y-0.5"
              style={{ background: "#1e293b" }}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
