"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, ChevronDown, Loader2, MessageSquare, RotateCcw, BookOpen } from "lucide-react";
import { getAssignmentsByStudent } from "@/lib/assignment-service";

type Message = {
  id: string;
  sender: "ai" | "student";
  text: string;
  options?: { text: string }[];
  timestamp: number;
};

const STORAGE_KEY_PREFIX = "parallax_chat_";
const MAX_HISTORY = 40; // Keep last 40 messages per student

const OPENING_TEXT = `안녕! **Parallax AI 튜터**야. 고등학교 영어 전문 튜터로, 수능 영어와 내신 영어 모두 도와줄 수 있어.

지문 구조 분석, 어법 질문, 어휘 의미, 독해 전략, 공부법 등 영어에 관한 건 뭐든 물어봐.

지금 공부 중인 지문이 있으면 위에서 선택하거나, 자유롭게 질문해도 돼!`;

export default function AITeacherPage() {
  const [assignments, setAssignments] = useState<{ id: string; label: string; workbook?: string; chapter?: string; full_text?: string }[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("none");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studentName, setStudentName] = useState("학생");
  const [chatInitialized, setChatInitialized] = useState(false);

  // Get student name
  const getName = useCallback(() => {
    try {
      const saved = localStorage.getItem("stu_session");
      if (saved) return JSON.parse(saved).name || "학생";
    } catch { /* noop */ }
    return "학생";
  }, []);

  // Load chat history from localStorage
  const loadHistory = useCallback((name: string) => {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
    } catch { /* noop */ }
    return null;
  }, []);

  // Save chat history
  const saveHistory = useCallback((name: string, msgs: Message[]) => {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      const toSave = msgs.slice(-MAX_HISTORY);
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch { /* noop */ }
  }, []);

  // Initialize
  useEffect(() => {
    const name = getName();
    setStudentName(name);

    // Load assignments
    getAssignmentsByStudent(name).then(data => {
      setAssignments((data || []).filter(Boolean).map((s: { id: string; label: string; workbook?: string; chapter?: string; full_text?: string }) => ({
        id: s.id, label: s.label, workbook: s.workbook, chapter: s.chapter, full_text: s.full_text
      })));
    }).catch(err => console.warn("Assignment load failed:", err));

    // Load or initialize chat history
    const history = loadHistory(name);
    if (history && history.length > 0) {
      setMessages(history);
    } else {
      const openingMsg: Message = {
        id: "open", sender: "ai", text: OPENING_TEXT,
        options: [
          { text: "어법 질문이 있어요" },
          { text: "지문 해석이 어려워요" },
          { text: "단어 의미가 궁금해요" },
          { text: "공부법 상담하고 싶어요" },
        ],
        timestamp: Date.now()
      };
      setMessages([openingMsg]);
    }
    setChatInitialized(true);
  }, [getName, loadHistory]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save history whenever messages change
  useEffect(() => {
    if (chatInitialized && messages.length > 0 && studentName !== "학생") {
      saveHistory(studentName, messages);
    }
  }, [messages, chatInitialized, studentName, saveHistory]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const studentMsg: Message = {
      id: Date.now().toString(), sender: "student", text: text.trim(), timestamp: Date.now()
    };
    const newMessages = [...messages, studentMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Build context
      const selected = assignments.find(a => a.id === selectedSetId);
      const passageContext = selected
        ? `지문: ${selected.workbook || ""} ${selected.chapter || ""} ${selected.label}\n원문: ${selected.full_text || "(원문 없음)"}`
        : "None (General English Question)";

      // Build history for API (last 20 messages only for context window)
      const historyForAPI = newMessages.slice(-20).map(m => ({
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.text
      }));

      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: passageContext,
          message: text.trim(),
          history: historyForAPI.slice(0, -1) // exclude the current message (already in message field)
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.reply || "잠시 후 다시 시도해 주세요.";
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), sender: "ai", text: replyText,
        options: data.options,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(), sender: "ai",
        text: `오류가 발생했습니다: ${(err as Error).message}. 잠시 후 다시 시도해 주세요.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleOptionClick = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const handleClearChat = () => {
    if (!confirm("대화 내역을 전부 초기화하시겠습니까?")) return;
    const openingMsg: Message = {
      id: "open_" + Date.now(), sender: "ai", text: OPENING_TEXT,
      options: [
        { text: "어법 질문이 있어요" },
        { text: "지문 해석이 어려워요" },
        { text: "단어 의미가 궁금해요" },
        { text: "공부법 상담하고 싶어요" },
      ],
      timestamp: Date.now()
    };
    setMessages([openingMsg]);
    try { localStorage.removeItem(STORAGE_KEY_PREFIX + studentName); } catch { /* noop */ }
  };

  const selectedSet = assignments.find(a => a.id === selectedSetId);
  const lastAIMsg = [...messages].reverse().find(m => m.sender === "ai");

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full relative bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-5 shrink-0 z-20 bg-background/80 backdrop-blur-md sticky top-0 border-b border-foreground/5">
        <div className="w-10 h-10 rounded-[1rem] bg-foreground text-background flex items-center justify-center shadow-xl shrink-0">
          <Sparkles size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-[15px] text-foreground font-black">Parallax AI 튜터</h1>
            <span className="text-[9px] font-black text-accent/60 bg-accent-light px-2 py-0.5 rounded-md border border-foreground/5 uppercase tracking-widest">
              {messages.length > 1 ? `${messages.length}개 대화` : "새 대화"}
            </span>
          </div>
          {/* Passage Selector */}
          <div className="relative">
            <select
              value={selectedSetId}
              onChange={e => setSelectedSetId(e.target.value)}
              className="w-full bg-accent-light border border-foreground/5 text-accent text-[11px] font-bold rounded-xl px-3 py-1.5 appearance-none focus:outline-none cursor-pointer pr-8 hover:border-foreground/20 transition-all"
            >
              <option value="none">지문 없이 자유 질문</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.workbook ? `${a.workbook} · ${a.chapter || ""} · ` : ""}{a.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2 rounded-xl text-accent hover:text-error hover:bg-error/5 transition-all"
          title="대화 초기화"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Context Badge */}
      {selectedSet && (
        <div className="mx-6 mt-4 mb-0 px-4 py-2.5 bg-foreground/5 rounded-2xl border border-foreground/5 flex items-center gap-2 animate-in fade-in duration-300">
          <BookOpen size={13} className="text-accent shrink-0" />
          <span className="text-[12px] font-bold text-foreground truncate">{selectedSet.workbook} · {selectedSet.chapter} · {selectedSet.label}</span>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar flex flex-col gap-6 pb-[200px] pt-6">
        {messages.map((msg, idx) => {
          const isLastAI = msg === lastAIMsg && msg.sender === "ai";
          return (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              {/* Date separator for first message of the day */}
              {idx > 0 && msg.timestamp - messages[idx - 1].timestamp > 3600000 && (
                <div className="text-center text-[10px] font-bold text-accent/40 my-3">
                  {new Date(msg.timestamp).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <div className={`flex ${msg.sender === "ai" ? "justify-start" : "justify-end"}`}>
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles size={12} strokeWidth={1.5} />
                  </div>
                )}
                <div className="max-w-[85%] flex flex-col gap-2.5">
                  <div className={`p-5 rounded-[2rem] text-[14px] shadow-sm whitespace-pre-wrap leading-[1.7] ${
                    msg.sender === "ai"
                      ? "bg-white border border-foreground/5 text-foreground rounded-tl-sm font-medium"
                      : "bg-foreground text-background rounded-tr-sm shadow-xl font-medium"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>

              {/* Follow-up options — only on last AI message */}
              {isLastAI && msg.options && msg.options.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-4 ml-9 pr-6 animate-in slide-in-from-left-4 duration-500">
                  {msg.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionClick(opt.text)}
                      disabled={isLoading}
                      className="text-left text-[12px] font-bold text-foreground bg-white hover:bg-foreground hover:text-background border border-foreground/10 px-5 py-3 rounded-[1.5rem] transition-all active:scale-[0.98] leading-snug shadow-sm disabled:opacity-50"
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 ml-9 animate-in fade-in duration-300">
            <div className="flex gap-1.5">
              {[0, 150, 300].map(delay => (
                <div key={delay} className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
            <span className="text-[11px] text-accent font-bold">Parallax가 생각 중...</span>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="fixed bottom-[88px] left-0 right-0 w-full max-w-2xl mx-auto px-5 z-20 pb-4">
        <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-4">
          <form id="ai-form" onSubmit={handleSend}
            className="relative bg-white rounded-[2rem] p-2 border border-foreground/10 flex items-end shadow-[0_8px_32px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="pl-4 text-accent opacity-30 shrink-0 pb-3">
              <MessageSquare size={16} />
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={selectedSet ? `${selectedSet.label}에 대해 질문해봐...` : "영어에 대해 무엇이든 물어봐..."}
              className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-[14px] font-medium placeholder:text-accent/50 text-foreground w-full shadow-none resize-none min-h-[44px] max-h-[120px]"
              rows={1}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 shrink-0 rounded-[1.3rem] bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-md self-end"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
            </button>
          </form>
          <p className="text-center text-[10px] text-accent/40 font-bold mt-2">
            대화 내역은 자동 저장되며 다음 방문 시 이어집니다
          </p>
        </div>
      </div>
    </div>
  );
}
