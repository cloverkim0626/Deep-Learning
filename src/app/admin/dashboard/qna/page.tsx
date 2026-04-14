"use client";

import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp, Send, CheckCircle } from "lucide-react";

type Answer = { id: string; author: string; isTeacher: boolean; text: string; time: string };
type Question = {
  id: string; author: string; class: string; passage: string;
  question: string; time: string; status: "unanswered" | "answered";
  answers: Answer[];
};

const INIT_QS: Question[] = [
  {
    id: "q1", author: "김가현", class: "고3 수능특강", passage: "[수능특강 12강 2번]",
    question: "S10에서 'which we perceive to be safe' 관계절이 계속적 용법인데, 한정적으로 쓰면 의미가 어떻게 달라지나요?",
    time: "15:28", status: "unanswered", answers: []
  },
  {
    id: "q2", author: "이도윤", class: "고2 내신 정규", passage: "[수능특강 12강 1번]",
    question: "S03에서 'no less than'을 쓰면 두 주어를 동등하게 강조한다고 했는데, 'no more than'이랑 어떻게 달라요?",
    time: "15:31", status: "answered",
    answers: [{ id: "a1", author: "선생님", isTeacher: true, text: "no less than = '~만큼이나'로 비교해서 강조, no more than = '겨우 ~에 불과한'이야. 전자는 비교 대상과 동등하게 높이는 거고, 후자는 낮추는 거야. 시험에서 두 표현 구분 문제 바로 나와.", time: "15:45" }]
  },
];

export default function AdminQnAPage() {
  const [questions, setQuestions] = useState<Question[]>(INIT_QS);
  const [expandedId, setExpandedId] = useState<string | null>("q1");
  const [filter, setFilter] = useState<"all" | "unanswered" | "answered">("all");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const submitReply = (qId: string) => {
    const text = replyInputs[qId]?.trim();
    if (!text) return;
    const answer: Answer = { id: Date.now().toString(), author: "선생님", isTeacher: true, text, time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
    setQuestions(prev => prev.map(q => q.id !== qId ? q : { ...q, status: "answered", answers: [...q.answers, answer] }));
    setReplyInputs(prev => ({ ...prev, [qId]: "" }));
  };

  const filtered = questions.filter(q => filter === "all" || q.status === filter);
  const unansweredCount = questions.filter(q => q.status === "unanswered").length;

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl text-foreground serif">Q&amp;A 답변 관리</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">학생 질문에 답변하면 학생 알림으로 전송됩니다.</p>
        </div>
        {unansweredCount > 0 && (
          <div className="flex items-center gap-2 text-[13px] font-bold text-error bg-error/5 border border-error/10 px-4 py-2 rounded-xl">
            미답변 {unansweredCount}건
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "unanswered", "answered"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${filter === f ? "bg-foreground text-background shadow" : "bg-accent-light text-accent hover:text-foreground"}`}>
            {f === "all" ? "전체" : f === "unanswered" ? "미답변" : "답변완료"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map(q => (
          <div key={q.id} className={`glass framer-card rounded-[1.5rem] border transition-all ${q.status === "answered" ? "border-foreground/5 opacity-80" : "border-error/15 shadow-[0_4px_24px_rgba(214,59,47,0.06)]"}`}>
            <button className="w-full flex items-start justify-between p-5 text-left gap-4" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center text-[13px] font-black shrink-0 ${q.status === "answered" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                  {q.status === "answered" ? <CheckCircle size={18} strokeWidth={2} /> : <MessageSquare size={18} strokeWidth={2} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-[14px]">{q.author}</span>
                    <span className="text-[10px] text-accent bg-accent-light px-2 py-0.5 rounded-lg">{q.class}</span>
                    <span className="text-[10px] text-accent">{q.passage}</span>
                  </div>
                  <p className="text-[13px] text-foreground/80 font-medium leading-snug truncate pr-4">{q.question}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-accent">{q.time}</span>
                {expandedId === q.id ? <ChevronUp size={15} className="text-accent" /> : <ChevronDown size={15} className="text-accent" />}
              </div>
            </button>

            {expandedId === q.id && (
              <div className="px-5 pb-5 border-t border-foreground/5 pt-4 space-y-4">
                <div className="bg-background rounded-2xl px-5 py-4 border border-foreground/5">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">학생 질문</p>
                  <p className="text-[14px] text-foreground font-medium leading-relaxed">{q.question}</p>
                </div>

                {q.answers.map(ans => (
                  <div key={ans.id} className="bg-foreground text-background rounded-2xl px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">선생님 답변 · {ans.time}</p>
                    <p className="text-[14px] font-medium leading-relaxed">{ans.text}</p>
                  </div>
                ))}

                <div className="flex gap-3">
                  <textarea
                    value={replyInputs[q.id] || ""}
                    onChange={e => setReplyInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="답변을 입력하세요. 저장 시 학생에게 알림이 전송됩니다."
                    rows={3}
                    className="flex-1 px-5 py-3.5 rounded-2xl border border-foreground/10 bg-transparent text-[13px] font-medium focus:outline-none focus:border-foreground/30 text-foreground placeholder:text-accent resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => submitReply(q.id)}
                    disabled={!replyInputs[q.id]?.trim()}
                    className="h-12 self-end px-5 bg-foreground text-background font-bold text-[13px] rounded-2xl flex items-center gap-2 shrink-0 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-30 disabled:hover:translate-y-0">
                    <Send size={14} strokeWidth={2} /> 답변
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
