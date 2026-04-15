"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, PenTool, Bot, MessageCircle, CalendarPlus, Bell, LogOut, Volume2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getClinicQueue, getTestSessionsByStudent } from "@/lib/database-service";
import { getAssignmentsByStudent } from "@/lib/assignment-service";

const INITIAL_NOTIFICATIONS: { id: string; text: string; sub: string; unread: boolean; link: string }[] = [];

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
  const [notifs] = useState(INITIAL_NOTIFICATIONS);

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

      // Remaining tests = sets not yet tested
      const testedSetIds = new Set((sessions as { set_id?: string }[]).map(s => s.set_id).filter(Boolean));
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
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
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
            <div className="px-6 py-12 text-center text-[13px] text-accent/50 font-medium italic">신규 알림이 없습니다.</div>
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
              <div className="text-center mb-8 mt-6">
                <h2 className="text-3xl font-black text-foreground serif mb-2">{profile.name} 학생</h2>
                <p className="text-[14px] text-accent font-bold tracking-widest">{profile.class}</p>
              </div>

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

              {/* TTS demo */}
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    const u = new SpeechSynthesisUtterance("Keep up the great work!");
                    u.lang = "en-US"; u.rate = 0.85;
                    window.speechSynthesis.speak(u);
                  }
                }}
                className="w-full h-12 rounded-2xl border border-foreground/10 flex items-center justify-center gap-2 text-[13px] font-bold text-accent hover:bg-foreground/5 transition-all mb-4"
              >
                <Volume2 size={16} /> 영어 발음 듣기 테스트
              </button>

              <button onClick={handleLogout} className="w-full h-14 rounded-[2rem] bg-error/10 text-error font-black text-[14px] flex items-center justify-center gap-2 hover:bg-error hover:text-white transition-all">
                <LogOut size={18} strokeWidth={3} /> 로그아웃
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
