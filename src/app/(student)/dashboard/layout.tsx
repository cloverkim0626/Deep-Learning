"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, PenTool, Bot, MessageCircle, CalendarPlus, Bell, LogOut, Volume2, Quote, Settings, Lock, Eye, EyeOff, Calendar, Trophy, X, Layers, Flame, BarChart2, HelpCircle, Brain, Check } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getClinicQueue, getTestSessionsByStudent, getQnaPosts, changeStudentPassword, updateStudentNickname, getStudentNickname } from "@/lib/database-service";
import { getAssignmentsByStudent } from "@/lib/assignment-service";

const INITIAL_NOTIFICATIONS: { id: string; text: string; sub: string; unread: boolean; link: string }[] = [];

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

function getStreakMessage(name: string, streak: number): string {
  if (streak === 0) return `${name} 학생, 오늘부터 시작해봐요!`;
  if (streak < 3) return `좋은 시작이에요! 계속 이어가봐요 🔥`;
  if (streak < 7) return `${streak}일 연속! 훌륭해요 💪`;
  if (streak < 14) return `일주일 넘게 연속 학습! 대단해요 🌟`;
  if (streak < 30) return `${streak}일 연속 달성! 진짜 대단해요 🏅`;
  return `${streak}일 연속! 레전드급 학습자예요 🏆`;
}

