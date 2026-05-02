"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Timer, Trash2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TUTORS } from "@/lib/tutors";

type ClinicEntry = {
  id: string; student_name: string; topic: string;
  status: "waiting"|"in-progress"|"completed";
  created_at: string; started_at?: string; completed_at?: string;
  tutor_name?: string; session_feedback?: string;
};

export default function AdminClinicPage() {
  const [queue, setQueue] = useState<ClinicEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [filter, setFilter] = useState<"all"|"waiting"|"in-progress"|"completed">("all");
  const [updatingId, setUpdatingId] = useState<string|null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id:string;student:string}|null>(null);
  const [tutorModal, setTutorModal] = useState<{id:string;student:string}|null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{id:string;student:string}|null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("clinic_queue").select("*").order("created_at", { ascending: false });
    setQueue((data||[]) as ClinicEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const startWithTutor = async (id: string, tutorName: string) => {
    await supabase.from("clinic_queue").update({ status:"in-progress", tutor_name: tutorName, started_at: new Date().toISOString() }).eq("id", id);
    setTutorModal(null); load();
  };

  const completeWithFeedback = async (id: string, feedback: string) => {
    await supabase.from("clinic_queue").update({ status:"completed", session_feedback: feedback||null, completed_at: new Date().toISOString() }).eq("id", id);
    setFeedbackModal(null); setFeedbackText(""); load();
  };

  const del = async () => {
    if(!deleteConfirm) return;
    await supabase.from("clinic_queue").delete().eq("id", deleteConfirm.id);
    setDeleteConfirm(null); load();
  };

  const revert = async (id: string) => {
    await supabase.from("clinic_queue").update({ status:"waiting", started_at: null, completed_at: null }).eq("id", id); load();
  };

  const dur = (s?: string, e?: string) => s&&e ? Math.round((new Date(e).getTime()-new Date(s).getTime())/60000) : null;
  const filtered = queue.filter(q => filter==="all"||q.status===filter);
  const waiting = queue.filter(q=>q.status==="waiting").length;

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto custom-scrollbar h-full">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">클리닉 대기 관리</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">학생 클리닉 접수 현황 · 15초 자동 갱신</p>
        </div>
        <div className="flex items-center gap-3">
          {waiting>0&&<div className="flex items-center gap-2 text-[13px] font-bold text-error bg-error/5 border border-error/10 px-4 py-2 rounded-xl"><AlertTriangle size={15}/>대기 {waiting}명</div>}
          <button onClick={()=>{setLoading(true);load();}} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground transition-all"><RefreshCw size={14} className={loading?"animate-spin":""}/> 새로고침</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all","waiting","in-progress","completed"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-5 py-2 rounded-xl text-[12px] font-black transition-all ${filter===f?"bg-foreground text-background shadow":"bg-accent-light text-accent hover:text-foreground"}`}>
            {f==="all"?"전체":f==="waiting"?"대기 중":f==="in-progress"?"상담 중":"완료"}
          </button>
        ))}
      </div>

      {loading ? <div className="py-20 text-center text-accent animate-pulse font-bold">불러오는 중...</div>
      : filtered.length===0 ? <div className="py-20 text-center glass rounded-[2.5rem] border border-foreground/5"><CheckCircle size={32} className="text-success mx-auto mb-3 opacity-40"/><p className="text-accent font-bold opacity-50">해당하는 접수가 없습니다.</p></div>
      : <div className="flex flex-col gap-4">{filtered.map((item,idx)=>{
        const d = dur(item.started_at, item.completed_at);
        const inProg = item.status==="in-progress"&&item.started_at ? Math.round((Date.now()-new Date(item.started_at).getTime())/60000) : null;
        return (
          <div key={item.id} className={`glass rounded-[1.5rem] border transition-all ${item.status==="completed"?"border-foreground/5 opacity-60":item.status==="in-progress"?"border-blue-200 shadow-md":"border-amber-200"}`}>
            <button className="w-full flex items-center justify-between p-6 text-left gap-4" onClick={()=>setExpandedId(expandedId===item.id?null:item.id)}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-[.9rem] flex items-center justify-center shrink-0 font-black text-[14px] ${item.status==="completed"?"bg-success/10 text-success":item.status==="in-progress"?"bg-blue-50 text-blue-600":"bg-amber-50 text-amber-600"}`}>{idx+1}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-[15px]">{item.student_name}</span>
                    {item.tutor_name&&<span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1"><User size={10}/>{item.tutor_name}</span>}
                    {d!==null&&<span className="text-[10px] font-bold text-success bg-success/5 border border-success/10 px-2 py-0.5 rounded-lg flex items-center gap-1"><Timer size={10}/>{d}분</span>}
                    {inProg!==null&&<span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg animate-pulse flex items-center gap-1"><Timer size={10}/>{inProg}분 경과</span>}
                  </div>
                  <p className="text-[12px] text-accent mt-0.5 truncate max-w-[200px] md:max-w-sm">{item.topic}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.status==="waiting"?<Clock size={16} className="text-amber-500"/>:item.status==="in-progress"?<Clock size={16} className="text-blue-500 animate-pulse"/>:<CheckCircle size={16} className="text-success"/>}
                {expandedId===item.id?<ChevronUp size={16} className="text-accent"/>:<ChevronDown size={16} className="text-accent"/>}
              </div>
            </button>
            {expandedId===item.id&&(
              <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-4">
                <div className="bg-background rounded-2xl px-5 py-4 border border-foreground/5">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">사전 질문</p>
                  <p className="text-[14px] text-foreground font-medium leading-relaxed">{item.topic}</p>
                </div>
                {item.session_feedback&&(
                  <div className="bg-purple-50 rounded-2xl px-5 py-4 border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">클리닉 피드백 ({item.tutor_name})</p>
                    <p className="text-[13px] text-purple-900 font-medium">{item.session_feedback}</p>
                  </div>
                )}
                <div className="flex gap-3 flex-wrap">
                  {item.status==="waiting"&&(
                    <button onClick={()=>setTutorModal({id:item.id,student:item.student_name})} disabled={updatingId===item.id}
                      className="flex-1 h-11 bg-blue-600 text-white text-[13px] font-black rounded-xl shadow hover:-translate-y-0.5 disabled:opacity-40 transition-all">
                      상담 시작 (튜터 선택)
                    </button>
                  )}
                  {item.status==="in-progress"&&(
                    <button onClick={()=>{setFeedbackModal({id:item.id,student:item.student_name});setFeedbackText("");}} disabled={updatingId===item.id}
                      className="flex-1 h-11 bg-success text-white text-[13px] font-black rounded-xl shadow hover:-translate-y-0.5 disabled:opacity-40 transition-all">
                      클리닉 완료 + 피드백
                    </button>
                  )}
                  {item.status!=="waiting"&&<button onClick={()=>revert(item.id)} className="h-11 px-5 bg-amber-50 text-amber-600 text-[12px] font-black rounded-xl border border-amber-200 hover:bg-amber-100 transition-all">대기로</button>}
                  <button onClick={()=>setDeleteConfirm({id:item.id,student:item.student_name})} className="h-11 px-4 bg-error/8 text-error text-[12px] font-black rounded-xl border border-error/15 hover:bg-error hover:text-white transition-all flex items-center gap-1.5"><Trash2 size={13}/>삭제</button>
                </div>
              </div>
            )}
          </div>
        );
      })}</div>}

      {/* 튜터 선택 모달 */}
      {tutorModal&&(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={()=>setTutorModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <h3 className="text-[17px] font-black text-slate-800 mb-1">상담 튜터 선택</h3>
            <p className="text-[13px] text-slate-400 mb-5">{tutorModal.student} 학생</p>
            <div className="flex flex-col gap-2">
              {TUTORS.map(t=>(
                <button key={t.id} onClick={()=>startWithTutor(tutorModal.id, t.name)}
                  className={`h-12 rounded-2xl text-[14px] font-black transition-all hover:-translate-y-0.5 ${t.is_head?"bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900":"bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {t.name}{t.is_head?" (강사)":""}
                </button>
              ))}
            </div>
            <button onClick={()=>setTutorModal(null)} className="w-full h-11 mt-3 rounded-2xl border border-slate-200 text-slate-400 text-[13px] font-bold">취소</button>
          </div>
        </div>
      )}

      {/* 피드백 모달 */}
      {feedbackModal&&(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={()=>setFeedbackModal(null)}>
          <div className="bg-white rounded-t-3xl shadow-2xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="text-[17px] font-black text-slate-800 mb-1">클리닉 완료</h3>
            <p className="text-[13px] text-slate-400 mb-4">{feedbackModal.student} 학생 — 이번 상담에 대한 피드백을 남겨주세요</p>
            <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} rows={3} placeholder="예) 빈칸 추론 전략 학습, 문맥 독해 연습 필요..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-[13px] font-medium resize-none focus:border-purple-400 focus:outline-none text-slate-800 placeholder:text-slate-300"/>
            <div className="flex gap-2 mt-3">
              <button onClick={()=>setFeedbackModal(null)} className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-400 text-[13px] font-bold">취소</button>
              <button onClick={()=>completeWithFeedback(feedbackModal.id, feedbackText)} className="flex-1 h-11 rounded-2xl bg-success text-white text-[13px] font-black">완료 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteConfirm&&(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="glass w-full max-w-sm rounded-[2rem] border border-red-100 shadow-2xl overflow-hidden">
            <div className="p-7 border-b border-red-50">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 size={20} className="text-red-500"/></div>
              <h3 className="text-[16px] font-black text-foreground">클리닉 접수 삭제</h3>
              <p className="text-[13px] font-bold text-foreground mt-3 bg-red-50 px-4 py-3 rounded-xl">{deleteConfirm.student} 학생</p>
            </div>
            <div className="p-5 flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 h-11 rounded-xl border border-foreground/10 text-[13px] font-black text-accent">취소</button>
              <button onClick={del} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-black">삭제 확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
