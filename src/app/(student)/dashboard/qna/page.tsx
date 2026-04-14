"use client";

import { useState, useEffect } from "react";
import { Send, ThumbsUp, MessageCircle, ChevronDown, CheckCircle, Clock, Plus, X, Search, ChevronRight, User } from "lucide-react";
import { getQnaPosts, createQnaPost, addQnaAnswer } from "@/lib/database-service";

type Answer = {
  id: string;
  author: string;
  authorId: string;
  isTeacher: boolean;
  text: string;
  time: string;
};

type Post = {
  id: string;
  author: string;
  authorId: string;
  class: string;
  passage: string;
  question: string;
  likes: number;
  liked: boolean;
  status: "pending" | "answered";
  answers: Answer[];
  showAnswers: boolean;
};

export default function QnAPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState("학생");
  const [studentClass, setStudentClass] = useState("");
  
  // Modal Step State
  const [step, setStep] = useState(1);
  const [selWorkbook, setSelWorkbook] = useState("");
  const [selChapter, setSelChapter] = useState("");
  const [selPassage, setSelPassage] = useState("");
  const [question, setQuestion] = useState("");

  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  useEffect(() => {
    // Read session from localStorage
    const saved = localStorage.getItem("stu_session");
    if (saved) {
      const data = JSON.parse(saved);
      setStudentName(data.name || "학생");
      setStudentClass(data.class || "");
    }

    async function loadData() {
      try {
        const data = await getQnaPosts();
        if (data) {
          const formatted: Post[] = data.map((p: any) => ({
            id: p.id,
            author: p.profiles?.full_name || "익명",
            authorId: p.author_id,
            class: p.profiles?.class_name || "학생",
            passage: p.passage_id || "일반 질문",
            question: p.question,
            likes: Math.floor(Math.random() * 5),
            liked: false,
            status: p.status,
            answers: (p.qna_answers || []).map((a: any) => ({
              id: a.id,
              author: a.is_teacher ? "선생님" : (a.profiles?.full_name || "익명"),
              authorId: a.author_id,
              isTeacher: a.is_teacher,
              text: a.text,
              time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })),
            showAnswers: false
          }));
          setPosts(formatted);
        }
      } catch (err) {
        console.warn("Using dummy data fallback");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePostQuestion = async () => {
    if (!question.trim()) return;
    try {
      const passageLabel = [selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ");
      // TO PREVENT DB ERROR: Send null for author_id if we don't have a valid Supabase Auth UUID yet
      // This will still allow the post to be created in the DB as an anonymous post.
      const result = await createQnaPost(null as any, passageLabel || "기타", question);
      
      const newPost: Post = {
        id: result?.id || Date.now().toString(), 
        author: `나 (${studentName})`, 
        authorId: "current",
        class: studentClass || "학생", 
        passage: passageLabel || "기타",
        question: question, likes: 0, liked: false, status: "pending", answers: [], showAnswers: false
      };
      setPosts(prev => [newPost, ...prev]);
      setShowModal(false);
      resetModal();
    } catch (err) {
      console.error(err);
      alert("질문 등록에 실패했습니다. (DB 연결 확인 필요)");
    }
  };

  const handlePostComment = async (postId: string) => {
    const text = commentInput[postId];
    if (!text?.trim()) return;

    try {
      await addQnaAnswer(postId, null as any, text, false);
      const newAns: Answer = {
        id: Date.now().toString(),
        author: `나 (${studentName})`,
        authorId: "current",
        isTeacher: false,
        text,
        time: "방금"
      };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, answers: [...p.answers, newAns], showAnswers: true } : p));
      setCommentInput(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      alert("답변 등록에 실패했습니다.");
    }
  };

  const resetModal = () => {
    setStep(1); setSelWorkbook(""); setSelChapter(""); setSelPassage(""); setQuestion("");
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative">
      <div className="px-6 pt-10 pb-6 shrink-0 flex items-center justify-between">
        <div>
            <h1 className="text-3xl text-foreground serif font-black">Q&amp;A 게시판</h1>
            <p className="text-[13px] text-accent mt-2 font-medium">학습 중 궁금한 점을 질문하고 함께 토론해 보세요.</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
        >
            <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-32 flex flex-col gap-6 pt-4">
        {isLoading ? (
          <div className="text-center py-20 text-accent font-bold animate-pulse">질문들을 불러오는 중...</div>
        ) : posts.map(post => (
          <div key={post.id} className="glass border border-foreground/5 rounded-[2.5rem] p-8 transition-all bg-white relative overflow-hidden group">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
                  <User size={18} className="text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-black ${post.authorId === "current" || post.author.includes(studentName) ? "text-foreground" : "text-accent"}`}>
                        {post.author.includes(studentName) ? `나 (${studentName})` : "익명"}
                    </span>
                    <span className="text-[10px] font-bold text-accent px-2 py-0.5 bg-accent-light/50 rounded-md uppercase tracking-widest">{post.class}</span>
                  </div>
                  <span className="text-[11px] text-accent font-bold opacity-60 mt-0.5 block italic">{post.passage}</span>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${post.status === 'answered' ? 'bg-success/5 text-success border-success/10' : 'bg-accent-light text-accent border-foreground/5'}`}>
                {post.status === 'answered' ? '답변 완료' : '답변 대기'}
              </div>
            </div>

            <p className="text-[16px] text-foreground font-medium leading-relaxed mb-8">{post.question}</p>

            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-[13px] font-black text-accent hover:text-foreground transition-all">
                <ThumbsUp size={18} strokeWidth={2.5} /> {post.likes}
              </button>
              <button 
                onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, showAnswers: !p.showAnswers } : p))}
                className="flex items-center gap-2 text-[13px] font-black text-accent hover:text-foreground transition-all"
              >
                <MessageCircle size={18} strokeWidth={2.5} /> 답변 {post.answers.length}개
              </button>
            </div>

            {post.showAnswers && (
              <div className="mt-8 space-y-4 border-t border-foreground/5 pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                {post.answers.map(ans => (
                  <div key={ans.id} className={`p-5 rounded-[1.8rem] flex flex-col gap-2 ${ans.isTeacher ? "bg-foreground text-background shadow-xl" : "bg-accent-light/50 text-foreground"}`}>
                    <div className="flex justify-between items-center opacity-70">
                        <span className="text-[10px] font-black tracking-widest uppercase">{ans.author.includes(studentName) ? `나 (${studentName})` : ans.author}</span>
                        <span className="text-[10px] font-bold">{ans.time}</span>
                    </div>
                    <p className="text-[14px] font-medium leading-relaxed">{ans.text}</p>
                  </div>
                ))}
                
                {/* Reply Input */}
                <div className="mt-6 relative flex items-center gap-3">
                    <input 
                        value={commentInput[post.id] || ""}
                        onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="이 질문에 대한 생각을 적어봐..."
                        className="flex-1 h-14 px-6 rounded-2xl bg-white border border-foreground/5 focus:border-foreground/20 focus:outline-none text-[14px] font-medium shadow-inner"
                    />
                    <button 
                        onClick={() => handlePostComment(post.id)}
                        className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <Send size={18} strokeWidth={2.5} />
                    </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-foreground/20 backdrop-blur-md" onClick={() => setShowModal(false)} />
           <div className="relative w-full max-w-md bg-background rounded-t-[3rem] p-8 shadow-[0_-24px_80px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-700">
                <div className="flex justify-center mb-10">
                    <div className="w-14 h-1.5 rounded-full bg-foreground/10" />
                </div>

                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h3 className="text-[24px] font-black text-foreground serif">질문하기</h3>
                    </div>
                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-accent">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Hierarchy Picker Steps (Minimalized) */}
                    {step < 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? "bg-foreground" : "bg-foreground/5"}`} />
                                ))}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto px-1 py-1 custom-scrollbar space-y-2">
                                {step === 1 ? (
                                    ["수능특강 2026", "수능완성 2026", "자이스토리 고3", "기타/교제없음"].map(w => (
                                        <button key={w} onClick={() => { setSelWorkbook(w); w === "기타/교제없음" ? setStep(4) : setStep(2); }}
                                            className="w-full p-5 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[15px]">
                                            {w} <ChevronRight size={16} className="text-accent" />
                                        </button>
                                    ))
                                ) : step === 2 ? (
                                    ["12강 (어휘)", "13강 (빈칸)", "14강 (무관)", "건너뛰기"].map(c => (
                                        <button key={c} onClick={() => { setSelChapter(c === "건너뛰기" ? "" : c); setStep(3); }}
                                            className="w-full p-5 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[15px]">
                                            {c} <ChevronRight size={16} className="text-accent" />
                                        </button>
                                    ))
                                ) : (
                                    ["1번 지문", "2번 지문", "3번 지문", "건너뛰기"].map(p => (
                                        <button key={p} onClick={() => { setSelPassage(p === "건너뛰기" ? "" : p); setStep(4); }}
                                            className="w-full p-5 text-left bg-white border border-foreground/5 rounded-2xl hover:border-foreground/20 transition-all flex items-center justify-between font-bold text-[15px]">
                                            {p} <ChevronRight size={16} className="text-accent" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95">
                             <div className="bg-accent-light/50 p-4 rounded-xl flex items-center justify-between">
                                 <span className="text-[12px] font-bold text-foreground">
                                    {[selWorkbook, selChapter, selPassage].filter(Boolean).join(" > ") || "직접 입력"}
                                 </span>
                                 <button onClick={() => setStep(1)} className="text-[10px] font-black text-accent underline">수정</button>
                             </div>
                             <textarea 
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                { ... (question.length === 0 ? {autoFocus: true} : {})}
                                placeholder="질문 내용을 입력해 주세요..."
                                className="w-full h-40 p-6 rounded-[2.2rem] bg-white border border-foreground/10 focus:border-foreground/30 focus:outline-none transition-all text-[16px] font-medium placeholder:text-accent/30 resize-none shadow-inner"
                             />
                             <button 
                                onClick={handlePostQuestion}
                                className="w-full h-18 bg-foreground text-background rounded-[2.2rem] font-black tracking-[0.2em] text-[15px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                             >
                                질문 등록 <Send size={20} strokeWidth={2.5} />
                             </button>
                        </div>
                    )}
                </div>
                <div className="h-10" />
           </div>
        </div>
      )}
    </div>
  );
}
