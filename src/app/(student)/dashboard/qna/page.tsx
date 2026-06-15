"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Send, MessageCircle, Plus, X, Trash2, Pencil, Check, ChevronRight } from "lucide-react";
import {
  getQnaPosts, createQnaPost, addQnaAnswer,
  deleteQnaPost, updateQnaPost,
  updateQnaAnswer, deleteQnaAnswer,
  getQnaHearts, toggleQnaHeart,
} from "@/lib/database-service";

type Answer = { id: string; author: string; isTeacher: boolean; text: string; time: string; };
type Post = {
  id: string; author: string; passage: string; question: string;
  status: "pending" | "answered"; answers: Answer[]; showAnswers: boolean; createdAt: string;
};
type Hearts = Record<string, string[]>; // target_id → [author_name, ...]

const TAXONOMY: Record<string, Record<string, string[]>> = {
  "수능특강 영어": {
    "Part1": ["1강","2강","3강","4강","5강","6강","7강","11강","12강","13강","14강","15강","16강"],
    "Part2": ["21강","22강","23강","24강","25강","26강","27강","28강","29강","30강"],
    "Part3": ["TEST1","TEST2","TEST3"],
  },
  "고3 평가원": { "2025년": ["3월","6월","9월","11월"], "2026년": ["3월","6월","9월"] },
  "고2 평가원": { "2025년": ["3월","6월","9월"], "2026년": ["3월","6월"] },
  "고1 평가원": { "2025년": ["3월","6월","9월"], "2026년": ["3월","6월"] },
};
const QNA_TOP_OPTIONS = [...Object.keys(TAXONOMY), "교재 없음 (기타 자료)", "기타 문의"];

const KTALK = {
  myBubbleA:     { bg: "#B8E4F9", text: "#0d2d3f" },
  myBubbleB:     { bg: "#FFD6E0", text: "#3f0d1a" },
  otherBubble:   { bg: "#FFFFFF", text: "#222222" },
  teacherBubble: { bg: "#FFF8CC", text: "#4a3800" },
};
const BUBBLE_RADIUS = "18px";

