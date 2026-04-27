"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, ChevronDown, ChevronUp, RefreshCw, Trophy, XCircle, CheckCircle, BookOpen, Clock, Filter, SortAsc, Users } from "lucide-react";
import { getStudents, getTestSessionsByStudent } from "@/lib/database-service";
import { getWrongAnswers } from "@/lib/assignment-service";

type Student = { id: string; name: string; class_name: string };
type Session = {
  id: string;
  student_name: string;
  total_questions: number;
  correct_count: number;
  created_at: string;
  completed_at?: string | null;
  test_type?: string | null;
  set_id?: string | null;
  word_sets?: { label?: string; passage_number?: string; sub_sub_category?: string } | null;
};
type WrongEntry = { id: string; wrong_count: number; created_at: string; words?: { word: string; korean: string } };
type StudentStat = { student: Student; sessions: Session[]; wrongAnswers: WrongEntry[] };

type TimeFilter = '1d' | '3d' | '1w' | '1m' | 'all';
const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: '1d', label: '오늘' },
  { key: '3d', label: '3일' },
  { key: '1w', label: '1주' },
  { key: '1m', label: '1개월' },
  { key: 'all', label: '전체' },
];

// KST 기준 날짜 문자열 (YYYY-MM-DD)
function toKSTDateStr(isoStr: string): string {
  const d = new Date(new Date(isoStr).getTime() + 9 * 3600000);
  return d.toISOString().split('T')[0];
}

// KST 기준 오늘 날짜 문자열
function todayKST(): string {
  return toKSTDateStr(new Date().toISOString());
}

// 기간 필터 — 자정 기준 KST
function filterByTime(sessions: Session[], tf: TimeFilter): Session[] {
  if (tf === 'all') return sessions;
  const today = todayKST(); // e.g. '2026-04-19'

  if (tf === '1d') {
    // 오늘(KST 자정~현재)만
    return sessions.filter(s => {
      const dt = s.completed_at || s.created_at;
      return dt ? toKSTDateStr(dt) === today : false;
    });
  }
  // 3일, 1주, 1개월: N일 전 자정 이후
  const daysBack: Record<string, number> = { '3d': 3, '1w': 7, '1m': 30 };
  const n = daysBack[tf];
  const pastDate = new Date(todayKST() + 'T00:00:00+09:00');
  pastDate.setDate(pastDate.getDate() - (n - 1));
  const sinceKST = pastDate.toISOString().split('T')[0];
  return sessions.filter(s => {
    const dt = s.completed_at || s.created_at;
    return dt ? toKSTDateStr(dt) >= sinceKST : false;
  });
}

// test_type 한글
function typeLabel(t: string | null | undefined) {
  if (!t) return '';
  if (t === 'vocab') return '뜻고르기';
  if (t === 'vocab_drill') return 'One More! 뜻고르기';
  if (t === 'synonym') return '유반의어 객관식';
  if (t === 'synonym_drill') return 'One More! 유반의어';
  if (t === 'card_game') return '유반의어 카드게임';
  if (t === 'card_game_drill') return 'One More! 카드게임';
  return t;
}

// 지문 전체명
function passageFullLabel(sess: Session) {
  if (sess.word_sets?.label) {
    const ws = sess.word_sets;
    const parts = [ws.label];
    if (ws.passage_number) parts.push(`${ws.passage_number}번`);
    if (ws.sub_sub_category) parts.push(ws.sub_sub_category);
    return parts.join(' · ');
  }
  if (!sess.set_id) {
    const t = sess.test_type || '';
    return t.includes('_drill') ? 'One More! 오답 드릴' : '전체세트 종합 테스트';
  }
  return sess.set_id.slice(0, 8);
}

