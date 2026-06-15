"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen, Check, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAY_KO = ['일','월','화','수','목','금','토'];

type ReportRow = {
  id: string;
  session_date: string;
  html_content: string;
  teacher_comment: string | null;
  published_at: string;
};

export default function ParentReportPage() {
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(), month: new Date().getMonth() + 1,
  });
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  // postMessage 리스너: iframe 내부 버튼 → React 제어
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'go-back') {
        setActiveReport(null);
        setShowCommentPanel(false);
        setCommentText('');
      }
      if (e.data?.type === 'open-comment') {
        setShowCommentPanel(p => !p);
        setCommentSent(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("parentSession");
    if (!raw) { setLoading(false); return; }
    try {
      const s = JSON.parse(raw);
      setStudentName(s.studentName || "");
      setClassName(s.className || "");
      loadReports(s.studentName);
    } catch { setLoading(false); }
  }, []);

  const loadReports = async (name: string) => {
    const { data } = await supabase
      .from("daily_reports")
      .select("id,session_date,html_content,teacher_comment,published_at")
      .eq("student_name", name)
      .eq("published", true)
      .order("session_date", { ascending: false });
    const rows = (data || []) as ReportRow[];
    setReports(rows);
    if (rows.length > 0) {
      const d = new Date(rows[0].session_date + 'T12:00:00');
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    setLoading(false);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('report_confirmed_ids');
      if (raw) setConfirmedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const handleConfirm = (reportId: string) => {
    setConfirmedIds(prev => {
      const next = new Set(prev).add(reportId);
      localStorage.setItem('report_confirmed_ids', JSON.stringify([...next]));
      return next;
    });
  };

  // 강사 코멘트 전송
  const handleSendComment = async () => {
    if (!commentText.trim() || !activeReport) return;
    setSendingComment(true);
    try {
      const d = new Date(activeReport.session_date + 'T12:00:00');
      const dateLabel = `${d.getMonth()+1}월 ${d.getDate()}일`;
      // API 라우트를 통해 service role key로 RLS 우회 insert
      const res = await fetch('/api/admin-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${studentName} 학부모 (${className} · ${dateLabel} 리포트)`,
          school: className,
          inquiry_type: 'report_comment',
          detail_message: commentText.trim(),
          status: 'pending',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '전송 실패' }));
        throw new Error(err.error);
      }
      setCommentSent(true);
      setCommentText('');
      setTimeout(() => {
        setCommentSent(false);
        setShowCommentPanel(false);
      }, 2000);
    } catch (e) {
      alert('전송 실패. 다시 시도해주세요. (' + (e as Error).message + ')');
    } finally {
      setSendingComment(false);
    }
  };

  const getHtml = (r: ReportRow) => {
    const html = r.html_content || '';
    return html.replace('{{TEACHER_COMMENT}}', r.teacher_comment || '');
  };

  // HTML 하단에 버튼 주입 (postMessage 방식)
  const getHtmlWithButtons = (r: ReportRow) => {
    const base = getHtml(r);
    const buttons = `
<div style="background:#f8f8f8;border-top:1px solid #e5e5e5;padding:24px 20px 88px;display:flex;gap:10px;flex-wrap:wrap;">
  <button onclick="window.parent.postMessage({type:'go-back'},'*')"
    style="flex:1;min-width:120px;height:48px;border-radius:12px;border:1.5px solid #e0e0e0;background:#fff;font-size:13px;font-weight:700;color:#444;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
    &#8592; 목록으로 돌아가기
  </button>
  <button onclick="window.parent.postMessage({type:'open-comment'},'*')"
    style="flex:1;min-width:140px;height:48px;border-radius:12px;border:1.5px solid #bbf7d0;background:#f0fdf4;font-size:13px;font-weight:700;color:#16a34a;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
    &#128172; 강사에게 코멘트하기
  </button>
</div>`;
    return base.replace('</body>', buttons + '</body>');
  };

  const monthReports = reports.filter(r => {
    const d = new Date(r.session_date + 'T12:00:00');
    return d.getFullYear() === viewMonth.year && d.getMonth() + 1 === viewMonth.month;
  });

  const availableMonths = Array.from(new Set(reports.map(r => {
    const d = new Date(r.session_date + 'T12:00:00');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  }))).sort();

  const currentMonthKey = `${viewMonth.year}-${String(viewMonth.month).padStart(2,'0')}`;
  const currentIdx = availableMonths.indexOf(currentMonthKey);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < availableMonths.length - 1;

  const goPrev = () => {
    if (!canPrev) return;
    const [y, m] = availableMonths[currentIdx - 1].split('-').map(Number);
    setViewMonth({ year: y, month: m });
  };
  const goNext = () => {
    if (!canNext) return;
    const [y, m] = availableMonths[currentIdx + 1].split('-').map(Number);
    setViewMonth({ year: y, month: m });
  };

  const AURORA = {
    primary: "rgba(90,125,85,0.9)",
    accent: "#5a7d5a",
    light: "rgba(155,185,140,0.12)",
    border: "rgba(155,180,140,0.22)",
    bg: "#f2ede4",
    card: "rgba(255,255,255,0.7)",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ color: AURORA.accent }}>
      <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
    </div>
  );

  if (!studentName) return (
    <div className="flex items-center justify-center h-full text-slate-400 font-bold text-[14px]">
      로그인 정보가 없습니다.
    </div>
  );

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: AURORA.accent }}>Daily Report</p>
        <h2 className="text-[20px] font-black" style={{ color: '#2d3d2d' }}>수업 기록</h2>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: AURORA.light }}>
            <BookOpen size={28} style={{ color: AURORA.accent }} />
          </div>
          <div>
            <p className="font-bold text-[15px]" style={{ color: '#2d3d2d' }}>아직 발행된 리포트가 없습니다</p>
            <p className="text-[12px] mt-1" style={{ color: 'rgba(74,112,85,0.6)' }}>수업 후 선생님이 리포트를 발행하면 여기에 표시됩니다</p>
          </div>
        </div>
      ) : (
        <>
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-5 px-1">
            <button onClick={goPrev} disabled={!canPrev}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-20 transition-all hover:scale-105"
              style={{ background: AURORA.light, border: `1px solid ${AURORA.border}` }}>
              <ChevronLeft size={18} style={{ color: AURORA.accent }} />
            </button>
            <div className="text-center">
              <p className="text-[18px] font-black" style={{ color: '#2d3d2d' }}>
                {viewMonth.year}년 {viewMonth.month}월
              </p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(74,112,85,0.5)' }}>
                {monthReports.length}개 수업 기록
              </p>
            </div>
            <button onClick={goNext} disabled={!canNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-20 transition-all hover:scale-105"
              style={{ background: AURORA.light, border: `1px solid ${AURORA.border}` }}>
              <ChevronRight size={18} style={{ color: AURORA.accent }} />
            </button>
          </div>

          {monthReports.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'rgba(74,112,85,0.4)' }}>
              <p className="font-bold text-[14px]">이 달에는 리포트가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthReports.map((r, i) => {
                const d = new Date(r.session_date + 'T12:00:00');
                const mm = d.getMonth() + 1;
                const dd = d.getDate();
                const day = DAY_KO[d.getDay()];
                const isClinic = (r.html_content || '').includes('클리닉') && (r.html_content || '').indexOf('클리닉') < 500;
                const isLatest = i === 0;
                return (
                  <button key={r.id} onClick={() => setActiveReport(r)}
                    className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: AURORA.card,
                      border: `1px solid ${AURORA.border}`,
                      backdropFilter: 'blur(8px)',
                      boxShadow: isLatest ? '0 4px 20px rgba(90,125,85,0.12)' : undefined,
                    }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: isClinic ? 'rgba(20,184,166,0.12)' : AURORA.light }}>
                        <span className="text-[14px] font-black" style={{ color: isClinic ? '#0f766e' : AURORA.accent, lineHeight: 1 }}>{dd}</span>
                        <span className="text-[9px] font-bold mt-0.5" style={{ color: isClinic ? 'rgba(15,118,110,0.6)' : 'rgba(90,125,85,0.5)' }}>{day}요일</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-black" style={{ color: '#2d3d2d' }}>{mm}/{dd} ({day})</span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                            style={{ background: isClinic ? 'rgba(20,184,166,0.15)' : AURORA.light, color: isClinic ? '#0f766e' : AURORA.accent }}>
                            {isClinic ? '🩺 클리닉' : '📚 수업'}
                          </span>
                          {isLatest && <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-500">NEW</span>}
                          {confirmedIds.has(r.id) && <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-600">✓ 확인</span>}
                        </div>
                        <p className="text-[11px]" style={{ color: 'rgba(74,112,85,0.6)' }}>
                          {confirmedIds.has(r.id) ? '확인 완료' : r.teacher_comment ? '✏️ 강사 코멘트 있음' : '리포트 보기 →'}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'rgba(90,125,85,0.3)', flexShrink: 0 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-6 text-center">
            <p className="text-[10px] font-semibold" style={{ color: 'rgba(74,112,85,0.4)' }}>
              총 {reports.length}개 수업 기록이 있습니다
            </p>
          </div>
        </>
      )}

      {/* 리포트 전체화면 오버레이 */}
      {activeReport && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#fff' }}>
          {/* 상단 바 */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-slate-100">
            <button onClick={() => { setActiveReport(null); setShowCommentPanel(false); setCommentText(''); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
              <X size={16} />
            </button>
            <div className="flex-1">
              <p className="text-[13px] font-black text-slate-800">
                {activeReport.session_date.replace(/-/g, '.')}
              </p>
              <p className="text-[10px] text-slate-400">{studentName} · 수업 리포트</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const idx = reports.indexOf(activeReport);
                  if (idx < reports.length - 1) setActiveReport(reports[idx + 1]);
                }}
                disabled={reports.indexOf(activeReport) >= reports.length - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-all">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  const idx = reports.indexOf(activeReport);
                  if (idx > 0) setActiveReport(reports[idx - 1]);
                }}
                disabled={reports.indexOf(activeReport) <= 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 리포트 iframe - 버튼이 HTML 하단에 주입됨 */}
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={getHtmlWithButtons(activeReport)}
              className="w-full border-0"
              style={{ height: '100%', minHeight: '100vh' }}
              title={`리포트 ${activeReport.session_date}`}
            />
          </div>

          {/* 코멘트 패널 - fixed bottom sheet (푸터 위로) */}
          {showCommentPanel && (
            <div className="fixed bottom-[72px] left-0 right-0 z-[200] border-t-2 border-green-200 px-4 pt-4 pb-5 shadow-2xl"
              style={{ background: 'rgba(240,253,244,0.99)', backdropFilter: 'blur(16px)' }}>
              {commentSent ? (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <span className="text-[36px]">✅</span>
                  <p className="text-[15px] font-black text-green-700">코멘트가 전달되었습니다!</p>
                  <p className="text-[12px] text-green-600">선생님이 확인 후 연락드릴게요.</p>
                  <button onClick={() => { setShowCommentPanel(false); setCommentSent(false); }}
                    className="mt-2 h-10 px-6 rounded-xl bg-green-600 text-white text-[13px] font-bold">닫기</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[14px] font-black text-green-800">강사에게 코멘트하기</p>
                      <p className="text-[11px] text-green-600 mt-0.5">
                        {(() => {
                          const d = new Date(activeReport.session_date + 'T12:00:00');
                          return `${d.getMonth()+1}월 ${d.getDate()}일 리포트 · ${className || studentName}`;
                        })()}
                      </p>
                    </div>
                    <button onClick={() => { setShowCommentPanel(false); setCommentText(''); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-green-400 hover:bg-green-100 transition-all">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="궁금한 점이나 전달할 내용을 입력하세요..."
                      rows={3}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-green-200 text-[13px] outline-none focus:border-green-400 resize-none"
                      style={{ background: '#fff', color: '#1a2e1a' }}
                    />
                    <button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || sendingComment}
                      className="w-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: '#16a34a', color: '#fff' }}>
                      {sendingComment
                        ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        : <Send size={16} />
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
