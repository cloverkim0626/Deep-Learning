"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, ChevronDown, ChevronUp, RefreshCw, Trophy, XCircle, CheckCircle, BookOpen, Clock } from "lucide-react";
import { getStudents, getTestSessionsByStudent } from "@/lib/database-service";
import { getWrongAnswers } from "@/lib/assignment-service";

type Student = { id: string; name: string; class_name: string };
type Session = { id: string; student_name: string; total_questions: number; correct_count: number; created_at: string; completed_at?: string };
type WrongEntry = { id: string; wrong_count: number; created_at: string; words?: { word: string; korean: string } };

type StudentStat = {
  student: Student;
  sessions: Session[];
  wrongAnswers: WrongEntry[];
};

export default function AdminProgressPage() {
  const [stats, setStats] = useState<StudentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          return {
            student,
            sessions: (sessions || []) as Session[],
            wrongAnswers: (wrong || []) as WrongEntry[],
          };
        })
      );

      // Only show students with some activity, or all students
      setStats(allStats);
    } catch (err) {
      console.error("Progress load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getMasteryRate = (s: StudentStat) => {
    const total = s.sessions.reduce((acc, sess) => acc + (sess.total_questions || 0), 0);
    const correct = s.sessions.reduce((acc, sess) => acc + (sess.correct_count || 0), 0);
    if (total === 0) return null;
    return Math.round((correct / total) * 100);
  };

  const getLastActive = (s: StudentStat) => {
    if (s.sessions.length === 0) return null;
    const latest = [...s.sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return new Date(latest.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto h-full custom-scrollbar">
      <div className="flex justify-between items-end mb-10 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground serif font-black">학생별 학습 현황</h1>
          <p className="text-[14px] text-accent mt-2 font-medium">단어 시험 기록 · 오답 누적 · 실시간 DB 연동</p>
        </div>
        <button
          onClick={() => { setIsLoading(true); loadData(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[12px] font-black text-accent hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-accent animate-pulse font-bold">데이터를 불러오는 중...</div>
      ) : stats.length === 0 ? (
        <div className="py-20 text-center glass rounded-[2.5rem] border border-foreground/5">
          <BarChart2 size={32} className="text-accent mx-auto mb-3 opacity-30" />
          <p className="text-accent font-bold opacity-50">등록된 학생이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {stats.map(s => {
            const expanded = expandedId === s.student.id;
            const masteryRate = getMasteryRate(s);
            const lastActive = getLastActive(s);
            const totalSessions = s.sessions.length;
            const totalWrong = s.wrongAnswers.length;

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
                        <span className="flex items-center gap-1"><Trophy size={11} strokeWidth={2} /> 시험 {totalSessions}회</span>
                        <span className="flex items-center gap-1"><XCircle size={11} strokeWidth={2} /> 오답 {totalWrong}개</span>
                        {lastActive && <span className="flex items-center gap-1"><Clock size={11} /> 최근: {lastActive}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {masteryRate !== null ? (
                      <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border ${
                        masteryRate >= 70 ? "text-success bg-success/5 border-success/15" :
                        masteryRate >= 40 ? "text-foreground bg-accent-light border-foreground/5" :
                        "text-error bg-error/5 border-error/15"
                      }`}>{masteryRate}%</span>
                    ) : (
                      <span className="text-[11px] text-accent/40 font-bold px-3 py-1.5">미응시</span>
                    )}
                    {expanded ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
                  </div>
                </button>

                {expanded && (
                  <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-5">
                    {/* Test Sessions */}
                    <div>
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">시험 세션 기록</p>
                      {s.sessions.length === 0 ? (
                        <p className="text-[13px] text-accent/40 font-bold">시험 기록 없음</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {[...s.sessions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 10)
                            .map(sess => {
                              const pct = sess.total_questions > 0 ? Math.round((sess.correct_count / sess.total_questions) * 100) : 0;
                              return (
                                <div key={sess.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-foreground/5">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 ${
                                    pct >= 70 ? "bg-success/10 text-success" : pct >= 40 ? "bg-accent-light text-foreground" : "bg-error/10 text-error"
                                  }`}>{pct}%</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-foreground">
                                      {sess.correct_count}/{sess.total_questions}문제 정답
                                    </p>
                                    <p className="text-[11px] text-accent">
                                      {new Date(sess.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                  {pct >= 70 ? <CheckCircle size={14} className="text-success" /> : pct < 40 ? <XCircle size={14} className="text-error" /> : null}
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
                          {[...s.wrongAnswers]
                            .sort((a, b) => b.wrong_count - a.wrong_count)
                            .slice(0, 5)
                            .map(w => (
                              <div key={w.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-error/10 text-[12px]">
                                <span className="font-black text-foreground">{w.words?.word || "-"}</span>
                                <span className="text-accent font-medium">{w.words?.korean}</span>
                                <span className="w-5 h-5 rounded-full bg-error/10 text-error font-black text-[10px] flex items-center justify-center">
                                  {w.wrong_count}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Stats summary */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "총 시험 횟수", value: totalSessions + "회", icon: <BookOpen size={14} /> },
                        { label: "전체 정답률", value: masteryRate !== null ? masteryRate + "%" : "—", icon: <Trophy size={14} /> },
                        { label: "누적 오답", value: totalWrong + "개", icon: <XCircle size={14} /> },
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
