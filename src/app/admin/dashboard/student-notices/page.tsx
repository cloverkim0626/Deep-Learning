"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, Check, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DBClass = { id: string; name: string; academy_name: string | null };
type StudentNotice = {
  id: string;
  title: string;
  content: string;
  class_name: string;
  author_name: string;
  created_at: string;
  updated_at: string;
};

// Helper component for rendering HTML notices inside a sandboxed iframe
function NoticePreviewIframe({ content }: { content: string }) {
  const iframeRef = (el: HTMLIFrameElement | null) => {
    if (!el) return;
    const doc = el.contentDocument || el.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();

    // Dynamically adjust height
    const resize = () => {
      const body = doc.body;
      const html = doc.documentElement;
      if (body && html) {
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        el.style.height = `${height + 20}px`;
      }
    };
    el.onload = resize;
    setTimeout(resize, 200);
  };

  return (
    <iframe
      ref={iframeRef}
      style={{ width: "100%", minHeight: "350px", border: "none", background: "#ffffff", borderRadius: "12px" }}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}

export default function AdminStudentNoticesPage() {
  const [notices, setNotices] = useState<StudentNotice[]>([]);
  const [classes, setClasses] = useState<DBClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetClass, setTargetClass] = useState("전체");

  // Edit State
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editClass, setEditClass] = useState("전체");

  // Preview State
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch student notices
      const { data: noticeData, error: noticeErr } = await supabase
        .from("student_notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (noticeErr) throw noticeErr;
      setNotices(noticeData || []);

      // 2. Fetch classes
      const { data: classData, error: classErr } = await supabase
        .from("classes")
        .select("id, name, academy_name")
        .order("name", { ascending: true });
      if (classErr) throw classErr;
      setClasses(classData || []);
    } catch (err) {
      console.error("Error loading student notices admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("student_notices")
        .insert({
          title,
          content,
          class_name: targetClass,
          author_name: "선생님",
        });
      if (error) throw error;
      setTitle("");
      setContent("");
      setTargetClass("전체");
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Error posting notice:", err);
      alert("공지 등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 학생 공지를 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("student_notices")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Error deleting notice:", err);
      alert("공지 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      alert("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    try {
      const { error } = await supabase
        .from("student_notices")
        .update({
          title: editTitle,
          content: editContent,
          class_name: editClass,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      setEditId(null);
      await loadData();
    } catch (err) {
      console.error("Error saving edited notice:", err);
      alert("공지 수정 중 오류가 발생했습니다.");
    }
  };

  const isHTML = (str: string) => /<[a-z/][\s\S]*>/i.test(str);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-black text-slate-800">📢 학생 공지사항 관리</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">학생들에게 주차별 수업공지 및 과제를 전달하세요</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-black text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)" }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "작성 취소" : "공지 작성"}
        </button>
      </div>

      {/* Write Form */}
      {showForm && (
        <div className="mb-5 p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <p className="text-[12px] font-black text-indigo-500 uppercase tracking-widest mb-3">새 공지 작성</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 pl-1 block mb-1">공지 제목</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 6월 3주차 시험범위 공지"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-[14px] font-bold outline-none focus:border-indigo-400 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 pl-1 block mb-1">대상 반 선택</label>
              <select
                value={targetClass}
                onChange={e => setTargetClass(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-[14px] font-bold outline-none focus:border-indigo-400 text-slate-800 bg-white"
              >
                <option value="전체">전체 공지 (모든 학생)</option>
                <option value="GUEST">GUEST 체험반</option>
                {classes.map(c => {
                  const label = c.academy_name ? `[${c.academy_name}] ${c.name}` : c.name;
                  return <option key={c.id} value={c.name}>{label}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-400 pl-1">공지 내용 (HTML 코드, 일반 텍스트, 혹은 단독 URL 링크 입력 가능)</label>
              {content.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTitle(title || "공지사항 미리보기");
                    setPreviewContent(content);
                  }}
                  className="text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                >
                  <Eye size={12} /> 입력 화면 미리보기
                </button>
              )}
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="여기에 공지글이나 HTML 코드를 입력하세요. 만약 http:// 또는 https:// 로 시작하는 웹 링크만 입력하면, 학생이 공지 클릭 시 모달창 없이 해당 웹사이트로 바로 연결됩니다."
              rows={10}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] font-mono outline-none focus:border-indigo-400 resize-y text-slate-700 font-medium"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-500 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handlePost}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-black text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)" }}
            >
              {saving ? "저장 중..." : "게시하기"}
            </button>
          </div>
        </div>
      )}

      {/* Notices List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">로딩 중...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 text-slate-300 text-[14px]">
          아직 등록된 학생 공지가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(n => {
            const isEditing = editId === n.id;
            const isHtmlNotice = isHTML(n.content);

            return (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold outline-none focus:border-indigo-400 text-slate-800"
                        />
                      </div>
                      <div>
                        <select
                          value={editClass}
                          onChange={e => setEditClass(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold outline-none focus:border-indigo-400 text-slate-800 bg-white"
                        >
                          <option value="전체">전체 공지</option>
                          <option value="GUEST">GUEST 체험반</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.name}>
                              {c.academy_name ? `[${c.academy_name}] ${c.name}` : c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-mono outline-none focus:border-indigo-400 resize-y text-slate-700"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditId(null)}
                        className="px-4 h-9 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-500"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleEditSave(n.id)}
                        className="px-4 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-bold flex items-center gap-1"
                      >
                        <Check size={14} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              n.class_name === "전체"
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : n.class_name === "GUEST"
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                            }`}
                          >
                            🎯 {n.class_name === "전체" ? "전체 공지" : n.class_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleString("ko-KR", {
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {n.content.trim().startsWith("http://") || n.content.trim().startsWith("https://") ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                              링크 바로가기
                            </span>
                          ) : isHtmlNotice ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                              HTML 포맷
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800">{n.title}</h3>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPreviewTitle(n.title);
                            setPreviewContent(n.content);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                          title="미리보기"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditId(n.id);
                            setEditTitle(n.title);
                            setEditContent(n.content);
                            setEditClass(n.class_name);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                          title="수정"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Short Text Snippet */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {n.content.trim().startsWith("http://") || n.content.trim().startsWith("https://") ? (
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] text-indigo-600 font-bold font-mono truncate mr-2">
                            🔗 [링크 연결] {n.content.trim()}
                          </p>
                          <a
                            href={n.content.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-indigo-500 hover:underline shrink-0"
                          >
                            링크 열기 →
                          </a>
                        </div>
                      ) : (
                        <p className="text-[12px] text-slate-500 font-mono line-clamp-2 overflow-hidden">
                          {isHtmlNotice ? "[HTML 코드 소스]" : ""} {n.content}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notice Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">공지사항 미리보기</span>
                <h4 className="text-[14px] font-black text-slate-800">{previewTitle}</h4>
              </div>
              <button
                onClick={() => {
                  setPreviewContent(null);
                  setPreviewTitle("");
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              {isHTML(previewContent) ? (
                <div className="shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <NoticePreviewIframe content={previewContent} />
                </div>
              ) : (
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                  <p className="whitespace-pre-wrap text-[14px] text-slate-800 leading-relaxed font-medium">
                    {previewContent}
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-slate-50 text-right">
              <button
                onClick={() => {
                  setPreviewContent(null);
                  setPreviewTitle("");
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-[12px] hover:bg-slate-700 active:scale-95 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
