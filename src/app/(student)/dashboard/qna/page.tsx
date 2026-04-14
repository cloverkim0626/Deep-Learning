"use client";

import { useState, useEffect } from "react";
import { Send, ThumbsUp, MessageCircle, ChevronDown, CheckCircle, Clock } from "lucide-react";
import { getQnaPosts, createQnaPost } from "@/lib/database-service";

type Answer = {
  id: string;
  author: string;
  isTeacher: boolean;
  text: string;
  time: string;
};

type Post = {
  id: string;
  author: string;
  class: string;
  passage: string;
  question: string;
  likes: number;
  liked: boolean;
  status: "pending" | "answered";
  answers: Answer[];
  showAnswers: boolean;
};

const PASSAGE_OPTIONS = [
  "[수능특강 12강 2번] Trust Your Gut?",
  "[수능특강 12강 1번] The Sound of Silence",
  "[수능완성 3강 4번] Illusion of Multitasking"
];

const MOCK_POSTS: Post[] = [
  {
    id: "q1", author: "김가연", class: "고3 금토반", passage: "[수능특강 12강 2번] Trust Your Gut?",
    question: "S10에서 'which we perceive to be safe' 관계절이 계속적 용법인데, 이걸 한정적으로 쓰면 의미가 어떻게 달라지나요?",
    likes: 3, liked: false, status: "answered",
    answers: [
      { id: "a1", author: "선생님", isTeacher: true, text: "한정적 용법(콤마 없이 that/which)은 '안전하다고 인식되는 그 제품들만'으로 좁혀버리고, 계속적 용법은 '그 제품들인데 — 우리가 안전하다고 인식하는'으로 부가정보를 추가하는 거야. 이 문장에서는 plant products 전체를 지칭하므로 계속적이 맞아.", time: "14:20" }
    ],
    showAnswers: false
  },
];

