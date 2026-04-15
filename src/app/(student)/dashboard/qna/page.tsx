"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, CheckCircle, Plus, X, ChevronRight, User } from "lucide-react";
import { getQnaPosts, createQnaPost, addQnaAnswer } from "@/lib/database-service";

type Answer = {
  id: string; author: string; isTeacher: boolean; text: string; time: string;
};
type Post = {
  id: string; author: string; passage: string; question: string;
  status: "pending" | "answered"; answers: Answer[]; showAnswers: boolean;
  createdAt: string;
};

const WORKBOOKS = ["수능특강", "수능완성", "교과서 (고난도)", "기타/교제없음"];

export default function QnAPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState("학생");
  const [studentClass, setStudentClass] = useState("");

  // Modal state
  const [step, setStep] = useState(1);
  const [selWorkbook, setSelWorkbook] = useState("");
  const [selChapter, setSelChapter] = useState("");
  const [selPassage, setSelPassage] = useState("");
  const [question, setQuestion] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stu_session");
      if (saved) {
        const data = JSON.parse(saved);
        setStudentName(data.name || "학생");
        setStudentClass(data.class || "");
      }
    } catch { /* noop */ }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await getQnaPosts();
      if (data) {
        const formatted: Post[] = (data as {
          id: string; author_name?: string; passage_id?: string; question: string;
          status?: string; created_at: string;
          qna_answers?: { id: string; author_name?: string; is_teacher?: boolean; text: string; created_at: string }[];
        }[]).map(p => ({
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
            time: new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          })),
          showAnswers: false
        }));
        setPosts(formatted);
      }
    } catch (err) {
      console.warn("Q&A load failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isMyPost = (authorName: string) => authorName === studentName;

  const handlePostQuestion = async () => {
    if (!question.trim()) return;
    setIsPosting(true);
    try {
      const passageLabel = [selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ");
      await createQnaPost(studentName, passageLabel || "기타", question);
      await loadData(); // Reload from DB to get accurate data
      setShowModal(false);
      resetModal();
    } catch (err) {
      alert("질문 등록에 실패했습니다.");
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostComment = async (postId: string) => {
    const text = commentInput[postId];
    if (!text?.trim()) return;
    setSubmittingCommentId(postId);
    try {
      await addQnaAnswer(postId, studentName, text, false);
      setCommentInput(prev => ({ ...prev, [postId]: "" }));
      await loadData(); // Reload to get accurate answer data
    } catch {
      alert("답변 등록에 실패했습니다.");
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const resetModal = () => {
    setStep(1); setSelWorkbook(""); setSelChapter(""); setSelPassage(""); setQuestion("");
  };

  const toggleAnswers = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, showAnswers: !p.showAnswers } : p));
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">Q&A 게시판</h1>
          <p className="text-[13px] text-accent mt-2 font-medium">학습 중 궁금한 점을 질문하고 함께 토론해 보세요.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-32 flex flex-col gap-6 pt-4">
        {isLoading ? (
          <div className="text-center py-20 text-accent font-bold animate-pulse">질문들을 불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center text-accent font-bold opacity-40">
            아직 질문이 없어요. 먼저 질문해봐!
          </div>
        ) : (
          posts.map(post => {
            const isMine = isMyPost(post.author);
            return (
              <div key={post.id}
                className={`glass border rounded-[2.5rem] p-8 transition-all bg-white ${isMine ? "border-foreground/15 shadow-md" : "border-foreground/5"}`}>
                {/* Author Row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMine ? "bg-foreground text-background" : "bg-accent-light"}`}>
                      {isMine ? (
                        <span className="text-[14px] font-black">{studentName[0]}</span>
                      ) : (
                        <User size={18} className="text-accent" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-black ${isMine ? "text-foreground" : "text-accent"}`}>
                          {isMine ? `나 (${studentName})` : "익명"}
                        </span>
                        {isMine && (
                          <span className="text-[9px] font-black text-foreground/30 bg-foreground/5 px-2 py-0.5 rounded-lg border border-foreground/5">내 글</span>
                        )}
                      </div>
                      <span className="text-[11px] text-accent font-bold opacity-60 mt-0.5 block italic">{post.passage}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${
                    post.status === "answered" ? "bg-success/5 text-success border-success/10" : "bg-accent-light text-accent border-foreground/5"
                  }`}>
                    {post.status === "answered" ? "답변 완료" : "답변 대기"}
                  </div>
                </div>

                {/* Question */}
                <p className="text-[16px] text-foreground font-medium leading-relaxed mb-6">{post.question}</p>

                {/* Time */}
                <p className="text-[11px] text-accent/50 font-bold mb-4">
                  {new Date(post.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>

                {/* Answer toggle */}
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => toggleAnswers(post.id)}
                    className="flex items-center gap-2 text-[13px] font-black text-accent hover:text-foreground transition-all"
                  >
                    <MessageCircle size={18} strokeWidth={2.5} />
                    답변 {post.answers.length}개
                  </button>
                </div>

                {/* Answers */}
                {post.showAnswers && (
                  <div className="mt-8 space-y-4 border-t border-foreground/5 pt-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    {post.answers.length === 0 && (
                      <p className="text-[13px] text-accent/50 font-bold text-center py-4">
                        아직 답변이 없어요.
                      </p>
                    )}
                    {post.answers.map(ans => {
                      const isMyAnswer = ans.author === studentName;
                      return (
                        <div key={ans.id}
                          className={`p-5 rounded-[1.8rem] flex flex-col gap-2 ${
                            ans.isTeacher ? "bg-foreground text-background shadow-xl" :
                            isMyAnswer ? "bg-foreground/5 text-foreground border border-foreground/10" :
                            "bg-accent-light/50 text-foreground"
                          }`}>
                          <div className="flex justify-between items-center opacity-70">
                            <span className="text-[10px] font-black tracking-widest uppercase">
                              {ans.isTeacher ? "선생님" : isMyAnswer ? `나 (${studentName})` : "익명"}
                            </span>
                            <span className="text-[10px] font-bold">{ans.time}</span>
                          </div>
                          <p className="text-[14px] font-medium leading-relaxed">{ans.text}</p>
                        </div>
                      );
                    })}

                    {/* Reply Input */}
                    <div className="mt-6 relative flex items-center gap-3">
                      <input
                        value={commentInput[post.id] || ""}
                        onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="이 질문에 대한 생각을 적어봐..."
                        className="flex-1 h-14 px-6 rounded-2xl bg-white border border-foreground/5 focus:border-foreground/20 focus:outline-none text-[14px] font-medium shadow-inner"
                        onKeyDown={e => e.key === "Enter" && handlePostComment(post.id)}
                      />
                      <button
                        onClick={() => handlePostComment(post.id)}
                        disabled={submittingCommentId === post.id}
                        className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-40"
                      >
                        <Send size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-md" onClick={() => { setShowModal(false); resetModal(); }} />
          <div className="relative w-full max-w-md bg-background rounded-t-[3rem] p-8 shadow-[0_-24px_80px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
            <div className="flex justify-center mb-8">
              <div className="w-14 h-1.5 rounded-full bg-foreground/10" />
            </div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-[24px] font-black text-foreground serif">질문하기</h3>
                <p className="text-[12px] text-accent font-bold mt-0.5">{studentName} 학생</p>
              </div>
              <button onClick={() => { setShowModal(false); resetModal(); }} className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-accent">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Step Indicators */}
              {step < 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${step > i ? "bg-foreground" : step === i ? "bg-foreground/50" : "bg-foreground/10"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">
                    {step === 1 ? "교재 선택" : step === 2 ? "강/챕터 선택" : "지문 선택"}
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {step === 1 ? (
                      [...WORKBOOKS].map(w => (
                        <button key={w} onClick={() => { setSelWorkbook(w); w === "기타/교제없음" ? setStep(4) : setStep(2); }}
                          className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                          {w} <ChevronRight size={16} className="text-accent" />
                        </button>
                      ))
                    ) : step === 2 ? (
                      [...Array.from({ length: 10 }, (_, i) => `${i + 1}강`), "건너뛰기"].map(c => (
                        <button key={c} onClick={() => { setSelChapter(c === "건너뛰기" ? "" : c); setStep(3); }}
                          className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                          {c} <ChevronRight size={16} className="text-accent" />
                        </button>
                      ))
                    ) : (
                      ["1번 지문", "2번 지문", "3번 지문", "4번 지문", "5번 지문", "건너뛰기"].map(p => (
                        <button key={p} onClick={() => { setSelPassage(p === "건너뛰기" ? "" : p); setStep(4); }}
                          className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                          {p} <ChevronRight size={16} className="text-accent" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-accent-light/50 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-[13px] font-bold text-foreground">
                      {[selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ") || "직접 입력"}
                    </span>
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-accent underline">수정</button>
                  </div>
                  <textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    autoFocus
                    placeholder="질문 내용을 자유롭게 작성해 주세요..."
                    className="w-full h-40 p-6 rounded-[2rem] bg-white border border-foreground/10 focus:border-foreground/30 focus:outline-none transition-all text-[15px] font-medium placeholder:text-accent/30 resize-none"
                  />
                  <button
                    onClick={handlePostQuestion}
                    disabled={isPosting || !question.trim()}
                    className="w-full h-16 bg-foreground text-background rounded-[2rem] font-black tracking-widest text-[15px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                  >
                    {isPosting ? "등록 중..." : "질문 등록"} <Send size={20} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  );
}
