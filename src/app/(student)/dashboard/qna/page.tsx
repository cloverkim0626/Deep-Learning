"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, Plus, X, ChevronRight, User, Trash2, Pencil, Check, ChevronDown, ChevronUp } from "lucide-react";
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

// 하트 리액션 state — id(post or answer) → 누른 사람 목록
type Hearts = Record<string, string[]>;

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

// 하트 토글 헬퍼
function toggleHeart(prev: Hearts, id: string, who: string): Hearts {
  const cur = prev[id] || [];
  const already = cur.includes(who);
  return { ...prev, [id]: already ? cur.filter(u => u !== who) : [...cur, who] };
}

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

  // 하트 state (post & answer 공용, key = post.id or answer.id)
  const [hearts, setHearts] = useState<Hearts>({});

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

  // ── 하트 버튼 컴포넌트 (인라인) ──
  const HeartBtn = ({ id, big = false }: { id: string; big?: boolean }) => {
    const likers = hearts[id] || [];
    const liked = likers.includes(studentName);
    const count = likers.length;
    return (
      <button
        onClick={e => { e.stopPropagation(); setHearts(prev => toggleHeart(prev, id, studentName)); }}
        className="flex items-center gap-0.5 transition-all hover:scale-115 active:scale-90 select-none"
        style={{ fontSize: big ? 15 : 13, lineHeight: 1 }}
        title="하트"
      >
        <span style={{ filter: liked ? "none" : "grayscale(1) opacity(0.45)" }}>
          {liked ? "❤️" : "🤍"}
        </span>
        {count > 0 && (
          <span style={{ fontSize: big ? 11 : 9, fontWeight: 800, color: liked ? "#d0304a" : "rgba(0,0,0,0.35)", marginLeft: 1 }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  let myPostCount = 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500" style={{ background: "linear-gradient(180deg, #a8c5d4 0%, #b8d0dc 100%)" }}>

      {/* ── 헤더 ── */}
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

      {/* ── 채팅방 라벨 ── */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div style={{ flex: 1, height: 1, background: "rgba(40,80,100,0.18)" }} />
        <span className="text-[11px] font-bold px-3 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)", color: "rgba(20,50,70,0.7)" }}>
          Q&amp;A 채팅방
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(40,80,100,0.18)" }} />
      </div>

      {/* ── 포스트 목록 ── */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-10 flex flex-col gap-2 pt-1">
        {isLoading ? (
          <div className="text-center py-20 font-bold animate-pulse" style={{ color: "rgba(20,50,70,0.6)" }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center font-bold opacity-50" style={{ color: "rgba(20,50,70,0.6)" }}>아직 질문이 없어요. 먼저 질문해봐! 👋</div>
        ) : posts.map(post => {
          const isMine = isMyPost(post.author);
          const isEditingThisPost = editingPostId === post.id;
          const postLikers = hearts[post.id] || [];
          const postLiked = postLikers.includes(studentName);
          const postLikeCount = postLikers.length;

          let myBubble = KTALK.myBubbleA;
          if (isMine) {
            myBubble = myPostCount % 2 === 0 ? KTALK.myBubbleA : KTALK.myBubbleB;
            myPostCount++;
          }

          return (
            <div key={post.id} className="flex flex-col items-stretch mb-2">

              {/* ── 질문 말풍선 행 ── */}
              <div className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>

                {/* 아바타 */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-5 text-[13px] font-black"
                  style={isMine
                    ? { background: "#FEE500", color: "#3A1D1D" }
                    : { background: "rgba(255,255,255,0.65)", border: "1.5px solid rgba(255,255,255,0.85)", color: "#4a6a7a" }
                  }
                >
                  {isMine ? studentName[0] : <User size={16} />}
                </div>

                {/* 말풍선 묶음 */}
                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} gap-1`} style={{ width: "80%" }}>

                  {/* 이름 + 지문 */}
                  <div className={`flex items-center gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[11px] font-bold" style={{ color: "rgba(20,50,70,0.8)" }}>
                      {isMine ? `나 (${studentName})` : "익명"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.45)", color: "rgba(20,50,70,0.6)" }}>
                      📚 {post.passage}
                    </span>
                  </div>

                  {/* ── 말풍선 (하트는 말풍선 내 오른쪽 하단) ── */}
                  <div
                    className="w-full px-4 pt-3 pb-2"
                    style={{
                      background: isMine ? myBubble.bg : KTALK.otherBubble.bg,
                      color: isMine ? myBubble.text : KTALK.otherBubble.text,
                      borderRadius: BUBBLE_RADIUS,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.13)",
                    }}
                  >
                    {isEditingThisPost ? (
                      <textarea
                        value={editingPostText}
                        onChange={e => setEditingPostText(e.target.value)}
                        autoFocus rows={3}
                        style={{
                          width: "100%", background: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(0,0,0,0.12)", color: "#1a2a36",
                          borderRadius: 10, padding: "6px 10px",
                          resize: "vertical" as const, fontSize: 15, lineHeight: 1.6, outline: "none",
                        }}
                        onKeyDown={e => { if (e.key === "Escape") handleCancelEditPost(); }}
                      />
                    ) : (
                      <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                        {post.question}
                      </p>
                    )}

                    {/* 말풍선 하단 — 상태배지 왼쪽 / 하트 + 댓글 오른쪽 */}
                    <div className="flex items-center justify-between mt-2">
                      {/* 상태 배지 */}
                      <span
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={post.status === "answered"
                          ? { background: "rgba(40,160,70,0.18)", color: "#1a6a2a" }
                          : { background: "rgba(190,150,0,0.15)", color: "#7a5a00" }
                        }
                      >
                        {post.status === "answered" ? "✓ 답변완료" : "○ 대기중"}
                      </span>

                      {/* 오른쪽: 하트 + 댓글 버튼 */}
                      <div className="flex items-center gap-2">
                        {/* 하트 */}
                        <button
                          onClick={e => { e.stopPropagation(); setHearts(prev => toggleHeart(prev, post.id, studentName)); }}
                          className="flex items-center gap-0.5 transition-all hover:scale-110 active:scale-90 select-none"
                          style={{ fontSize: 14, lineHeight: 1 }}
                        >
                          <span style={{ filter: postLiked ? "none" : "grayscale(1) opacity(0.4)" }}>
                            {postLiked ? "❤️" : "🤍"}
                          </span>
                          {postLikeCount > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: postLiked ? "#d0304a" : "rgba(0,0,0,0.35)", marginLeft: 1 }}>
                              {postLikeCount}
                            </span>
                          )}
                        </button>

                        {/* 댓글 토글 버튼 — 오른쪽 하단 이동 */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleAnswers(post.id); }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-all hover:scale-105"
                          style={{ background: post.showAnswers ? "rgba(30,80,120,0.18)" : "rgba(0,0,0,0.07)", color: "#1a5070", fontSize: 10, fontWeight: 700 }}
                        >
                          <MessageCircle size={11} strokeWidth={2.5} />
                          {post.answers.length}
                          {post.showAnswers ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 시간 + 수정/삭제 */}
                  <div className={`flex items-center gap-1.5 flex-wrap ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[10px]" style={{ color: "rgba(20,50,70,0.5)" }}>
                      {new Date(post.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {isMine && !isEditingThisPost && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleStartEditPost(post); }} title="수정"
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                          style={{ color: "rgba(20,50,70,0.42)" }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }} title="삭제"
                          disabled={deletingPostId === post.id}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-200/60 transition-all disabled:opacity-30"
                          style={{ color: "rgba(180,60,60,0.65)" }}>
                          {deletingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Trash2 size={11} />}
                        </button>
                      </>
                    )}
                    {isMine && isEditingThisPost && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleSaveEditPost(post.id); }} title="저장"
                          disabled={savingPostId === post.id}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-200/60 transition-all disabled:opacity-30"
                          style={{ color: "#1a7a2a" }}>
                          {savingPostId === post.id ? <span className="text-[9px] animate-pulse">…</span> : <Check size={12} />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleCancelEditPost(); }} title="취소"
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                          style={{ color: "rgba(20,50,70,0.42)" }}>
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 댓글 섹션 ── */}
              {post.showAnswers && (
                <div className="mt-2 pl-11 animate-in fade-in slide-in-from-top-2 duration-300">

                  <div className="flex flex-col gap-2 items-end">
                    {post.answers.length === 0 && (
                      <p className="w-full text-center py-2 text-[11px] font-semibold" style={{ color: "rgba(20,50,70,0.4)" }}>
                        아직 댓글이 없어요 🌱
                      </p>
                    )}

                    {post.answers.map(ans => {
                      const isMe = ans.author === studentName;
                      const isEditingThis = editingAnswerId === ans.id;
                      const isDeletingThis = deletingAnswerId === ans.id;
                      const ansLikers = hearts[ans.id] || [];
                      const ansLiked = ansLikers.includes(studentName);
                      const ansLikeCount = ansLikers.length;

                      const bubbleBg = ans.isTeacher ? KTALK.teacherBubble.bg : isMe ? "#D4F0FF" : KTALK.otherBubble.bg;
                      const bubbleColor = ans.isTeacher ? KTALK.teacherBubble.text : isMe ? "#0d2d3f" : "#222222";

                      return (
                        <div key={ans.id} className="flex flex-col items-end" style={{ width: "90%" }}>

                          {/* 이름 행 — 프로필 아이콘 + 이름 (한 번만) */}
                          <div className="flex items-center gap-1.5 mb-1 pr-0.5 self-end">
                            {ans.isTeacher && (
                              <span
                                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: "#FFD700", color: "#3a2800", boxShadow: "0 0 5px rgba(255,200,0,0.45)" }}
                              >
                                ⭐ 선생님
                              </span>
                            )}
                            {/* 프로필 아이콘 */}
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                              style={ans.isTeacher
                                ? { background: "#FEE500", color: "#3A1D1D" }
                                : isMe
                                  ? { background: "#FEE500", color: "#3A1D1D" }
                                  : { background: "rgba(255,255,255,0.7)", color: "#3a5a6a", border: "1px solid rgba(255,255,255,0.9)" }
                              }
                            >
                              {/* 선생님은 T아이콘 없이, 이름 레이블이 ⭐ 선생님으로 충분 */}
                              {ans.isTeacher ? "🏫" : isMe ? studentName[0] : <User size={10} />}
                            </div>
                            {/* 이름 — 선생님이면 "선생님" 한 번만, 학생이면 닉네임 */}
                            <span className="text-[10px] font-bold" style={{ color: ans.isTeacher ? "#7a5a00" : "rgba(20,50,70,0.65)" }}>
                              {ans.isTeacher ? "선생님" : isMe ? `나 (${studentName})` : "익명"}
                            </span>
                          </div>

                          {/* 말풍선 */}
                          <div
                            className="w-full px-4 pt-3 pb-2"
                            style={{
                              background: bubbleBg,
                              color: bubbleColor,
                              borderRadius: BUBBLE_RADIUS,
                              boxShadow: ans.isTeacher
                                ? "0 2px 10px rgba(255,210,0,0.2), 0 1px 3px rgba(0,0,0,0.08)"
                                : "0 1px 3px rgba(0,0,0,0.09)",
                              borderLeft: ans.isTeacher ? "3px solid #FFD700" : "none",
                            }}
                          >
                            {isEditingThis ? (
                              <textarea
                                value={editingAnswerText}
                                onChange={e => setEditingAnswerText(e.target.value)}
                                autoFocus rows={2}
                                style={{
                                  width: "100%", background: "rgba(255,255,255,0.65)",
                                  border: "1px solid rgba(0,0,0,0.1)", color: "#1a2a36",
                                  borderRadius: 8, padding: "4px 8px",
                                  resize: "vertical" as const, fontSize: 13, outline: "none",
                                }}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEditAnswer(ans.id); }
                                  if (e.key === "Escape") handleCancelEditAnswer();
                                }}
                              />
                            ) : (
                              <p style={{ fontSize: 13, lineHeight: 1.65, fontWeight: ans.isTeacher ? 600 : 500, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {ans.text}
                              </p>
                            )}

                            {/* 말풍선 오른쪽 하단 — 하트 */}
                            <div className="flex justify-end mt-1.5">
                              <button
                                onClick={e => { e.stopPropagation(); setHearts(prev => toggleHeart(prev, ans.id, studentName)); }}
                                className="flex items-center gap-0.5 transition-all hover:scale-110 active:scale-90 select-none"
                                style={{ fontSize: 13, lineHeight: 1 }}
                              >
                                <span style={{ filter: ansLiked ? "none" : "grayscale(1) opacity(0.35)" }}>
                                  {ansLiked ? "❤️" : "🤍"}
                                </span>
                                {ansLikeCount > 0 && (
                                  <span style={{ fontSize: 9, fontWeight: 800, color: ansLiked ? "#d0304a" : "rgba(0,0,0,0.3)", marginLeft: 1 }}>
                                    {ansLikeCount}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* 시간 + 수정/삭제 */}
                          <div className="flex items-center gap-1 mt-0.5 pr-0.5">
                            <span className="text-[9px]" style={{ color: "rgba(20,50,70,0.42)" }}>{ans.time}</span>
                            {isMe && !ans.isTeacher && !isEditingThis && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleStartEditAnswer(ans); }} title="수정"
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                                  style={{ color: "rgba(20,50,70,0.38)" }}>
                                  <Pencil size={9} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteAnswer(ans.id); }} title="삭제"
                                  disabled={isDeletingThis}
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-200/60 transition-all disabled:opacity-30"
                                  style={{ color: "rgba(180,60,60,0.58)" }}>
                                  {isDeletingThis ? <span className="text-[8px] animate-pulse">…</span> : <Trash2 size={9} />}
                                </button>
                              </>
                            )}
                            {isMe && !ans.isTeacher && isEditingThis && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleSaveEditAnswer(ans.id); }} title="저장"
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-200/60 transition-all"
                                  style={{ color: "#1a7a2a" }}>
                                  <Check size={10} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleCancelEditAnswer(); }} title="취소"
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50 transition-all"
                                  style={{ color: "rgba(20,50,70,0.38)" }}>
                                  <X size={10} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── 댓글 입력창 ── */}
                  <div
                    className="flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.8)" }}
                  >
                    <MessageCircle size={14} strokeWidth={2} style={{ color: "rgba(20,60,90,0.38)", flexShrink: 0 }} />
                    <input
                      value={commentInput[post.id] || ""}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handlePostComment(post.id)}
                      placeholder="댓글 입력..."
                      className="flex-1 bg-transparent text-[13px] font-medium focus:outline-none"
                      style={{ color: "#1a2a36" }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); handlePostComment(post.id); }}
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

      {/* ── 질문 등록 모달 ── */}
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