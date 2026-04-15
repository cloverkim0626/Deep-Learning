"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ChevronDown, ChevronUp, Send, CheckCircle, RefreshCw, Clock, Search } from "lucide-react";
import { getQnaPosts, addQnaAnswer } from "@/lib/database-service";

type Answer = { id: string; author: string; isTeacher: boolean; text: string; time: string };
type Question = {
  id: string; author: string; passage: string;
  question: string; createdAt: string; status: "pending" | "answered";
  answers: Answer[];
};

export default function AdminQnAPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await getQnaPosts();
      if (data) {
        const formatted: Question[] = (data as { id: string; author_name?: string; passage_id?: string; question: string; status?: string; created_at: string; qna_answers?: { id: string; author_name?: string; is_teacher?: boolean; text: string; created_at: string }[] }[]).map(p => ({
          id: p.id,
          author: p.author_name || "익명",
          passage: p.passage_id || "기타",
          question: p.question,
          createdAt: p.created_at,
          status: (p.status as "pending" | "answered") || "pending",
          answers: (p.qna_answers || []).map(a => ({
            id: a.id,
            author: a.is_teacher ? "선생님" : (a.author_name || "익명"),
            isTeacher: !!a.is_teacher,
            text: a.text,
            time: new Date(a.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
          }))
        }));
        setQuestions(formatted);
      }
    } catch (err) {
      console.error("QnA load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const submitReply = async (qId: string) => {
    const text = replyInputs[qId]?.trim();
    if (!text) return;
    setSubmittingId(qId);
    try {
      await addQnaAnswer(qId, "선생님", text, true);
      setReplyInputs(prev => ({ ...prev, [qId]: "" }));
      await loadData(); // Reload to get updated data
    } catch (err: unknown) {
      alert("답변 등록 실패: " + (err as Error).message);
    } finally {
      setSubmittingId(null);
    }
  };

  const filtered = questions.filter(q => {
    const matchFilter = filter === "all" || q.status === filter;
    const matchSearch = !search || q.author.includes(search) || q.question.includes(search) || q.passage.includes(search);
    return matchFilter && matchSearch;
  });

  const unansweredCount = questions.filter(q => q.status === "pending").length;

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">Q&A 답변 관리</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">학생 질문 · DB 실시간 연동 · 20초 자동 갱신</p>
        </div>
        <div className="flex items-center gap-3">
          {unansweredCount > 0 && (
            <div className="flex items-center gap-2 text-[13px] font-bold text-error bg-error/5 border border-error/10 px-4 py-2 rounded-xl">
              미답변 {unansweredCount}건
            </div>
          )}
          <button
            onClick={() => { setIsLoading(true); loadData(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="glass rounded-[2rem] p-6 border border-foreground/5 mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="학생이름 · 질문 내용 · 지문 검색..."
            className="w-full h-11 pl-10 pr-4 bg-accent-light rounded-xl border border-transparent focus:border-foreground/20 text-[13px] font-medium outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "answered"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${filter === f ? "bg-foreground text-background shadow" : "bg-accent-light text-accent hover:text-foreground"}`}>
              {f === "all" ? "전체" : f === "pending" ? "미답변" : "답변완료"}
            </button>
          ))}
        </div>
      </div>

      {/* Question List */}
      {isLoading ? (
        <div className="py-16 text-center text-accent animate-pulse font-bold">질문을 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center glass rounded-[2.5rem] border border-foreground/5">
          <MessageSquare size={32} className="text-accent mx-auto mb-3 opacity-30" />
          <p className="text-accent font-bold opacity-50">해당하는 질문이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(q => (
            <div key={q.id}
              className={`glass rounded-[1.5rem] border transition-all ${
                q.status === "answered" ? "border-foreground/5 opacity-80" : "border-error/15 shadow-[0_4px_24px_rgba(214,59,47,0.06)]"
              }`}>
              <button className="w-full flex items-start justify-between p-5 text-left gap-4"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center text-[13px] font-black shrink-0 ${
                    q.status === "answered" ? "bg-success/10 text-success" : "bg-error/10 text-error"
                  }`}>
                    {q.status === "answered" ? <CheckCircle size={18} strokeWidth={2} /> : <MessageSquare size={18} strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-black text-foreground text-[14px]">{q.author}</span>
                      <span className="text-[10px] text-accent bg-accent-light px-2 py-0.5 rounded-lg">{q.passage}</span>
                    </div>
                    <p className="text-[13px] text-foreground/80 font-medium leading-snug truncate pr-4">{q.question}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-accent">
                    {new Date(q.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
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
                    <div key={ans.id} className={`rounded-2xl px-5 py-4 ${ans.isTeacher ? "bg-foreground text-background" : "bg-accent-light/50 text-foreground"}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                        {ans.author} · {ans.time}
                      </p>
                      <p className="text-[14px] font-medium leading-relaxed">{ans.text}</p>
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <textarea
                      value={replyInputs[q.id] || ""}
                      onChange={e => setReplyInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="학생에게 답변을 입력하세요..."
                      rows={3}
                      className="flex-1 px-5 py-3.5 rounded-2xl border border-foreground/10 bg-transparent text-[13px] font-medium focus:outline-none focus:border-foreground/30 text-foreground placeholder:text-accent resize-none leading-relaxed"
                    />
                    <button
                      onClick={() => submitReply(q.id)}
                      disabled={!replyInputs[q.id]?.trim() || submittingId === q.id}
                      className="h-12 self-end px-5 bg-foreground text-background font-bold text-[13px] rounded-2xl flex items-center gap-2 shrink-0 hover:-translate-y-0.5 transition-all disabled:opacity-30"
                    >
                      <Send size={14} strokeWidth={2} />
                      {submittingId === q.id ? "전송 중..." : "답변"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
