"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Hash } from "lucide-react";

const QUEUE = [
  { id: "c1", ticket: 101, name: "김가현", class: "고3 수능특강 (월수반)", passage: "[수능특강 12강 2번] Trust Your Gut?", question: "S09의 just as 절 구조 이해 안 됨.", status: "대기중", time: "15:28" },
  { id: "c2", ticket: 102, name: "이도윤", class: "고2 내신 정규 (화목반)", passage: "[수능특강 12강 1번] The Sound of Silence", question: "S03 no less than 동사 are 수일치 이유 모르겠음.", status: "대기중", time: "15:31" },
  { id: "c3", ticket: 103, name: "박서준", class: "고3 수능특강 (월수반)", passage: "[수능완성 3강 4번] Illusion of Multitasking", question: "having been p.p. 구조 S5.", status: "완료", time: "15:12" },
];

export default function AdminClinicPage() {
  const [queue, setQueue] = useState(QUEUE);
  const [expandedId, setExpandedId] = useState<string | null>("c1");
  const [filter, setFilter] = useState<"all" | "대기중" | "완료">("all");

  const handleComplete = (id: string) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, status: "완료" } : item));
  };

  const filtered = queue.filter(item => filter === "all" || item.status === filter);
  const pendingCount = queue.filter(q => q.status === "대기중").length;

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl text-foreground serif">클리닉 대기 관리</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">오프라인 클리닉 사전 접수 대기 현황입니다.</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-[13px] font-bold text-error bg-error/5 border border-error/10 px-4 py-2 rounded-xl">
            <AlertTriangle size={15} strokeWidth={2.5} />
            현재 대기 {pendingCount}명
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "대기중", "완료"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${filter === f ? "bg-foreground text-background shadow" : "bg-accent-light text-accent hover:text-foreground"}`}>
            {f === "all" ? "전체" : f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map(item => (
          <div key={item.id} className={`glass framer-card rounded-[1.5rem] border transition-all ${item.status === "완료" ? "border-success/20 opacity-60" : "border-foreground/5 hover:border-foreground/10"}`}>
            <button className="w-full flex items-center justify-between p-6 text-left gap-4" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-[0.9rem] flex flex-col items-center justify-center shrink-0 font-black text-[13px] ${item.status === "완료" ? "bg-success/10 text-success" : "bg-foreground text-background"}`}>
                  <Hash size={9} strokeWidth={3} className="-mb-0.5" />
                  {item.ticket}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-[15px]">{item.name}</span>
                    <span className="text-[11px] text-accent bg-accent-light px-2 py-0.5 rounded-lg font-medium">{item.class}</span>
                  </div>
                  <p className="text-[12px] text-accent mt-0.5 truncate max-w-[200px] md:max-w-md">{item.question}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-accent hidden md:block">{item.time}</span>
                {item.status === "대기중"
                  ? <Clock size={16} className="text-error" />
                  : <CheckCircle size={16} className="text-success" />}
                {expandedId === item.id ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
              </div>
            </button>

            {expandedId === item.id && (
              <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5">지문</p>
                  <p className="text-[13px] text-foreground font-medium">{item.passage}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5">사전 질문</p>
                  <p className="text-[14px] text-foreground font-medium leading-relaxed bg-background rounded-xl px-5 py-4 border border-foreground/5">{item.question}</p>
                </div>
                {item.status === "대기중" && (
                  <button onClick={() => handleComplete(item.id)}
                    className="h-11 w-full md:w-auto px-8 bg-foreground text-background text-[13px] font-bold rounded-xl shadow hover:-translate-y-0.5 active:scale-95 transition-all">
                    클리닉 완료 처리
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
