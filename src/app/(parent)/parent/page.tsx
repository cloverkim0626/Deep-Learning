"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Report = { id: string; session_date: string; html_content: string; published_at: string };

export default function ParentReportPage() {
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem("parentSession");
    if (!session) return;
    try {
      const s = JSON.parse(session);
      setParentName(s.parentName || "");
      setStudentName(s.studentName || "");
      loadReports(s.studentName);
    } catch { setLoading(false); }
  }, []);

  const loadReports = async (name: string) => {
    const { data } = await supabase.from("daily_reports")
      .select("id,session_date,html_content,published_at,teacher_comment")
      .eq("student_name", name).eq("published", true)
      .order("session_date", { ascending: false });
    setReports((data || []) as Report[]);
    setIdx(0);
    setLoading(false);
  };

  const cur = reports[idx];

  if (loading) return (
    <div className="flex items-center justify-center h-full text-white opacity-60 font-bold">
      리포트를 불러오는 중...
    </div>
  );

  if (!studentName) return (
    <div className="flex items-center justify-center h-full text-white opacity-60 font-bold">
      로그인 정보가 없습니다.
    </div>
  );

  if (reports.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="text-5xl opacity-20">📋</div>
      <p className="text-white/60 font-bold text-[15px]">아직 발행된 리포트가 없습니다.</p>
      <p className="text-white/40 text-[12px]">수업 후 선생님이 리포트를 발행하면 여기에 표시됩니다.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* 네비게이션 바 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => setIdx(i => Math.min(i + 1, reports.length - 1))} disabled={idx >= reports.length - 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/10 disabled:opacity-20 transition-all">
          <ChevronLeft size={20}/>
        </button>
        <div className="text-center">
          <p className="text-white font-black text-[14px]">{cur?.session_date?.replace(/-/g,'.')}</p>
          <p className="text-white/50 text-[10px] font-bold">{idx + 1} / {reports.length}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowCal(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/10 transition-all">
            <Calendar size={16}/>
          </button>
          <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx <= 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/10 disabled:opacity-20 transition-all">
            <ChevronRight size={20}/>
          </button>
        </div>
      </div>

      {/* 리포트 표시 */}
      <div className="flex-1 overflow-hidden">
        {cur ? (
          <iframe
            srcDoc={(cur.html_content || '').replace('{{TEACHER_COMMENT}}', (cur as any).teacher_comment || '')}
            className="w-full h-full border-0 bg-white"
            title={`리포트 ${cur.session_date}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 font-bold">선택된 리포트가 없습니다</div>
        )}
      </div>

      {/* 달력 패널 */}
      {showCal && (
        <div className="absolute inset-0 z-20 flex items-start justify-center pt-16"
          style={{ background: 'rgba(0,20,60,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowCal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-5 w-80 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-black text-slate-800">리포트 목록</p>
              <button onClick={() => setShowCal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X size={14} className="text-slate-500"/></button>
            </div>
            <div className="space-y-1">
              {reports.map((r, i) => (
                <button key={r.id} onClick={() => { setIdx(i); setShowCal(false); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${i === idx ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                  <div className={`w-2 h-2 rounded-full ${i === idx ? 'bg-emerald-500' : 'bg-slate-200'}`}/>
                  <span className={`text-[13px] font-bold ${i === idx ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {r.session_date?.replace(/-/g,'.')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
