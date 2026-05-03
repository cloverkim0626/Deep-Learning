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
              background: 'linear-gradient(135deg,#405DE6,#833AB4,#E1306C,#F77737)',
              animation: 'igRingPulse 3s ease-in-out infinite',
            }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-[18px] font-black"
                style={{ background: '#09090f', color: '#fff' }}>
                {initial}
              </div>
            </div>
            {/* 온라인 도트 */}
            <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ background: '#22c55e', borderColor: '#09090f' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
          </div>
          {/* 이름 + 설명 */}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black leading-tight" style={{ color: '#ffffff' }}>{studentName}</p>
            <p className="text-[12px] font-bold mt-0.5" style={{ color: 'rgba(200,185,255,0.95)' }}>
              클리닉 대기 접수
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <span className="text-[10px] font-bold" style={{ color: 'rgba(100,255,150,0.95)' }}>선생님 온라인</span>
            </div>
          </div>
          {/* 대기 뱃지 */}
          <div className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black"
            style={{ background: 'rgba(64,93,230,0.2)', border: '1px solid rgba(64,93,230,0.4)', color: 'rgba(160,180,255,0.9)' }}>
            {queue.length}명 대기
          </div>
        </div>

        {/* IG 스토리 스타일 구분선 */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)' }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar flex flex-col gap-5 pb-32 pt-3">

        {/* ── 접수 폼 / 완료 카드 ── */}
        {!isJoined ? (
          <form onSubmit={handleSubmit}>
            {/* IG 포스트 스타일 카드 */}
            <div className="rounded-[1.6rem] overflow-hidden"
              style={{
                background: 'rgba(15,15,30,0.85)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
              }}>
              {/* 카드 상단 — 포스팅 헤더 */}
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#405DE6,#E1306C)' }}>
                  {initial}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-white leading-none">{studentName}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(160,160,255,0.55)' }}>클리닉 신청서 작성 중</p>
                </div>
                <Sparkles size={14} style={{ color: 'rgba(180,130,255,0.6)' }} />
              </div>

              {/* 입력 영역 */}
              <div className="px-4 py-4">
                <p className="text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'rgba(160,130,255,0.6)' }}>
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
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    padding: '12px 14px',
                  }}
                />
                {question.length > 0 && (
                  <span className="block text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
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
                      ? 'rgba(100,100,200,0.4)'
                      : 'linear-gradient(135deg,#405DE6,#833AB4,#E1306C)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(225,48,108,0.35)',
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
              background: 'linear-gradient(135deg,rgba(34,197,94,0.20),rgba(16,185,129,0.14))',
              border: '1px solid rgba(34,197,94,0.35)',
            }}>
            <div className="px-5 py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}>
                <CheckCircle2 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-black" style={{ color: '#ffffff' }}>접수 완료! 🎉</p>
                <p className="text-[12px] font-bold mt-0.5" style={{ color: 'rgba(160,255,180,0.95)' }}>
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
              <Users size={13} style={{ color: 'rgba(160,130,255,0.7)' }} />
              <span className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'rgba(160,130,255,0.7)' }}>
                실시간 대기
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <span className="text-[10px] font-bold" style={{ color: 'rgba(100,220,120,0.7)' }}>LIVE</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-[12px] animate-pulse" style={{ color: 'rgba(160,130,255,0.5)' }}>
              확인 중...
            </div>
          ) : queue.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle size={22} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>대기 중인 학생이 없어</p>
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
                        ? 'linear-gradient(135deg,rgba(64,93,230,0.18),rgba(131,58,180,0.12))'
                        : 'rgba(255,255,255,0.04)',
                      border: isMe
                        ? '1px solid rgba(64,93,230,0.35)'
                        : '1px solid rgba(255,255,255,0.07)',
                    }}>
                    {/* 순서 + 아바타 */}
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white ${
                        stu.status === 'in-progress'
                          ? ''
                          : ''
                      }`} style={{
                        background: isMe
                          ? 'linear-gradient(135deg,#405DE6,#E1306C)'
                          : 'rgba(255,255,255,0.10)',
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
                        <span className="text-[14px] font-black text-white">
                          {stu.name}
                          {isMe && (
                            <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md"
                              style={{ background: 'rgba(64,93,230,0.3)', color: 'rgba(160,180,255,0.9)' }}>나</span>
                          )}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          <Clock size={9} /> {stu.fullTime}
                        </span>
                      </div>
                      {stu.question && stu.question !== "질문 없음" && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {stu.question}
                        </p>
                      )}
                    </div>

                    {/* 상태 뱃지 */}
                    <div className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shrink-0"
                      style={stu.status === 'in-progress'
                        ? { background: 'rgba(34,197,94,0.20)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }
                        : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}>
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
