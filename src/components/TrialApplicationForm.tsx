"use client";
import { useState } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props { onClose: () => void; }
type Step = 1 | 2 | 3 | 4;

const GRADES = ["1학년", "2학년", "3학년", "N수생"];
const CLASSES = [
  { name: "아라고1", schedule: "월 오후 8~10시 / 수 오후 5~7시" },
  { name: "아라고2", schedule: "월 오후 6~8시 / 수 오후 7~9시" },
  { name: "고3반",   schedule: "금 오후 8:30~10:30" },
];

const VOCAB_DIFFICULTIES = [
  "외워도 자꾸 잊어버려요", "단어가 너무 많아서 엄두가 안 나요",
  "문맥 속 뜻을 모르겠어요", "발음을 몰라서 외우기 힘들어요",
  "어근·어원을 몰라서 연결이 안 돼요", "예문이 없어서 활용이 어려워요",
];
const DESIRED_FEATURES = [
  "단어 발음 음성 지원", "오답 노트 자동 정리",
  "AI가 내 취약점 분석", "선생님과 실시간 채팅",
  "수능 기출 어휘 집중", "유의어·반의어 퀴즈",
  "학습 랭킹·경쟁 요소", "진도 달성 뱃지",
];

export default function TrialApplicationForm({ onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [applicantType, setApplicantType] = useState<"학생" | "학부모" | "">("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"남" | "여" | "">("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [currentTextbook, setCurrentTextbook] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [difficultyExtra, setDifficultyExtra] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureExtra, setFeatureExtra] = useState("");

  // Step 3
  const [wantsConsultation, setWantsConsultation] = useState(false);
  const [wantsAuditClass, setWantsAuditClass] = useState(false);
  const [auditClassPref, setAuditClassPref] = useState("");

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const canStep1 = applicantType && school && grade && name && gender && phone.length >= 10;
  const canStep2 = currentTextbook.trim().length > 0;

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const { error: dbErr } = await supabase.from("trial_applications").insert([{
        applicant_type: applicantType, school, grade, name, gender, phone,
        current_textbook: currentTextbook,
        vocab_difficulties: [...selectedDifficulties, ...(difficultyExtra.trim() ? [`기타: ${difficultyExtra.trim()}`] : [])].join(", "),
        desired_features: [...selectedFeatures, ...(featureExtra.trim() ? [`기타: ${featureExtra.trim()}`] : [])].join(", "),
        wants_consultation: wantsConsultation,
        wants_audit_class: wantsAuditClass,
        trial_class_preference: wantsAuditClass ? auditClassPref : null,
        wants_trial_class: true, // 앱 체험은 기본 제공
        status: "pending", admin_note: "",
      }]);
      if (dbErr) throw dbErr;
      setStep(4);
    } catch { setError("제출 중 오류가 발생했습니다. 다시 시도해 주세요."); }
    finally { setLoading(false); }
  };

  const stepTitles = ["", "기본 정보", "학습 정보 & 설문", "신청 선택", ""];
  const stepSubs   = ["", "반갑습니다! 간단히 알려주세요 😊", "공부 습관을 알려주시면 딱 맞는 경험을 드려요", "필요한 것을 선택해 주세요", ""];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step < 4 ? onClose : undefined} />
      <div className="relative w-full max-w-sm max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-400" style={{ background: "#fafafa" }}>

        {/* 헤더 */}
        <div className="shrink-0 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#405DE6 0%,#833AB4 38%,#E1306C 78%,#F77737 100%)" }}>
          <div className="px-5 pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-[15px]">✏️</div>
                <span className="text-white text-[13px] font-black">체험 신청</span>
              </div>
              {step < 4 && (
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors">
                  <X size={14} className="text-white" />
                </button>
              )}
            </div>
            <p className="text-white text-[18px] font-black leading-tight">{step < 4 ? stepTitles[step] : "신청 완료! 🎉"}</p>
            <p className="text-white/70 text-[11px] mt-1">{step < 4 ? stepSubs[step] : `${name}님의 신청을 접수했어요`}</p>
          </div>
          {step < 4 && (
            <div className="flex gap-1 px-5 pb-4">
              {[1,2,3].map(s => (
                <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: s <= step ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }} />
              ))}
            </div>
          )}
          <div style={{ height: "16px", background: "#fafafa", borderRadius: "50% 50% 0 0 / 100% 100% 0 0", marginTop: "-2px" }} />
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">신청자 구분</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["학생", "학부모"] as const).map(t => (
                    <button key={t} onClick={() => setApplicantType(t)}
                      className="h-12 rounded-2xl text-[13px] font-black transition-all border-2"
                      style={{ borderColor: applicantType === t ? "#833AB4" : "#e2e8f0", background: applicantType === t ? "rgba(131,58,180,0.06)" : "#fff", color: applicantType === t ? "#833AB4" : "#64748b" }}>
                      {t === "학생" ? "👨‍🎓 학생" : "👪 학부모"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">학교명</label>
                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="OO고등학교"
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none"
                  style={{ borderColor: school ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">학년</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADES.map(g => (
                    <button key={g} onClick={() => setGrade(g)}
                      className="h-11 rounded-xl text-[11px] font-black transition-all border-2"
                      style={{ borderColor: grade === g ? "#E1306C" : "#e2e8f0", background: grade === g ? "rgba(225,48,108,0.06)" : "#fff", color: grade === g ? "#E1306C" : "#64748b" }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">이름</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none"
                  style={{ borderColor: name ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">성별</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["남", "여"] as const).map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className="h-11 rounded-2xl text-[13px] font-black transition-all border-2"
                      style={{ borderColor: gender === g ? "#405DE6" : "#e2e8f0", background: gender === g ? "rgba(64,93,230,0.06)" : "#fff", color: gender === g ? "#405DE6" : "#64748b" }}>
                      {g === "남" ? "♂ 남" : "♀ 여"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  핸드폰 번호 <span className="text-[9px] text-slate-300 normal-case font-medium">계정 발급에 사용돼요</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g,""))}
                  placeholder="01012345678" type="tel" maxLength={11}
                  className="w-full h-12 px-4 rounded-2xl border-2 text-[14px] font-bold outline-none"
                  style={{ borderColor: phone.length >= 10 ? "#833AB4" : "#e2e8f0", color: "#1e293b" }} />
              </div>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              {/* 교재 + 진도 */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  📚 지금 공부하는 교재와 진도 <span className="text-rose-400">*</span>
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  교재 이름과 현재 진도까지 적어주세요.<br />
                  <span className="text-indigo-400 font-bold">예: 수능특강 영어 7강, EBS 수능완성 3단원</span>
                </p>
                <textarea value={currentTextbook} onChange={e => setCurrentTextbook(e.target.value)}
                  placeholder="예) 수능특강 영어 7강까지 / 마더텅 영어독해 2회독 중"
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border-2 text-[13px] font-bold outline-none resize-none"
                  style={{ borderColor: currentTextbook ? "#833AB4" : "#e2e8f0", color: "#1e293b", lineHeight: 1.6 }} />
              </div>

              {/* 설문: 단어 외울 때 힘들었던 점 */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  😩 단어 외울 때 어떤 점이 힘드셨나요?
                </label>
                <p className="text-[10px] text-slate-400 mb-2">해당하는 것 모두 선택해 주세요 (선택 사항)</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VOCAB_DIFFICULTIES.map(d => {
                    const active = selectedDifficulties.includes(d);
                    return (
                      <button key={d} onClick={() => toggleArr(selectedDifficulties, setSelectedDifficulties, d)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border"
                        style={{ borderColor: active ? "#E1306C" : "#e2e8f0", background: active ? "rgba(225,48,108,0.08)" : "#fff", color: active ? "#E1306C" : "#64748b" }}>
                        {active ? "✓ " : ""}{d}
                      </button>
                    );
                  })}
                </div>
                <textarea value={difficultyExtra} onChange={e => setDifficultyExtra(e.target.value)}
                  placeholder="직접 입력 (예: 뜻은 아는데 문장에서 못 씀)"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border text-[12px] outline-none resize-none"
                  style={{ borderColor: difficultyExtra ? "#E1306C" : "#e2e8f0", color: "#334155" }} />
              </div>

              {/* 설문: 원하는 기능 */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  💡 앱에 있었으면 하는 기능은?
                </label>
                <p className="text-[10px] text-slate-400 mb-2">솔직하게 알려주시면 반영할게요 😊 (선택 사항)</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DESIRED_FEATURES.map(f => {
                    const active = selectedFeatures.includes(f);
                    return (
                      <button key={f} onClick={() => toggleArr(selectedFeatures, setSelectedFeatures, f)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border"
                        style={{ borderColor: active ? "#405DE6" : "#e2e8f0", background: active ? "rgba(64,93,230,0.08)" : "#fff", color: active ? "#405DE6" : "#64748b" }}>
                        {active ? "✓ " : ""}{f}
                      </button>
                    );
                  })}
                </div>
                <textarea value={featureExtra} onChange={e => setFeatureExtra(e.target.value)}
                  placeholder="직접 입력 (예: 지문 해석 단계별 힌트)"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border text-[12px] outline-none resize-none"
                  style={{ borderColor: featureExtra ? "#405DE6" : "#e2e8f0", color: "#334155" }} />
              </div>
            </>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <>
              <div className="rounded-2xl px-4 py-3 text-[11px] leading-relaxed"
                style={{ background: "linear-gradient(135deg,rgba(64,93,230,0.06),rgba(131,58,180,0.06))", border: "1px solid rgba(131,58,180,0.12)" }}>
                <p className="font-black text-slate-700 mb-0.5">🎁 앱 체험은 기본 제공이에요!</p>
                <p className="text-slate-500">신청 완료 후 문자로 앱 계정을 보내드려요. 체험 기간은 <strong className="text-slate-700">3일</strong>이에요.</p>
              </div>

              {/* 상담 신청 */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">추가로 원하시는 게 있으면 알려주세요</label>
                <button onClick={() => setWantsConsultation(v => !v)}
                  className="w-full px-5 py-4 rounded-2xl border-2 flex items-start gap-3 transition-all text-left mb-2"
                  style={{ borderColor: wantsConsultation ? "#10b981" : "#e2e8f0", background: wantsConsultation ? "rgba(16,185,129,0.05)" : "#fff" }}>
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{ borderColor: wantsConsultation ? "#10b981" : "#cbd5e1", background: wantsConsultation ? "#10b981" : "transparent" }}>
                    {wantsConsultation && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <p className="text-[13px] font-black" style={{ color: wantsConsultation ? "#10b981" : "#1e293b" }}>💬 수업 상담 신청</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">강사와 1:1 상담 (수업 청강 아님, 전화·방문 상담)</p>
                  </div>
                </button>

                {/* 청강 신청 */}
                <button onClick={() => setWantsAuditClass(v => !v)}
                  className="w-full px-5 py-4 rounded-2xl border-2 flex items-start gap-3 transition-all text-left"
                  style={{ borderColor: wantsAuditClass ? "#405DE6" : "#e2e8f0", background: wantsAuditClass ? "rgba(64,93,230,0.05)" : "#fff" }}>
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{ borderColor: wantsAuditClass ? "#405DE6" : "#cbd5e1", background: wantsAuditClass ? "#405DE6" : "transparent" }}>
                    {wantsAuditClass && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <p className="text-[13px] font-black" style={{ color: wantsAuditClass ? "#405DE6" : "#1e293b" }}>🏫 수업 청강 신청</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">실제 수업을 직접 들어볼 수 있어요</p>
                  </div>
                </button>
              </div>

              {/* 청강 반 선택 */}
              {wantsAuditClass && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[11px] font-black text-slate-400 block">청강 희망 반 <span className="font-medium text-slate-300">(검단 우독학원)</span></label>
                  {CLASSES.map(cls => (
                    <button key={cls.name} onClick={() => setAuditClassPref(cls.name)}
                      className="w-full px-4 py-3 rounded-2xl border-2 flex items-center justify-between transition-all"
                      style={{ borderColor: auditClassPref === cls.name ? "#833AB4" : "#e2e8f0", background: auditClassPref === cls.name ? "rgba(131,58,180,0.06)" : "#fff" }}>
                      <div className="text-left">
                        <p className="text-[13px] font-black" style={{ color: auditClassPref === cls.name ? "#833AB4" : "#1e293b" }}>{cls.name}</p>
                        <p className="text-[10px] text-slate-400">{cls.schedule}</p>
                      </div>
                      {auditClassPref === cls.name && <CheckCircle size={15} className="text-purple-500" />}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step 4: 완료 ── */}
          {step === 4 && (
            <div className="py-6 flex flex-col items-center text-center gap-4">
              <div className="text-[48px]">🎉</div>
              <div>
                <p className="text-[18px] font-black text-slate-800">신청 완료!</p>
                <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
                  <strong className="text-slate-700">{name}</strong>님, 신청해 주셔서 감사해요!<br />
                  <strong className="text-slate-700">{phone}</strong>으로 곧 앱 계정을 보내드릴게요.
                </p>
              </div>
              <div className="w-full rounded-2xl p-4 text-left space-y-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-center gap-2 text-[11px]">
                  <CheckCircle size={12} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-slate-600">앱 체험 3일 제공 (계정 문자 발송 예정)</span>
                </div>
                {wantsConsultation && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-600">수업 상담 신청 완료</span>
                  </div>
                )}
                {wantsAuditClass && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle size={12} className="text-purple-400 flex-shrink-0" />
                    <span className="text-slate-600">청강 신청 완료 {auditClassPref && `(${auditClassPref})`}</span>
                  </div>
                )}
              </div>
              <button onClick={onClose}
                className="w-full h-12 rounded-2xl text-[13px] font-black text-white hover:-translate-y-0.5 transition-all"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                닫기
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-bold"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              <AlertCircle size={13} />{error}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {step < 4 && (
          <div className="shrink-0 px-5 pb-5 pt-3 flex gap-2" style={{ borderTop: "1px solid #efefef" }}>
            {step > 1 && (
              <button onClick={() => setStep(s => (s - 1) as Step)}
                className="h-12 px-4 rounded-2xl text-[13px] font-black border-2 flex items-center gap-1 transition-all"
                style={{ borderColor: "#e2e8f0", color: "#64748b" }}>
                <ArrowLeft size={14} />
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => (s + 1) as Step)}
                disabled={step === 1 ? !canStep1 : !canStep2}
                className="flex-1 h-12 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                다음 <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 h-12 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)" }}>
                {loading ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "신청 완료 🎉"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
