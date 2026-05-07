"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen, Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAY_KO = ['일','월','화','수','목','금','토'];

type ReportRow = {
  id: string;
  session_date: string;
  html_content: string;
  teacher_comment: string | null;
  published_at: string;
  session_type?: string; // 'class' | 'clinic'
};

export default function ParentReportPage() {
  const [studentName, setStudentName] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("parentSession");
    if (!raw) { setLoading(false); return; }
    try {
      const s = JSON.parse(raw);
      setStudentName(s.studentName || "");
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
    // 기본: 가장 최근 리포트가 있는 달로 이동
    if (rows.length > 0) {
      const d = new Date(rows[0].session_date + 'T12:00:00');
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    setLoading(false);
  };

  // 현재 보는 달의 리포트들
  const monthReports = reports.filter(r => {
    const d = new Date(r.session_date + 'T12:00:00');
    return d.getFullYear() === viewMonth.year && d.getMonth() + 1 === viewMonth.month;
  });

  // 이동 가능 달 범위 (리포트 있는 달)
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

  // 리포트 HTML: html_content 직접 사용 (report_data 재빌드 제거 → 렌더 버그 수정)
  const getHtml = (r: ReportRow) => {
    const html = r.html_content || '';
    return html.replace('{{TEACHER_COMMENT}}', r.teacher_comment || '');
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
      {/* 섹션 헤더 */}
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

          {/* 해당 월 리포트 없음 */}
          {monthReports.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'rgba(74,112,85,0.4)' }}>
              <p className="font-bold text-[14px]">이 달에는 리포트가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 타임라인 스타일 날짜 목록 */}
              {monthReports.map((r, i) => {
                const d = new Date(r.session_date + 'T12:00:00');
                const mm = d.getMonth() + 1;
                const dd = d.getDate();
                const day = DAY_KO[d.getDay()];
                // session_type 유추: html_content에서 "클리닉" 포함 여부로 판단
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
                      {/* 날짜 원형 배지 */}
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: isClinic ? 'rgba(20,184,166,0.12)' : AURORA.light }}>
                        <span className="text-[14px] font-black" style={{ color: isClinic ? '#0f766e' : AURORA.accent, lineHeight: 1 }}>{dd}</span>
                        <span className="text-[9px] font-bold mt-0.5" style={{ color: isClinic ? 'rgba(15,118,110,0.6)' : 'rgba(90,125,85,0.5)' }}>{day}요일</span>
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-black" style={{ color: '#2d3d2d' }}>
                            {mm}/{dd} ({day})
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                            style={{
                              background: isClinic ? 'rgba(20,184,166,0.15)' : AURORA.light,
                              color: isClinic ? '#0f766e' : AURORA.accent
                            }}>
                            {isClinic ? '🩺 클리닉' : '📚 수업'}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-500">NEW</span>
                          )}
                        </div>
                        <p className="text-[11px]" style={{ color: 'rgba(74,112,85,0.6)' }}>
                          {r.teacher_comment ? '✏️ 강사 코멘트 있음' : '리포트 보기 →'}
                        </p>
                      </div>

                      {/* 화살표 */}
                      <ChevronRight size={16} style={{ color: 'rgba(90,125,85,0.3)', flexShrink: 0 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 전체 리포트 수 요약 */}
          <div className="mt-6 text-center">
            <p className="text-[10px] font-semibold" style={{ color: 'rgba(74,112,85,0.4)' }}>
              총 {reports.length}개 수업 기록이 있습니다
            </p>
          </div>
        </>
      )}

      {/* 리포트 전체화면 오버레이 */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#fff' }}>
          {/* 상단 바 */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-slate-100">
            <button onClick={() => setActiveReport(null)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">
              <X size={16} />
            </button>
            <div className="flex-1">
              <p className="text-[13px] font-black text-slate-800">
                {activeReport.session_date.replace(/-/g, '.')}
              </p>
              <p className="text-[10px] text-slate-400">
                {studentName} · 수업 리포트
              </p>
            </div>
            {/* 이전/다음 네비게이션 */}
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
          {/* 리포트 iframe - html_content 직접 사용 */}
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={getHtml(activeReport)}
              className="w-full border-0"
              style={{ height: '100%', minHeight: '100vh' }}
              title={`리포트 ${activeReport.session_date}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
