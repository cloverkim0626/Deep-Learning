"use client";
import { useState, useEffect, useCallback } from "react";
import { Send, MessageCircle, Plus, X, Trash2, Pencil, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Answer = { id: string; author: string; isTeacher: boolean; text: string; time: string; };
type Post = { id: string; author: string; question: string; status: "pending"|"answered"; answers: Answer[]; showAnswers: boolean; createdAt: string; };
type Hearts = Record<string, string[]>;

const KTALK = {
  myBubble:      { bg: "rgba(100,70,220,0.25)",  text: "#d0c8ff" },
  otherBubble:   { bg: "rgba(255,255,255,0.07)", text: "rgba(220,210,255,0.85)" },
  teacherBubble: { bg: "rgba(60,30,160,0.35)",   text: "#c8b8ff" },
};
const BR = "18px";

async function getPosts() {
  const { data } = await supabase.from("parent_qna_posts").select("*, parent_qna_answers(*)").order("created_at", { ascending: true });
  return data || [];
}
async function createPost(author: string, className: string, question: string) {
  const { data } = await supabase.from("parent_qna_posts").insert({ author_name: author, class_name: className, question }).select().single();
  return data;
}
async function addAnswer(postId: string, author: string, text: string, isTeacher: boolean) {
  await supabase.from("parent_qna_answers").insert({ post_id: postId, author_name: author, is_teacher: isTeacher, text });
  if (!isTeacher) await supabase.from("parent_qna_posts").update({ status: "answered" }).eq("id", postId);
}
async function deletePost(id: string) { await supabase.from("parent_qna_posts").delete().eq("id", id); }
async function updatePost(id: string, question: string) { await supabase.from("parent_qna_posts").update({ question }).eq("id", id); }
async function updateAnswer(id: string, text: string) { await supabase.from("parent_qna_answers").update({ text }).eq("id", id); }
async function deleteAnswer(id: string) { await supabase.from("parent_qna_answers").delete().eq("id", id); }
async function getHearts(ids: string[]): Promise<Hearts> {
  if (!ids.length) return {};
  const { data } = await supabase.from("parent_qna_hearts").select("target_id,author_name").in("target_id", ids);
  const result: Hearts = {};
  for (const r of data || []) { result[r.target_id] = [...(result[r.target_id] || []), r.author_name]; }
  return result;
}
async function toggleHeart(targetId: string, type: string, author: string, liked: boolean) {
  if (liked) { await supabase.from("parent_qna_hearts").delete().eq("target_id", targetId).eq("author_name", author); }
  else { await supabase.from("parent_qna_hearts").insert({ target_id: targetId, target_type: type, author_name: author }); }
}

export default function ParentQnA() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [posting, setPosting] = useState(false);
  const [parentName, setParentName] = useState("학부모");
  const [className, setClassName] = useState("");
  const [hearts, setHearts] = useState<Hearts>({});
  const [heartLoading, setHeartLoading] = useState<string|null>(null);
  const [commentInput, setCommentInput] = useState<Record<string,string>>({});
  const [submittingId, setSubmittingId] = useState<string|null>(null);
  const [editPostId, setEditPostId] = useState<string|null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [editAnsId, setEditAnsId] = useState<string|null>(null);
  const [editAnsText, setEditAnsText] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("parentSession");
      if (raw) { const d = JSON.parse(raw); setParentName(d.studentName ? `${d.studentName} 학부모` : "학부모"); setClassName(d.className || ""); }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await getPosts();
      const fmt: Post[] = (data as any[]).map(p => ({
        id: p.id, author: p.author_name || "익명", question: p.question, createdAt: p.created_at,
        status: p.status || "pending",
        answers: (p.parent_qna_answers || []).map((a: any) => ({
          id: a.id, author: a.is_teacher ? "선생님" : (a.author_name || "익명"),
          isTeacher: !!a.is_teacher, text: a.text,
          time: new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
        showAnswers: false,
      }));
      setPosts(fmt);
      const ids = fmt.flatMap(p => [p.id, ...p.answers.map(a => a.id)]);
      setHearts(await getHearts(ids));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAnswers = (id: string) => setPosts(prev => prev.map(p => p.id === id ? { ...p, showAnswers: !p.showAnswers } : p));

  const handleHeart = async (targetId: string, type: "post"|"answer") => {
    if (heartLoading === targetId) return;
    const liked = (hearts[targetId] || []).includes(parentName);
    setHearts(prev => ({ ...prev, [targetId]: liked ? (prev[targetId]||[]).filter(u=>u!==parentName) : [...(prev[targetId]||[]), parentName] }));
    setHeartLoading(targetId);
    try { await toggleHeart(targetId, type, parentName, liked); }
    catch { setHearts(prev => ({ ...prev, [targetId]: liked ? [...(prev[targetId]||[]), parentName] : (prev[targetId]||[]).filter(u=>u!==parentName) })); }
    finally { setHeartLoading(null); }
  };

  const handlePost = async () => {
    if (!question.trim()) return;
    setPosting(true);
    try { await createPost(parentName, className, question); setShowModal(false); setQuestion(""); await load(); }
    catch { alert("등록 실패"); }
    finally { setPosting(false); }
  };

  const handleComment = async (postId: string) => {
    const text = commentInput[postId]; if (!text?.trim()) return;
    setSubmittingId(postId);
    try { await addAnswer(postId, parentName, text, false); setCommentInput(p => ({...p,[postId]:""})); await load(); }
    catch { alert("댓글 등록 실패"); }
    finally { setSubmittingId(null); }
  };

  const HeartBtn = ({ targetId, type }: { targetId: string; type: "post"|"answer" }) => {
    const likers = hearts[targetId] || [];
    const liked = likers.includes(parentName);
    return (
      <button onClick={e => { e.stopPropagation(); handleHeart(targetId, type); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-all hover:scale-105 select-none"
        style={{ background: liked ? "rgba(160,80,220,0.2)" : "rgba(255,255,255,0.06)", border: liked ? "1px solid rgba(160,80,220,0.4)" : "1px solid rgba(255,255,255,0.12)", color: liked ? "#c084fc" : "rgba(200,190,255,0.5)", fontSize: 10, fontWeight: 700 }}>
        <span style={{ fontSize: 13 }}>{liked ? "💜" : "🤍"}</span><span>{likers.length}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500" style={{ background: "transparent", minHeight: "calc(100vh - 120px)", fontFamily: "var(--font-inter), sans-serif" }}>

      {/* 헤더 */}
      <div className="px-5 pt-6 pb-4 shrink-0 flex items-center justify-between"
        style={{ background: "rgba(10,5,30,0.6)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(120,80,255,0.2)" }}>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "rgba(220,210,255,0.95)" }}>Q&amp;A 채팅방</h1>
          <p className="text-[12px] mt-0.5 font-semibold" style={{ color: "rgba(160,130,255,0.6)" }}>학습 관련 질문을 자유롭게 남겨주세요 💬</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ background: "rgba(120,80,255,0.2)", border: "1px solid rgba(120,80,255,0.4)", color: "rgba(200,180,255,0.9)" }}>
          <Plus size={22} strokeWidth={3} />
        </button>
      </div>

      {/* 채팅방 라벨 */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div style={{ flex:1, height:1, background:"rgba(120,80,255,0.15)" }} />
        <span className="text-[11px] font-bold px-3 py-0.5 rounded-full" style={{ background:"rgba(80,50,180,0.2)", color:"rgba(180,150,255,0.7)", border:"1px solid rgba(120,80,255,0.2)" }}>학부모 Q&amp;A</span>
        <div style={{ flex:1, height:1, background:"rgba(120,80,255,0.15)" }} />
      </div>

      {/* 포스트 목록 */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-2 pt-1">
        {loading ? (
          <div className="text-center py-20 font-bold animate-pulse" style={{ color:"rgba(0,80,100,0.6)" }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-24 text-center font-bold opacity-50" style={{ color:"rgba(0,80,100,0.6)" }}>아직 질문이 없습니다. 첫 질문을 남겨보세요! 👋</div>
        ) : posts.map(post => {
          const isMine = post.author === parentName;
          const isEditing = editPostId === post.id;
          return (
            <div key={post.id} className="flex flex-col items-stretch mb-2">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-5 text-[13px] font-black"
                  style={isMine ? { background:"#D4AF37", color:"#3A1D1D" } : { background:"rgba(255,255,255,0.65)", color:"#5a3a1a" }}>
                  {isMine ? parentName[0] : "?"}
                </div>
                <div className="flex flex-col items-start gap-1" style={{ width:"80%" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold" style={{ color:"rgba(50,30,10,0.8)" }}>{isMine ? `나 (${parentName})` : "익명"}</span>
                  </div>
                  <div className="w-full px-4 pt-3 pb-2"
                    style={{ background: isMine ? KTALK.myBubble.bg : KTALK.otherBubble.bg, color: isMine ? KTALK.myBubble.text : KTALK.otherBubble.text, borderRadius: BR, boxShadow:"0 1px 4px rgba(0,0,0,0.13)" }}>
                    {isEditing ? (
                      <textarea value={editPostText} onChange={e=>setEditPostText(e.target.value)} autoFocus rows={3}
                        style={{ width:"100%", background:"rgba(255,255,255,0.55)", border:"1px solid rgba(0,0,0,0.12)", color:"#1a2a36", borderRadius:10, padding:"6px 10px", resize:"vertical", fontSize:15, outline:"none" }} />
                    ) : (
                      <p style={{ fontSize:15, lineHeight:1.65, fontWeight:500, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>{post.question}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={post.status==="answered" ? { background:"rgba(40,160,70,0.18)",color:"#1a6a2a" } : { background:"rgba(190,150,0,0.15)",color:"#7a5a00" }}>
                        {post.status==="answered" ? "✓ 답변완료" : "○ 대기중"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <HeartBtn targetId={post.id} type="post" />
                        <button onClick={e=>{e.stopPropagation();toggleAnswers(post.id);}}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full transition-all hover:scale-105"
                          style={{ background:post.showAnswers?"rgba(100,60,0,0.18)":"rgba(0,0,0,0.07)", border:post.showAnswers?"1px solid rgba(100,60,0,0.28)":"1px solid rgba(0,0,0,0.1)", color:"#5a3010", fontSize:10, fontWeight:700 }}>
                          <MessageCircle size={11} strokeWidth={2.5} />{post.answers.length}{post.showAnswers?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px]" style={{ color:"rgba(0,60,80,0.5)" }}>
                      {new Date(post.createdAt).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                    </span>
                    {isMine && !isEditing && (
                      <>
                        <button onClick={()=>{setEditPostId(post.id);setEditPostText(post.question);}} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50" style={{color:"rgba(50,30,10,0.42)"}}><Pencil size={11}/></button>
                        <button onClick={async()=>{if(!confirm("삭제할까요?"))return;await deletePost(post.id);await load();}} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-200/60" style={{color:"rgba(180,60,60,0.65)"}}><Trash2 size={11}/></button>
                      </>
                    )}
                    {isMine && isEditing && (
                      <>
                        <button onClick={async()=>{await updatePost(post.id,editPostText);setEditPostId(null);await load();}} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-green-200/60" style={{color:"#1a7a2a"}}><Check size={12}/></button>
                        <button onClick={()=>setEditPostId(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50" style={{color:"rgba(50,30,10,0.42)"}}><X size={12}/></button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 댓글 */}
              {post.showAnswers && (
                <div className="mt-2 pl-11 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col gap-2 items-end">
                    {post.answers.length===0 && <p className="w-full text-center py-2 text-[11px] font-semibold" style={{color:"rgba(50,30,10,0.4)"}}>아직 댓글이 없어요 🌱</p>}
                    {post.answers.map(ans => {
                      const isMe = ans.author === parentName;
                      const isEditingAns = editAnsId === ans.id;
                      const bg = ans.isTeacher ? KTALK.teacherBubble.bg : isMe ? "#D4F0FF" : KTALK.otherBubble.bg;
                      const col = ans.isTeacher ? KTALK.teacherBubble.text : isMe ? "#0d2d3f" : "#222";
                      return (
                        <div key={ans.id} className="flex flex-col items-end" style={{width:"90%"}}>
                          <div className="flex items-center gap-1.5 mb-1 pr-0.5 self-end">
                            {ans.isTeacher && <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{background:"#D4AF37",color:"#3a2800"}}>⭐ 선생님</span>}
                            <span className="text-[10px] font-bold" style={{color:ans.isTeacher?"#7a5a00":"rgba(50,30,10,0.65)"}}>{ans.isTeacher?"선생님":isMe?`나 (${parentName})`:"익명"}</span>
                          </div>
                          <div className="w-full px-4 pt-3 pb-2" style={{background:bg,color:col,borderRadius:BR,boxShadow:ans.isTeacher?"0 2px 10px rgba(212,175,55,0.2)":"0 1px 3px rgba(0,0,0,0.09)",borderLeft:ans.isTeacher?"3px solid #D4AF37":"none"}}>
                            {isEditingAns ? (
                              <textarea value={editAnsText} onChange={e=>setEditAnsText(e.target.value)} autoFocus rows={2}
                                style={{width:"100%",background:"rgba(255,255,255,0.65)",border:"1px solid rgba(0,0,0,0.1)",color:"#1a2a36",borderRadius:8,padding:"4px 8px",resize:"vertical",fontSize:13,outline:"none"}}
                                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();updateAnswer(ans.id,editAnsText).then(()=>{setEditAnsId(null);load();});}}} />
                            ) : (
                              <p style={{fontSize:13,lineHeight:1.65,fontWeight:ans.isTeacher?600:500,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{ans.text}</p>
                            )}
                            <div className="flex justify-end mt-1.5"><HeartBtn targetId={ans.id} type="answer"/></div>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 pr-0.5">
                            <span className="text-[9px]" style={{color:"rgba(50,30,10,0.42)"}}>{ans.time}</span>
                            {isMe && !ans.isTeacher && !isEditingAns && (
                              <>
                                <button onClick={()=>{setEditAnsId(ans.id);setEditAnsText(ans.text);}} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50" style={{color:"rgba(50,30,10,0.38)"}}><Pencil size={9}/></button>
                                <button onClick={async()=>{if(!confirm("삭제?"))return;await deleteAnswer(ans.id);await load();}} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-200/60" style={{color:"rgba(180,60,60,0.58)"}}><Trash2 size={9}/></button>
                              </>
                            )}
                            {isMe && !ans.isTeacher && isEditingAns && (
                              <>
                                <button onClick={async()=>{await updateAnswer(ans.id,editAnsText);setEditAnsId(null);await load();}} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-green-200/60" style={{color:"#1a7a2a"}}><Check size={10}/></button>
                                <button onClick={()=>setEditAnsId(null)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50" style={{color:"rgba(50,30,10,0.38)"}}><X size={10}/></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 댓글 입력 */}
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-2xl" style={{background:"rgba(255,255,255,0.6)",backdropFilter:"blur(6px)",border:"1px solid rgba(255,255,255,0.8)"}}>
                    <MessageCircle size={14} strokeWidth={2} style={{color:"rgba(0,100,120,0.4)",flexShrink:0}}/>
                    <input value={commentInput[post.id]||""} onChange={e=>setCommentInput(p=>({...p,[post.id]:e.target.value}))}
                      onKeyDown={e=>e.key==="Enter"&&handleComment(post.id)} placeholder="댓글 입력..."
                      className="flex-1 bg-transparent text-[13px] font-medium focus:outline-none" style={{color:"#0d3b4f"}}/>
                    <button onClick={()=>handleComment(post.id)} disabled={submittingId===post.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-40 transition-all"
                      style={{background:"rgba(0,180,200,0.85)",color:"#fff"}}><Send size={13} strokeWidth={2.5}/></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 질문 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={()=>{setShowModal(false);setQuestion("");}}/>
          <div className="relative w-full max-w-md bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[70vh] flex flex-col">
            <div className="flex justify-center mb-6"><div className="w-14 h-1.5 rounded-full bg-slate-200"/></div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[22px] font-black text-slate-800">질문하기</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">{parentName}</p>
              </div>
              <button onClick={()=>{setShowModal(false);setQuestion("");}} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><X size={18}/></button>
            </div>
            <textarea value={question} onChange={e=>setQuestion(e.target.value)} autoFocus placeholder="질문 내용을 작성해 주세요..."
              className="flex-1 p-5 rounded-[2rem] border border-slate-200 focus:border-yellow-400 focus:outline-none text-[15px] font-medium resize-none text-slate-800 placeholder:text-slate-300" rows={5}/>
            <button onClick={handlePost} disabled={posting||!question.trim()}
              className="w-full h-14 rounded-[2rem] font-black text-[15px] mt-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-30"
              style={{background:"linear-gradient(135deg,#D4AF37 0%,#b8960c 100%)",color:"#3A1D1D"}}>
              {posting?"등록 중...":"질문 등록"} <Send size={18} strokeWidth={2.5}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
