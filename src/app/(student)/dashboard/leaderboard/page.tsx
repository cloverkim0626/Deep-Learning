"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Medal, RefreshCw, Flame } from "lucide-react";

type Period = 'today' | 'week' | 'month';
type RankEntry = { name: string; displayName: string; score: number; rank: number };

const PERIOD_LABELS: Record<Period, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
};

function getMedalStyle(rank: number) {
  if (rank === 1) return { bg: 'from-yellow-400 to-amber-300', text: 'text-yellow-900', icon: '🥇', glow: '0 0 20px rgba(251,191,36,0.5)' };
  if (rank === 2) return { bg: 'from-slate-400 to-slate-300', text: 'text-slate-800', icon: '🥈', glow: '0 0 14px rgba(148,163,184,0.4)' };
  if (rank === 3) return { bg: 'from-orange-400 to-orange-300', text: 'text-orange-900', icon: '🥉', glow: '0 0 14px rgba(251,146,60,0.4)' };
  return { bg: '', text: 'text-foreground', icon: `${rank}`, glow: '' };
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  useEffect(() => {
    try {
      const s = localStorage.getItem('stu_session');
      if (s) {
        const data = JSON.parse(s);
        setMyName(data.name || '');
        setStudentClass(data.class || '');
      }
    } catch { /* noop */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (studentClass && studentClass !== 'GUEST') params.set('class', studentClass);
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      setRanking(data.ranking || []);
    } catch { setRanking([]); }
    setLoading(false);
  }, [period, studentClass]);

  useEffect(() => { load(); }, [load]);

  const myRank = ranking.find(r => r.name === myName);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
            <Trophy size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[18px] font-black text-foreground">리더보드</h1>
            <p className="text-[11px] text-accent font-bold">{studentClass ? `${studentClass} 반 기준` : '전체 기준'} · 정답 단어 수 합산</p>
          </div>
          <button onClick={load} className="ml-auto w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center text-accent hover:bg-foreground/10 transition-all">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 기간 탭 */}
        <div className="flex gap-2 bg-foreground/5 rounded-2xl p-1">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-black transition-all ${
                period === p ? 'bg-white text-foreground shadow-sm' : 'text-accent'
              }`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 내 순위 배너 (항상 상단 고정) */}
      {myRank && (
        <div className="mx-5 mb-3 px-5 py-3.5 rounded-2xl bg-foreground text-background flex items-center gap-3 shrink-0">
          <Flame size={18} className="text-orange-300" />
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">내 순위</p>
            <p className="text-[15px] font-black">{myRank.rank}위 · {myRank.score}점 정답</p>
          </div>
          <span className="ml-auto text-[28px] leading-none">{myRank.rank <= 3 ? getMedalStyle(myRank.rank).icon : ''}</span>
        </div>
      )}

      {/* 랭킹 리스트 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-foreground/5 animate-pulse" />
          ))
        ) : ranking.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={32} className="text-accent/20 mx-auto mb-3" />
            <p className="text-accent font-bold opacity-40">아직 기록이 없어요.</p>
            <p className="text-accent/40 text-[11px] font-medium mt-1">테스트를 완료하면 순위에 반영됩니다!</p>
          </div>
        ) : ranking.map(entry => {
          const medal = getMedalStyle(entry.rank);
          const isMe = entry.name === myName;
          const isTop3 = entry.rank <= 3;

          return (
            <div key={entry.name}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                isMe
                  ? 'border-foreground/20 bg-foreground/5 ring-1 ring-foreground/10'
                  : isTop3
                    ? 'border-transparent bg-gradient-to-r from-background to-foreground/[0.02] shadow-sm'
                    : 'border-foreground/5 bg-white'
              }`}
              style={isTop3 ? { boxShadow: medal.glow } : undefined}>
              {/* 순위 뱃지 */}
              {isTop3 ? (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${medal.bg} flex items-center justify-center text-[20px] leading-none shadow-md shrink-0`}>
                  {medal.icon}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-black text-accent">{entry.rank}</span>
                </div>
              )}
              {/* 이름 */}
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-black truncate ${isMe ? 'text-foreground' : 'text-foreground/80'}`}>
                  {entry.displayName || entry.name} {isMe && <span className="text-[10px] font-black text-accent/60 ml-1">(나)</span>}
                </p>
                <p className="text-[10px] text-accent font-medium mt-0.5">정답 {entry.score}단어</p>
              </div>
              {/* 점수 바 */}
              {ranking[0] && (
                <div className="w-20 shrink-0">
                  <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTop3 ? entry.rank === 1 ? 'bg-yellow-400' : entry.rank === 2 ? 'bg-slate-400' : 'bg-orange-400' : 'bg-foreground/20'
                      }`}
                      style={{ width: `${(entry.score / ranking[0].score) * 100}%` }}
                    />
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
