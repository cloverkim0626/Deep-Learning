"use client";
import { useState } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { onClose: () => void; onTrialRequest: () => void; }

const GRADES = ["1학년","2학년","3학년","N수생"];
const CLASSES = [
  { name:"아라고1", schedule:"월 8~10시 · 수 5~7시" },
  { name:"아라고2", schedule:"월 6~8시 · 수 7~9시" },
  { name:"고3반",   schedule:"금 8:30~10:30" },
];
const C = "#405DE6";

export default function ContactModal({ onClose, onTrialRequest }: Props) {
  const [view, setView] = useState<"menu"|"enroll"|"premium"|"done">("menu");
  // step for enrollment form
  const [step, setStep] = useState(1);
  // basic info
  const [aType, setAType] = useState<"학생"|"학부모"|"">("");
  const [school, setSchool] = useState(""); const [grade, setGrade] = useState("");
  const [name, setName] = useState(""); const [gender, setGender] = useState<"남"|"여"|"">("");
  const [phone, setPhone] = useState("");
  // step2
  const [wantsCons, setWantsCons] = useState(false);
  const [wantsAudit, setWantsAudit] = useState(false);
  const [auditClass, setAuditClass] = useState("");
  const [wantsSample, setWantsSample] = useState(false);
  const [loading, setLoading] = useState(false); const [err, setErr] = useState("");

  const can1 = aType && school && grade && name && gender && phone.length >= 10;

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.from("contact_inquiries").insert([{
        name, school, grade, phone,
        inquiry_type: "enrollment_audit",
        detail_message: [
          wantsCons ? "상담 신청" : "",
          wantsAudit ? `청강 신청: ${auditClass}` : "",
          wantsSample ? "교재 샘플 신청" : "",
          `신청자: ${aType} / 성별: ${gender}`,
        ].filter(Boolean).join(" | "),
        audit_class_preference: wantsAudit ? auditClass : null,
        status:"pending", admin_note:"",
      }]);
      if (error) throw error;
      setView("done");
    } catch { setErr("오류가 발생했습니다. 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const reset = () => { setStep(1);setAType("");setSchool("");setGrade("");setName("");setGender("");setPhone("");setWantsCons(false);setWantsAudit(false);setAuditClass("");setWantsSample(false);setErr(""); };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[340px] max-h-[82vh] rounded-[1.8rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-300" style={{background:"#fff"}}>

        {/* ── MENU ── */}
        {view === "menu" && (
          <>
            {/* IG 헤더 */}
            <div className="shrink-0 relative" style={{background:"linear-gradient(135deg,#405DE6,#833AB4,#E1306C,#F77737)", minHeight:120}}>
              <div className="px-5 pt-4 pb-6 pr-[115px]">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white/60 text-[9px] font-black tracking-[3px] uppercase">Contact</span>
                  <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><X size={13} className="text-white"/></button>
                </div>
                <p className="text-white text-[19px] font-black leading-snug">무엇을<br/>도와드릴까요?</p>
                <p className="text-white/65 text-[10px] mt-1.5">모든 상담은 무료로 진행됩니다.</p>
              </div>
              {/* 선생님 사진 - 헤더 오른쪽, 아래로 body까지 겹침 */}
              <img src="/teacher-nobg.png" alt="김효진T"
                style={{position:"absolute", right:8, bottom:-66, height:209, width:"auto", objectFit:"contain", objectPosition:"bottom", filter:"drop-shadow(-4px 0 12px rgba(0,0,0,0.18))", zIndex:10}}
              />
              <div style={{height:16,background:"#fff",borderRadius:"50% 50% 0 0 / 100% 100% 0 0",marginTop:"-1px", position:"relative", zIndex:0}}/>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-2" style={{position:"relative", zIndex:0}}>
              {/* SNS 로고 - 왼쪽 */}
              <div className="flex items-center gap-5 px-1 pb-1 pt-11">
                {[
                  { label:"Instagram", color:"#E1306C", svg:<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                  { label:"KakaoTalk", color:"#3A1D1D", svg:
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="11" rx="10" ry="8.5" fill="#FEE500"/>
                      <path d="M8 10.5c0-.83.9-1.5 2-1.5s2 .67 2 1.5-.9 1.5-2 1.5S8 11.33 8 10.5z" fill="#3A1D1D"/>
                      <path d="M12 10.5c0-.83.9-1.5 2-1.5s2 .67 2 1.5-.9 1.5-2 1.5-2-.67-2-1.5z" fill="#3A1D1D"/>
                      <path d="M7.5 15.5l1-3h7l1 3-4.5 1.5z" fill="#FEE500"/>
                    </svg>
                  },
                  { label:"Blog", color:"#03c75a", svg:<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h18v2H3v-2z"/></svg> },
                ].map(s=>(
                  <button key={s.label} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform" style={{color:s.color}}>
                    {s.svg}
                    <span className="text-[8px] font-black text-slate-400">{s.label}</span>
                  </button>
                ))}
              </div>
              <div style={{height:1,background:"#f1f5f9"}}/>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-1">문의 · 신청</p>
              {[
                { id:"trial", icon:"✨", label:"앱 체험 신청", desc:"3일 체험 계정 무료 발급", color:"#6366f1", bg:"#eef2ff", action:()=>{onClose();onTrialRequest();} },
                { id:"enroll", icon:"🏫", label:"등록 · 청강 문의", desc:"수업 상담, 청강 신청, 교재 샘플", color:"#8b5cf6", bg:"#f5f3ff", action:()=>setView("enroll") },
                { id:"premium", icon:"💳", label:"계정 유료 이용 문의", desc:"추후 오픈 예정", color:"#94a3b8", bg:"#f8fafc", action:()=>setView("premium") },
              ].map(t => (
                <button key={t.id} onClick={t.action}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all hover:scale-[1.01] group"
                  style={{background:"#fafafa",border:"1.5px solid #f1f5f9"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=t.color;(e.currentTarget as HTMLElement).style.background=t.bg;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#f1f5f9";(e.currentTarget as HTMLElement).style.background="#fafafa";}}>
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px]" style={{background:t.bg}}>{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-slate-800">{t.label}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{t.desc}</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors"/>
                </button>
              ))}
            </div>
            <div className="shrink-0 px-5 py-3 text-center" style={{borderTop:"1px solid #f1f5f9"}}>
              <p className="text-[9px] text-slate-300 font-medium">검단 우독학원 · Team Parallax</p>
            </div>
          </>
        )}

        {/* ── 계정 유료 ── */}
        {view === "premium" && (
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center gap-4">
            <span className="text-[44px]">🔒</span>
            <p className="text-[16px] font-black text-slate-800">추후 오픈 예정입니다.</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">계정 유료 이용 서비스는 준비 중입니다.<br/>오픈 시 안내해 드릴게요!</p>
            <button onClick={()=>setView("menu")} className="mt-2 px-6 py-2.5 rounded-xl text-[12px] font-black" style={{background:"#f1f5f9",color:"#64748b"}}>돌아가기</button>
          </div>
        )}

        {/* ── 등록·청강 폼 ── */}
        {view === "enroll" && (
          <>
            {/* 폼 헤더 */}
            <div className="shrink-0 px-5 pt-4 pb-3" style={{borderBottom:"1px solid #f1f5f9"}}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={()=>{reset();setView("menu");}} className="flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft size={13}/> 뒤로</button>
                <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"><X size={12} className="text-slate-400"/></button>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px]" style={{background:"#f5f3ff"}}>🏫</span>
                <div>
                  <p className="text-[14px] font-black text-slate-900">등록 · 청강 문의</p>
                  <p className="text-[9px] font-medium" style={{color:"#8b5cf6"}}>수업 상담 · 청강 · 교재 샘플</p>
                </div>
              </div>
              {/* step bar 2단계 */}
              <div className="flex gap-1 mt-3">
                {[1,2].map(s=><div key={s} className="h-1 flex-1 rounded-full transition-all" style={{background:s<=step?"#8b5cf6":"#f1f5f9"}}/>)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {step === 1 && (
                <>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">신청자 구분</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["학생","학부모"] as const).map(t=>(
                        <button key={t} onClick={()=>setAType(t)} className="h-10 rounded-xl text-[12px] font-black transition-all border-2" style={{borderColor:aType===t?"#8b5cf6":"#e2e8f0",background:aType===t?"rgba(139,92,246,0.06)":"#fff",color:aType===t?"#8b5cf6":"#64748b"}}>
                          {t==="학생"?"👨‍🎓 학생":"👪 학부모"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">학교</label>
                    <input value={school} onChange={e=>setSchool(e.target.value)} placeholder="OO고등학교" className="w-full h-10 px-3 rounded-xl border-2 text-[13px] font-bold outline-none" style={{borderColor:school?"#8b5cf6":"#e2e8f0",color:"#1e293b"}}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">학년</label>
                    <div className="grid grid-cols-4 gap-1">
                      {GRADES.map(g=><button key={g} onClick={()=>setGrade(g)} className="h-9 rounded-xl text-[10px] font-black border-2 transition-all" style={{borderColor:grade===g?"#E1306C":"#e2e8f0",background:grade===g?"rgba(225,48,108,0.06)":"#fff",color:grade===g?"#E1306C":"#64748b"}}>{g}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">이름</label>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="홍길동" className="w-full h-10 px-3 rounded-xl border-2 text-[13px] font-bold outline-none" style={{borderColor:name?"#8b5cf6":"#e2e8f0",color:"#1e293b"}}/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">성별</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["남","여"] as const).map(g=><button key={g} onClick={()=>setGender(g)} className="h-9 rounded-xl text-[12px] font-black border-2 transition-all" style={{borderColor:gender===g?"#405DE6":"#e2e8f0",background:gender===g?"rgba(64,93,230,0.06)":"#fff",color:gender===g?"#405DE6":"#64748b"}}>{g==="남"?"♂ 남":"♀ 여"}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">핸드폰 번호</label>
                    <input value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,""))} placeholder="01012345678" type="tel" maxLength={11} className="w-full h-10 px-3 rounded-xl border-2 text-[13px] font-bold outline-none" style={{borderColor:phone.length>=10?"#8b5cf6":"#e2e8f0",color:"#1e293b"}}/>
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">원하시는 항목을 선택해 주세요</p>
                  {[
                    {val:wantsCons, set:setWantsCons, title:"💬 수업 상담 신청", sub:"강사와 1:1 상담"},
                    {val:wantsAudit, set:setWantsAudit, title:"🏫 청강 신청", sub:"실제 수업 직접 체험"},
                    {val:wantsSample, set:setWantsSample, title:"📄 교재 샘플 신청", sub:"수업 교재 샘플 무료 제공"},
                  ].map((item,i)=>(
                    <button key={i} onClick={()=>item.set(v=>!v)} className="w-full px-4 py-3 rounded-2xl border-2 flex items-center gap-3 text-left transition-all" style={{borderColor:item.val?"#8b5cf6":"#e2e8f0",background:item.val?"rgba(139,92,246,0.05)":"#fff"}}>
                      <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0" style={{borderColor:item.val?"#8b5cf6":"#cbd5e1",background:item.val?"#8b5cf6":"transparent"}}>
                        {item.val&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div>
                        <p className="text-[12px] font-black" style={{color:item.val?"#8b5cf6":"#1e293b"}}>{item.title}</p>
                        <p className="text-[9px] text-slate-400">{item.sub}</p>
                      </div>
                    </button>
                  ))}
                  {wantsAudit && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black text-slate-400 block px-1">청강 희망 반 (검단 우독학원)</label>
                      {CLASSES.map(cls=>(
                        <button key={cls.name} onClick={()=>setAuditClass(cls.name)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all" style={{borderColor:auditClass===cls.name?"#8b5cf6":"#e2e8f0",background:auditClass===cls.name?"rgba(139,92,246,0.06)":"#fff"}}>
                          <div>
                            <p className="text-[12px] font-black" style={{color:auditClass===cls.name?"#8b5cf6":"#1e293b"}}>{cls.name}</p>
                            <p className="text-[9px] text-slate-400">{cls.schedule}</p>
                          </div>
                          {auditClass===cls.name&&<CheckCircle size={13} className="text-purple-500"/>}
                        </button>
                      ))}
                    </div>
                  )}
                  {err && <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",color:"#ef4444"}}><AlertCircle size={11}/>{err}</div>}
                </div>
              )}
            </div>

            <div className="shrink-0 px-5 pb-4 pt-2.5 flex gap-2" style={{borderTop:"1px solid #f1f5f9"}}>
              {step>1&&<button onClick={()=>setStep(s=>s-1)} className="h-11 px-4 rounded-xl border-2 text-[12px] font-black" style={{borderColor:"#e2e8f0",color:"#64748b"}}><ArrowLeft size={13}/></button>}
              {step<2
                ?<button onClick={()=>setStep(s=>s+1)} disabled={step===1?!can1:false} className="flex-1 h-11 rounded-xl text-[12px] font-black text-white flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none" style={{background:"linear-gradient(90deg,#8b5cf6,#6366f1)"}}>다음 <ArrowRight size={13}/></button>
                :<button onClick={submit} disabled={loading} className="flex-1 h-11 rounded-xl text-[12px] font-black text-white flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-50" style={{background:"linear-gradient(90deg,#8b5cf6,#6366f1)"}}>
                  {loading?<span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"/>:<>신청 완료 🎉</>}
                </button>}
            </div>
          </>
        )}

        {/* ── 완료 ── */}
        {view === "done" && (
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center gap-4">
            <span className="text-[44px]">🎉</span>
            <div>
              <p className="text-[17px] font-black text-slate-800">신청 완료!</p>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed"><strong className="text-slate-700">{name}</strong>님 신청 감사해요!<br/><strong className="text-slate-700">{phone}</strong>으로 곧 연락드릴게요.</p>
            </div>
            <button onClick={onClose} className="w-full h-11 rounded-2xl text-[12px] font-black text-white transition-all hover:-translate-y-0.5" style={{background:"#1e293b"}}>닫기</button>
          </div>
        )}
      </div>
    </div>
  );
}
