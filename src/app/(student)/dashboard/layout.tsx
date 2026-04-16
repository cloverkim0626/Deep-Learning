"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, PenTool, Bot, MessageCircle, CalendarPlus, Bell, LogOut, Volume2, Quote, Settings, Lock, Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getClinicQueue, getTestSessionsByStudent, getQnaPosts, changeStudentPassword } from "@/lib/database-service";
import { getAssignmentsByStudent } from "@/lib/assignment-service";

const INITIAL_NOTIFICATIONS: { id: string; text: string; sub: string; unread: boolean; link: string }[] = [];

// Daily English quotes — picked by day of year
const DAILY_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
  { text: "Learning is not attained by chance; it must be sought for with ardor and attended to with diligence.", author: "Abigail Adams" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Try to learn something about everything and everything about something.", author: "Thomas Huxley" },
  { text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo" },
  { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "Knowledge is power.", author: "Francis Bacon" },
  { text: "A mind that is stretched by a new experience can never go back to its old dimensions.", author: "Oliver Wendell Holmes" },
  { text: "Change is the end result of all true learning.", author: "Leo Buscaglia" },
  { text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein" },
  { text: "One child, one teacher, one book, one pen can change the world.", author: "Malala Yousafzai" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { text: "Education breeds confidence. Confidence breeds hope. Hope breeds peace.", author: "Confucius" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

// AI 격려 멘트 생성 (통계 기반)
function generateAdvice(name: string, clinicCount: number, remainingTests: number, wrongCount: number): string {
  if (clinicCount === 0 && remainingTests === 0) {
    return `${name} 학생, 오늘도 화이팅! 클리닉을 신청하고 궁금한 점을 해결해봐요.`;
  }
  if (remainingTests > 0) {
    return `아직 ${remainingTests}개의 세트 시험이 남아있어요. TEST 모드에서 도전해봐요 💪`;
  }
  if (wrongCount > 0) {
    return `오답 노트에 ${wrongCount}개 단어가 있어요. 복습하면 실력이 쑥쑥 올라요 📚`;
  }
  if (clinicCount > 0) {
    return `클리닉 ${clinicCount}회 신청했네요. 선생님과의 상담이 큰 도움이 됐길 바라요 ✨`;
  }
  return `꾸준히 학습 중이에요. 오늘도 좋은 하루 보내세요! 🌟`;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pwChanging, setPwChanging] = useState(false);
  const [pwError, setPwError] = useState('');
  const [notifs, setNotifs] = useState<{ id: string; text: string; sub: string; unread: boolean; link: string }[]>([]);

  const [profile, setProfile] = useState({
    name: "학생",
    class: "소속 반 없음",
  });

  // Real stats
  const [stats, setStats] = useState({
    clinicCount: 0,
    remainingTests: 0,
    wrongCount: 0,
    masteryPct: 0,
  });
  const [advice, setAdvice] = useState("");

  const getStudentName = useCallback(() => {
    try {
      const saved = localStorage.getItem("stu_session");
      if (saved) return JSON.parse(saved).name || "학생";
    } catch { /* noop */ }
    return "학생";
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("stu_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setProfile({ name: data.name || "학생", class: data.class || "소속 반 없음" });
      } catch { /* noop */ }
    }
  }, []);

  // Load notifications: QnA answers + new assignments
  const loadNotifs = useCallback(async () => {
    const name = getStudentName();
    const lastSeen = Number(localStorage.getItem('notif_last_seen') || '0');
    const newNotifs: { id: string; text: string; sub: string; unread: boolean; link: string }[] = [];
    try {
      // QnA answered
      const posts = await getQnaPosts().catch(() => []);
      (posts as { id: string; author_name: string; question: string; status: string; qna_answers?: { created_at: string; is_teacher: boolean }[]; created_at: string }[])
        .filter(p => p.author_name === name && p.status === 'answered')
        .forEach(p => {
          const latestTeacherAnswer = p.qna_answers?.filter(a => a.is_teacher)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          if (latestTeacherAnswer) {
            const answerTime = new Date(latestTeacherAnswer.created_at).getTime();
            newNotifs.push({
              id: `qna-${p.id}`,
              text: '선생님이 Q&A에 답변해주셨어요!',
              sub: p.question.slice(0, 30) + (p.question.length > 30 ? '...' : ''),
              unread: answerTime > lastSeen,
              link: '/dashboard/qna',
            });
          }
        });
      // New assignments
      const assignments = await getAssignmentsByStudent(name).catch(() => []);
      (assignments as { id: string; label: string; created_at?: string }[])
        .forEach(a => {
          const assignTime = new Date(a.created_at || 0).getTime();
          if (assignTime > lastSeen) {
            newNotifs.push({
              id: `assign-${a.id}`,
              text: '새 지문이 배당되었어요!',
              sub: a.label,
              unread: true,
              link: '/dashboard',
            });
          }
        });
    } catch { /* noop */ }
    setNotifs(newNotifs);
  }, [getStudentName]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // Mark all read when dropdown opens
  const handleOpenNotif = () => {
    setShowNotif(!showNotif);
    setShowProfile(false);
    if (!showNotif) {
      localStorage.setItem('notif_last_seen', Date.now().toString());
      // Mark all as read visually after short delay
      setTimeout(() => setNotifs(prev => prev.map(n => ({ ...n, unread: false }))), 800);
    }
  };

  const loadStats = useCallback(async () => {
    const name = getStudentName();
    try {
      const [clinicData, sessions, assignments] = await Promise.all([
        getClinicQueue().catch(() => []),
        getTestSessionsByStudent(name).catch(() => []),
        getAssignmentsByStudent(name).catch(() => []),
      ]);

      // Clinic count for this student
      const myClinic = (clinicData as { student_name: string; status: string }[])
        .filter(c => c.student_name === name && c.status === "completed").length;

      // Mastery: from test sessions
      const totalQ = (sessions as { total_questions: number; correct_count: number }[])
        .reduce((a, s) => a + (s.total_questions || 0), 0);
      const correctQ = (sessions as { total_questions: number; correct_count: number }[])
        .reduce((a, s) => a + (s.correct_count || 0), 0);
      const mastery = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

      // Only COMPLETED sessions count (completed_at not null)
      const testedSetIds = new Set((sessions as { set_id?: string; completed_at?: string | null }[])
        .filter(s => s.completed_at)
        .map(s => s.set_id).filter(Boolean));
      const remaining = (assignments as { id: string }[]).filter(a => !testedSetIds.has(a.id)).length;

      setStats({
        clinicCount: myClinic,
        remainingTests: remaining,
        wrongCount: 0, // updated when wrong tab is visited
        masteryPct: mastery,
      });

      setAdvice(generateAdvice(name, myClinic, remaining, 0));
    } catch (err) {
      console.warn("Stats load failed:", err);
    }
  }, [getStudentName]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Reload stats when profile panel opens
  useEffect(() => {
    if (showProfile) loadStats();
  }, [showProfile, loadStats]);

  const unreadCount = notifs.filter(n => n.unread).length;

  const handleLogout = () => {
    localStorage.removeItem("stu_session");
    router.push("/");
  };

  const handlePwConfirm = () => {
    setPwError('');
    if (!currentPw.trim()) { setPwError('현재 비밀번호를 입력하세요.'); return; }
    if (!newPw.trim() || newPw.length < 4) { setPwError('새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (currentPw === newPw) { setPwError('현재 비밀번호와 동일합니다.'); return; }
    setShowConfirmModal(true);
  };

  const doChangePassword = async () => {
    setPwChanging(true);
    const result = await changeStudentPassword(profile.name, currentPw, newPw);
    setPwChanging(false);
    setShowConfirmModal(false);
    if (result.success) {
      setCurrentPw(''); setNewPw('');
      setShowSettings(false);
      alert('비밀번호가 변경되었습니다! 다음 로그인부터 새 비밀번호를 사용하세요.');
    } else {
      setPwError(result.error || '오류가 발생했습니다.');
    }
  };

  const displayStats = [
    { label: "클리닉 완료", value: stats.clinicCount + "회" },
    { label: "어휘 성취도", value: stats.masteryPct + "%" },
    { label: "남은 시험", value: stats.remainingTests + "세트" },
  ];

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.1)] bg-background overflow-hidden border-x border-foreground/5">

      {/* Top Header */}
      <header className="h-20 flex items-center justify-between px-6 border-b border-foreground/5 bg-background/90 backdrop-blur-xl z-30 shrink-0 sticky top-0">
        <Link href="/dashboard" className="flex flex-col gap-1">
          <span className="text-[18px] text-foreground serif font-black leading-none tracking-tight">Deep Learning</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-accent leading-none">{profile.name}</span>
            <div className="w-1 h-1 rounded-full bg-foreground/20" />
            <span className="text-[10px] font-bold text-accent leading-none">{profile.class}</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNotif}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-accent-light/30 hover:bg-accent-light transition-colors"
          >
            <Bell className="text-foreground/60 w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error" />
            )}
          </button>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center text-[14px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {profile.name.length > 2 ? profile.name.slice(1) : profile.name.charAt(0)}
          </button>
        </div>
      </header>

      {/* Notification Dropdown */}
      {showNotif && (
        <div className="absolute top-[85px] left-4 right-4 bg-background border border-foreground/10 rounded-[2rem] shadow-[0_24px_50px_rgba(0,0,0,0.15)] z-40 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/5">
            <span className="text-[14px] font-black text-foreground">새로운 소식</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto py-2">
            {notifs.length === 0 ? (
              <div className="px-6 py-12 text-center text-[13px] text-accent/50 font-medium italic">신규 알림이 없습니다.</div>
            ) : notifs.map(n => (
              <Link key={n.id} href={n.link}
                onClick={() => setShowNotif(false)}
                className={`flex items-start gap-3 px-6 py-4 hover:bg-foreground/3 transition-colors ${n.unread ? 'bg-accent-light/30' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-foreground' : 'bg-foreground/20'}`} />
                <div>
                  <p className={`text-[13px] font-bold ${n.unread ? 'text-foreground' : 'text-accent'}`}>{n.text}</p>
                  <p className="text-[11px] text-accent/60 mt-0.5">{n.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Profile Panel */}
      {showProfile && (
        <div className="absolute inset-0 z-50 flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" onClick={() => setShowProfile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[3rem] shadow-[0_-24px_60px_rgba(0,0,0,0.2)] overflow-y-auto max-h-[90vh] custom-scrollbar animate-in slide-in-from-bottom duration-700">
            <div className="flex justify-center pt-6 pb-2">
              <div className="w-14 h-1.5 rounded-full bg-foreground/10" />
            </div>
            <div className="px-8 pb-12">
              {/* Header */}
              <div className="relative text-center mb-8 mt-6">
                {/* 설정 버튼 — GUEST 반 제외 */}
                {profile.class !== 'GUEST' && (
                  <button
                    onClick={() => { setShowSettings(s => !s); setPwError(''); }}
                    className={`absolute right-0 top-0 p-2.5 rounded-xl transition-all ${
                      showSettings ? 'bg-foreground text-background' : 'bg-accent-light/60 text-accent hover:bg-foreground/10'
                    }`}
                    title="비밀번호 설정"
                  >
                    <Settings size={16} strokeWidth={2} />
                  </button>
                )}
                <h2 className="text-3xl font-black text-foreground serif mb-2">{profile.name} 학생</h2>
                <p className="text-[14px] text-accent font-bold tracking-widest">{profile.class}</p>
              </div>

              {/* 비밀번호 변경 패널 */}
              {showSettings && profile.class !== 'GUEST' && (
                <div className="mb-6 p-5 glass border border-foreground/8 rounded-[1.5rem] space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={13} className="text-accent" />
                    <span className="text-[11px] font-black text-accent uppercase tracking-widest">비밀번호 변경</span>
                  </div>
                  {/* 현재 비밀번호 */}
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="현재 비밀번호"
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-foreground/10 bg-white text-[14px] font-bold outline-none focus:border-foreground/30 transition-colors"
                    />
                    <button onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-foreground">
                      {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* 변경할 비밀번호 */}
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="변경할 비밀번호 (4자 이상)"
                      className="w-full h-12 pl-4 pr-10 rounded-xl border border-foreground/10 bg-white text-[14px] font-bold outline-none focus:border-foreground/30 transition-colors"
                    />
                    <button onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-foreground">
                      {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwError && <p className="text-[12px] text-red-500 font-bold px-1">{pwError}</p>}
                  <button
                    onClick={handlePwConfirm}
                    className="w-full h-11 bg-foreground text-background rounded-xl font-black text-[13px] hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    확인
                  </button>
                </div>
              )}

              {/* AI 격려/피드백 */}
              <div className="mb-6 px-5 py-4 bg-foreground rounded-[1.5rem] text-background">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-background/20 flex items-center justify-center">
                    <Bot size={13} className="text-background" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">Parallax AI 어드바이스</span>
                </div>
                <p className="text-[14px] font-medium leading-relaxed opacity-90">{advice || "학습 데이터를 분석 중이에요..."}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {displayStats.map(s => (
                  <div key={s.label} className="bg-white border border-foreground/5 rounded-[1.5rem] px-4 py-5 shadow-sm text-center">
                    <p className="text-[9px] font-black text-accent uppercase tracking-[0.12em] mb-2 leading-tight">{s.label}</p>
                    <p className="text-[20px] font-black text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* 오늘의 명문 */}
              {(() => {
                const q = getDailyQuote();
                return (
                  <div className="mb-4 px-5 py-5 glass border border-foreground/5 rounded-[1.5rem]">
                    <div className="flex items-center gap-2 mb-3">
                      <Quote size={12} className="text-accent" />
                      <span className="text-[9px] font-black text-accent tracking-widest uppercase">Today's Quote</span>
                      <span className="ml-auto text-[9px] font-bold text-accent/40">{new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className="text-[14px] font-bold text-foreground leading-relaxed serif italic mb-2">"{q.text}"</p>
                    <p className="text-[11px] text-accent font-black">— {q.author}</p>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          const u = new SpeechSynthesisUtterance(q.text);
                          u.lang = 'en-US'; u.rate = 0.82;
                          window.speechSynthesis.speak(u);
                        }
                      }}
                      className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-foreground transition-colors"
                    >
                      <Volume2 size={13} /> 발음 듣기
                    </button>
                  </div>
                );
              })()}

              <button onClick={handleLogout} className="w-full h-14 rounded-[2rem] bg-error/10 text-error font-black text-[14px] flex items-center justify-center gap-2 hover:bg-error hover:text-white transition-all">
                <LogOut size={18} strokeWidth={3} /> 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비밀번호 변경 확인 모달 ── */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative w-full max-w-sm bg-background rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-5">
              <Lock size={22} className="text-foreground" />
            </div>
            <h3 className="text-[18px] font-black text-foreground text-center mb-2">비밀번호 변경</h3>
            <p className="text-[13px] text-accent text-center font-medium mb-6">
              비밀번호를 변경하시겠습니까?<br />
              <span className="text-[11px] opacity-60">변경 후 다음 로그인에 적용됩니다.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={doChangePassword}
                disabled={pwChanging}
                className="flex-1 h-12 bg-foreground text-background rounded-2xl font-black text-[14px] hover:-translate-y-0.5 disabled:opacity-40 transition-all"
              >
                {pwChanging ? '변경 중...' : '확인'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={pwChanging}
                className="flex-1 h-12 border border-foreground/10 text-accent rounded-2xl font-black text-[14px] hover:bg-foreground/5 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-[100px] bg-background">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md h-[88px] bg-background/90 backdrop-blur-2xl border-t border-foreground/5 flex items-center justify-around z-30 px-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <NavButton href="/dashboard" icon={<BookOpen size={22} />} label="단어학습" isActive={pathname === "/dashboard"} />
        <NavButton href="/dashboard/essay" icon={<PenTool size={22} />} label="서술형" isActive={pathname.startsWith("/dashboard/essay")} />
        <NavButton href="/dashboard/ai-teacher" icon={<Bot size={22} />} label="AI튜터" isActive={pathname.startsWith("/dashboard/ai-teacher")} />
        <NavButton href="/dashboard/qna" icon={<MessageCircle size={22} />} label="질의응답" isActive={pathname.startsWith("/dashboard/qna")} />
        <NavButton href="/dashboard/clinic" icon={<CalendarPlus size={22} />} label="클리닉" isActive={pathname.startsWith("/dashboard/clinic")} />
      </nav>
    </div>
  );
}

function NavButton({ href, icon, label, isActive = false }: { href: string; icon: React.ReactNode; label: string; isActive?: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center flex-1 h-full gap-1.5 group relative">
      <div className={`transition-all duration-500 relative z-10 ${isActive ? "text-foreground -translate-y-1.5 scale-110" : "text-foreground/30 group-hover:text-foreground/80 group-hover:-translate-y-0.5"}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black tracking-tight transition-all duration-500 z-10 ${isActive ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/80"}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute inset-x-3 bottom-2 h-1 bg-foreground rounded-full animate-in zoom-in duration-500" />
      )}
    </Link>
  );
}
