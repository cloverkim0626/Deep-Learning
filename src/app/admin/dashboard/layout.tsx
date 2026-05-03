"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, BookOpen, MessageSquare, LogOut, BarChart2, MessageCircle, PenTool, GraduationCap, Bell, FileText, ClipboardList } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard/classes",       icon: GraduationCap, label: "수업 관리" },
  { href: "/admin/dashboard/students",      icon: Users,          label: "수강생 관리" },
  { href: "/admin/dashboard/content",       icon: BookOpen,       label: "교재/콘텐츠" },
  { href: "/admin/dashboard/clinic",        icon: MessageSquare,  label: "클리닉 대기" },
  { href: "/admin/dashboard/progress",      icon: BarChart2,      label: "학습 분석" },
  { href: "/admin/dashboard/qna",           icon: MessageCircle,  label: "Q&A 관리" },
  { href: "/admin/dashboard/notices",       icon: Bell,           label: "학부모 공지" },
  { href: "/admin/dashboard/reports",       icon: FileText,       label: "일간 리포트" },
  { href: "/admin/dashboard/essay-prompts",   icon: PenTool,        label: "프롬프트" },
  { href: "/admin/dashboard/consultations",   icon: ClipboardList,  label: "상담 신청" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f1f5f9', color: '#1e293b' }}>
      {/* Admin Sidebar - dark professional */}
      <aside className="w-56 border-r flex-col z-20 hidden md:flex shrink-0"
        style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b shrink-0"
          style={{ borderColor: '#f1f5f9' }}>
          <div>
            <p className="text-[14px] font-bold text-slate-800 tracking-tight">Deep Learning</p>
            <p className="text-[9px] font-bold tracking-widest uppercase mt-0.5" style={{ color: '#6366f1' }}>Team Parallax</p>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                style={{
                  background: active ? '#eef2ff' : 'transparent',
                  color: active ? '#4f46e5' : '#475569',
                  borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
                }}>
                <Icon size={15} strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? '#4f46e5' : '#94a3b8' }} />
                {label}
              </Link>
            );
          })}
        </nav>
        {/* Logout */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[12px] font-bold transition-all"
            style={{ color: '#ef4444' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <LogOut size={15} strokeWidth={1.8} />
            로그아웃
          </button>
          <p className="text-[8px] font-bold tracking-[0.2em] uppercase mt-3 px-1 select-none" style={{ color: '#cbd5e1' }}>
            Team Parallax © 2026
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col" style={{ background: '#f1f5f9' }}>
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b flex items-center px-5 justify-between shrink-0"
          style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
          <span className="text-[14px] font-bold text-slate-800">Deep Learning</span>
          <button onClick={handleLogout} style={{ color: '#ef4444' }}>
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto relative custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
