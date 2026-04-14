"use client";

import { useState } from "react";
import { BarChart2, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

const ERROR_TAGS: Record<string, string> = {
  E01: "시제", E02: "수일치", E03: "수동태", E04: "관계대명사",
  E05: "to부정사", E06: "분사구문", E07: "비교구문", E08: "접속사",
  E09: "어휘선택", E10: "병렬구조", E11: "전치사", E12: "어순"
};

const STUDENTS = [
  {
    id: "1", name: "김가현", class: "고3 수능특강 (월수반)",
    sessions: 12, mastered: 34, total: 60,
    topErrors: [{ code: "E08", count: 5 }, { code: "E04", count: 4 }, { code: "E02", count: 2 }],
    recentPassage: "[수능특강 12강 2번] Trust Your Gut?", lastActive: "15:28"
  },
  {
    id: "2", name: "이도윤", class: "고2 내신 정규 (화목반)",
    sessions: 7, mastered: 18, total: 40,
    topErrors: [{ code: "E02", count: 6 }, { code: "E10", count: 3 }],
    recentPassage: "[수능특강 12강 1번] The Sound of Silence", lastActive: "15:31"
  },
  {
    id: "3", name: "박서준", class: "고3 수능특강 (월수반)",
    sessions: 15, mastered: 52, total: 60,
    topErrors: [{ code: "E06", count: 8 }, { code: "E03", count: 3 }, { code: "E01", count: 1 }],
    recentPassage: "[수능완성 3강 4번] Illusion of Multitasking", lastActive: "14:50"
  },
];

function MasteryBar({ mastered, total }: { mastered: number; total: number }) {
  const pct = Math.round((mastered / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-bold mb-1.5">
        <span className="text-accent">어휘 습득률</span>
        <span className={pct >= 70 ? "text-success" : pct >= 40 ? "text-foreground" : "text-error"}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-success" : pct >= 40 ? "bg-foreground" : "bg-error"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-accent mt-1">{mastered}/{total}개 완료</p>
    </div>
  );
}

export default function AdminProgressPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-12 pb-20 max-w-4xl mx-auto overflow-y-auto h-full custom-scrollbar">
      <div className="mb-10">
        <h1 className="text-3xl text-foreground serif">학생별 학습 현황</h1>
        <p className="text-[14px] text-accent mt-2 font-medium">AI 튜터 진단 데이터 · 오류 유형별 누적 집계</p>
      </div>

      <div className="flex flex-col gap-4">
        {STUDENTS.map(student => {
          const expanded = expandedId === student.id;
          return (
            <div key={student.id} className="glass framer-card rounded-[1.5rem] border border-foreground/5 hover:border-foreground/10 transition-all">
              <button
                className="w-full flex items-start md:items-center justify-between p-6 text-left gap-4"
                onClick={() => setExpandedId(expanded ? null : student.id)}
              >
                <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-[1rem] bg-foreground text-background flex items-center justify-center font-black text-[15px] shrink-0">
                    {student.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-foreground text-[15px]">{student.name}</span>
                      <span className="text-[11px] bg-accent-light text-accent px-2 py-0.5 rounded-lg font-medium">{student.class}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[12px] text-accent font-medium">
                      <span className="flex items-center gap-1"><BarChart2 size={12} strokeWidth={2} /> 세션 {student.sessions}회</span>
                      <span>최근: {student.lastActive}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-1 md:mt-0">
                  <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border ${
                    Math.round(student.mastered/student.total*100) >= 70
                      ? "text-success bg-success/5 border-success/15"
                      : Math.round(student.mastered/student.total*100) >= 40
                        ? "text-foreground bg-accent-light border-foreground/5"
                        : "text-error bg-error/5 border-error/15"
                  }`}>
                    {Math.round(student.mastered/student.total*100)}%
                  </span>
                  {expanded ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-accent" />}
                </div>
              </button>

              {expanded && (
                <div className="px-6 pb-6 border-t border-foreground/5 pt-5 space-y-5">
                  <MasteryBar mastered={student.mastered} total={student.total} />

                  <div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3">AI 자동 진단 — 누적 오류 TOP</p>
                    <div className="flex flex-wrap gap-2">
                      {student.topErrors.map(err => (
                        <div key={err.code} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-foreground/5 text-[12px]">
                          <span className="font-black text-foreground">{err.code}</span>
                          <span className="text-accent font-medium">{ERROR_TAGS[err.code]}</span>
                          <span className="w-5 h-5 rounded-full bg-error/10 text-error font-black text-[10px] flex items-center justify-center">{err.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">최근 학습 지문</p>
                    <p className="text-[13px] text-foreground font-medium bg-accent-light px-4 py-2.5 rounded-xl">{student.recentPassage}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
