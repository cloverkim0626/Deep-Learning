"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PenTool, Bot, MessageCircle, CalendarPlus, Bell, X, ChevronRight } from "lucide-react";
import { useState } from "react";

const NOTIFICATIONS = [
  { id: "n1", text: "선생님이 Q&A 질문에 답변을 등록했습니다.", sub: "S10 계속적 용법 질문 → 답변 완료", time: "방금", unread: true, link: "/dashboard/qna" },
  { id: "n2", text: "새 단어 세트가 배당되었습니다.", sub: "수능완성 3강 — 멀티태스킹 환상 (5단어)", time: "1시간 전", unread: true, link: "/dashboard" },
];

const STUDENT_PROFILE = {
  name: "김가연", class: "고3 수능특강 (금토반)",
  stats: [
    { label: "총 학습 세션", value: "12회" },
    { label: "어휘 습득", value: "34 / 60" },
    { label: "AI 튜터 대화", value: "8회" },
    { label: "클리닉 접수", value: "2건" },
  ],
  recentErrors: [
    { code: "E08", label: "접속사 오류", count: 5 },
    { code: "E04", label: "관계대명사", count: 4 },
    { code: "E02", label: "수일치", count: 2 },
  ],
  testHistory: [
    { set: "수능특강 1강", score: "8/10", date: "04.13" },
    { set: "수능특강 12강", score: "6/10", date: "04.12" },
  ]
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);

  const unreadCount = notifs.filter(n => n.unread).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, unread: false })));

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto relative shadow-[0_0_40px_rgba(0,0,0,0.1)] bg-background overflow-hidden border-x border-white/20 dark:border-white/5">

      {/* Top Header - Fixed/Sticky */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-foreground/5 bg-background/90 backdrop-blur-md z-30 shrink-0 sticky top-0">
        <div className="font-bold text-lg tracking-tight text-foreground flex items-center gap-2 serif">
          <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center shadow-md">
            <BookOpen size={16} />
          </div>
          Deep Learning
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent-light transition-colors"
          >
            <Bell className="text-foreground/60 w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-error text-background text-[9px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center text-[13px] font-black shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            {STUDENT_PROFILE.name[0]}
          </button>
        </div>
      </header>

      {/* Notification Dropdown */}
      {showNotif && (
        <div className="absolute top-[64px] right-4 w-[calc(100%-32px)] bg-background border border-foreground/10 rounded-[1.5rem] shadow-[0_16px_48px_rgba(0,0,0,0.12)] z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/5">
            <span className="text-[13px] font-bold text-foreground">알림</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-bold text-accent hover:text-foreground transition-colors">모두 읽음</button>
            )}
          </div>
          {notifs.map(n => (
            <Link key={n.id} href={n.link} onClick={() => setShowNotif(false)}
              className={`flex items-start gap-3 px-5 py-4 border-b border-foreground/5 last:border-0 hover:bg-accent-light transition-colors ${n.unread ? "bg-accent-light/60" : ""}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? "bg-error" : "bg-transparent"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-snug">{n.text}</p>
                <p className="text-[11px] text-accent mt-0.5">{n.sub}</p>
              </div>
              <span className="text-[10px] text-accent shrink-0 mt-0.5">{n.time}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Profile Panel */}
      {showProfile && (
        <div className="absolute inset-0 z-50 flex flex-col animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[2.5rem] shadow-[0_-16px_48px_rgba(0,0,0,0.15)] overflow-y-auto max-h-[85vh] custom-scrollbar animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-center pt-5 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-foreground/10" />
            </div>
            <div className="px-7 pb-10">
              <div className="flex items-center gap-5 mb-8 mt-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center text-2xl font-black shadow-xl">
                  {STUDENT_PROFILE.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground serif">{STUDENT_PROFILE.name}</h2>
                  <p className="text-[13px] text-accent font-bold mt-1 tracking-wider text-error">{STUDENT_PROFILE.class}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {STUDENT_PROFILE.stats.map(s => (
                  <div key={s.label} className="bg-accent-light rounded-[1.5rem] px-5 py-4 border border-foreground/5 shadow-inner">
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.1em]">{s.label}</p>
                    <p className="text-[20px] font-black text-foreground mt-1.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full pb-24 bg-background scroll-smooth">
        {children}
      </main>

      {/* Bottom Navigation - Fixed/Sticky */}
      <nav className="shrink-0 w-full h-[80px] bg-background/90 backdrop-blur-2xl border-t border-foreground/5 flex items-center justify-around z-30 px-3 pb-safe sticky bottom-0">
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
    <Link href={href} className="flex flex-col items-center justify-center flex-1 h-full gap-1 group relative">
      <div className={`transition-all duration-500 relative z-10 ${isActive ? "text-foreground -translate-y-1.5 scale-110" : "text-foreground/30 group-hover:text-foreground/80 group-hover:-translate-y-0.5"}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black tracking-tighter transition-all duration-500 z-10 ${isActive ? "text-foreground" : "text-foreground/30 group-hover:text-foreground/80"}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute inset-x-2 bottom-1.5 h-1.5 bg-foreground/5 rounded-full blur-md animate-pulse" />
      )}
    </Link>
  );
}
