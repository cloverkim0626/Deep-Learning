"use client";

import { useState, useEffect } from "react";
import { Calendar, UserCircle, MessageSquare, Clock, Send, Users, CheckCircle2 } from "lucide-react";
import { getClinicQueue, joinClinicQueue } from "@/lib/database-service";

type WaitingStudent = {
  id: string;
  name: string;
  time: string;
  question: string;
  status: "waiting" | "in-progress" | "done";
};

export default function ClinicPage() {
  const [question, setQuestion] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [queue, setQueue] = useState<WaitingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQueue() {
      try {
        const data = await getClinicQueue();
        if (data && data.length > 0) {
          const formatted: WaitingStudent[] = data.map((q: any) => ({
            id: q.id,
            name: q.profiles?.full_name || "익명",
            time: new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            question: q.topic || "질문 없음",
            status: q.status
          }));
          setQueue(formatted);
        }
      } catch (err) {
        console.warn("Using mock queue:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadQueue();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mockStudentId = "s1";
      await joinClinicQueue(mockStudentId, question || "질문 없음");
      
      const newEntry: WaitingStudent = {
        id: Date.now().toString(),
        name: "김가연",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        question: question || "질문 없음",
        status: "waiting"
      };
      setQueue(prev => [newEntry, ...prev]);
      setIsJoined(true);
      setQuestion("");
    } catch (err) {
      // Manual fallback for demo if DB fails
      const newEntry: WaitingStudent = {
        id: Date.now().toString(),
        name: "김가연",
        time: "방금",
        question: question || "질문 없음",
        status: "waiting"
      };
      setQueue(prev => [newEntry, ...prev]);
      setIsJoined(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      <div className="px-6 pt-10 pb-6 shrink-0">
        <h1 className="text-3xl text-foreground serif font-black">클리닉 대기 접수</h1>
        <p className="text-[14px] text-accent mt-2 font-medium">질문이 있거나 개인 지도가 필요하면 대기열에 이름을 올려줘.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar flex flex-col gap-8 pb-32 pt-4">
        {/* Registration Form - Always available */}
        {!isJoined ? (
          <div className="glass framer-card rounded-[2.5rem] border border-foreground/5 p-8 shadow-sm bg-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
                <Calendar size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[17px] font-black text-foreground">새로운 클리닉 접수</h3>
                <p className="text-[11px] text-accent font-bold uppercase tracking-widest mt-0.5">Clinic Registration</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <textarea 
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="질문 내용을 입력해주세요. (입력하지 않아도 접수가 가능합니다)"
                  className="w-full h-32 p-6 rounded-[2rem] bg-accent-light/30 border border-foreground/5 focus:border-foreground/20 focus:outline-none transition-all text-[15px] font-medium placeholder:text-accent/30 resize-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full h-16 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0.5 transition-all flex items-center justify-center gap-3"
              >
                클리닉 대기열 등록하기 <Send size={18} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        ) : (
          <div className="glass rounded-[2.5rem] p-10 bg-success text-white text-center animate-in zoom-in duration-500 shadow-2xl">
             <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
             </div>
             <h3 className="text-xl font-black mb-2">접수 완료!</h3>
             <p className="text-[14px] opacity-80 font-medium">선생님이 부를 때까지 잠시만 기다려줘.</p>
          </div>
        )}

        {/* Real-time Queue Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[12px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={14} /> 실시간 대기 현황
             </h3>
             <span className="text-[10px] font-bold text-accent bg-accent-light px-3 py-1 rounded-full">{queue.length}명 대기 중</span>
          </div>

          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="text-center py-10 text-accent text-[12px] font-bold">대기열 확인 중...</div>
            ) : queue.map((stu) => (
              <div key={stu.id} className="glass border border-foreground/5 rounded-[2rem] p-6 flex items-center justify-between hover:shadow-md transition-all bg-white/40">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-[14px] font-black text-foreground">
                    {stu.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-black text-foreground">{stu.name}</span>
                      <span className="text-[10px] text-accent font-bold opacity-50">{stu.time}</span>
                    </div>
                    <p className="text-[12px] text-accent font-medium mt-1 truncate max-w-[150px]">{stu.question}</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                  stu.status === 'in-progress' ? 'bg-success/10 text-success border-success/10' : 'bg-accent-light text-accent border-foreground/5'
                }`}>
                  {stu.status === 'in-progress' ? '상담 중' : '대기 중'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
