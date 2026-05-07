"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Users, BookOpen, MessageSquare, LogOut, BarChart2, MessageCircle,
  PenTool, GraduationCap, Bell, FileText, ClipboardList,
  ChevronDown, Database, Layers, Activity,
} from "lucide-react";

type NavItem = { href: string; label: string; icon?: React.ElementType; disabled?: boolean };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "myclass",
    label: "My Class",
    icon: GraduationCap,
    items: [
      { href: "/admin/dashboard/classes",  label: "수업 관리",   icon: Layers },
      { href: "/admin/dashboard/students", label: "수강생 관리", icon: Users },
    ],
  },
  {
    id: "contents",
    label: "Contents",
    icon: BookOpen,
    items: [
      { href: "/admin/dashboard/content",       label: "콘텐츠 DB",  icon: Database },
      { href: "/admin/dashboard/essay-prompts", label: "프롬프트",   icon: PenTool },
      { href: "/admin/dashboard/textbook",      label: "교재 제작",  icon: FileText, disabled: true },
    ],
  },
  {
    id: "communication",
    label: "커뮤니케이션",
    icon: MessageCircle,
    items: [
      { href: "/admin/dashboard/clinic",         label: "클리닉 대기", icon: MessageSquare },
      { href: "/admin/dashboard/qna",            label: "Q&A 관리",   icon: MessageCircle },
      { href: "/admin/dashboard/consultations",  label: "상담 신청",   icon: ClipboardList },
      { href: "/admin/dashboard/notices",        label: "학부모 공지", icon: Bell },
    ],
  },
  {
    id: "analytics",
    label: "학습현황",
    icon: BarChart2,
    items: [
      { href: "/admin/dashboard/progress", label: "학습 분석",  icon: BarChart2 },
      { href: "/admin/dashboard/reports",  label: "일간 리포트", icon: Activity },
    ],
  },
];

function NavGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActive = group.items.some(
    (item) => !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"))
  );
  const [open, setOpen] = useState(isActive);
  const Icon = group.icon;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] transition-all"
        style={{
          color: isActive ? "#18181b" : "#a1a1aa",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <Icon size={12} strokeWidth={1.5} style={{ color: isActive ? "#18181b" : "#d4d4d8" }} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={10} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#d4d4d8" }} />
      </button>

      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const active = !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"));
            const ItemIcon = item.icon;
            return item.disabled ? (
              <div
                key={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px]"
                style={{ color: "#d4d4d8", cursor: "not-allowed" }}
              >
                {ItemIcon && <ItemIcon size={13} strokeWidth={1.5} style={{ color: "#e4e4e7" }} />}
                <span style={{ fontWeight: 400 }}>{item.label}</span>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#f4f4f5", color: "#a1a1aa", fontWeight: 500 }}>
                  soon
                </span>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all"
                style={{
                  background: active ? "#f4f4f5" : "transparent",
                  color: active ? "#18181b" : "#71717a",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? "2px solid #18181b" : "2px solid transparent",
                  paddingLeft: active ? "10px" : "12px",
                }}
              >
                {ItemIcon && (
                  <ItemIcon size={13} strokeWidth={active ? 2 : 1.5}
                    style={{ color: active ? "#18181b" : "#a1a1aa" }} />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex admin-layout" style={{ color: "#18181b" }}>
      {/* Sidebar */}
      <aside className="w-52 flex-col z-20 hidden md:flex shrink-0"
        style={{ borderRight: "1px solid #f0f0f0", background: "#ffffff" }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid #f4f4f5" }}>
          <div>
            <p className="text-[13px] text-zinc-900" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Deep Learning</p>
            <p className="text-[8px] mt-0.5" style={{ color: "#a1a1aa", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Team Parallax
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 flex flex-col overflow-y-auto custom-scrollbar gap-0.5">
          {NAV_GROUPS.map((group) => (
            <NavGroup key={group.id} group={group} pathname={pathname} />
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 shrink-0" style={{ borderTop: "1px solid #f4f4f5" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[12px] transition-all"
            style={{ color: "#ef4444", fontWeight: 400 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={13} strokeWidth={1.5} />
            로그아웃
          </button>
          <p className="text-[8px] mt-3 px-3 select-none" style={{ color: "#e4e4e7", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            © 2026 Team Parallax
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col" style={{ background: "#fafafa" }}>
        {/* Mobile Header */}
        <div className="md:hidden h-14 flex items-center px-5 justify-between shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0", background: "#ffffff" }}>
          <span className="text-[13px] font-semibold text-zinc-900">Deep Learning</span>
          <button onClick={handleLogout} style={{ color: "#ef4444" }}>
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
