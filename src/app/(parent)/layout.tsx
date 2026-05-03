"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ClipboardList, CalendarDays, MessageCircle, Trophy, Settings, X, Eye, EyeOff, Bell, Megaphone, RefreshCw, Crown, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ParentSession { studentName: string; className: string; }

type Period = 'today' | 'week' | 'month';
type RankEntry = { name: string; displayName: string; score: number; rank: number };
type HofEntry = { rank: number; name: string; displayName: string; score: number; month: number; year: number };

const PERIOD_LABELS: Record<Period, string> = { today: '\uc624\ub298', week: '\uc774\ubc88 \uc8fc', month: '\uc774\ubc88 \ub2ec' };
const MONTH_LABELS: Record<number, string> = { 1:'1\uc6d4',2:'2\uc6d4',3:'3\uc6d4',4:'4\uc6d4',5:'5\uc6d4',6:'6\uc6d4',7:'7\uc6d4',8:'8\uc6d4',9:'9\uc6d4',10:'10\uc6d4',11:'11\uc6d4',12:'12\uc6d4' };

function getMedalStyle(rank: number) {
  if (rank === 1) return { bg: 'from-yellow-400 to-amber-300', text: 'text-yellow-900', icon: '🥇', glow: '0 0 20px rgba(251,191,36,0.5)' };
  if (rank === 2) return { bg: 'from-slate-400 to-slate-300', text: 'text-slate-800', icon: '🥈', glow: '0 0 14px rgba(148,163,184,0.4)' };
  if (rank === 3) return { bg: 'from-orange-400 to-orange-300', text: 'text-orange-900', icon: '🥉', glow: '0 0 14px rgba(251,146,60,0.4)' };
  return { bg: '', text: 'text-slate-700', icon: `${rank}`, glow: '' };
}

function useParentSession() {
  const [session, setSession] = useState<ParentSession | null>(null);
  const router = useRouter();
  useEffect(() => {
    const raw = sessionStorage.getItem("parentSession");
    if (!raw) { router.replace("/login/parent"); return; }
    try { setSession(JSON.parse(raw)); } catch { router.replace("/login/parent"); }
  }, [router]);
  return session;
}

