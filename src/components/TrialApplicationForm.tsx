"use client";
import { useState } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

const GRADES = ["1학년", "2학년", "3학년", "N수생"];
const CLASSES = [
  { name: "아라고1", schedule: "월 오후 8~10시 / 수 오후 5~7시" },
  { name: "아라고2", schedule: "월 오후 6~8시 / 수 오후 7~9시" },
  { name: "고3반",   schedule: "금 오후 8:30~10:30" },
];

export default function TrialApplicationForm({ onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 폼 데이터
  const [applicantType, setApplicantType] = useState<"학생" | "학부모" | "">("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"남" | "여" | "">("");
  const [phone, setPhone] = useState("");
  const [currentTextbook, setCurrentTextbook] = useState("");
  const [wantsConsultation, setWantsConsultation] = useState(false);
  const [wantsTrialClass, setWantsTrialClass] = useState(false);
  const [trialClassPref, setTrialClassPref] = useState("");

  const canStep1 = applicantType && school && grade && name && gender && phone.length >= 10;
  const canStep2 = currentTextbook.trim().length > 0;
  const canStep3 = true; // 체험수업은 선택

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: dbErr } = await supabase.from("trial_applications").insert([{
        applicant_type: applicantType,
        school,
        grade,
        name,
        gender,
        phone,
        current_textbook: currentTextbook,
        wants_consultation: wantsConsultation,
        wants_trial_class: wantsTrialClass,
        trial_class_preference: wantsTrialClass ? trialClassPref : null,
        status: "pending",
        admin_note: "",
      }]);
      if (dbErr) throw dbErr;
      setStep(4);
    } catch {
      setError("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 4 ? onClose : undefined} />
      <div className="relative w-full max-w-sm max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-400"
        style={{ background: "#fafafa" }}>

        {/* IG 그라디언트 헤더 */}
        <div className="shrink-0 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#405DE6 0%,#833AB4 38%,#E1306C 78%,#F77737 100%)" }}>
          <div className="px-5 pt-5 pb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-[15px]">✏️</div>
                <span className="text-white text-[13px] font-black">체험 신청</span>
              </div>
              {step !== 4 && (
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors">
                  <X size={14} className="text-white" />
                </button>
              )}
            </div>
            <p className="text-white text-[18px] font-black leading-tight">
              {step === 1 && "기본 정보 입력"}
              {step === 2 && "학습 정보"}
              {step === 3 && "체험수업 신청"}
              {step === 4 && "신청 완료! 🎉"}
            </p>
            <p className="text-white/65 text-[10px] mt-1 font-medium">
              {step === 1 && "신청자 정보를 입력해 주세요"}
              {step === 2 && "현재 공부하는 교재를 알려주세요"}
              {step === 3 && "수업 체험은 선택 사항이에요"}
              {step === 4 && "문자로 계정 정보를 발송해 드려요"}
            </p>
          </div>
          {/* Step indicator */}
          {step !== 4 && (
            <div className="flex gap-1 px-5 pb-4">
              {[1, 2, 3].map(s => (
                <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: s <= step ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }} />
              ))}
            </div>
          )}
          <div style={{ height: "16px", background: "#fafafa", borderRadius: "50% 50% 0 0 / 100% 100% 0 0", marginTop: "-2px" }} />
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* ── Step 1: 기본정보 ── */}
          {step === 1 && (
            <>
              {/* 신청자 유형 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">신청자 구분</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["학생", "학부모"] as const).map(t => (
                    <button key={t} onClick={() => setApplicantType(t)}
                      className="h-12 rounded-2xl text-[13px] font-black transition-all border-2"
                      style={{
                        borderColor: applicantType === t ? "#833AB4" : "#e2e8f0",
                        background: applicantType === t ? "linear-gradient(135deg,rgba(64,93,230,0.08),rgba(131,58,180,0.08))" : "#fff",
                        color: applicantType === t ? "#833AB4" : "#64748b",
                      }}>
                      {t === "학생" ? "👨‍🎓 학생" : "👪 학부모"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 학교 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">학교명</label>
                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="OO고등학교"
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: school ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>

              {/* 학년 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">학년</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADES.map(g => (
                    <button key={g} onClick={() => setGrade(g)}
                      className="h-11 rounded-xl text-[11px] font-black transition-all border-2"
                      style={{
                        borderColor: grade === g ? "#E1306C" : "#e2e8f0",
                        background: grade === g ? "linear-gradient(135deg,rgba(225,48,108,0.08),rgba(247,119,55,0.08))" : "#fff",
                        color: grade === g ? "#E1306C" : "#64748b",
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">이름</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: name ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>

              {/* 성별 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">성별</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["남", "여"] as const).map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className="h-11 rounded-2xl text-[13px] font-black transition-all border-2"
                      style={{
                        borderColor: gender === g ? "#405DE6" : "#e2e8f0",
                        background: gender === g ? "rgba(64,93,230,0.08)" : "#fff",
                        color: gender === g ? "#405DE6" : "#64748b",
                      }}>
                      {g === "남" ? "♂ 남" : "♀ 여"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  핸드폰 번호 <span className="text-[9px] text-slate-400 normal-case font-medium">(체험계정 발급에 사용)</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="01012345678" type="tel" maxLength={11}
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none transition-all"
                  style={{ borderColor: phone.length >= 10 ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>
            </>
          )}

          {/* ── Step 2: 학습정보 ── */}
          {step === 2 && (
            <>
              <div className="rounded-2xl p-4 text-[11px] leading-relaxed"
                style={{ background: "linear-gradient(135deg,rgba(64,93,230,0.06),rgba(131,58,180,0.06))", border: "1px solid rgba(131,58,180,0.15)" }}>
                <p className="font-black text-slate-700 mb-1">📚 교재 정보가 중요해요!</p>
                <p className="text-slate-500">체험 시 <strong className="text-slate-700">해당 교재의 지문</strong>을 우선 배당해 드려요. 수능특강, 자이스토리, 마더텅 등 <strong className="text-slate-700">구체적으로</strong> 적어주세요.</p>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  현재 공부하는 교재 <span className="text-rose-500">*</span>
                </label>
                <textarea value={currentTextbook} onChange={e => setCurrentTextbook(e.target.value)}
                  placeholder="예: 수능특강 영어, EBS 수능완성, 마더텅 영어독해&#10;(여러 교재는 쉼표로 구분)"
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border-2 text-[13px] font-bold outline-none transition-all resize-none"
                  style={{ borderColor: currentTextbook ? "#833AB4" : "#e2e8f0", color: "#1e293b", lineHeight: 1.6 }} />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">상담 신청</label>
                <button onClick={() => setWantsConsultation(v => !v)}
                  className="w-full h-14 px-5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left"
                  style={{
                    borderColor: wantsConsultation ? "#20C997" : "#e2e8f0",
                    background: wantsConsultation ? "rgba(32,201,151,0.06)" : "#fff",
                  }}>
                  <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: wantsConsultation ? "#20C997" : "#cbd5e1", background: wantsConsultation ? "#20C997" : "transparent" }}>
                    {wantsConsultation && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <p className="text-[13px] font-black" style={{ color: wantsConsultation ? "#20C997" : "#1e293b" }}>💬 수업 상담 신청할게요</p>
                    <p className="text-[10px] text-slate-400">선생님이 직접 연락드려요</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: 체험수업 ── */}
          {step === 3 && (
            <>
              <div className="rounded-2xl p-4 text-[11px] leading-relaxed"
                style={{ background: "rgba(247,119,55,0.06)", border: "1px solid rgba(247,119,55,0.2)" }}>
                <p className="font-black text-slate-700 mb-1">⚠️ 꼭 읽어주세요</p>
                <p className="text-slate-500">
                  체험수업 신청 시 <strong className="text-slate-700">앱 체험만 가능</strong>합니다. (직접 수업 청강 불가)<br />
                  신청 후 문자로 <strong className="text-slate-700">계정·비밀번호</strong>를 발급해 드리며,<br />
                  <strong className="text-slate-700">체험 기간은 3일</strong>입니다.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">앱 체험 신청 (선택)</label>
                <button onClick={() => setWantsTrialClass(v => !v)}
                  className="w-full h-14 px-5 rounded-2xl border-2 flex items-center gap-3 transition-all text-left mb-3"
                  style={{
                    borderColor: wantsTrialClass ? "#405DE6" : "#e2e8f0",
                    background: wantsTrialClass ? "rgba(64,93,230,0.06)" : "#fff",
                  }}>
                  <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: wantsTrialClass ? "#405DE6" : "#cbd5e1", background: wantsTrialClass ? "#405DE6" : "transparent" }}>
                    {wantsTrialClass && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <p className="text-[13px] font-black" style={{ color: wantsTrialClass ? "#405DE6" : "#1e293b" }}>🎓 앱 체험 신청할게요</p>
                    <p className="text-[10px] text-slate-400">3일 무료 체험 · 계정 문자 발급</p>
                  </div>
                </button>

                {wantsTrialClass && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[11px] font-black text-slate-500 block">관심 수업반 선택 (참고용)</label>
                    {CLASSES.map(cls => (
                      <button key={cls.name} onClick={() => setTrialClassPref(cls.name)}
                        className="w-full px-4 py-3 rounded-2xl border-2 flex items-center justify-between transition-all"
                        style={{
                          borderColor: trialClassPref === cls.name ? "#833AB4" : "#e2e8f0",
                          background: trialClassPref === cls.name ? "rgba(131,58,180,0.06)" : "#fff",
                        }}>
                        <div className="text-left">
                          <p className="text-[13px] font-black" style={{ color: trialClassPref === cls.name ? "#833AB4" : "#1e293b" }}>{cls.name}</p>
                          <p className="text-[10px] text-slate-400">{cls.schedule}</p>
                        </div>
                        {trialClassPref === cls.name && <CheckCircle size={16} className="text-purple-500" />}
                      </button>
                    ))}
                    <p className="text-[10px] text-slate-400 px-1">
                      * 배당 지문은 신청자 교재 기준으로 선생님이 직접 설정해 드려요.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 4: 완료 ── */}
          {step === 4 && (
            <div className="py-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-[36px]"
                style={{ background: "linear-gradient(135deg,rgba(64,93,230,0.1),rgba(131,58,180,0.1))" }}>
                🎉
              </div>
              <div>
                <p className="text-[18px] font-black text-slate-800">신청 완료!</p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  <strong className="text-slate-700">{name}</strong>님의 신청을 접수했습니다.<br />
                  <strong className="text-slate-700">{phone}</strong>으로 곧 연락드릴게요.
                </p>
              </div>
              <div className="w-full rounded-2xl p-4 text-left space-y-2"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                {wantsConsultation && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-600">상담 신청 완료</span>
                  </div>
                )}
                {wantsTrialClass && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle size={13} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-slate-600">앱 체험 신청 완료 {trialClassPref && `(${trialClassPref})`} · 체험 기간 3일</span>
                  </div>
                )}
                {!wantsConsultation && !wantsTrialClass && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                    <span className="text-slate-500">상담·체험 미신청. 문의사항은 선생님께 연락 주세요.</span>
                  </div>
                )}
              </div>
              <button onClick={onClose}
                className="w-full h-12 rounded-2xl text-[13px] font-black text-white transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                닫기
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-bold"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {step !== 4 && (
          <div className="shrink-0 px-5 pb-5 pt-3 flex gap-2" style={{ borderTop: "1px solid #efefef" }}>
            {step > 1 && (
              <button onClick={() => setStep(s => (s - 1) as Step)}
                className="h-12 px-4 rounded-2xl text-[13px] font-black border-2 flex items-center gap-1 transition-all"
                style={{ borderColor: "#e2e8f0", color: "#64748b" }}>
                <ArrowLeft size={14} />
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={step === 1 ? !canStep1 : step === 2 ? !canStep2 : false}
                className="flex-1 h-12 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                다음 <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 h-12 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                {loading ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "신청 완료"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
