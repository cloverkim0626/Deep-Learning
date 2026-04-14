"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Tag, ChevronDown } from "lucide-react";

type Option = { text: string; isCorrect?: boolean; followUpKey?: string };
type Message = {
  id: string;
  sender: "ai" | "student";
  text: string;
  errorTag?: { code: string; label: string };
  options?: Option[];
};

const PASSAGES: Record<string, { short: string; full: string; sentences: Record<string, string> }> = {
  p1: { 
    short: "Trust Your Gut?", 
    full: "[수능특강 12강 2번] Trust Your Gut?",
    sentences: {
      S01: "Ironically, the very instinct that once protected us may now be counterproductive in modern life.",
      S02: "The ingestion of even small amounts of certain plant toxins could be fatal to early humans.",
      S03: "Early humans relied upon experience to judge which plants were safe to eat.",
      S09: "It’s the only reason for anyone to trust anything about reality.",
      S10: "Without testing and evidence, intuition is useful, but it is never the ultimate word."
    }
  },
};

const OPENING: Message = {
  id: "open", sender: "ai",
  text: "안녕! 오늘 공부는 좀 어때? 지금 지문에서 막히는 부분이 있다면 내가 도와줄게. 문장 구조가 어렵니, 아니면 전체적인 흐름이 궁금하니?",
  options: [
    { text: "특정 문장 해석이 안 돼", followUpKey: "ask_specific" },
    { text: "지문 전체 논리가 궁금해", followUpKey: "ask_logic" },
    { text: "그냥 기초부터 천천히 알려줘", followUpKey: "start_basic" },
  ]
};

export default function AITeacherPage() {
  const [passage, setPassage] = useState("p1");
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushMessages = (...msgs: Message[]) => setMessages(prev => [...prev, ...msgs]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    
    const studentMsg: Message = { id: Date.now().toString(), sender: "student", text };
    pushMessages(studentMsg);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.sender === "ai" ? "assistant" : "user", content: m.text }));
      const currentPassage = PASSAGES[passage]?.full || "";

      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage: currentPassage, message: text, history }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Robust check for various possible AI response keys
      const aiResponseText = data.reply || data.text || data.answer || "미안해, 다시 한 번 설명해줄 수 있겠니? (응답 형식을 맞추지 못했어)";
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: "ai", 
        text: aiResponseText, 
        options: data.options,
        errorTag: data.errorTag
      };
      pushMessages(aiMsg);
    } catch (err: any) {
      pushMessages({ id: Date.now().toString(), sender: "ai", text: `에러가 발생했어: ${err.message}. 잠시 후 다시 시도해줘.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (opt: Option) => {
    if (isLoading) return;
    setInput(opt.text);
    setTimeout(() => document.getElementById("ai-form")?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 10);
  };

  const lastAIMsg = [...messages].reverse().find(m => m.sender === "ai");

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full relative bg-background">
      {/* Header - Sticky within layout */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-5 shrink-0 animate-in fade-in duration-500">
        <div className="w-12 h-12 rounded-[1.2rem] bg-foreground text-background flex items-center justify-center shadow-xl shrink-0 group hover:rotate-6 transition-transform">
          <Sparkles size={20} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] text-foreground serif font-black leading-none mb-2">AI 코어 튜터 (Socratic)</h1>
          <div className="relative group">
            <select value={passage} onChange={e => setPassage(e.target.value)}
              className="w-full bg-accent-light border border-foreground/5 text-accent text-[12px] font-bold rounded-xl px-4 py-2 appearance-none focus:outline-none cursor-pointer pr-10 hover:border-foreground/20 transition-all">
              {Object.entries(PASSAGES).map(([k, v]) => <option key={k} value={k}>{v.full}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar flex flex-col gap-6 pb-24 pt-2">
        {messages.map((msg) => {
          const isLastAI = msg === lastAIMsg && msg.sender === "ai";
          return (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className={`flex ${msg.sender === "ai" ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[85%] flex flex-col gap-2">
                  <div className={`p-5 rounded-[2rem] text-[15px] leading-relaxed font-medium shadow-sm whitespace-pre-wrap ${
                    msg.sender === "ai"
                      ? "bg-white border border-foreground/10 text-foreground rounded-tl-sm shadow-inner-white"
                      : "bg-foreground text-background rounded-tr-sm shadow-xl"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.errorTag && (
                    <div className="flex items-center gap-2 px-2">
                      <Tag size={12} className="text-red-500" strokeWidth={2.5} />
                      <span className="text-[11px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                        {msg.errorTag.label} (Code: {msg.errorTag.code})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isLastAI && msg.options && (
                <div className="flex flex-col gap-2 mt-4 pl-1">
                  {msg.options.map((opt, idx) => (
                    <button key={idx} onClick={() => handleOptionClick(opt)}
                      className="text-left text-[14px] font-bold text-foreground bg-accent-light hover:bg-foreground hover:text-background border border-foreground/5 px-5 py-3.5 rounded-2xl transition-all active:scale-[0.98] leading-snug shadow-sm">
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <form id="ai-form" onSubmit={handleSend} className="relative glass-dark rounded-full p-2 border border-foreground/10 flex items-center focus-within:ring-2 ring-foreground/5 transition-all duration-500 shadow-2xl">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="궁금한 문장이나 단어를 물어봐..."
            className="flex-1 bg-transparent border-none outline-none px-6 py-3.5 text-[15px] font-medium placeholder:text-accent/60 text-foreground w-full"
          />
          <button type="submit" disabled={!input.trim() || isLoading}
            className="w-12 h-12 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg">
            {isLoading ? <span className="animate-spin text-[18px]">◌</span> : <Send size={18} strokeWidth={2.5} className="-ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