export default function QnAPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState("학생");

  const [step, setStep] = useState(1);
  const [selWorkbook, setSelWorkbook] = useState("");
  const [selChapter, setSelChapter] = useState("");
  const [selPassage, setSelPassage] = useState("");
  const [question, setQuestion] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState("");
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);

  // ── Supabase 기반 하트 state ──
  const [hearts, setHearts] = useState<Hearts>({});
  const [heartLoading, setHeartLoading] = useState<string | null>(null); // 낙관적 업데이트 중 중복 방지
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stu_session");
      if (saved) { const d = JSON.parse(saved); setStudentName(d.name || "학생"); }
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
          id: p.id, author: p.author_name || "익명", passage: p.passage_id || "기타",
          question: p.question, createdAt: p.created_at,
          status: (p.status as "pending" | "answered") || "pending",
          answers: (p.qna_answers || []).map(a => ({
            id: a.id, author: a.is_teacher ? "선생님" : (a.author_name || "익명"),
            isTeacher: !!a.is_teacher, text: a.text,
            time: new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })),
          showAnswers: false,
        }));
        setPosts(formatted);

        // 하트 데이터 로드
        const allIds = formatted.flatMap(p => [p.id, ...p.answers.map(a => a.id)]);
        const h = await getQnaHearts(allIds);
        setHearts(h);
      }
    } catch (err) { console.warn("Q&A load failed:", err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isMyPost = (a: string) => a === studentName;
  const resetModal = () => { setStep(1); setSelWorkbook(""); setSelChapter(""); setSelPassage(""); setQuestion(""); };
  const toggleAnswers = (id: string) => setPosts(prev => prev.map(p => p.id === id ? { ...p, showAnswers: !p.showAnswers } : p));

  // ── 하트 토글 (낙관적 업데이트) ──
  const handleHeart = async (targetId: string, targetType: "post" | "answer") => {
    if (heartLoading === targetId) return;
    const likers = hearts[targetId] || [];
    const liked = likers.includes(studentName);
    // 낙관적 업데이트
    setHearts(prev => ({
      ...prev,
      [targetId]: liked
        ? (prev[targetId] || []).filter(u => u !== studentName)
        : [...(prev[targetId] || []), studentName],
    }));
    setHeartLoading(targetId);
    try {
      await toggleQnaHeart(targetId, targetType, studentName, liked);
    } catch {
      // 실패 시 롤백
      setHearts(prev => ({
        ...prev,
        [targetId]: liked
          ? [...(prev[targetId] || []), studentName]
          : (prev[targetId] || []).filter(u => u !== studentName),
      }));
    } finally {
      setHeartLoading(null);
    }
  };

  const handlePostQuestion = async () => {
    if (!question.trim()) return;
    setIsPosting(true);
    try {
      const label = [selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ");
      await createQnaPost(studentName, label || "기타", question);
      await loadData(); setShowModal(false); resetModal();
    } catch { alert("질문 등록에 실패했습니다."); }
    finally { setIsPosting(false); }
  };

  const handlePostComment = async (postId: string) => {
    const text = commentInput[postId];
    if (!text?.trim()) return;
    setSubmittingCommentId(postId);
    try {
      await addQnaAnswer(postId, studentName, text, false);
      setCommentInput(prev => ({ ...prev, [postId]: "" }));
      await loadData();
    } catch { alert("답변 등록에 실패했습니다."); }
    finally { setSubmittingCommentId(null); }
  };

  const handleStartEditPost = (post: Post) => { setEditingPostId(post.id); setEditingPostText(post.question); };
  const handleCancelEditPost = () => { setEditingPostId(null); setEditingPostText(""); };
  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostText.trim()) return;
    setSavingPostId(postId);
    try { await updateQnaPost(postId, editingPostText); setEditingPostId(null); await loadData(); }
    catch { alert("수정에 실패했습니다."); }
    finally { setSavingPostId(null); }
  };
  const handleDeletePost = async (postId: string) => {
    if (!confirm("이 질문을 삭제할까요?")) return;
    setDeletingPostId(postId);
    try { await deleteQnaPost(postId); await loadData(); }
    catch { alert("삭제에 실패했습니다."); }
    finally { setDeletingPostId(null); }
  };

  const handleStartEditAnswer = (ans: Answer) => { setEditingAnswerId(ans.id); setEditingAnswerText(ans.text); };
  const handleCancelEditAnswer = () => { setEditingAnswerId(null); setEditingAnswerText(""); };
  const handleSaveEditAnswer = async (answerId: string) => {
    if (!editingAnswerText.trim()) return;
    try { await updateQnaAnswer(answerId, editingAnswerText); setEditingAnswerId(null); await loadData(); }
    catch { alert("수정에 실패했습니다."); }
  };
  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm("이 답변을 삭제할까요?")) return;
    setDeletingAnswerId(answerId);
    try { await deleteQnaAnswer(answerId); await loadData(); }
    catch { alert("삭제에 실패했습니다."); }
    finally { setDeletingAnswerId(null); }
  };

  return (
    <div className="flex flex-col bg-transparent animate-in fade-in duration-500">

      {/* 헤더 - sticky */}
      <div className="sticky top-0 z-10 px-5 pt-6 pb-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(3,15,22,0.97) 80%, transparent 100%)', borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <h1 className="text-[22px] font-black text-white leading-tight">Q&amp;A</h1>
          <p className="text-[11px] mt-0.5 font-medium" style={{ color: "rgba(160,210,255,0.65)" }}>궁금한 점을 자유롭게 질문해봐 💬</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-[12px] text-white hover:scale-105 active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg,#14b8a6,#38bdf8,#06b6d4)", boxShadow: "0 4px 16px rgba(6,182,212,0.35)" }}>
          <Plus size={14} strokeWidth={3} /> 질문
        </button>
      </div>

      {/* 포스트 목록 — 자연 높이, main이 스크롤 */}
      <div className="px-4 pt-3 pb-6" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div className="text-center py-20 font-bold animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>아직 질문이 없어요. 먼저 질문해봐! 👋</div>
        ) : posts.map(post => {
          const isMine = isMyPost(post.author);
          const isEditingThisPost = editingPostId === post.id;
          const displayAuthor = isMine ? post.author : '익명';
          const initial = isMine ? (post.author.length > 1 ? post.author.slice(-2) : post.author.charAt(0)) : '익';
          const heartCount = (hearts[post.id] || []).length;
          const liked = (hearts[post.id] || []).includes(studentName);

          return (
            <div key={post.id} className="rounded-[1.4rem] overflow-hidden"
              style={{ background: "rgba(8,38,55,0.82)", border: "1px solid rgba(34,211,238,0.20)", backdropFilter: "blur(12px)" }}>

              {/* 포스트 헤더 */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="p-[2px] rounded-full shrink-0"
                  style={{ background: isMine ? "linear-gradient(135deg,#14b8a6,#38bdf8)" : "rgba(255,255,255,0.20)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
                    style={{ background: "#021622", color: isMine ? "#99f6e4" : "rgba(255,255,255,0.85)" }}>
                    {initial}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black leading-none" style={{ color: "#ffffff" }}>
                    {isMine ? `${post.author} (나)` : '익명'}
                  </p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(160,210,255,0.85)" }}>
                    📚 {post.passage}
                  </p>
                </div>
                <span className="text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                  style={post.status === "answered"
                    ? { background: "rgba(34,197,94,0.20)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)" }
                    : { background: "rgba(255,200,0,0.18)", color: "#fbbf24", border: "1px solid rgba(255,200,0,0.30)" }}>
                  {post.status === "answered" ? "답변완료" : "대기중"}
                </span>
              </div>

              {/* 본문 */}
              <div className="px-4 py-3">
                {isEditingThisPost ? (
                  <textarea value={editingPostText} onChange={e => setEditingPostText(e.target.value)}
                    autoFocus rows={3}
                    className="w-full rounded-xl text-[14px] font-medium resize-none outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", padding: "10px 12px" }}
                    onKeyDown={e => { if (e.key === "Escape") handleCancelEditPost(); }} />
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.92)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                    {post.question}
                  </p>
                )}
                <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {new Date(post.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* IG 액션 바 */}
              <div className="flex items-center gap-3 px-4 pb-3 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                <button onClick={e => { e.stopPropagation(); handleHeart(post.id, "post"); }}
                  className="flex items-center gap-1 transition-all hover:scale-110 active:scale-95">
                  <span style={{ fontSize: 16 }}>{liked ? "❤️" : "🤍"}</span>
                  <span className="text-[11px] font-bold" style={{ color: liked ? "#f43f5e" : "rgba(255,255,255,0.35)" }}>{heartCount}</span>
                </button>
                <button onClick={e => { e.stopPropagation(); toggleAnswers(post.id); }}
                  className="flex items-center gap-1 transition-all hover:scale-105">
                  <MessageCircle size={16} style={{ color: "rgba(255,255,255,0.35)" }} />
                  <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{post.answers.length}</span>
                </button>
                {isMine && !isEditingThisPost && (
                  <>
                    <button onClick={e => { e.stopPropagation(); handleStartEditPost(post); }}
                      className="ml-auto w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
                      style={{ color: "rgba(255,255,255,0.28)" }}><Pencil size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                      disabled={deletingPostId === post.id}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 transition-all disabled:opacity-30"
                      style={{ color: "rgba(255,100,100,0.5)" }}>
                      {deletingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Trash2 size={11} />}
                    </button>
                  </>
                )}
                {isMine && isEditingThisPost && (
                  <>
                    <button onClick={e => { e.stopPropagation(); handleSaveEditPost(post.id); }}
                      disabled={savingPostId === post.id}
                      className="ml-auto w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-500/20 transition-all disabled:opacity-30"
                      style={{ color: "#4ade80" }}>
                      {savingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Check size={12} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleCancelEditPost(); }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
                      style={{ color: "rgba(255,255,255,0.28)" }}><X size={12} /></button>
                  </>
                )}
              </div>

              {/* 댓글 섹션 */}
              {post.showAnswers && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex flex-col gap-2.5 pt-3">
                    {post.answers.length === 0 && (
                      <p className="text-center py-2 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>아직 댓글이 없어요 🌱</p>
                    )}
                    {post.answers.map(ans => {
                      const isMe = ans.author === studentName;
                      const isEditingThis = editingAnswerId === ans.id;
                      const isDeletingThis = deletingAnswerId === ans.id;
                      const ansInitial = ans.isTeacher ? 'T' : isMe ? (ans.author.length > 1 ? ans.author.slice(-2) : ans.author.charAt(0)) : '익';
                      return (
                        <div key={ans.id} className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                            style={{ background: ans.isTeacher ? "linear-gradient(135deg,#f59e0b,#d97706)" : isMe ? "linear-gradient(135deg,#14b8a6,#38bdf8)" : "rgba(255,255,255,0.12)", color: "#fff" }}>
                            {ans.isTeacher ? "T" : ansInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[11px] font-bold" style={{ color: ans.isTeacher ? "#fbbf24" : "rgba(255,255,255,0.65)" }}>
                                {ans.isTeacher ? '선생님' : isMe ? `${ans.author} (나)` : '익명'}
                              </span>
                              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{ans.time}</span>
                            </div>
                            {isEditingThis ? (
                              <textarea value={editingAnswerText} onChange={e => setEditingAnswerText(e.target.value)}
                                autoFocus rows={2}
                                className="w-full rounded-lg text-[13px] resize-none outline-none"
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.88)", padding: "6px 10px" }}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEditAnswer(ans.id); } if (e.key === "Escape") handleCancelEditAnswer(); }} />
                            ) : (
                              <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.72)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{ans.text}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <button onClick={e => { e.stopPropagation(); handleHeart(ans.id, "answer"); }}
                                className="flex items-center gap-0.5 transition-all hover:scale-110">
                                <span style={{ fontSize: 12 }}>{(hearts[ans.id] || []).includes(studentName) ? "❤️" : "🤍"}</span>
                                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{(hearts[ans.id] || []).length}</span>
                              </button>
                              {isMe && !ans.isTeacher && !isEditingThis && (
                                <>
                                  <button onClick={e => { e.stopPropagation(); handleStartEditAnswer(ans); }}
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
                                    style={{ color: "rgba(255,255,255,0.25)" }}><Pencil size={9} /></button>
                                  <button onClick={e => { e.stopPropagation(); handleDeleteAnswer(ans.id); }}
                                    disabled={isDeletingThis}
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-500/20 transition-all disabled:opacity-30"
                                    style={{ color: "rgba(255,100,100,0.4)" }}>
                                    {isDeletingThis ? <span className="text-[8px] animate-pulse">…</span> : <Trash2 size={9} />}
                                  </button>
                                </>
                              )}
                              {isMe && !ans.isTeacher && isEditingThis && (
                                <>
                                  <button onClick={e => { e.stopPropagation(); handleSaveEditAnswer(ans.id); }}
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-500/20 transition-all"
                                    style={{ color: "#4ade80" }}><Check size={10} /></button>
                                  <button onClick={e => { e.stopPropagation(); handleCancelEditAnswer(); }}
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
                                    style={{ color: "rgba(255,255,255,0.25)" }}><X size={10} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 댓글 입력 */}
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <input value={commentInput[post.id] || ""}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handlePostComment(post.id)}
                      placeholder="댓글 달기..."
                      className="flex-1 bg-transparent text-[13px] font-medium focus:outline-none"
                      style={{ color: "rgba(255,255,255,0.75)" }} />
                    <button onClick={e => { e.stopPropagation(); handlePostComment(post.id); }}
                      disabled={submittingCommentId === post.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all"
                      style={{ background: "linear-gradient(135deg,#14b8a6,#38bdf8)" }}>
                      <Send size={12} strokeWidth={2.5} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ── 질문 등록 모달 (Portal — overflow clip 회피) ── */}
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[500] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-md" onClick={() => { setShowModal(false); resetModal(); }} />
          <div className="relative w-full max-w-md bg-background rounded-t-[3rem] p-8 shadow-[0_-24px_80px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-500 max-h-[85vh] flex flex-col">
            <div className="flex justify-center mb-8"><div className="w-14 h-1.5 rounded-full bg-foreground/10" /></div>
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
              {step < 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${step > i ? "bg-foreground" : step === i ? "bg-foreground/50" : "bg-foreground/10"}`} />)}
                  </div>
                  <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">
                    {step === 1 ? "교재 선택" : step === 2 ? "강/챕터 선택" : "지문 선택"}
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {step === 1 ? QNA_TOP_OPTIONS.map(w => {
                      const isSpecial = w === "교재 없음 (기타 자료)" || w === "기타 문의";
                      return (
                        <button key={w} onClick={() => { setSelWorkbook(w); isSpecial ? setStep(4) : setStep(2); }}
                          className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                          <span>{w}</span>
                          <span className="flex items-center gap-1 text-accent">
                            {isSpecial && <span className="text-[10px] font-black bg-accent-light px-2 py-0.5 rounded-lg mr-1">바로 질문</span>}
                            <ChevronRight size={16} />
                          </span>
                        </button>
                      );
                    }) : step === 2 ? Object.keys(TAXONOMY[selWorkbook] || {}).concat(["건너뛰기"]).map(c => (
                      <button key={c} onClick={() => { setSelChapter(c === "건너뛰기" ? "" : c); setStep(3); }}
                        className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                        {c} <ChevronRight size={16} className="text-accent" />
                      </button>
                    )) : (TAXONOMY[selWorkbook]?.[selChapter] || []).concat(["건너뛰기"]).map(p => (
                      <button key={p} onClick={() => { setSelPassage(p === "건너뛰기" ? "" : p); setStep(4); }}
                        className="w-full p-4 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[14px]">
                        {p} <ChevronRight size={16} className="text-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-accent-light/50 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-[13px] font-bold text-foreground">{[selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ") || "직접 입력"}</span>
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-accent underline">수정</button>
                  </div>
                  <textarea value={question} onChange={e => setQuestion(e.target.value)} autoFocus
                    placeholder="질문 내용을 자유롭게 작성해 주세요..."
                    className="w-full h-40 p-6 rounded-[2rem] bg-white border border-foreground/10 focus:border-foreground/30 focus:outline-none transition-all text-[15px] font-medium placeholder:text-accent/30 resize-none" />
                  <button onClick={handlePostQuestion} disabled={isPosting || !question.trim()}
                    className="w-full h-16 bg-foreground text-background rounded-[2rem] font-black tracking-widest text-[15px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center gap-3">
                    {isPosting ? "등록 중..." : "질문 등록"} <Send size={20} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
            <div className="h-6" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
