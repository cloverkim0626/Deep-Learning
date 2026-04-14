"use client";

import { useState, useEffect } from "react";
import { PenTool, CheckCircle, Lightbulb, ChevronRight, ChevronDown } from "lucide-react";
import { getEssaySets } from "@/lib/database-service";

type EssaySet = {
  id: string;
  title: string;
  source: string;
  task: string;
  constraints: string[];
  sampleAnswer: string;
  feedback: string;
};

const MOCK_ESSAY_SETS: EssaySet[] = [
  {
    id: "e1",
    title: "수능특강 12강 2번 - 논증 재구성",
    source: "Ironically, the very instinct that once protected us may now be counterproductive in modern life. It’s the only reason for anyone to trust anything about reality.",
    task: "S01의 'counterproductive'의 의미를 문맥에 맞게 풀어서 영작하시오.",
    constraints: ["'instinct'와 'modern environment' 단어를 포함할 것", "상반된 결과를 가져온다는 논리가 명확할 것"],
    sampleAnswer: "The same instinct that served our survival historically can lead to unintended negative results in the modern environment.",
    feedback: "핵심 대조(historically vs modern)를 잘 포착했습니다. 'counterproductive'라는 단어를 쓰지 않고도 그 의미를 완벽하게 형상화했네요. 이런 식의 패러프레이징 훈련이 내신 상위권과 수능 고난도 킬러 문항을 잡는 핵심입니다."
  },
];

export default function EssayPracticePage() {
  const [essaySets, setEssaySets] = useState<EssaySet[]>(MOCK_ESSAY_SETS);
  const [setIdx, setSetIdx] = useState(0);
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEssaySets();
        if (data && data.length > 0) {
          const formatted: EssaySet[] = data.map((s: any) => ({
            id: s.id,
            title: s.label,
            source: s.subtitle || "", 
            task: s.essay_items?.[0]?.instruction || "과제가 미설정되었습니다.",
            constraints: [], 
            sampleAnswer: s.essay_items?.[0]?.sample_answer || "",
            feedback: "데이터베이스에서 로드된 진단 결과입니다."
          }));
          setEssaySets(formatted);
        }
      } catch (err) {
        console.warn("Using mock essay sets:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const currentSet = essaySets[setIdx] || essaySets[0];

  const handleSetChange = (idx: number) => {
    setSetIdx(idx);
    setContent("");
    setSubmitted(false);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col h-full px-6 py-8 max-w-2xl mx-auto w-full relative bg-background animate-in fade-in duration-500">
      <div className="w-full mb-8 relative z-20">
        <button 
          onClick={() => setShowPicker(!showPicker)}
          className="w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] glass border border-foreground/5 text-left shadow-sm bg-white"
        >
          <div>
            <span className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1">배포된 서술형 과제 {setIdx + 1}/{essaySets.length}</span>
            <span className="text-[16px] font-black text-foreground">{currentSet.title}</span>
          </div>
          <ChevronDown size={18} className={`text-accent transition-transform ${showPicker ? "rotate-180" : ""}`} />
        </button>

        {showPicker && (
          <div className="absolute mt-3 w-full glass border border-foreground/10 rounded-[2.2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-50 p-2">
            {essaySets.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => handleSetChange(idx)}
                className={`w-full px-6 py-4 text-left hover:bg-foreground/5 transition-colors rounded-2xl border-b border-foreground/5 last:border-0 ${setIdx === idx ? "bg-foreground/5 shadow-inner" : ""}`}
              >
                <div className="text-[9px] font-black text-accent uppercase tracking-tighter mb-1">Passage Set {idx + 1}</div>
                <div className="text-[14px] font-bold text-foreground">{s.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-8 custom-scrollbar pb-32">
        <div className="glass framer-card rounded-[2.8rem] p-10 border border-foreground/5 shadow-sm relative bg-white/50">
          <div className="absolute top-0 left-10 -translate-y-1/2 bg-background px-4 py-1 rounded-full border border-foreground/5 text-[10px] font-black tracking-widest text-accent uppercase">
            지문 원문 (Context)
          </div>
          <p className="text-[16px] text-foreground leading-[1.9] font-medium serif italic opacity-80">
            "{currentSet.source}"
          </p>
          <div className="mt-10 p-7 rounded-[2.2rem] bg-foreground text-background shadow-2xl">
            <h3 className="text-[13px] font-black mb-5 uppercase tracking-[0.1em] flex items-center gap-2.5">
              <Lightbulb size={18} className="text-accent" />
              과제: {currentSet.task}
            </h3>
            <ul className="text-[14px] text-background/80 space-y-3 list-disc pl-6 font-medium">
              {currentSet.constraints.length > 0 ? currentSet.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              )) : (
                <li>지정된 세부 제약 조건이 없습니다.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="glass rounded-[2.8rem] p-2 border border-foreground/5 shadow-inner relative focus-within:border-foreground/30 transition-all duration-700 bg-white/30">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="당신만의 논증을 이곳에 영작하세요... (최소 10자 이상)"
            disabled={submitted}
            className="w-full min-h-[220px] p-8 bg-transparent border-none outline-none text-[17px] leading-relaxed text-foreground placeholder:text-accent/40 serif font-medium"
          />
        </div>

        {submitted && (
           <div className="framer-card rounded-[2.8rem] border border-success/30 bg-success/5 p-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
               <div className="flex items-center gap-2 mb-6">
                 <CheckCircle size={20} className="text-success" />
                 <span className="text-[11px] font-black text-success uppercase tracking-[0.2em]">Parallax AI Feedback</span>
               </div>
               <p className="text-[15px] text-foreground leading-[1.8] font-bold italic mb-8 border-l-4 border-success/20 pl-6 py-1">
                 {currentSet.feedback}
               </p>
               <div className="mt-6 pt-8 border-t border-success/10 bg-white/50 p-6 rounded-[1.8rem]">
                 <p className="text-[10px] font-black text-success uppercase tracking-widest mb-3">모범 답안 (Reference)</p>
                 <p className="text-[14px] text-foreground/70 font-bold serif leading-relaxed">{currentSet.sampleAnswer}</p>
               </div>
           </div>
        )}
      </div>

      <div className="fixed bottom-24 left-0 w-full px-8 flex justify-center z-20 pointer-events-none">
        <div className="w-full max-w-2xl flex justify-end pointer-events-auto">
          <button 
            onClick={() => setSubmitted(true)}
            disabled={content.trim().length < 10 || submitted}
            className="h-16 px-12 bg-foreground rounded-full flex items-center justify-center gap-3 text-background font-black text-[16px] shadow-2xl hover:scale-105 active:scale-95 transition-all duration-500 disabled:opacity-10 border-4 border-background"
          >
            {submitted ? "진단 완료" : "AI 논증 피드백 받기"}
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
