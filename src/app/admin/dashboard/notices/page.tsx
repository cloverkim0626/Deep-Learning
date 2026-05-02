"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, Check, ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; author: string; isTeacher: boolean; content: string; time: string; };
type Notice = { id: string; title: string; content: string; author: string; createdAt: string; comments: Comment[]; showComments: boolean; };

async function getNotices(): Promise<Notice[]> {
  const { data } = await supabase.from("parent_notices").select("*, parent_notice_comments(*)").order("created_at", { ascending: false });
  return (data || []).map((n: any) => ({
    id: n.id, title: n.title, content: n.content, author: n.author_name, createdAt: n.created_at,
    comments: (n.parent_notice_comments || []).map((c: any) => ({
      id: c.id, author: c.author_name, isTeacher: !!c.is_teacher, content: c.content,
      time: new Date(c.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    })),
    showComments: false,
  }));
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setNotices(await getNotices());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleComments = (id: string) => setNotices(prev => prev.map(n => n.id === id ? { ...n, showComments: !n.showComments } : n));

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) { alert("제목과 내용을 입력해 주세요."); return; }
    setSaving(true);
    await supabase.from("parent_notices").insert({ title, content, author_name: "선생님" });
    setTitle(""); setContent(""); setShowForm(false);
    await load(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 공지를 삭제하시겠습니까?")) return;
    await supabase.from("parent_notices").delete().eq("id", id);
    await load();
  };

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    await supabase.from("parent_notices").update({ title: editTitle, content: editContent, updated_at: new Date().toISOString() }).eq("id", id);
    setEditId(null); await load();
  };

  const handleComment = async (noticeId: string) => {
    const text = commentInput[noticeId]; if (!text?.trim()) return;
    await supabase.from("parent_notice_comments").insert({ notice_id: noticeId, author_name: "선생님", is_teacher: true, content: text });
    setCommentInput(p => ({ ...p, [noticeId]: "" }));
    await load();
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await supabase.from("parent_notice_comments").delete().eq("id", id);
    await load();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-slate-800">🔔 학부모 공지사항</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">학부모님께 공지를 전달하세요</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-black text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)" }}>
          <Plus size={15} /> 공지 작성
        </button>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <div className="mb-5 p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <p className="text-[12px] font-black text-indigo-500 uppercase tracking-widest mb-3">새 공지 작성</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목"
            className="w-full h-11 px-4 mb-3 rounded-xl border border-slate-200 text-[14px] font-bold outline-none focus:border-indigo-400 text-slate-800" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 작성하세요..." rows={5}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-indigo-400 resize-none text-slate-700 font-medium" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-500">취소</button>
            <button onClick={handlePost} disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-black text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)" }}>
              {saving ? "저장 중..." : "게시하기"}
            </button>
          </div>
        </div>
      )}

      {/* 공지 목록 */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">로딩 중...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 text-slate-300 text-[14px]">아직 공지사항이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {notices.map(n => {
            const isEditing = editId === n.id;
            return (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  {/* 제목 */}
                  {isEditing ? (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full h-10 px-3 mb-2 rounded-xl border border-slate-200 text-[15px] font-bold outline-none focus:border-indigo-400 text-slate-800" />
                  ) : (
                    <h3 className="text-[16px] font-black text-slate-800 mb-1">{n.title}</h3>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-indigo-500 px-2 py-0.5 rounded-full bg-indigo-50">📣 선생님</span>
                    <span className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {/* 내용 */}
                  {isEditing ? (
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-indigo-400 resize-none text-slate-700" />
                  ) : (
                    <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  )}
                  {/* 액션 */}
                  <div className="flex items-center justify-between mt-3">
                    <button onClick={() => toggleComments(n.id)}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-all">
                      <MessageCircle size={14} /> 댓글 {n.comments.length}
                      {n.showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleEditSave(n.id)} className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100"><Check size={13} /></button>
                          <button onClick={() => setEditId(null)} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(n.id); setEditTitle(n.title); setEditContent(n.content); }} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(n.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-all"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 댓글 */}
                {n.showComments && (
                  <div className="border-t border-slate-50 px-5 py-4 bg-slate-50/50 animate-in fade-in duration-200">
                    <div className="space-y-3 mb-3">
                      {n.comments.length === 0 && <p className="text-[12px] text-slate-300 text-center py-2">아직 댓글이 없어요</p>}
                      {n.comments.map(c => (
                        <div key={c.id} className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                            style={c.isTeacher ? { background: "#6366f1", color: "#fff" } : { background: "#e2e8f0", color: "#64748b" }}>
                            {c.isTeacher ? "T" : c.author[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-black text-slate-700">{c.isTeacher ? "선생님" : c.author}</span>
                              <span className="text-[10px] text-slate-300">{c.time}</span>
                            </div>
                            <p className="text-[13px] text-slate-600 leading-relaxed">{c.content}</p>
                          </div>
                          <button onClick={() => handleDeleteComment(c.id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 flex-shrink-0"><Trash2 size={11} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100">
                      <input value={commentInput[n.id] || ""} onChange={e => setCommentInput(p => ({ ...p, [n.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleComment(n.id)}
                        placeholder="댓글 작성..."
                        className="flex-1 bg-transparent text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-300" />
                      <button onClick={() => handleComment(n.id)} className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white hover:bg-indigo-600 flex-shrink-0"><Send size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