const AURORA = {
  primary: "rgba(90,125,85,0.9)",
  accent: "#5a7d5a",
  light: "rgba(155,185,140,0.1)",
  border: "rgba(155,180,140,0.22)",
  bg: "#f2ede4",
  header: "rgba(245,241,234,0.93)",
  navBg: "rgba(248,244,238,0.97)",
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = useParentSession();
  const pathname = usePathname();
  const router = useRouter();

  const [showTrophy, setShowTrophy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [pwErr, setPwErr] = useState("");
  const [showCur, setShowCur] = useState(false); const [showNew, setShowNew] = useState(false);

  // 由щ뜑蹂대뱶 state
  const [lbPeriod, setLbPeriod] = useState<Period>('week');
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HofEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const [hasNew, setHasNew] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string }[]>([]);

  const checkNotifications = useCallback(async () => {
    if (!session) return;
    const lastSeen = sessionStorage.getItem("parent_last_seen") || "2000-01-01";
    const [{ data: notices }, { data: answers }] = await Promise.all([
      supabase.from("parent_notices").select("id,title,created_at").gt("created_at", lastSeen).order("created_at", { ascending: false }),
      supabase.from("parent_qna_answers").select("id,text,created_at,is_teacher").eq("is_teacher", true).gt("created_at", lastSeen).order("created_at", { ascending: false }),
    ]);
    const items = [
      ...(notices || []).map((n: any) => ({ id: n.id, text: `새 공지사항: ${n.title}`, time: n.created_at })),
      ...(answers || []).map((a: any) => ({ id: a.id, text: `선생님이 답변을 남겼습니다`, time: a.created_at })),
    ].sort((a, b) => b.time.localeCompare(a.time));
    setNotifications(items);
    setHasNew(items.length > 0);
  }, [session]);

  useEffect(() => { checkNotifications(); }, [checkNotifications]);

  const loadLeaderboard = useCallback(async (period: Period) => {
    setLbLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${period}`);
      const json = await res.json();
      setRanking(json.ranking || []);
      setHallOfFame(json.hallOfFame || []);
    } catch (e) { console.warn("leaderboard error", e); }
    finally { setLbLoading(false); }
  }, []);

  const handleChangePw = async () => {
    if (!session) return;
    const { data: acc } = await supabase.from("parent_accounts").select("password").eq("student_name", session.studentName).eq("class_name", session.className).maybeSingle();
    if (!acc || acc.password !== curPw) { setPwErr("현재 비밀번호가 올바르지 않습니다."); return; }
    if (newPw.length < 4) { setPwErr("새 비밀번호는 4자리 이상이어야 합니다."); return; }
    await supabase.from("parent_accounts").update({ password: newPw }).eq("student_name", session.studentName).eq("class_name", session.className);
    setPwModal(false); setCurPw(""); setNewPw(""); setPwErr(""); alert("비밀번호가 변경되었습니다.");
  };

  const handleLogout = () => { sessionStorage.removeItem("parentSession"); router.push("/"); };

  const nav = [
    { href: "/parent",          label: "일간리포트",  icon: <ClipboardList size={20} /> },
    { href: "/parent/monthly",  label: "월간리포트",  icon: <CalendarDays size={20} /> },
    { href: "/parent/notices",  label: "공지사항",    icon: <Megaphone size={20} /> },
    { href: "/parent/qna",      label: "질의응답",    icon: <MessageCircle size={20} /> },
  ];

  if (!session) return null;

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden" style={{ background: AURORA.bg }}>
      {/* 봄 숲 노스텔지아 배경 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes springHaze {
            0%,100%{opacity:0.45;transform:translate(0,0) scale(1)}
            40%{opacity:0.65;transform:translate(1.5%,2%) scale(1.03)}
            70%{opacity:0.5;transform:translate(-0.5%,1%) scale(0.98)}
          }
          @keyframes springLight {
            0%,100%{opacity:0.3;transform:translateX(0) scaleX(1)}
            50%{opacity:0.5;transform:translateX(1.5%) scaleX(1.02)}
          }
          @keyframes springDrift {
            0%,100%{opacity:0.2;transform:translate(0,0)}
            50%{opacity:0.38;transform:translate(-1.5%,3%)}
          }
        `}</style>

        {/* 따뜻한 봄 햇살 - 상단 좌측 */}
        <div style={{ position:'absolute', top:'-15%', left:'-20%', width:'75vw', height:'75vw',
          background:'radial-gradient(ellipse, rgba(195,220,165,0.28) 0%, rgba(170,200,140,0.14) 30%, rgba(200,215,175,0.06) 55%, transparent 70%)',
          borderRadius:'50%', filter:'blur(55px)',
          animation:'springLight 14s ease-in-out infinite' }}/>

        {/* 녹음 보케 - 우측 중앙 */}
        <div style={{ position:'absolute', top:'5%', right:'-25%', width:'65vw', height:'65vw',
          background:'radial-gradient(ellipse, rgba(175,205,150,0.22) 0%, rgba(155,190,130,0.1) 40%, transparent 68%)',
          borderRadius:'50%', filter:'blur(65px)',
          animation:'springHaze 18s ease-in-out infinite' }}/>

        {/* 따뜻한 크림빛 오버레이 - 중앙 */}
        <div style={{ position:'absolute', top:'30%', left:'5%', width:'55vw', height:'55vw',
          background:'radial-gradient(ellipse, rgba(220,215,185,0.18) 0%, transparent 65%)',
          borderRadius:'50%', filter:'blur(50px)',
          animation:'springDrift 22s ease-in-out infinite' }}/>

        {/* 하단 깊은 녹음 */}
        <div style={{ position:'absolute', bottom:'-15%', right:'-5%', width:'60vw', height:'50vw',
          background:'radial-gradient(ellipse, rgba(145,180,125,0.15) 0%, rgba(125,165,105,0.06) 50%, transparent 70%)',
          borderRadius:'50%', filter:'blur(45px)',
          animation:'springHaze 25s ease-in-out infinite 3s' }}/>

        {/* 필름 느낌 그레인 오버레이 */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(165deg, rgba(215,225,195,0.12) 0%, rgba(240,235,218,0.08) 35%, transparent 60%, rgba(175,205,155,0.07) 100%)' }}/>

        {/* 따뜻한 비네팅 */}
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(195,185,165,0.12) 80%, rgba(180,170,148,0.18) 100%)' }}/>
      </div>

      {/* ?? ?ㅻ뜑 ?? */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 border-b"
        style={{ background: AURORA.header, borderColor: AURORA.border, backdropFilter: "blur(16px)" }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(74,112,85,0.6)' }}>Report Portal</p>
          <p className="text-[16px] font-black" style={{ color: '#2d3d2d' }}>{session.studentName} 학부모님</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowTrophy(true); loadLeaderboard(lbPeriod); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: AURORA.light, border: `1px solid ${AURORA.border}`, color: AURORA.primary }}>
            <Trophy size={16} />
          </button>
          <button onClick={() => { setShowBell(true); setHasNew(false); sessionStorage.setItem("parent_last_seen", new Date().toISOString()); }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: AURORA.light, border: `1px solid ${AURORA.border}`, color: AURORA.primary }}>
            <Bell size={16} />
            {hasNew && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[6px] font-black text-white">N</span></span>}
          </button>
          <button onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: AURORA.light, border: `1px solid ${AURORA.border}`, color: AURORA.primary }}>
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ?? 肄섑뀗痢??? */}
      <main className="flex-1 overflow-auto pb-24 relative z-10">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{ background: AURORA.navBg, borderColor: AURORA.border, backdropFilter: "blur(20px)" }}>
        <div className="flex">
          {nav.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-all relative"
                style={{ color: active ? AURORA.primary : 'rgba(74,112,85,0.4)' }}>
                {item.icon}
                <span className="text-[9px] font-bold">{item.label}</span>
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: AURORA.primary }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ?? ?몃줈??= ?숈깮 由щ뜑蹂대뱶? ?숈씪???꾩껜?붾㈃ ?? */}
      {showTrophy && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#f9fafb" }}>
          <div className="flex flex-col h-full max-w-md mx-auto w-full bg-white">

            {/* ?ㅻ뜑 */}
            <div className="px-5 pt-10 pb-4 shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <Trophy size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h1 className="text-[18px] font-black text-slate-800">리더보드</h1>
                  <p className="text-[11px] text-slate-400 font-bold">누적 점수 기준 순위</p>
                </div>
                <button onClick={() => loadLeaderboard(lbPeriod)}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
                  <RefreshCw size={15} className={lbLoading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowTrophy(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                  <X size={15} />
                </button>
              </div>
              {/* 湲곌컙 ??*/}
              <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
                {(['today','week','month'] as Period[]).map(p => (
                  <button key={p} onClick={() => { setLbPeriod(p); loadLeaderboard(p); }}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-black transition-all ${
                      lbPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
                    }`}>
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* 紐낆삁???꾨떦 */}
            {hallOfFame.length > 0 && (
              <div className="mx-5 mb-4 shrink-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <Crown size={13} className="text-amber-500" strokeWidth={2.5} />
                  <span className="text-[11px] font-black text-amber-600 tracking-widest uppercase">
                    {hallOfFame[0] ? `${hallOfFame[0].year}년 ${MONTH_LABELS[hallOfFame[0].month]} MVP` : ''}
                  </span>
                  <div className="flex-1 h-px bg-amber-200/60" />
                </div>
                <div className="flex gap-2">
                  {hallOfFame.map(entry => {
                    const colors = [
                      { from:'from-amber-400', to:'to-yellow-300', border:'border-amber-300/60', text:'text-amber-900', badge:'bg-amber-400' },
                      { from:'from-slate-300', to:'to-slate-200', border:'border-slate-300/60', text:'text-slate-700', badge:'bg-slate-400' },
                      { from:'from-orange-300', to:'to-amber-200', border:'border-orange-300/60', text:'text-orange-800', badge:'bg-orange-400' },
                    ];
                    const c = colors[(entry.rank - 1)] || colors[2];
                    return (
                      <div key={entry.rank} className={`flex-1 rounded-2xl bg-gradient-to-br ${c.from} ${c.to} border ${c.border} p-3 text-center`}>
                        <div className={`w-8 h-8 rounded-xl ${c.badge} flex items-center justify-center mx-auto mb-1.5 text-white font-black text-[14px] shadow-sm`}>
                          {entry.displayName.slice(0, 1)}
                        </div>
                        <p className={`text-[11px] font-black ${c.text} truncate`}>{entry.displayName}</p>
                        <p className={`text-[9px] font-bold ${c.text} opacity-70 mt-0.5`}>{entry.score}점</p>
                      </div>
                    );
                  })}
                  {Array.from({ length: 3 - hallOfFame.length }).map((_, i) => (
                    <div key={`e-${i}`} className="flex-1 rounded-2xl border border-dashed border-slate-200 p-3 text-center flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 font-bold">미정</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ranking.find(r => r.name === session.studentName) && (
              <div className="mx-5 mb-3 px-5 py-3.5 rounded-2xl bg-slate-800 text-white flex items-center gap-3 shrink-0">
                <Flame size={18} className="text-orange-300" />
                <div>
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">나의 순위</p>
                  <p className="text-[15px] font-black">
                    {ranking.find(r => r.name === session.studentName)?.rank}위 · {ranking.find(r => r.name === session.studentName)?.score}점
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
              {lbLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)
              ) : ranking.length === 0 ? (
                <div className="py-16 text-center">
                  <Trophy size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold">아직 기록이 없습니다.</p>
                  <p className="text-slate-300 text-[11px] font-medium mt-1">테스트를 완료하면 순위가 생길 거예요.</p>
                </div>
              ) : ranking.map(entry => {
                const medal = getMedalStyle(entry.rank);
                const isChild = entry.name === session.studentName;
                const isTop3 = entry.rank <= 3;
                return (
                  <div key={entry.name}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                      isChild ? 'border-sky-200 bg-sky-50 ring-1 ring-sky-100' :
                      isTop3 ? 'border-transparent bg-gradient-to-r from-white to-slate-50 shadow-sm' : 'border-slate-100 bg-white'
                    }`}
                    style={isTop3 ? { boxShadow: medal.glow } : undefined}>
                    {isTop3 ? (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${medal.bg} flex items-center justify-center text-[20px] leading-none shadow-md shrink-0`}>
                        {medal.icon}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-[13px] font-black text-slate-500">{entry.rank}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-slate-800 truncate">
                        {entry.displayName || entry.name}
                        {isChild && <span className="text-[10px] font-black text-sky-500 ml-1.5">나의 자녀</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">누적 {entry.score}점</p>
                    </div>
                    {ranking[0] && (
                      <div className="w-20 shrink-0">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            isTop3 ? entry.rank===1?'bg-yellow-400':entry.rank===2?'bg-slate-400':'bg-orange-400' : 'bg-slate-300'
                          }`} style={{ width: `${(entry.score / ranking[0].score) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showBell && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowBell(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-black text-slate-800">앱 알림</h3>
              <button onClick={() => setShowBell(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><X size={14} /></button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-center text-slate-300 py-8 text-[13px]">알림이 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <p className="flex-1 text-[13px] font-medium text-slate-700">{n.text}</p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(n.time).toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-black text-slate-800">설정</h3>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: AURORA.light, border: `1px solid ${AURORA.border}` }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: AURORA.primary }}>현재 계정</p>
                <p className="text-[16px] font-black text-slate-800">{session.studentName} 학부모님</p>
                <p className="text-[12px] text-slate-500">{session.className}</p>
              </div>
              <button onClick={() => { setShowSettings(false); setPwModal(true); }} className="w-full h-12 rounded-2xl text-[14px] font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all">비밀번호 변경</button>
              <button onClick={handleLogout} className="w-full h-12 rounded-2xl text-[14px] font-bold text-rose-600 border border-rose-100 hover:bg-rose-50 transition-all">로그아웃</button>
            </div>
          </div>
        </div>
      )}

      {pwModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={() => { setPwModal(false); setPwErr(""); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-[17px] font-black text-slate-800 mb-5">비밀번호 변경</h3>
            <div className="space-y-3">
              <div className="relative">
                <input type={showCur ? "text" : "password"} value={curPw} onChange={e => { setCurPw(e.target.value); setPwErr(""); }} placeholder="현재 비밀번호" className="w-full h-12 px-4 pr-10 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-sky-400" />
                <button onClick={() => setShowCur(v => !v)} className="absolute right-3 top-3.5 text-slate-400">{showCur ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPw} onChange={e => { setNewPw(e.target.value); setPwErr(""); }} placeholder="새 비밀번호 (4자리 이상)" className="w-full h-12 px-4 pr-10 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-sky-400" />
                <button onClick={() => setShowNew(v => !v)} className="absolute right-3 top-3.5 text-slate-400">{showNew ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </div>
              {pwErr && <p className="text-[12px] text-rose-500">{pwErr}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setPwModal(false); setPwErr(""); }} className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-500">취소</button>
                <button onClick={handleChangePw} className="flex-1 h-11 rounded-xl text-[13px] font-black text-white transition-all" style={{ background: `linear-gradient(135deg,${AURORA.primary} 0%,${AURORA.accent} 100%)` }}>변경</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
