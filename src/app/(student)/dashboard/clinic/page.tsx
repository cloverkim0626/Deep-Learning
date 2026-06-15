"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Users, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { getClinicQueue, joinClinicQueue } from "@/lib/database-service";

type WaitingStudent = {
  id: string;
  name: string;
  time: string;
  fullTime: string;
  question: string;
  status: "waiting" | "in-progress" | "done";
};

export default function ClinicPage() {
  const [question, setQuestion] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [queue, setQueue] = useState<WaitingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName] = useState("학생");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("stu_session");
    if (saved) {
      try { setStudentName(JSON.parse(saved).name || "학생"); } catch { /* noop */ }
    }
    loadQueue();
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadQueue() {
    try {
      const data = await getClinicQueue();
      if (data) {
        const formatted: WaitingStudent[] = (data as {
          id: string; student_name?: string; created_at: string;
          topic?: string; status: string;
        }[])
          .filter(q => q.status !== "completed")
          .map(q => {
            const d = new Date(q.created_at);
            return {
              id: q.id,
              name: q.student_name || "익명",
              time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              fullTime: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              question: q.topic || "",
              status: q.status as "waiting" | "in-progress" | "done",
            };
          });
        setQueue(formatted);
      }
    } catch (err) {
      console.warn("Queue load failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await joinClinicQueue(studentName, question.trim() || "질문 없음") as { id?: string } | null;
      const now = new Date();
      const newEntry: WaitingStudent = {
        id: result?.id || Date.now().toString(),
        name: studentName,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fullTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        question: question.trim() || "질문 없음",
        status: "waiting",
      };
      setQueue(prev => [newEntry, ...prev]);
      setIsJoined(true);
      setQuestion("");
    } catch (err) {
      console.error("Clinic submit error:", err);
      alert("접수에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이름 첫 글자 이니셜
  const initial = studentName.length > 1 ? studentName.slice(-2) : studentName.charAt(0);

  return (
    <div className="flex flex-col h-full bg-transparent animate-in fade-in duration-500">
      <style>{`
        @keyframes igRingPulse {
          0%,100%{opacity:0.8} 50%{opacity:1}
        }
        @keyframes igBadgePop {
          0%{transform:scale(0.8);opacity:0}
          60%{transform:scale(1.1)}
          100%{transform:scale(1);opacity:1}
        }
      `}</style>

      {/* ── IG 스타일 헤더 프로필 섹션 ── */}
      <div className="px-5 pt-8 pb-4 shrink-0">
        {/* 프로필 행 */}
        <div className="flex items-center gap-4 mb-5">
          {/* IG 스토리 링 아바타 */}
          <div className="relative shrink-0">
            <div className="p-[2.5px] rounded-full" style={{
              background: 'linear-gradient(135deg,#10b981,#fb923c)',
              animation: 'igRingPulse 3s ease-in-out infinite',
            }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-[18px] font-black"
                style={{ background: '#ffffff', color: '#1e293b', border: '1px solid rgba(0,0,0,0.08)' }}>
                {initial}
              </div>
            </div>
            {/* 온라인 도트 */}
            <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ background: '#22c55e', borderColor: '#fafaf6' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          </div>
          {/* 이름 + 설명 */}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black leading-tight text-slate-800">{studentName}</p>
            <p className="text-[12px] font-bold mt-0.5 text-slate-500">
              클리닉 대기 접수
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <span className="text-[10px] font-bold text-emerald-600">선생님 온라인</span>
            </div>
          </div>
          {/* 대기 뱃지 */}
          <div className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#047857' }}>
            {queue.length}명 대기
          </div>
        </div>

        {/* IG 스토리 스타일 구분선 */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(0,0,0,0.06),transparent)' }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar flex flex-col gap-5 pb-32 pt-3">

        {/* ── 접수 폼 / 완료 카드 ── */}
        {!isJoined ? (
          <form onSubmit={handleSubmit}>
            {/* IG 포스트 스타일 카드 */}
            <div className="rounded-[1.6rem] overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(0,0,0,0.05)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)',
              }}>
              {/* 카드 상단 — 포스팅 헤더 */}
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#10b981,#fb923c)' }}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-none">{studentName}</p>
                  <p className="text-[10px] mt-0.5 text-slate-500">클리닉 신청서 작성 중</p>
                </div>
                <Sparkles size={14} style={{ color: '#fb923c' }} />
              </div>

              {/* 입력 영역 */}
              <div className="px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-widest mb-2.5 text-emerald-600">
                  질문 내용
                </p>
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="선생님께 여쭤볼 내용을 적어줘&#10;(비워도 접수 가능해)"
                  rows={4}
                  className="w-full rounded-xl text-[14px] font-medium resize-none outline-none leading-relaxed"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: '#1e293b',
                    padding: '12px 14px',
                  }}
                />
                {question.length > 0 && (
                  <span className="block text-right text-[10px] mt-1 text-slate-400">
                    {question.length}자
                  </span>
                )}
              </div>

              {/* IG 좋아요 바 스타일 액션 영역 */}
              <div className="px-4 pb-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl font-black text-[14px] tracking-wide flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: isSubmitting
                      ? 'rgba(16,185,129,0.4)'
                      : 'linear-gradient(135deg,#10b981,#fb923c)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(251,146,60,0.25)',
                  }}>
                  {isSubmitting ? (
                    <span className="animate-pulse">접수 중...</span>
                  ) : (
                    <><Send size={15} strokeWidth={2.5} /> 클리닉 대기열 등록</>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="rounded-[1.6rem] overflow-hidden animate-in zoom-in duration-500"
            style={{
              background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-black text-emerald-800">접수 완료! 🎉</p>
                <p className="text-[12px] font-bold mt-0.5 text-emerald-600">
                  선생님이 부를 때까지 잠깐만 기다려줘
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 실시간 대기 현황 ── */}
        <div>
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={13} className="text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                실시간 대기
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <span className="text-[10px] font-bold text-emerald-600">LIVE</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-[12px] animate-pulse text-slate-400">
              확인 중...
            </div>
          ) : queue.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle size={22} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[12px] font-bold text-slate-400">대기 중인 학생이 없어</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {queue.map((stu, i) => {
                const isMe = stu.name === studentName;
                const stuInitial = stu.name.length > 1 ? stu.name.slice(-2) : stu.name.charAt(0);
                return (
                  <div key={stu.id}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all"
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(251,146,60,0.08))'
                        : '#ffffff',
                      border: isMe
                        ? '1px solid rgba(251,146,60,0.25)'
                        : '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    }}>
                    {/* 순서 + 아바타 */}
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black ${isMe ? 'text-white' : 'text-slate-600'}`}
                        style={{
                          background: isMe
                            ? 'linear-gradient(135deg,#10b981,#fb923c)'
                            : 'rgba(0,0,0,0.06)',
                        }}>
                        {stuInitial}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                        style={{ background: stu.status === 'in-progress' ? '#22c55e' : 'rgba(100,100,150,0.6)' }}>
                        {i + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-slate-800">
                          {stu.name}
                          {isMe && (
                            <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md"
                              style={{ background: 'rgba(16,185,129,0.15)', color: '#047857' }}>나</span>
                          )}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                          <Clock size={9} /> {stu.fullTime}
                        </span>
                      </div>
                      {stu.question && stu.question !== "질문 없음" && (
                        <p className="text-[11px] mt-0.5 truncate text-slate-600">
                          {stu.question}
                        </p>
                      )}
                    </div>

                    {/* 상태 뱃지 */}
                    <div className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shrink-0"
                      style={stu.status === 'in-progress'
                        ? { background: 'rgba(16,185,129,0.08)', color: '#047857', border: '1px solid rgba(16,185,129,0.15)' }
                        : { background: 'rgba(0,0,0,0.04)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }}>
                      {stu.status === 'in-progress' ? '상담 중' : '대기'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