// Streak: 90%+ 세션 기준 — 2026-04-20부터 하루 2세트 이상 필요 (이전은 1세트)
// 주 2일 휴식 허용, 오늘은 미집계
const STREAK_RULE_CHANGE = '2026-04-20';
function computeStreak(sessions: { completed_at?: string | null; correct_count?: number; total_questions?: number }[]): number {
  // 날짜별 통과 세션 수 집계
  const dayCountMap: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const total = s.total_questions ?? 0;
    if (total === 0) continue;
    const pct = (s.correct_count ?? 0) / total;
    if (pct >= 0.9) {
      const d = new Date(s.completed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayCountMap[key] = (dayCountMap[key] || 0) + 1;
    }
  }

  // 날짜별로 기준 충족 여부 판단
  const passedDays = new Set<string>();
  for (const [key, count] of Object.entries(dayCountMap)) {
    const required = key >= STREAK_RULE_CHANGE ? 2 : 1; // 4/20 이전은 1세트, 이후는 2세트
    if (count >= required) passedDays.add(key);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let skipsLeft = 2; // weekly skips - simplified: allow 2 total consecutive skips
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1); // start from yesterday

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (passedDays.has(key)) {
      streak++;
      skipsLeft = 2; // reset skip allowance on pass
    } else {
      if (skipsLeft > 0) {
        skipsLeft--;
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
    // safety: don't go back more than 365 days
    if (streak > 365) break;
  }
  return streak;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pwChanging, setPwChanging] = useState(false);
  const [pwError, setPwError] = useState('');
  const [notifs, setNotifs] = useState<{ id: string; text: string; sub: string; unread: boolean; link: string }[]>([]);
  // 닉네임
  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{name:string;score:number;rank:number}[]>([]);
  const [lbPeriod, setLbPeriod] = useState<'today'|'week'|'month'>('week');
  const [lbLoading, setLbLoading] = useState(false);
  const [showScholarship, setShowScholarship] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSessions, setCalendarSessions] = useState<{ completed_at?: string | null; set_id: string; word_sets?: { label: string } | null; test_type?: string | null; correct_count?: number; total_questions?: number }[]>([]);
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const [profile, setProfile] = useState({
    name: "학생",
    class: "소속 반 없음",
  });

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
        // 닉네임 로드 (localStorage 우선, DB 폴백)
        const savedNick = data.nickname || '';
        setNickname(savedNick);
        setNicknameInput(savedNick);
        if (!savedNick && data.name) {
          getStudentNickname(data.name).then(n => {
            if (n) {
              setNickname(n);
              setNicknameInput(n);
              try {
                const sess = JSON.parse(localStorage.getItem('stu_session') || '{}');
                localStorage.setItem('stu_session', JSON.stringify({ ...sess, nickname: n }));
              } catch { /* noop */ }
            }
          }).catch(() => {});
        }
      } catch { /* noop */ }
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    const name = getStudentName();
    const lastSeen = Number(localStorage.getItem('notif_last_seen') || '0');
    const newNotifs: { id: string; text: string; sub: string; unread: boolean; link: string }[] = [];
    try {
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

  const handleOpenNotif = () => {
    setShowNotif(!showNotif);
    setShowProfile(false);
    if (!showNotif) {
      localStorage.setItem('notif_last_seen', Date.now().toString());
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

      const myClinic = (clinicData as { student_name: string; status: string }[])
        .filter(c => c.student_name === name && c.status === "completed").length;

      const totalQ = (sessions as { total_questions: number; correct_count: number }[])
        .reduce((a, s) => a + (s.total_questions || 0), 0);
      const correctQ = (sessions as { total_questions: number; correct_count: number }[])
        .reduce((a, s) => a + (s.correct_count || 0), 0);
      const mastery = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

      // 통과(90%+)한 세트만 "완료"로 인정 → 실패 이력만 있는 세트는 여전히 "남은 세트"로 표시
      const passedSetIds = new Set((sessions as { set_id?: string; completed_at?: string | null; correct_count?: number; total_questions?: number }[])
        .filter(s => s.completed_at && s.total_questions && s.total_questions > 0 && (s.correct_count ?? 0) / s.total_questions >= 0.9)
        .map(s => s.set_id).filter(Boolean));
      const remaining = (assignments as { id: string }[]).filter(a => !passedSetIds.has(a.id)).length;

      setStats({
        clinicCount: myClinic,
        remainingTests: remaining,
        wrongCount: 0,
        masteryPct: mastery,
      });

      setAdvice(generateAdvice(name, myClinic, remaining, 0));

      // Streak
      const streakVal = computeStreak(sessions as { completed_at?: string | null; correct_count?: number; total_questions?: number }[]);
      setStreak(streakVal);

      // Calendar sessions
      setCalendarSessions(sessions as { completed_at?: string | null; set_id: string; word_sets?: { label: string } | null; test_type?: string | null; correct_count?: number; total_questions?: number }[]);
    } catch (err) {
      console.warn("Stats load failed:", err);
    }
  }, [getStudentName]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (showProfile) loadStats();
  }, [showProfile, loadStats]);

  const unreadCount = notifs.filter(n => n.unread).length;

  const handleLogout = () => {
    localStorage.removeItem("stu_session");
    router.push("/");
  };

  const handleNicknameSave = async () => {
    if (nicknameSaving) return;
    setNicknameSaving(true);
    setNicknameMsg('');
    const result = await updateStudentNickname(profile.name, nicknameInput);
    setNicknameSaving(false);
    if (result.success) {
      const saved = nicknameInput.trim();
      setNickname(saved);
      setNicknameMsg('저장되었습니다!');
      try {
        const sess = JSON.parse(localStorage.getItem('stu_session') || '{}');
        localStorage.setItem('stu_session', JSON.stringify({ ...sess, nickname: saved }));
      } catch { /* noop */ }
      setTimeout(() => setNicknameMsg(''), 2000);
    } else {
      setNicknameMsg('저장 실패: ' + (result.error || ''));
    }
  };

  const handlePwConfirm = () => {
    setPwError('');
    if (!currentPw.trim()) { setPwError('현재 비밀번호를 입력하세요.'); return; }
    if (!newPw.trim() || newPw.length < 4) { setPwError('새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (currentPw === newPw) { setPwError('현재 비밀번호와 동일합니다.'); return; }
    setShowSettings(false);
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
          {/* 달력 버튼 */}
          <button
            onClick={async () => {
              if (!showCalendar) {
                const name = getStudentName();
                try {
                  const sessions = await getTestSessionsByStudent(name).catch(() => []);
                  setCalendarSessions(sessions as { completed_at?: string | null; set_id: string; word_sets?: { label: string } | null; test_type?: string | null; correct_count?: number; total_questions?: number }[]);
                } catch { /* noop */ }
              }
              setShowCalendar(c => !c);
              setShowNotif(false);
              setShowProfile(false);
              setCalendarSelectedDay(null);
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-accent-light/30 hover:bg-accent-light transition-colors"
            title="학습 달력"
          >
            <Calendar className="text-foreground/60 w-5 h-5" />
          </button>
          {/* 알림 버튼 */}
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
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); setShowCalendar(false); }}
            className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center text-[14px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {profile.name.length > 2 ? profile.name.slice(1) : profile.name.charAt(0)}
          </button>
        </div>
      </header>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="absolute inset-0 z-50 flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/25 backdrop-blur-sm" onClick={() => { setShowCalendar(false); setCalendarSelectedDay(null); }} />
          <div className="absolute inset-x-3 top-[90px] bottom-[100px] bg-background rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/5 shrink-0">
              <button onClick={() => { setCalendarMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; }); setCalendarSelectedDay(null); }} className="p-2 rounded-xl hover:bg-foreground/5 text-accent transition-colors">‹</button>
              <span className="text-[14px] font-black text-foreground">
                {calendarMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </span>
              <button onClick={() => { setCalendarMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; }); setCalendarSelectedDay(null); }} className="p-2 rounded-xl hover:bg-foreground/5 text-accent transition-colors">›</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {(() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

                // test_type 한글 변환
                const typeLabel = (t: string | null) => {
                  if (!t) return '기타';
                  if (t === 'vocab') return '뜻고르기';
                  if (t === 'vocab_drill') return 'One More! 뜻고르기';
                  if (t === 'synonym') return '유반의어 객관식';
                  if (t === 'synonym_drill') return 'One More! 유반의어';
                  if (t === 'card_game') return '유반의어 카드게임';
                  if (t === 'card_game_drill') return 'One More! 카드게임';
                  return t;
                };

                // null set_id의 실제 라벨: test_type이 _drill이면 드릴, 아니면 전체세트 테스트
                const sessionLabel = (s: { word_sets?: { label?: string } | null; set_id?: string | null; test_type?: string | null }) => {
                  const wsLabel = (s as { word_sets?: { label?: string } }).word_sets?.label;
                  if (wsLabel) return wsLabel;
                  if (!s.set_id) {
                    const t = s.test_type || '';
                    return t.includes('_drill') ? 'One More! 오답 드릴' : '전체세트 종합 테스트';
                  }
                  return s.set_id.slice(0, 8);
                };

                const dayMap: Record<string, { label: string; test_type: string | null; correct: number; total: number }[]> = {};
                calendarSessions.forEach(s => {
                  if (!s.completed_at) return;
                  const d = new Date(s.completed_at);
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  if (d.getFullYear() !== year || d.getMonth() !== month) return;
                  const correct = s.correct_count ?? 0;
                  const total = s.total_questions ?? 0;
                  if (total === 0) return; // total_questions=0인 잘못된 세션 제외
                  const pct = correct / total;
                  if (pct >= 0.9) {
                    if (!dayMap[key]) dayMap[key] = [];
                    dayMap[key].push({ label: sessionLabel(s), test_type: s.test_type ?? null, correct, total });
                  }
                });

                const days = ['일','월','화','수','목','금','토'];
                const cells: (number|null)[] = Array(firstDay).fill(null);
                for (let i = 1; i <= daysInMonth; i++) cells.push(i);

                return (
                  <div>
                    <div className="grid grid-cols-7 gap-1 mt-3 mb-2">
                      {days.map(d => <div key={d} className="text-center text-[9px] font-black text-accent/50 uppercase py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {cells.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} />;
                        const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const sessions = dayMap[key] || [];
                        const hasPass = sessions.length > 0;
                        const isToday = key === todayStr;
                        const isSelected = calendarSelectedDay === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setCalendarSelectedDay(isSelected ? null : (hasPass ? key : null))}
                            className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-[12px] font-black transition-all ${
                              isToday ? 'ring-2 ring-foreground' : ''
                            } ${isSelected ? 'bg-foreground text-background' : hasPass ? 'bg-orange-50 text-orange-700' : 'text-foreground/40'}`}
                          >
                            {day}
                            {hasPass && <span className="text-[8px] mt-0.5">{sessions.length > 1 ? `🔥×${sessions.length}` : '🔥'}</span>}
                          </button>
                        );
                      })}
                    </div>
                    {calendarSelectedDay && dayMap[calendarSelectedDay] && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[11px] font-black text-foreground/50 px-1">{calendarSelectedDay} 통과 세트</p>
                        {dayMap[calendarSelectedDay].map((s, i) => (
                          <div key={i} className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2.5">
                            <span className="text-[14px]">🔥</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-black text-foreground truncate">{s.label}</p>
                              <p className="text-[10px] text-accent">
                                {typeLabel(s.test_type)} · {s.correct}/{s.total}개 정답
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" onClick={() => { setShowProfile(false); setShowSettings(false); }} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[3rem] shadow-[0_-24px_60px_rgba(0,0,0,0.2)] overflow-y-auto max-h-[90vh] custom-scrollbar animate-in slide-in-from-bottom duration-700">
            <div className="flex justify-center pt-6 pb-2">
              <div className="w-14 h-1.5 rounded-full bg-foreground/10" />
            </div>
            <div className="px-8 pb-12">
              {/* Header */}
              <div className="relative text-center mb-8 mt-6">
                {/* 리더보드 아이콘 */}
                <button
                  onClick={async () => {
                    setShowLeaderboard(true);
                    setLbLoading(true);
                    try {
                      const res = await fetch(`/api/leaderboard?period=${lbPeriod}`);
                      const data = await res.json();
                      setLeaderboard(data.ranking || []);
                    } catch { setLeaderboard([]); }
                    setLbLoading(false);
                  }}
                  className="absolute left-0 top-0 p-2.5 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-all"
                  title="리더보드"
                >
                  <Trophy size={16} strokeWidth={2} />
                </button>
                {/* 설정 버튼 — GUEST 반 제외 */}
                {profile.class !== 'GUEST' && (
                  <button
                    onClick={() => { setShowSettings(true); setPwError(''); setCurrentPw(''); setNewPw(''); }}
                    className="absolute right-0 top-0 p-2.5 rounded-xl bg-accent-light/60 text-accent hover:bg-foreground/10 transition-all"
                    title="비밀번호 설정"
                  >
                    <Settings size={16} strokeWidth={2} />
                  </button>
                )}
                <h2 className="text-3xl font-black text-foreground serif mb-2">{profile.name} 학생</h2>
                <p className="text-[14px] text-accent font-bold tracking-widest">{profile.class}</p>
              </div>

              {/* 리더보드 인라인 패널 */}
              {showLeaderboard && (
                <div className="mb-6 rounded-[2rem] border border-amber-200/60 bg-gradient-to-b from-amber-50/80 to-white overflow-hidden animate-in fade-in duration-300">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-500" />
                      <span className="text-[13px] font-black text-foreground">리더보드</span>
                      <span className="text-[10px] font-bold text-amber-400">전체 반 합산</span>
                    </div>
                    <button onClick={() => setShowLeaderboard(false)} className="text-[18px] leading-none text-accent/40 hover:text-foreground">×</button>
                  </div>
                  {/* 기간 탭 */}
                  <div className="flex gap-1 px-4 pt-3 pb-2">
                    {(['today','week','month'] as const).map(p => (
                      <button key={p}
                        onClick={async () => {
                          setLbPeriod(p); setLbLoading(true);
                          try {
                            const res = await fetch(`/api/leaderboard?period=${p}`);
                            const data = await res.json();
                            setLeaderboard(data.ranking || []);
                          } catch { setLeaderboard([]); }
                          setLbLoading(false);
                        }}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                          lbPeriod === p ? 'bg-amber-400 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}>
                        {p === 'today' ? '오늘' : p === 'week' ? '이번 주' : '이번 달'}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 pb-1 max-h-[280px] overflow-y-auto custom-scrollbar space-y-1.5">
                    {lbLoading ? (
                      Array.from({length:3}).map((_,i) => <div key={i} className="h-10 rounded-xl bg-amber-100/50 animate-pulse" />)
                    ) : leaderboard.length === 0 ? (
                      <p className="text-center py-6 text-[12px] text-accent/40 font-medium">아직 기록이 없어요.</p>
                    ) : leaderboard.map(entry => {
                      const isMe = entry.name === profile.name;
                      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}`;
                      return (
                        <div key={entry.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                          isMe ? 'bg-foreground text-background' : 'bg-white border border-foreground/5'
                        }`}>
                          <span className="text-[14px] w-6 text-center shrink-0">{medal}</span>
                          <span className={`text-[12px] font-black flex-1 truncate ${isMe ? 'text-background' : 'text-foreground'}`}>
                            {(entry as {displayName?: string}).displayName || entry.name}{isMe && ' (나)'}
                          </span>
                          <span className={`text-[11px] font-bold shrink-0 ${isMe ? 'text-background/70' : 'text-accent'}`}>{entry.score}점</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 장학제도 토글 */}
                  <button
                    onClick={() => setShowScholarship(s => !s)}
                    className="w-full flex items-center justify-between px-5 py-3.5 border-t border-amber-100 bg-amber-50/60 hover:bg-amber-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <span className="text-[12px] font-black text-amber-800">딥러닝 장학제도 확인하기</span>
                    </div>
                    <span className={`text-[16px] text-amber-500 transition-transform duration-300 ${showScholarship ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  {/* 장학 내용 */}
                  {showScholarship && (
                    <div className="px-4 pb-5 pt-1 space-y-5 bg-gradient-to-b from-amber-50/40 to-white animate-in fade-in slide-in-from-top-2 duration-300">

                      {/* 점수 안내 */}
                      <div className="bg-white rounded-2xl border border-amber-100 p-4">
                        <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-2">📊 점수 계산</p>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-foreground/40 w-3 mt-0.5">·</span>
                            <p className="text-[11.5px] text-foreground/70 leading-relaxed">통과한 세트의 <strong className="text-foreground">단어 1개 = 1점</strong><br/><span className="text-foreground/50">(뜻고르기·유반의어 모두 각각 집계, One More! 통과도 포함)</span></p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-foreground/40 w-3 mt-0.5">·</span>
                            <p className="text-[11.5px] text-foreground/70 leading-relaxed">Q&amp;A 질문 올리고 <strong className="text-foreground">답변 확인 = +5점</strong></p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-foreground/40 w-3 mt-0.5">·</span>
                            <p className="text-[11.5px] text-foreground/70 leading-relaxed">클리닉 1회 신청 &amp; <strong className="text-foreground">상담 완료 = +10점</strong></p>
                          </div>
                        </div>
                      </div>

                      {/* 월간 리더보드 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Trophy size={13} className="text-amber-500" />
                          <p className="text-[12px] font-black text-foreground">월간 리더보드 장학</p>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">매월 말 지급</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { medal: '🥇', rank: '1위', prize: '문화상품권 3만원', color: 'from-yellow-50 to-yellow-100/60 border-yellow-200' },
                            { medal: '🥈', rank: '2위', prize: '문화상품권 1만원', color: 'from-slate-50 to-slate-100/60 border-slate-200' },
                            { medal: '🥉', rank: '3위', prize: '문화상품권 5천원', color: 'from-orange-50 to-orange-100/60 border-orange-200' },
                          ].map(r => (
                            <div key={r.rank} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r ${r.color} border`}>
                              <span className="text-[18px]">{r.medal}</span>
                              <div className="flex-1">
                                <p className="text-[12px] font-black text-foreground leading-tight">{r.rank}</p>
                                <p className="text-[10.5px] text-foreground/60">{r.prize}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-foreground/40 leading-relaxed px-1">※ 공동 순위 발생 시 해당 상품권 모두 지급</p>
                      </div>

                      <div className="h-[1px] bg-amber-100" />

                      {/* Streak 장학 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-[14px]">🔥</span>
                          <p className="text-[12px] font-black text-foreground">Streak 연속 달성 장학</p>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">달성 익일 즉시 지급</span>
                        </div>
                        <div className="bg-white rounded-xl border border-amber-100 p-3 mb-2.5 text-[11px] text-foreground/60 leading-relaxed">
                          <strong className="text-foreground">달성 기준:</strong> 주 2일 쉬어도 Streak 유지.<br/>매일 2세트 이상 통과하면 자정마다 <strong className="text-foreground">+1일</strong> 적립!
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { days: '30일', prize: '문화상품권 1만원',   star: '⭐' },
                            { days: '60일', prize: '문화상품권 3만원',   star: '⭐⭐' },
                            { days: '90일', prize: '문화상품권 5만원',   star: '⭐⭐⭐' },
                            { days: '120일', prize: '문화상품권 10만원', star: '🏅' },
                            { days: '180일', prize: '수강료 1개월 면제 or 상품권 15만원', star: '🏆' },
                          ].map(s => (
                            <div key={s.days} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-100">
                              <span className="text-[15px] shrink-0">{s.star}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-black text-foreground">{s.days} 연속</span>
                                <span className="text-[10.5px] text-foreground/55 block leading-tight">{s.prize}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-[10px] text-foreground/35 text-center leading-relaxed">
                        Streak 장학금은 <strong className="text-foreground">달성 익일 즉시 지급</strong>,<br/>
                        월간 리더보드는 매월 말 일괄 지급됩니다.<br/>
                        자세한 사항은 선생님께 문의해주세요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI 격려/피드백 */}
              <div className="mb-4 px-5 py-4 bg-foreground rounded-[1.5rem] text-background">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-background/20 flex items-center justify-center">
                    <Bot size={13} className="text-background" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">Parallax AI 어드바이스</span>
                </div>
                <p className="text-[14px] font-medium leading-relaxed opacity-90">{advice || "학습 데이터를 분석 중이에요..."}</p>
              </div>

              {/* 스트릭 카드 */}
              <div className="mb-4 px-5 py-4 rounded-[1.5rem] border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">🔥 STUDY STREAK</p>
                    <p className="text-[22px] font-black text-orange-600">{streak}일 연속</p>
                    <p className="text-[11px] font-bold text-orange-400 mt-0.5">{getStreakMessage(profile.name, streak)}</p>
                  </div>
                  <div className="text-[48px] leading-none select-none">
                    {streak === 0 ? '👀' : streak <= 3 ? '🔥' : streak <= 7 ? '🔥🔥' : streak <= 14 ? '🔥🔥🔥' : '🔥🔥🔥🔥'}
                  </div>
                </div>
                <div className="mt-3 text-[9px] text-orange-400 font-bold">* 주당 최대 2일 휴식 가능 • 일요일~토요일 1주 기준</div>
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

      {/* ── 비밀번호 변경 입력 모달 ── */}
      {showSettings && profile.class !== 'GUEST' && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => { setShowSettings(false); setPwError(''); setNicknameMsg(''); }} />
          <div className="relative w-full max-w-sm bg-background rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[18px] font-black text-foreground text-center mb-6">개인 설정</h3>

            {/* 닉네임 설정 */}
            <div className="mb-6">
              <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">🌟 닉네임</p>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder="리더보드에 표시될 닉네임"
                  maxLength={12}
                  className="flex-1 min-w-0 h-12 pl-4 pr-3 rounded-xl border border-foreground/10 bg-white text-[14px] font-bold outline-none focus:border-foreground/30 transition-colors"
                />
                <button
                  onClick={handleNicknameSave}
                  disabled={nicknameSaving}
                  className="w-12 h-12 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40"
                >
                  {nicknameSaving
                    ? <span className="text-[11px] font-black">...</span>
                    : <Check size={18} strokeWidth={3} />}
                </button>
              </div>
              {nicknameMsg && (
                <p className={`text-[11px] font-bold mt-2 px-1 ${nicknameMsg.includes('실패') ? 'text-red-500' : 'text-emerald-500'}`}>{nicknameMsg}</p>
              )}
              <p className="text-[10px] text-accent/50 mt-1.5 px-1">닉네임이 없으면 이름(실명)으로 표시됨 • 최대 12자</p>
            </div>

            <div className="h-px bg-foreground/10 my-2" />

            {/* 비밀번호 변경 */}
            <div className="mt-5">
              <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">🔒 비밀번호 변경</p>
              <div className="space-y-3">
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
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handlePwConfirm}
                  className="flex-1 h-12 bg-foreground text-background rounded-2xl font-black text-[14px] hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  확인
                </button>
                <button
                  onClick={() => { setShowSettings(false); setPwError(''); setCurrentPw(''); setNewPw(''); }}
                  className="flex-1 h-12 border border-foreground/10 text-accent rounded-2xl font-black text-[14px] hover:bg-foreground/5 transition-all"
                >
                  취소
                </button>
              </div>
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