export default function QnAPage() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newQ, setNewQ] = useState("");
  const [selectedPassage, setSelectedPassage] = useState(PASSAGE_OPTIONS[0]);
  const [showPassagePicker, setShowPassagePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getQnaPosts();
        if (data && data.length > 0) {
          const formatted: Post[] = data.map((p: any) => ({
            id: p.id,
            author: p.profiles?.full_name || "익명",
            class: p.profiles?.class_name || "일반",
            passage: p.passage_id || "기타",
            question: p.question,
            likes: 0,
            liked: false,
            status: p.status,
            answers: (p.qna_answers || []).map((a: any) => ({
              id: a.id,
              author: a.profiles?.full_name || (a.is_teacher ? "선생님" : "학생"),
              isTeacher: a.is_teacher,
              text: a.text,
              time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })),
            showAnswers: false
          }));
          setPosts(formatted);
        }
      } catch (err) {
        console.warn("Using mock posts:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleLike = (id: string) => {
    setPosts(p => p.map(post => post.id === id
      ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
      : post
    ));
  };

  const toggleAnswers = (id: string) => {
    setPosts(p => p.map(post => post.id === id ? { ...post, showAnswers: !post.showAnswers } : post));
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim()) return;

    try {
      const mockAuthorId = "s1"; 
      const result = await createQnaPost(mockAuthorId, selectedPassage, newQ);
      const newPost: Post = {
        id: result.id, author: "김가연", class: "고3 금토반",
        passage: selectedPassage,
        question: newQ, likes: 0, liked: false, status: "pending", answers: [], showAnswers: false
      };
      setPosts(prev => [newPost, ...prev]);
      setNewQ("");
    } catch (err) {
      const newPost: Post = {
        id: Date.now().toString(), author: "김가연", class: "고3 금토반",
        passage: selectedPassage,
        question: newQ, likes: 0, liked: false, status: "pending", answers: [], showAnswers: false
      };
      setPosts(prev => [newPost, ...prev]);
      setNewQ("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      <div className="px-6 pt-10 pb-6 shrink-0">
        <h1 className="text-3xl text-foreground serif font-black">Q&amp;A 게시판</h1>
        <p className="text-[14px] text-accent mt-2 font-medium">지문별 궁금증을 남기면 선생님이 직접 상세히 답변해줄게.</p>
      </div>

      <form onSubmit={handlePost} className="px-6 mb-8 shrink-0">
        <div className="glass framer-card rounded-[2.2rem] border border-foreground/5 p-6 shadow-sm focus-within:border-foreground/20 transition-all duration-500 bg-white">
          <div className="relative mb-4">
            <button 
              type="button"
              onClick={() => setShowPassagePicker(!showPassagePicker)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-light text-[11px] font-black text-foreground hover:bg-foreground/5 transition-all shadow-sm"
            >
              관련 지문: {selectedPassage.split("]")[0].replace("[", "")}
              <ChevronDown size={14} strokeWidth={3} />
            </button>
            {showPassagePicker && (
              <div className="absolute top-12 left-0 w-72 glass border border-foreground/10 rounded-[1.8rem] overflow-hidden shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95">
                {PASSAGE_OPTIONS.map(p => (
                  <button key={p} type="button" onClick={() => { setSelectedPassage(p); setShowPassagePicker(false); }}
                    className="w-full px-4 py-3 text-left text-[12px] font-bold hover:bg-foreground/5 rounded-xl border-b border-foreground/5 last:border-0 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <textarea
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="S번호와 함께 구체적으로 질문을 남겨줘..."
              className="flex-1 bg-transparent resize-none text-[15px] leading-relaxed text-foreground placeholder:text-accent/40 font-medium focus:outline-none min-h-[100px]"
            />
            <button
              type="submit"
              disabled={!newQ.trim()}
              className="w-14 h-14 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center shrink-0 self-end disabled:opacity-20 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto px-6 custom-scrollbar pb-32 flex flex-col gap-6">
        {isLoading ? (
          <div className="text-center py-10 text-accent text-[14px] font-bold animate-pulse">데이터 로드 중...</div>
        ) : posts.map(post => (
          <div key={post.id} className={`glass framer-card rounded-[2.5rem] border p-8 transition-all shadow-sm bg-white/50 ${post.status === 'answered' ? 'border-foreground/5' : 'border-error/10'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-[1rem] bg-foreground text-background flex items-center justify-center text-[15px] font-black shadow-lg">
                  {post.author[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-black text-foreground">{post.author}</span>
                    <span className="text-[10px] text-accent bg-accent-light px-2 py-0.5 rounded-md font-bold">{post.class}</span>
                  </div>
                  <span className="text-[11px] text-accent font-bold mt-1 block opacity-70 italic">{post.passage}</span>
                </div>
              </div>
              {post.status === 'answered' ? (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-success uppercase tracking-widest bg-success/10 px-3 py-1.5 rounded-xl border border-success/10">
                  <CheckCircle size={12} strokeWidth={3} /> 답변완료
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-error uppercase tracking-widest bg-error/10 px-3 py-1.5 rounded-xl border border-error/10">
                  <Clock size={12} strokeWidth={3} /> 답변대기
                </div>
              )}
            </div>

            <p className="text-[16px] text-foreground font-medium leading-[1.7] mb-8">{post.question}</p>

            <div className="flex items-center gap-6">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-2 text-[13px] font-black transition-all ${post.liked ? "text-foreground" : "text-accent hover:text-foreground"}`}
              >
                <ThumbsUp size={18} strokeWidth={2.5} fill={post.liked ? "currentColor" : "none"} />
                {post.likes}
              </button>
              <button
                onClick={() => toggleAnswers(post.id)}
                className={`flex items-center gap-2 text-[13px] font-black transition-all ${post.showAnswers ? "text-foreground" : "text-accent hover:text-foreground"}`}
              >
                <MessageCircle size={18} strokeWidth={2.5} />
                답변 {post.answers.length}개
              </button>
            </div>

            {post.showAnswers && post.answers.length > 0 && (
              <div className="mt-8 space-y-5 border-t border-foreground/5 pt-8 animate-in fade-in slide-in-from-top-3 duration-500">
                {post.answers.map(ans => (
                  <div key={ans.id} className={`p-6 rounded-[2rem] text-[15px] leading-relaxed font-medium shadow-md ${ans.isTeacher ? "bg-foreground text-background" : "bg-accent-light text-foreground"}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-60">{ans.isTeacher ? "선생님 답변" : "학생 의견"}</span>
                      <span className="text-[10px] font-bold opacity-50">{ans.time}</span>
                    </div>
                    {ans.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
