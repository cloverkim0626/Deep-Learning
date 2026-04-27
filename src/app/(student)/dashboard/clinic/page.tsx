"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { getClinicQueue, joinClinicQueue } from "@/lib/database-service";

type WaitingStudent = {
  id: string;
  name: string;
  time: string;         // HH:MM
  fullTime: string;     // HH:MM:SS for display
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
    // 30초마다 대기열 갱신
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadQueue() {
    try {
      const data = await getClinicQueue();
      if (data) {
        const formatted: WaitingStudent[] = (data as any[])
          .filter(q => q.status !== "completed")
          .map(q => {
            const d = new Date(q.created_at);
            return {
              id: q.id,
              name: q.student_name || "익명",
              time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              fullTime: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              question: q.topic || "",
              status: q.status,
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
      const result = await joinClinicQueue(studentName, question.trim() || "질문 없음");
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

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">

      {/* ── 헤더 ── */}
      <div className="px-6 pt-10 pb-2 shrink-0">
        <h1 className="text-[28px] text-foreground serif font-black">클리닉 대기 접수</h1>
        <p className="text-[13px] text-accent mt-1.5 font-medium leading-relaxed">
          질문이 있거나 개인 지도가 필요하면<br />대기열에 이름을 올려줘.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar flex flex-col gap-7 pb-32 pt-5">

        {/* ── 접수 폼 또는 완료 메시지 ── */}
        {!isJoined ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* textarea — 입력창 테두리 명확하게 */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="질문 내용을 적어줘 (안 써도 접수 가능해)"
                rows={4}
                className="w-full px-4 py-3.5 bg-white border-2 border-foreground/12 rounded-2xl focus:border-foreground/30 focus:outline-none text-[15px] font-medium placeholder:text-accent/25 text-foreground resize-none transition-colors leading-relaxed shadow-inner"
              />
              {question.length > 0 && (
                <span className="absolute bottom-3 right-4 text-[10px] text-accent/30 font-bold">{question.length}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-foreground text-background rounded-2xl font-black text-[14px] tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="animate-pulse">접수 중...</span>
              ) : (
                <><Send size={16} strokeWidth={2.5} /> 클리닉 대기열 등록하기</>
              )}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-4 px-5 py-5 rounded-[2rem] bg-emerald-50 border border-emerald-100">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[15px] font-black text-emerald-700">접수 완료!</p>
              <p className="text-[12px] text-emerald-600/70 font-medium mt-0.5">선생님이 부를 때까지 잠시만 기다려줘.</p>
            </div>
          </div>
        )}

        {/* ── 실시간 대기 현황 ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-accent/50 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Users size={12} /> 실시간 대기 현황
            </h3>
            <span className="text-[10px] font-black text-accent/50 bg-accent-light px-2.5 py-1 rounded-full">
              {queue.length}명 대기 중
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-[12px] text-accent/40 font-bold animate-pulse">확인 중...</div>
          ) : queue.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-accent/30 font-bold">
              <AlertCircle size={20} className="mx-auto mb-2 opacity-30" />
              대기 중인 학생이 없어.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {queue.map((stu, i) => (
                <div key={stu.id}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                    stu.name === studentName
                      ? "bg-foreground/5 border border-foreground/10"
                      : "border border-foreground/5"
                  }`}
                >
                  {/* 순서 번호 */}
                  <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center text-[12px] font-black text-accent shrink-0">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-black text-foreground">
                        {stu.name}
                        {stu.name === studentName && (
                          <span className="ml-1.5 text-[9px] font-black text-foreground/40 bg-foreground/8 px-1.5 py-0.5 rounded-md">나</span>
                        )}
                      </span>
                      {/* 접수 시각 — 초 포함 */}
                      <span className="flex items-center gap-0.5 text-[10px] text-accent/40 font-bold">
                        <Clock size={9} /> {stu.fullTime}
                      </span>
                    </div>
                    {stu.question && stu.question !== "질문 없음" && (
                      <p className="text-[11px] text-accent/50 font-medium mt-0.5 truncate">{stu.question}</p>
                    )}
                  </div>

                  {/* 상태 */}
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shrink-0 ${
                    stu.status === "in-progress"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-accent-light text-accent/50"
                  }`}>
                    {stu.status === "in-progress" ? "상담 중" : "대기"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
