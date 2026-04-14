"use client";

import { useState } from "react";
import { Send, Hash, Loader2 } from "lucide-react";

export default function ClinicPage() {
  const [question, setQuestion] = useState("");
  const [step, setStep] = useState<"input" | "processing" | "done">("input");
  const [ticketNumber] = useState(() => Math.floor(100 + Math.random() * 900));
  const [summary, setSummary] = useState("");

  const AI_SUMMARIES: Record<number, string> = {
    0: "수능특강 관련 접속사 구조 (just as vs just like) 혼동 문제",
    1: "주어-동사 수일치 판단 어려움 (삽입구 포함 복잡 문장)",
    2: "분사구문 시제 해석 오류 (having been p.p.)",
    3: "관계절 수식 범위 파악 불가, 문장 구조 전반 질문",
  };

  const handleSubmit = () => {
    // Lowered threshold to 2 characters to make it more responsive
    if (question.length < 2) return;
    setStep("processing");
    setTimeout(() => {
      const idx = Math.floor(Math.random() * 4);
      setSummary(AI_SUMMARIES[idx]);
      setStep("done");
    }, 1800);
  };

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center animate-in fade-in duration-500">
        <Loader2 size={32} className="text-accent animate-spin" strokeWidth={1.5} />
        <p className="text-[14px] text-accent font-medium">AI가 질문 내용을 정리하여 대기열에 등록 중...</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center pb-20 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-[2.5rem] bg-foreground flex items-center justify-center shadow-xl">
          <div className="flex flex-col items-center text-background">
            <Hash size={14} strokeWidth={2.5} className="mb-1 opacity-50" />
            <span className="text-5xl font-black leading-none">{ticketNumber}</span>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground serif">클리닉 대기 접수 완료</h2>
          <p className="text-[13px] text-accent font-medium leading-relaxed px-4">
            정상적으로 접수되었어! 선생님이나 조교님이 이름을 부를 때까지 공부하면서 기다려줘.
          </p>
        </div>
        <div className="w-full mt-2 p-6 rounded-[2rem] bg-accent-light border border-foreground/5 text-left shadow-inner">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 px-1">AI 자동 요약</p>
          <p className="text-[14px] text-foreground font-bold leading-relaxed">{summary}</p>
        </div>
        <button
          onClick={() => { setStep("input"); setQuestion(""); }}
          className="h-14 px-8 bg-foreground text-background text-[14px] font-bold rounded-2xl active:scale-95 transition-all shadow-lg"
        >
          새로운 질문 접수하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-10 animate-in fade-in duration-700 overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground serif font-black">클리닉 대기 접수</h1>
        <p className="text-[14px] text-accent mt-2 leading-relaxed font-medium">
          질문할 내용을 자유롭게 적어줘. AI가 핵심을 정리해서 선생님께 전달할게.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        <label className="text-[10px] font-bold text-accent uppercase tracking-widest px-1 block">
          질문 내용 (지문 번호, 문장 번호 등)
        </label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={"예: 수능특강 12강 S09 문장에서 'It'이 가리키는 게 뭔지 모르겠어요.\n(최소 2자 이상 입력해주세요)"}
          className="w-full h-64 px-6 py-5 rounded-[2rem] bg-white border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all resize-none text-[15px] leading-relaxed text-foreground placeholder:text-accent/50 font-medium shadow-sm"
        />
        <div className="p-4 bg-accent-light/50 rounded-2xl border border-foreground/5">
          <p className="text-[11px] text-accent font-bold leading-snug">
            💡 팁: 질문을 구체적으로 적을수록 선생님이 더 빠르게 도와주실 수 있어!
          </p>
        </div>
      </div>

      <div className="pt-8 pb-10">
        <button
          onClick={handleSubmit}
          disabled={question.length < 2}
          className="w-full h-15 bg-foreground text-background font-black text-[15px] tracking-widest rounded-[1.5rem] flex items-center justify-center gap-3 shadow-2xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-20 disabled:hover:translate-y-0"
        >
          클리닉 대기열 등록하기 <Send size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
