"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, BookOpen, MessageSquare, LogOut, BarChart2, MessageCircle, PenTool, GraduationCap } from "lucide-react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-foreground/10 glass framer-card hidden md:flex flex-col z-20">
        <div className="h-24 flex items-center px-8 border-b border-foreground/5 shrink-0">
          <Link href="/" className="font-serif text-xl font-bold tracking-tight text-foreground flex flex-col">
            Deep Learning
            <span className="text-[10px] font-sans font-bold tracking-widest text-accent uppercase mt-1">Team Parallax Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-6 flex flex-col gap-2">
           <Link href="/admin/dashboard/classes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-foreground/70 hover:text-foreground hover:bg-accent-light transition-all">
             <GraduationCap size={18} strokeWidth={1.5} /> 수업 관리
           </Link>
           <Link href="/admin/dashboard/students" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-foreground/70 hover:text-foreground hover:bg-accent-light transition-all">
             <Users size={18} strokeWidth={1.5} /> 수강생 관리
           </Link>
           <Link href="/admin/dashboard/content" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-accent hover:text-foreground hover:bg-accent-light transition-all">
             <BookOpen size={18} strokeWidth={1.5} /> 교재/콘텐츠 관리
           </Link>
           <Link href="/admin/dashboard/clinic" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-accent hover:text-foreground hover:bg-accent-light transition-all">
             <MessageSquare size={18} strokeWidth={1.5} /> 클리닉 대기 관리
           </Link>
           <Link href="/admin/dashboard/progress" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-accent hover:text-foreground hover:bg-accent-light transition-all">
             <BarChart2 size={18} strokeWidth={1.5} /> 학습 현황 분석
           </Link>
           <Link href="/admin/dashboard/qna" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-accent hover:text-foreground hover:bg-accent-light transition-all">
             <MessageCircle size={18} strokeWidth={1.5} /> Q&amp;A 답변 관리
           </Link>
           <Link href="/admin/dashboard/essay-prompts" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-accent hover:text-foreground hover:bg-accent-light transition-all">
             <PenTool size={18} strokeWidth={1.5} /> 프롬프트 관리
           </Link>
        </nav>
        <div className="p-6 border-t border-foreground/5 shrink-0">
           <button
             onClick={handleLogout}
             className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[14px] font-semibold text-error/80 hover:text-error hover:bg-error/5 transition-all"
           >
             <LogOut size={18} strokeWidth={1.5} /> 로그아웃
           </button>
           <p className="text-[9px] font-bold tracking-[0.2em] text-foreground/20 uppercase mt-4 px-1 select-none">
             Provided by Team Parallax
           </p>
        </div>
      </aside>

      <main className="flex-1 max-w-full overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-foreground/10 flex items-center px-6 justify-between shrink-0 glass z-10">
          <span className="font-serif text-lg font-bold text-foreground">Deep Learning</span>
          <button onClick={handleLogout} className="text-error p-2">
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
