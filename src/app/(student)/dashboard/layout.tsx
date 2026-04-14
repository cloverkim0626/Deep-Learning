"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, PenTool, Bot, MessageCircle, CalendarPlus, Bell, X, ChevronRight, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

// Initializing with empty or fresh states to avoid "weird old records"
const INITIAL_NOTIFICATIONS: any[] = [];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFICATIONS);
  
  // Real session state
  const [profile, setProfile] = useState({
    name: "학생",
    class: "소속 반 없음",
    stats: [
      { label: "오늘의 학습", value: "0분" },
      { label: "어휘 성취도", value: "0%" },
      { label: "AI 튜터 대화", value: "0회" },
      { label: "클리닉 접수", value: "0건" },
    ]
  });

  useEffect(() => {
    // Read session from localStorage
    const saved = localStorage.getItem("stu_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setProfile(prev => ({
          ...prev,
          name: data.name || "학생",
          class: data.class || "소속 반 없음"
        }));
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
  }, []);

  const unreadCount = notifs.filter(n => n.unread).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })));

  const handleLogout = () => {
    localStorage.removeItem("stu_session");
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.1)] bg-background overflow-hidden border-x border-foreground/5">

      {/* Top Header - Fixed/Sticky */}
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
            {unreadCount > 0 ? (
              <button onClick={markAllRead} className="text-[11px] font-bold text-accent hover:text-foreground">모두 읽음</button>
            ) : null}
          </div>
          <div className="max-h-[300px] overflow-y-auto py-2">
            {notifs.length > 0 ? notifs.map(n => (
              <Link key={n.id} href={n.link} onClick={() => setShowNotif(false)}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-accent-light transition-colors ${n.unread ? "bg-accent-light/40" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.unread ? "bg-error" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-snug">{n.text}</p>
                  <p className="text-[11px] text-accent mt-1">{n.sub}</p>
                </div>
              </Link>
            )) : (
              <div className="px-6 py-12 text-center text-[13px] text-accent/50 font-medium italic">신규 알림이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* Profile/Stats Panel (Simplified) */}
      {showProfile && (
        <div className="absolute inset-0 z-50 flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" onClick={() => setShowProfile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[3rem] shadow-[0_-24px_60px_rgba(0,0,0,0.2)] overflow-y-auto max-h-[90vh] custom-scrollbar animate-in slide-in-from-bottom duration-700">
            <div className="flex justify-center pt-6 pb-2">
              <div className="w-14 h-1.5 rounded-full bg-foreground/10" />
            </div>
            <div className="px-8 pb-12">
              <div className="text-center mb-10 mt-6">
                  <h2 className="text-3xl font-black text-foreground serif mb-2">{profile.name} 학생</h2>
                  <p className="text-[14px] text-accent font-bold tracking-widest">{profile.class}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {profile.stats.map(s => (
                  <div key={s.label} className="bg-white border border-foreground/5 rounded-[2rem] px-6 py-5 shadow-sm">
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.15em] mb-2">{s.label}</p>
                    <p className="text-[22px] font-black text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleLogout} className="w-full h-16 rounded-[2rem] bg-error/10 text-error font-black text-[14px] flex items-center justify-center gap-2 hover:bg-error hover:text-white transition-all">
                <LogOut size={18} strokeWidth={3} /> 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full pb-[100px] bg-background">
        {children}
      </main>

      {/* Bottom Navigation - Fixed */}
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