// 시간: 4/19 03:55
function fmtTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(new Date(iso).getTime() + 9 * 3600000); // KST
  const M = d.getUTCMonth() + 1;
  const D = d.getUTCDate();
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${M}/${D} ${h}:${m}`;
}

// 학생의 최근 통과 세션 날짜
function latestSessionTime(sessions: Session[]): string {
  if (!sessions.length) return '';
  // 1순위: 90% 이상 통과한 세션 중 가장 최근
  const passed = sessions.filter(s => s.completed_at && s.total_questions && s.total_questions > 0 && (s.correct_count / s.total_questions) >= 0.9);
  if (passed.length) {
    return passed.sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1))[0].completed_at!;
  }
  // 2순위 (fallback): 통과 세션 없으면 가장 최근 활동 세션 시간
  const any = sessions.filter(s => s.completed_at || s.created_at);
  if (!any.length) return '';
  return any.sort((a, b) => {
    const ta = a.completed_at || a.created_at || '';
    const tb = b.completed_at || b.created_at || '';
    return tb > ta ? 1 : -1;  // 내림차순
  })[0].completed_at || any[0].created_at || '';
}
// legacy alias
const latestPassTime = latestSessionTime;

export default function AdminProgressPage() {
  const [stats, setStats] = useState<StudentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [classFilter, setClassFilter] = useState('전체');
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const students = (await getStudents() || []) as Student[];
      const allStats: StudentStat[] = await Promise.all(
        students.map(async (student) => {
          const [sessions, wrong] = await Promise.all([
            getTestSessionsByStudent(student.name).catch(() => []),
            getWrongAnswers(student.name, 'all').catch(() => []),
          ]);
          return { student, sessions: (sessions || []) as Session[], wrongAnswers: (wrong || []) as WrongEntry[] };
        })
      );
      setStats(allStats);
    } catch (err) {
      console.error("Progress load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allClasses = ['전체', ...Array.from(new Set(stats.map(s => s.student.class_name).filter(Boolean))).sort()];

  const getMastery = (sessions: Session[]) => {
    const valid = sessions.filter(s => s.completed_at && s.total_questions);
    const passed = valid.filter(s => (s.correct_count / s.total_questions) >= 0.9);
    return { passCount: passed.length, total: valid.length };
  };

  const getLastActive = (sessions: Session[]) => {
    const sorted = [...sessions].filter(s => s.completed_at || s.created_at)
      .sort((a, b) => (b.completed_at || b.created_at) > (a.completed_at || a.created_at) ? 1 : -1);
    if (!sorted.length) return null;
    return new Date(sorted[0].completed_at || sorted[0].created_at)
      .toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 클래스 필터 + 정렬
  const displayStats = stats
    .filter(s => classFilter === '전체' || s.student.class_name === classFilter)
    .sort((a, b) => {
      if (sortBy === 'name') return a.student.name.localeCompare(b.student.name, 'ko');
      // 최근 학습순: 바로 전 통과 세션이 있는 학생이 먼저
      // compareFn(a,b) > 0 → b 앞으로; b를 앞에 놓으려면 양수 반환
      const aTime = latestPassTime(a.sessions);
      const bTime = latestPassTime(b.sessions);
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;   // a에 기록없으면 뒤로
      if (!bTime) return -1;  // b에 기록없으면 뒤로
      return bTime > aTime ? 1 : -1; // b가 더 최근이면 b 앞으로 (compareFn 양수)
    });

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto h-full custom-scrollbar">
      <div className="flex justify-between items-end mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">학생별 학습 현황</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">통과 세트 · 지문 상세 · 오답 누적</p>
        </div>
        <button
          onClick={() => { setIsLoading(true); loadData(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {/* 필터 & 정렬 */}
      <div className="glass rounded-[2rem] border border-foreground/5 p-5 mb-6 space-y-4">
        {/* 반 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Users size={13} className="text-accent" />
          <span className="text-[11px] font-black text-accent uppercase tracking-widest">반:</span>
          {allClasses.map(cls => (
            <button key={cls} onClick={() => setClassFilter(cls)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${classFilter === cls ? 'bg-foreground text-background' : 'bg-white border border-foreground/10 text-accent hover:text-foreground'}`}>
              {cls}
            </button>
          ))}
        </div>

        {/* 기간 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-accent" />
          <span className="text-[11px] font-black text-accent uppercase tracking-widest">기간:</span>
          {TIME_FILTERS.map(tf => (
            <button key={tf.key} onClick={() => setTimeFilter(tf.key)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${timeFilter === tf.key ? 'bg-foreground text-background' : 'bg-white border border-foreground/10 text-accent hover:text-foreground'}`}>
              {tf.label}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <div className="flex items-center gap-2 flex-wrap">
          <SortAsc size={13} className="text-accent" />
          <span className="text-[11px] font-black text-accent uppercase tracking-widest">정렬:</span>
          {([['name', '이름순'], ['recent', '최근 학습순']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${sortBy === key ? 'bg-foreground text-background' : 'bg-white border border-foreground/10 text-accent hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-accent animate-pulse font-bold">데이터를 불러오는 중...</div>
      ) : displayStats.length === 0 ? (
        <div className="py-20 text-center glass rounded-[2.5rem] border border-foreground/5">
          <BarChart2 size={32} className="text-accent mx-auto mb-3 opacity-30" />
          <p className="text-accent font-bold opacity-50">등록된 학생이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayStats.map(s => {
            const expanded = expandedId === s.student.id;
            const filteredSessions = filterByTime(s.sessions, timeFilter);
            const { passCount, total } = getMastery(filteredSessions);
            const lastActive = getLastActive(s.sessions);

            const passedSessions = filteredSessions
              .filter(sess => sess.completed_at && sess.total_questions && sess.total_questions > 0 && (sess.correct_count / sess.total_questions) >= 0.9)
              .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1));

            return (
              <div key={s.student.id} className="glass framer-card rounded-[1.5rem] border border-foreground/5 hover:border-foreground/10 transition-all">
                <button
                  className="w-full flex items-start md:items-center justify-between p-6 text-left gap-4"
                  onClick={() => setExpandedId(expanded ? null : s.student.id)}
                >
                  <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-[1rem] bg-foreground text-background flex items-center justify-center font-black text-[15px] shrink-0">
                      {s.student.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-foreground text-[15px]">{s.student.name}</span>
                        <span className="text-[11px] bg-accent-light text-accent px-2 py-0.5 rounded-lg font-medium">{s.student.class_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[12px] text-accent font-medium">
                        <span className="flex items-center gap-1"><Trophy size={11} strokeWidth={2} /> 통과 {passCount}/{total}회</span>
                        <span className="flex items-center gap-1"><XCircle size={11} strokeWidth={2} /> 오답 {s.wrongAnswers.length}개</span>
                        {lastActive && <span className="flex items-center gap-1"><Clock size={11} /> 최근: {lastActive}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {total > 0 ? (
                      <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border ${
                        passCount / total >= 0.7 ? "text-success bg-success/5 border-success/15" :
                        passCount / total >= 0.4 ? "text-foreground bg-accent-light border-foreground/5" :
                        "text-error bg-error/5 border-error/15"
                      }`}>{passCount}패스</span>
                    ) : (
                      <span className="text-[11px] text-accent/40 font-bold px-3 py-1.5">미응시</span>
                    )}
                    {expanded ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
                  </div>
                </button>

                {expanded && (
                  <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-5">
                    {/* 통과 세션 */}
                    <div>
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">
                        통과 세트 기록 ({TIME_FILTERS.find(t => t.key === timeFilter)?.label})
                      </p>
                      {passedSessions.length === 0 ? (
                        <p className="text-[13px] text-accent/40 font-bold">해당 기간에 통과한 세션 없음</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                          {passedSessions.map(sess => {
                            const correct = sess.correct_count ?? 0;
                            const total2 = sess.total_questions ?? 0;
                            const pct = total2 > 0 ? Math.round((correct / total2) * 100) : 0;
                            const timeStr = fmtTime(sess.completed_at);
                            return (
                              <div key={sess.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-background border border-foreground/5">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] shrink-0 bg-success/10 text-success">✓</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-black text-foreground truncate">{passageFullLabel(sess)}</p>
                                  <p className="text-[11px] font-bold text-foreground/70">{correct}/{total2} ({pct}%)</p>
                                  <p className="text-[10px] text-accent">{typeLabel(sess.test_type)}{timeStr ? ` · ${timeStr}` : ''}</p>
                                </div>
                                <CheckCircle size={14} className="text-success mt-1 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Wrong Answers */}
                    {s.wrongAnswers.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-error uppercase tracking-widest mb-3">
                          오답 TOP ({Math.min(s.wrongAnswers.length, 5)}개)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...s.wrongAnswers].sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5).map(w => (
                            <div key={w.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-error/10 text-[12px]">
                              <span className="font-black text-foreground">{w.words?.word || "–"}</span>
                              <span className="text-accent font-medium">{w.words?.korean}</span>
                              <span className="w-5 h-5 rounded-full bg-error/10 text-error font-black text-[10px] flex items-center justify-center">{w.wrong_count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "통과 세션", value: passCount + "회", icon: <CheckCircle size={14} /> },
                        { label: "전체 응시", value: total + "회", icon: <BookOpen size={14} /> },
                        { label: "누적 오답", value: s.wrongAnswers.length + "개", icon: <XCircle size={14} /> },
                      ].map(item => (
                        <div key={item.label} className="text-center bg-accent-light/50 rounded-2xl p-4">
                          <div className="text-accent opacity-60 flex justify-center mb-1">{item.icon}</div>
                          <div className="text-[16px] font-black text-foreground">{item.value}</div>
                          <div className="text-[10px] text-accent font-bold mt-0.5">{item.label}</div>
                        </div>
                      ))}
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
