"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, Plus, X, ChevronRight, User, Trash2, Pencil, Check } from "lucide-react";
import {
  getQnaPosts, createQnaPost, addQnaAnswer,
  deleteQnaPost, updateQnaPost,
  updateQnaAnswer, deleteQnaAnswer,
} from "@/lib/database-service";

type Answer = { id: string; author: string; isTeacher: boolean; text: string; time: string; };
type Post = {
  id: string; author: string; passage: string; question: string;
  status: "pending" | "answered"; answers: Answer[]; showAnswers: boolean; createdAt: string;
};

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

// 카카오톡 색상 팔레트
// 내 말풍선: 하늘색(#B8E4F9) / 핑크색(#FFD6E0) 번갈아가며
// 상대방 말풍선: 흰색 (#FFFFFF)
// 배경: 카톡 채팅방 배경 (#B2C8D4) 계열
const KTALK = {
  // 내 말풍선 색상 2가지 (인덱스 기반으로 번갈아)
  myBubbleA: { bg: "#B8E4F9", text: "#1a3a4a" },   // 하늘색
  myBubbleB: { bg: "#FFD6E0", text: "#4a1a2a" },   // 핑크색
  // 상대방 말풍선
  otherBubble: { bg: "#FFFFFF", text: "#222222" },
  // 선생님 말풍선
  teacherBubble: { bg: "#FFF9E6", text: "#5c4a00" },
  // 채팅 배경
  chatBg: "#B2C8D4",
  // 시간 색상
  time: "rgba(60,60,60,0.5)",
  // 이름 색상
  name: "#5a5a5a",
};

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

  // 질문 수정 상태
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // 답변 수정 상태
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState("");
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);

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
      }
    } catch (err) { console.warn("Q&A load failed:", err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isMyPost = (a: string) => a === studentName;
  const resetModal = () => { setStep(1); setSelWorkbook(""); setSelChapter(""); setSelPassage(""); setQuestion(""); };
  const toggleAnswers = (id: string) => setPosts(prev => prev.map(p => p.id === id ? { ...p, showAnswers: !p.showAnswers } : p));

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

  // ── 질문 수정/삭제 ──
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

  // ── 답변 수정/삭제 ──
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

  // 내 글 중에서 몇 번째 글인지 카운팅 (하늘색/핑크색 번갈아 쓰기 위함)
  let myPostCount = 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500" style={{ background: "linear-gradient(180deg, #a8c5d4 0%, #b8d0dc 100%)" }}>
      {/* Header — 카카오톡 채팅방 상단바 느낌 */}
      <div
        className="px-5 pt-10 pb-4 shrink-0 flex items-center justify-between shadow-sm"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.3)" }}
      >
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a2a36" }}>Q&amp;A 게시판</h1>
          <p className="text-[12px] mt-0.5 font-semibold" style={{ color: "rgba(20,50,70,0.65)" }}>학습 중 궁금한 점을 자유롭게 질문하세요 💬</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all outline-none"
          style={{ background: "#FEE500", color: "#3A1D1D" }}
        >
          <Plus size={22} strokeWidth={3} />
        </button>
      </div>

      {/* 날짜 구분선 — 카톡 채팅방 날짜 표시 느낌 */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div style={{ flex: 1, height: 1, background: "rgba(40,80,100,0.18)" }} />
        <span className="text-[11px] font-bold px-3 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)", color: "rgba(20,50,70,0.7)" }}>
          Q&amp;A 채팅방
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(40,80,100,0.18)" }} />
      </div>

      {/* Posts — 카톡 채팅 목록 */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-10 flex flex-col gap-1 pt-1">
        {isLoading ? (
          <div className="text-center py-20 font-bold animate-pulse" style={{ color: "rgba(20,50,70,0.6)" }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center font-bold opacity-50" style={{ color: "rgba(20,50,70,0.6)" }}>아직 질문이 없어요. 먼저 질문해봐! 👋</div>
        ) : posts.map(post => {
          const isMine = isMyPost(post.author);
          const isEditingThisPost = editingPostId === post.id;

          // 내 글 인덱스 (번갈아가며 색상)
          let myBubble = KTALK.myBubbleA;
          if (isMine) {
            myBubble = myPostCount % 2 === 0 ? KTALK.myBubbleA : KTALK.myBubbleB;
            myPostCount++;
          }

          return (
            <div key={post.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} mb-3`}>
              {/* 이름 — 내 글이면 오른쪽, 남의 글이면 왼쪽 */}
              {!isMine && (
                <div className="flex items-center gap-1.5 mb-1 ml-11">
                  <span className="text-[11px] font-bold" style={{ color: "rgba(20,50,70,0.75)" }}>익명</span>
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} max-w-[88%]`}>
                {/* 아바타 — 남의 글만 */}
                {!isMine && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 self-end mb-1"
                    style={{ background: "rgba(255,255,255,0.55)", border: "1.5px solid rgba(255,255,255,0.7)", color: "#4a6a7a" }}
                  >
                    <User size={16} />
                  </div>
                )}

                {/* 말풍선 + 메타정보 */}
                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} gap-1`}>
                  {/* 지문 레이블 */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5"
                    style={{ background: "rgba(255,255,255,0.4)", color: "rgba(20,50,70,0.65)" }}
                  >
                    📚 {post.passage}
                  </span>

                  {/* 말풍선 */}
                  <div
                    className="relative px-4 py-3 shadow-sm"
                    style={{
                      background: isMine ? myBubble.bg : KTALK.otherBubble.bg,
                      color: isMine ? myBubble.text : KTALK.otherBubble.text,
                      borderRadius: isMine ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
                      maxWidth: "100%",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    {isEditingThisPost ? (
                      <textarea
                        value={editingPostText}
                        onChange={e => setEditingPostText(e.target.value)}
                        autoFocus rows={3}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(0,0,0,0.12)",
                          color: "#1a2a36",
                          borderRadius: 8,
                          padding: "6px 10px",
                          resize: "vertical" as const,
                          fontSize: 15,
                          lineHeight: 1.6,
                          outline: "none",
                          minWidth: 200,
                        }}
                        onKeyDown={e => { if (e.key === "Escape") handleCancelEditPost(); }}
                      />
                    ) : (
                      <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                        {post.question}
                      </p>
                    )}

                    {/* 상태 배지 */}
                    <div className="mt-2 flex items-center gap-1">
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={
                          post.status === "answered"
                            ? { background: "rgba(60,180,80,0.18)", color: "#2a7a3a" }
                            : { background: "rgba(200,160,0,0.15)", color: "#7a5a00" }
                        }
                      >
                        {post.status === "answered" ? "✓ 완료" : "○ 대기"}
                      </span>
                    </div>
                  </div>

                  {/* 시간 + 답변 버튼 + 액션 버튼 */}
                  <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px]" style={{ color: "rgba(20,50,70,0.5)" }}>
                      {new Date(post.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => toggleAnswers(post.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-all"
                      style={{ background: "rgba(255,255,255,0.45)", color: "#1a5070", fontSize: 10, fontWeight: 700 }}
                    >
                      <MessageCircle size={11} strokeWidth={2.5} />
                      {post.answers.length}
                    </button>
                    {/* 내 글 수정/삭제 */}
                    {isMine && !isEditingThisPost && (
                      <>
                        <button
                          onClick={() => handleStartEditPost(post)} title="수정"
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/40 transition-all"
                          style={{ color: "rgba(20,50,70,0.5)" }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)} title="삭제"
                          disabled={deletingPostId === post.id}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-200/60 transition-all disabled:opacity-30"
                          style={{ color: "rgba(180,60,60,0.7)" }}
                        >
                          {deletingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Trash2 size={11} />}
                        </button>
                      </>
                    )}
                    {isMine && isEditingThisPost && (
                      <>
                        <button
                          onClick={() => handleSaveEditPost(post.id)} title="저장"
                          disabled={savingPostId === post.id}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-200/60 transition-all disabled:opacity-30"
                          style={{ color: "#2a7a3a" }}
                        >
                          {savingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Check size={12} />}
                        </button>
                        <button
                          onClick={handleCancelEditPost} title="취소"
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/40 transition-all"
                          style={{ color: "rgba(20,50,70,0.5)" }}
                        >
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 내 아바타 — 오른쪽 */}
                {isMine && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 self-end mb-1 text-[12px] font-black"
                    style={{ background: "#FEE500", color: "#3A1D1D" }}
                  >
                    {studentName[0]}
                  </div>
                )}
              </div>

              {/* 답변 섹션 — 카톡 답장 형태 */}
              {post.showAnswers && (
                <div
                  className={`mt-2 w-full max-w-[90%] ${isMine ? "self-end" : "self-start ml-11"} animate-in fade-in slide-in-from-top-2 duration-300`}
                >
                  {/* 답변 말풍선들 */}
                  <div className="flex flex-col gap-2">
                    {post.answers.length === 0 && (
                      <p className="text-center py-2 text-[11px] font-semibold" style={{ color: "rgba(20,50,70,0.45)" }}>아직 답변이 없어요 🌱</p>
                    )}
                    {post.answers.map(ans => {
                      const isMe = ans.author === studentName;
                      const isEditingThis = editingAnswerId === ans.id;
                      const isDeletingThis = deletingAnswerId === ans.id;

                      return (
                        <div
                          key={ans.id}
                          className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse justify-start" : "flex-row justify-start"}`}
                        >
                          {/* 아바타 */}
                          {!isMe && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black self-end"
                              style={ans.isTeacher
                                ? { background: "#FEE500", color: "#3A1D1D" }
                                : { background: "rgba(255,255,255,0.6)", color: "#3a5a6a" }
                              }
                            >
                              {ans.isTeacher ? "T" : <User size={12} />}
                            </div>
                          )}

                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5 max-w-[80%]`}>
                            {/* 이름 */}
                            {!isMe && (
                              <span className="text-[10px] font-bold ml-0.5" style={{ color: ans.isTeacher ? "#8a6a00" : "rgba(20,50,70,0.6)" }}>
                                {ans.isTeacher ? "👩‍🏫 선생님" : "익명"}
                              </span>
                            )}

                            {/* 말풍선 */}
                            <div
                              className="px-3 py-2.5 shadow-sm"
                              style={{
                                background: ans.isTeacher ? KTALK.teacherBubble.bg : isMe ? "#D4F0FF" : KTALK.otherBubble.bg,
                                color: ans.isTeacher ? KTALK.teacherBubble.text : isMe ? "#1a3a4a" : "#222222",
                                borderRadius: isMe ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                                border: ans.isTeacher ? "1px solid #FFE082" : "none",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                              }}
                            >
                              {isEditingThis ? (
                                <textarea
                                  value={editingAnswerText}
                                  onChange={e => setEditingAnswerText(e.target.value)}
                                  autoFocus rows={2}
                                  style={{ width: "100%", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.1)", color: "#1a2a36", borderRadius: 6, padding: "4px 8px", resize: "vertical" as const, fontSize: 13, outline: "none", minWidth: 160 }}
                                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEditAnswer(ans.id); } if (e.key === "Escape") handleCancelEditAnswer(); }}
                                />
                              ) : (
                                <p style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                  {ans.text}
                                </p>
                              )}
                            </div>

                            {/* 시간 + 액션 */}
                            <div className={`flex items-center gap-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                              <span className="text-[9px]" style={{ color: "rgba(20,50,70,0.45)" }}>{ans.time}</span>
                              {isMe && !ans.isTeacher && !isEditingThis && (
                                <>
                                  <button onClick={() => handleStartEditAnswer(ans)} title="수정"
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/40 transition-all"
                                    style={{ color: "rgba(20,50,70,0.45)" }}>
                                    <Pencil size={9} />
                                  </button>
                                  <button onClick={() => handleDeleteAnswer(ans.id)} title="삭제"
                                    disabled={isDeletingThis}
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-200/60 transition-all disabled:opacity-30"
                                    style={{ color: "rgba(180,60,60,0.65)" }}>
                                    {isDeletingThis ? <span className="text-[8px] animate-pulse">…</span> : <Trash2 size={9} />}
                                  </button>
                                </>
                              )}
                              {isMe && !ans.isTeacher && isEditingThis && (
                                <>
                                  <button onClick={() => handleSaveEditAnswer(ans.id)} title="저장"
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-200/60 transition-all"
                                    style={{ color: "#2a7a3a" }}>
                                    <Check size={10} />
                                  </button>
                                  <button onClick={handleCancelEditAnswer} title="취소"
                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/40 transition-all"
                                    style={{ color: "rgba(20,50,70,0.45)" }}>
                                    <X size={10} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 내 아바타 */}
                          {isMe && (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black self-end"
                              style={{ background: "#FEE500", color: "#3A1D1D" }}
                            >
                              {studentName[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 새 답변 입력 — 카톡 메세지 입력창 */}
                  <div
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.7)" }}
                  >
                    <input
                      value={commentInput[post.id] || ""}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handlePostComment(post.id)}
                      placeholder="메세지 입력..."
                      className="flex-1 bg-transparent text-[13px] font-medium focus:outline-none"
                      style={{ color: "#1a2a36" }}
                    />
                    <button
                      onClick={() => handlePostComment(post.id)}
                      disabled={submittingCommentId === post.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all"
                      style={{ background: "#FEE500", color: "#3A1D1D" }}
                    >
                      <Send size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 질문 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
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
        </div>
      )}
    </div>
  );
}