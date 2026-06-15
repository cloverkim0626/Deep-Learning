"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Sparkles, Loader2, MessageSquare, RotateCcw, BookOpen, ChevronDown } from "lucide-react";
import { getAllPassagesForTutor } from "@/lib/database-service";

type Message = {
  id: string;
  sender: "ai" | "student";
  text: string;
  options?: { text: string }[];
  timestamp: number;
};

type Passage = {
  id: string;
  label: string;
  workbook: string | null;
  chapter: string | null;
  sub_category: string | null;
  sub_sub_category: string | null;
  passage_number: string | null;
  full_text: string | null;
};

const STORAGE_KEY_PREFIX = "genie_chat_";
const MAX_HISTORY = 40;

const OPENING_TEXT = `안녕! **Genie**야. 고등학교 영어 전문 튜터로, 수능 영어와 내신 영어 모두 도와줄 수 있어.

지문 구조 분석, 어법 질문, 어휘 의미, 독해 전략, 공부법 등 영어에 관한 건 뭐든 물어봐.

지금 공부 중인 지문이 있으면 위에서 선택하거나, 자유롭게 질문해도 돼!`;

export default function AITeacherPage() {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("none");

  // 3단계 필터
  const [filterWorkbook, setFilterWorkbook] = useState<string>("전체");
  const [filterMid, setFilterMid] = useState<string>("전체");
  const [filterSub, setFilterSub] = useState<string>("전체");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [studentName, setStudentName] = useState("학생");
  const [chatInitialized, setChatInitialized] = useState(false);
  const [passagesLoading, setPassagesLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false); // 처음엔 접힌 상태
  const [keepPassage, setKeepPassage] = useState(false); // 현재 지문으로 계속 질문하기
  const [rememberPassage, setRememberPassage] = useState(false); // 최근 지문 기억

  const getName = useCallback(() => {
    try {
      const saved = localStorage.getItem("stu_session");
      if (saved) return JSON.parse(saved).name || "학생";
    } catch { /* noop */ }
    return "학생";
  }, []);

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

  const saveHistory = useCallback((name: string, msgs: Message[]) => {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      const toSave = msgs.slice(-MAX_HISTORY);
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const name = getName();
    setStudentName(name);

    // 최근 지문 기억 설정 복원
    try {
      const savedPassage = localStorage.getItem('genie_last_passage');
      if (savedPassage) {
        const sp = JSON.parse(savedPassage);
        setRememberPassage(true);
        if (sp.setId) setSelectedSetId(sp.setId);
        if (sp.workbook) setFilterWorkbook(sp.workbook);
        if (sp.mid) setFilterMid(sp.mid);
        if (sp.sub) setFilterSub(sp.sub);
      }
    } catch { /* noop */ }

    // 최근 경로 복원 (지문 기억 없을 때)
    try {
      const savedPath = localStorage.getItem('ai_tutor_last_path');
      if (savedPath && !localStorage.getItem('genie_last_passage')) {
        const p = JSON.parse(savedPath);
        if (p.workbook) setFilterWorkbook(p.workbook);
        if (p.mid) setFilterMid(p.mid);
        if (p.sub) setFilterSub(p.sub);
      }
    } catch { /* noop */ }

    // 전체 지문 로드 (배당 여부 무관)
    setPassagesLoading(true);
    getAllPassagesForTutor()
      .then(data => setPassages(data as Passage[]))
      .catch(err => console.warn("Passages load failed:", err))
      .finally(() => setPassagesLoading(false));

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatInitialized && messages.length > 0 && studentName !== "학생") {
      saveHistory(studentName, messages);
    }
  }, [messages, chatInitialized, studentName, saveHistory]);

  // ─── 필터 파생 데이터 ──────────────────────────────────────────────────────────
  const workbooks = useMemo(() => {
    const set = new Set(passages.map(p => p.workbook || "기타"));
    return ["전체", ...Array.from(set).sort()];
  }, [passages]);

  const midCategories = useMemo(() => {
    const base = filterWorkbook === "전체" ? passages : passages.filter(p => (p.workbook || "기타") === filterWorkbook);
    const set = new Set(base.map(p => p.sub_category || p.chapter || "기타"));
    return ["전체", ...Array.from(set).sort()];
  }, [passages, filterWorkbook]);

  const subCategories = useMemo(() => {
    let base = filterWorkbook === "전체" ? passages : passages.filter(p => (p.workbook || "기타") === filterWorkbook);
    if (filterMid !== "전체") base = base.filter(p => (p.sub_category || p.chapter || "기타") === filterMid);
    const subs = [...new Set(base.map(p => p.sub_sub_category).filter(Boolean))] as string[];
    return subs.length > 0 ? ["전체", ...subs.sort()] : [];
  }, [passages, filterWorkbook, filterMid]);

  const filteredPassages = useMemo(() => {
    let base = passages;
    if (filterWorkbook !== "전체") base = base.filter(p => (p.workbook || "기타") === filterWorkbook);
    if (filterMid !== "전체") base = base.filter(p => (p.sub_category || p.chapter || "기타") === filterMid);
    if (filterSub !== "전체") base = base.filter(p => p.sub_sub_category === filterSub);
    return base;
  }, [passages, filterWorkbook, filterMid, filterSub]);

  // 필터 변경 + 최근 경로 저장
  const savePath = (wb: string, mid: string, sub: string) => {
    try { localStorage.setItem('ai_tutor_last_path', JSON.stringify({ workbook: wb, mid, sub })); } catch { /* noop */ }
  };
  const changeWorkbook = (val: string) => {
    setFilterWorkbook(val); setFilterMid("전체"); setFilterSub("전체"); setSelectedSetId("none");
    savePath(val, "전체", "전체");
  };
  const changeMid = (val: string) => {
    setFilterMid(val); setFilterSub("전체"); setSelectedSetId("none");
    savePath(filterWorkbook, val, "전체");
  };
  const changeSub = (val: string) => {
    setFilterSub(val); setSelectedSetId("none");
    savePath(filterWorkbook, filterMid, val);
  };

  // 지문 선택 저장 헬퍼
  const selectPassage = (id: string) => {
    setSelectedSetId(id);
    if (id !== 'none') setSelectorOpen(false);
    if (rememberPassage && id !== 'none') {
      const p = passages.find(x => x.id === id);
      try {
        localStorage.setItem('genie_last_passage', JSON.stringify({
          setId: id,
          workbook: filterWorkbook,
          mid: filterMid,
          sub: filterSub,
          label: p?.label || '',
        }));
      } catch { /* noop */ }
    }
  };

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
      const selected = passages.find(a => a.id === selectedSetId);
      const passageContext = selected
        ? `지문: ${selected.workbook || ""} ${selected.sub_category || selected.chapter || ""} ${selected.label}\n원문: ${selected.full_text || "(원문 없음)"}`
        : "None (General English Question)";

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
          history: historyForAPI.slice(0, -1)
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

  const selectedSet = passages.find(a => a.id === selectedSetId);
  const lastAIMsg = [...messages].reverse().find(m => m.sender === "ai");

  // SelectBox: 라이트 헤더에 맞는 밝은 스타일
  const SelectBox = ({ value, onChange, children, className = "" }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
  }) => (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#fff',
          border: '1.5px solid rgba(0,0,0,0.08)',
          color: '#111',
          fontSize: '11px',
          fontWeight: 700,
          borderRadius: '10px',
          padding: '6px 28px 6px 10px',
          appearance: 'none',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {children}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full relative bg-transparent">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 shrink-0 z-20 sticky top-0 border-b"
        style={{ background: 'rgba(253, 251, 247, 0.97)', borderColor: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}>
        {/* 딥러닝 Parallax 로고 아이콘 */}
        <div className="w-9 h-9 rounded-[0.8rem] overflow-hidden shadow-sm shrink-0 mt-0.5"
          style={{ border: '1px solid rgba(0,0,0,0.10)' }}>
          <img src="/app-icon.jpg" alt="Deep Learning" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-[18px]" style={{
              fontFamily: 'var(--font-outfit), "Outfit", "Plus Jakarta Sans", sans-serif',
              fontWeight: 700,
              color: '#0f766e',
              letterSpacing: '-0.4px',
            }}>Genie</h1>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest"
              style={{ color: '#475569', background: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.08)' }}>
              {messages.length > 1 ? `${messages.length}개 대화` : "새 대화"}
            </span>
            {passagesLoading && <span className="text-[9px] font-bold" style={{ color: '#999' }}>지문 로딩 중...</span>}
            {/* 최근 지문 기억 체크박스 */}
            <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberPassage}
                onChange={e => {
                  setRememberPassage(e.target.checked);
                  if (!e.target.checked) {
                    try { localStorage.removeItem('genie_last_passage'); } catch { /* noop */ }
                  } else if (selectedSetId !== 'none') {
                    const p = passages.find(x => x.id === selectedSetId);
                    try {
                      localStorage.setItem('genie_last_passage', JSON.stringify({
                        setId: selectedSetId, workbook: filterWorkbook,
                        mid: filterMid, sub: filterSub, label: p?.label || '',
                      }));
                    } catch { /* noop */ }
                  }
                }}
                className="w-3.5 h-3.5 rounded cursor-pointer"
                style={{ accentColor: '#10b981' }}
              />
              <span className="text-[10px] font-bold transition-colors text-slate-500">지문 기억</span>
            </label>
          </div>

          <button
            onClick={() => setSelectorOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all mb-1.5 w-full"
            style={{
              background: selectorOpen ? 'rgba(16,185,129,0.08)' : '#ffffff',
              border: selectorOpen ? '1.5px solid #10b981' : '1.5px solid rgba(0,0,0,0.08)',
              color: '#111',
            }}
          >
            <BookOpen size={13} style={{ color: selectorOpen ? '#10b981' : '#64748b', flexShrink: 0 }} />
            <span className="text-[12px] font-black flex-1 text-left truncate" style={{ color: '#111' }}>
              {selectedSetId !== 'none' && !selectorOpen
                ? (() => { const p = passages.find(x => x.id === selectedSetId); return p ? (p.label || '지문 선택됨') : '지문 선택'; })()
                : '지문 선택'
              }
            </span>
            {!selectorOpen && selectedSetId === 'none' && (
              <span className="text-[9px] font-bold text-slate-400">(탭해서 선택)</span>
            )}
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${selectorOpen ? 'rotate-180' : ''} text-slate-400`} />
          </button>

          {/* ── 3단계 필터 (selectorOpen 일 때만 표시) ── */}
          {selectorOpen && (
            <div className="space-y-1.5">
              {/* Row 1: 교재 + 중분류 */}
              <div className="grid grid-cols-2 gap-1.5">
                <SelectBox value={filterWorkbook} onChange={changeWorkbook}>
                  {workbooks.map(w => <option key={w} value={w}>{w === "전체" ? "📚 교재 전체" : w}</option>)}
                </SelectBox>
                <SelectBox value={filterMid} onChange={changeMid}>
                  {midCategories.map(c => <option key={c} value={c}>{c === "전체" ? "📂 단원 전체" : c}</option>)}
                </SelectBox>
              </div>
              {/* Row 2: 소분류 (있을 때만) */}
              {subCategories.length > 0 && (
                <SelectBox value={filterSub} onChange={changeSub}>
                  {subCategories.map(c => <option key={c} value={c}>{c === "전체" ? "📁 소단원 전체" : c}</option>)}
                </SelectBox>
              )}
              {/* Row 3: 지문 선택 */}
              <div className="relative">
                <select
                  value={selectedSetId}
                  onChange={e => selectPassage(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] font-bold rounded-xl px-3 py-2 appearance-none focus:outline-none cursor-pointer pr-8 hover:border-slate-300 transition-all"
                >
                  <option value="none">지문 없이 자유 질문</option>
                  {filteredPassages.map(a => (
                    <option key={a.id} value={a.id}>
                      {[a.sub_sub_category, a.passage_number ? `${a.passage_number}번` : ""].filter(Boolean).join(" · ")}{" "}{a.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

        </div>
        <button
          onClick={handleClearChat}
          className="p-2 rounded-xl text-accent hover:text-error hover:bg-error/5 transition-all shrink-0 mt-0.5"
          title="대화 초기화"
        >
          <RotateCcw size={15} />
        </button>
      </div>



      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar flex flex-col gap-4 pb-[200px] pt-4">
        {messages.map((msg, idx) => {
          const isLastAI = msg === lastAIMsg && msg.sender === 'ai';
          return (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              {idx > 0 && msg.timestamp - messages[idx - 1].timestamp > 3600000 && (
                <div className="text-center text-[10px] font-bold my-3 text-slate-400">
                  {new Date(msg.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                {msg.sender === 'ai' && (
                  <div className="p-[2px] rounded-full shrink-0 mr-2 mt-1 self-end"
                    style={{ background: 'linear-gradient(135deg,#10b981,#fb923c)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <Sparkles size={11} strokeWidth={1.5} className="text-teal-600" />
                    </div>
                  </div>
                )}
                <div className="max-w-[80%] flex flex-col gap-2">
                  <div className={`px-4 py-3 text-[13.5px] whitespace-pre-wrap leading-[1.7] ${
                    msg.sender === 'ai'
                      ? 'rounded-[1.4rem] rounded-bl-sm font-medium'
                      : 'rounded-[1.4rem] rounded-br-sm font-medium'
                  }`} style={msg.sender === 'ai'
                    ? { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }
                    : { background: 'linear-gradient(135deg,#10b981,#fb923c)', color: '#fff', boxShadow: '0 4px 20px rgba(251,146,60,0.25)' }}>
                    {msg.text}
                  </div>
                </div>
              </div>

              {isLastAI && msg.options && msg.options.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-3 ml-10 pr-4 animate-in slide-in-from-left-4 duration-500">
                  {msg.options.map((opt, optIdx) => (
                    <button key={optIdx} onClick={() => handleOptionClick(opt.text)}
                      disabled={isLoading}
                      className="text-left text-[12px] font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
                      style={{ background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.2)', color: '#0f766e' }}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 ml-10 animate-in fade-in duration-300">
            <div className="flex gap-1">
              {[0, 150, 300].map(delay => (
                <div key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgba(16,185,129,0.5)', animationDelay: `${delay}ms` }} />
              ))}
            </div>
            <span className="text-[11px] font-bold text-emerald-600">Parallax가 생각 중...</span>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* IG DM 스타일 입력창 */}
      <div className="fixed bottom-[88px] left-0 right-0 w-full max-w-2xl mx-auto px-4 z-20 pb-4">
        <div className="pt-3" style={{ background: 'linear-gradient(to top, #fafaf6 80%, transparent)' }}>
          <form id="ai-form" onSubmit={handleSend}
            className="relative flex items-end gap-2 px-4 py-2.5 rounded-[2rem] bg-white"
            style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={selectedSet ? `${selectedSet.label}에 대해 질문해봐...` : '영어에 대해 무엇이든 물어봐...'}
              className="flex-1 bg-transparent outline-none text-[14px] font-medium resize-none min-h-[36px] max-h-[100px] text-foreground placeholder:text-accent/50"
              style={{ caretColor: '#fb923c' }}
              rows={1}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }}
            />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg,#10b981,#fb923c)', boxShadow: '0 4px 14px rgba(251,146,60,0.25)' }}>
              {isLoading ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} strokeWidth={2.5} className="text-white" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

