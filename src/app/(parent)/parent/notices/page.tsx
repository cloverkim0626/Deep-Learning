"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; author: string; isTeacher: boolean; content: string; time: string; };
type Notice = { id: string; title: string; content: string; author: string; createdAt: string; comments: Comment[]; showComments: boolean; };

export default function ParentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("학부모");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("parentSession");
      if (raw) { const d = JSON.parse(raw); setParentName(d.studentName ? `${d.studentName} 학부모` : "학부모"); }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("parent_notices").select("*, parent_notice_comments(*)").order("created_at", { ascending: false });
    setNotices((data || []).map((n: any) => ({
      id: n.id, title: n.title, content: n.content, author: n.author_name, createdAt: n.created_at,
      comments: (n.parent_notice_comments || []).map((c: any) => ({
        id: c.id, author: c.author_name, isTeacher: !!c.is_teacher, content: c.content,
        time: new Date(c.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      })),
      showComments: false,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleComments = (id: string) => setNotices(prev => prev.map(n => n.id === id ? { ...n, showComments: !n.showComments } : n));

  const handleComment = async (noticeId: string) => {
    const text = commentInput[noticeId]; if (!text?.trim()) return;
    setSubmittingId(noticeId);
    await supabase.from("parent_notice_comments").insert({ notice_id: noticeId, author_name: parentName, is_teacher: false, content: text });
    setCommentInput(p => ({ ...p, [noticeId]: "" }));
    await load(); setSubmittingId(null);
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await supabase.from("parent_notice_comments").delete().eq("id", id).eq("author_name", parentName);
    await load();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="pt-4 pb-5">
        <h1 className="text-[22px] font-black text-slate-800">📣 공지사항</h1>
        <p className="text-[12px] text-slate-500 mt-0.5">선생님의 공지를 확인하세요</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse text-[13px]">불러오는 중...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 text-slate-300 text-[14px]">아직 공지사항이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <div key={n.id} className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,150,200,0.12)", backdropFilter: "blur(8px)" }}>
              <div className="p-5">
                {/* 태그 + 날짜 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(0,119,182,0.1)", color: "#0077b6" }}>📣 선생님</span>
                  <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <h3 className="text-[16px] font-black text-slate-800 mb-2">{n.title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>

                {/* 댓글 토글 */}
                <button onClick={() => toggleComments(n.id)}
                  className="mt-3 flex items-center gap-1.5 text-[12px] font-bold transition-all"
                  style={{ color: "#0077b6" }}>
                  <MessageCircle size={14} /> 댓글 {n.comments.length}
                  {n.showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* 댓글 섹션 */}
              {n.showComments && (
                <div className="border-t px-5 py-4 animate-in fade-in duration-200" style={{ borderColor: "rgba(0,150,200,0.1)", background: "rgba(202,240,248,0.3)" }}>
                  <div className="space-y-3 mb-3">
                    {n.comments.length === 0 && <p className="text-[12px] text-slate-300 text-center py-2">아직 댓글이 없어요</p>}
                    {n.comments.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                          style={c.isTeacher ? { background: "#0077b6", color: "#fff" } : { background: "rgba(0,119,182,0.15)", color: "#0077b6" }}>
                          {c.isTeacher ? "T" : c.author[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-black text-slate-700">{c.isTeacher ? "선생님" : c.author}</span>
                            <span className="text-[10px] text-slate-300">{c.time}</span>
                          </div>
                          <p className="text-[13px] text-slate-600 leading-relaxed">{c.content}</p>
                        </div>
                        {c.author === parentName && !c.isTeacher && (
                          <button onClick={() => handleDeleteComment(c.id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-400 flex-shrink-0"><Trash2 size={11} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* 댓글 입력 */}
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100 shadow-sm">
                    <input value={commentInput[n.id] || ""} onChange={e => setCommentInput(p => ({ ...p, [n.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handleComment(n.id)}
                      placeholder="댓글 입력..."
                      className="flex-1 bg-transparent text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-300" />
                    <button onClick={() => handleComment(n.id)} disabled={submittingId === n.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all"
                      style={{ background: "#0077b6" }}>
                      <Send size={12} />
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
