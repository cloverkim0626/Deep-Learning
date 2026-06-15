"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Users, BookOpen, MessageSquare, LogOut, BarChart2, MessageCircle,
  PenTool, GraduationCap, Bell, FileText, ClipboardList,
  Database, Layers, Activity, Megaphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type NavItem = {
  href: string; label: string; icon?: React.ElementType;
  disabled?: boolean; newBadgeKey?: string;
};
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
      { href: "/admin/dashboard/clinic",        label: "클리닉 대기", icon: MessageSquare },
      { href: "/admin/dashboard/qna",           label: "Q&A 관리",   icon: MessageCircle, newBadgeKey: "qna" },
      { href: "/admin/dashboard/consultations", label: "상담 내역",   icon: ClipboardList, newBadgeKey: "consultations" },
      { href: "/admin/dashboard/notices",       label: "학부모 공지", icon: Bell },
      { href: "/admin/dashboard/student-notices", label: "학생 공지",   icon: Megaphone },
    ],
  },
  {
    id: "analytics",
    label: "학습현황",
    icon: BarChart2,
    items: [
      { href: "/admin/dashboard/progress", label: "학습 분석",   icon: BarChart2 },
      { href: "/admin/dashboard/reports",  label: "일간 리포트", icon: Activity },
    ],
  },
];

// ── NEW 배지 로직 ─────────────────────────────────────────────────────────────
// localStorage key: `admin_last_seen_<key>` = ISO timestamp
function markSeen(key: string) {
  try { localStorage.setItem(`admin_last_seen_${key}`, new Date().toISOString()); } catch {}
}
function getLastSeen(key: string): Date | null {
  try {
    const v = localStorage.getItem(`admin_last_seen_${key}`);
    return v ? new Date(v) : null;
  } catch { return null; }
}

// ── NavGroup (항상 열린 상태, 계층 구분 표시) ─────────────────────────────────
function NavGroup({
  group, pathname, newBadges,
}: {
  group: NavGroup; pathname: string; newBadges: Record<string, boolean>;
}) {
  const isGroupActive = group.items.some(
    (item) => !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"))
  );
  const Icon = group.icon;

  return (
    <div className="mb-3">
      {/* 그룹 헤더 — 항상 표시, collapse 없음 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 mb-1"
        style={{
          color: isGroupActive ? "#18181b" : "#52525b",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <Icon size={10} strokeWidth={2} style={{ color: isGroupActive ? "#3b82f6" : "#71717a" }} />
        <span>{group.label}</span>
        {/* 그룹에 active 있을 때 보라색 펄스 점 (하위 활성 파랑과 구분) */}
        {isGroupActive && (
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#059669",
              boxShadow: "0 0 0 2px rgba(5,150,105,0.25), 0 0 10px 3px rgba(5,150,105,0.5)",
              animation: "pulse-blue 2s infinite",
              display: "inline-block", marginLeft: 2,
            }}
          />
        )}
      </div>

      {/* 하위 항목들 — 항상 노출 */}
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const active = !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"));
          const ItemIcon = item.icon;
          const hasNew = item.newBadgeKey ? newBadges[item.newBadgeKey] : false;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ color: "#d4d4d8", cursor: "not-allowed", paddingLeft: "20px" }}
              >
                {/* 하위 구분 들여쓰기 표시 */}
                <span style={{ color: "#e4e4e7", fontSize: 10 }}>↳</span>
                {ItemIcon && <ItemIcon size={12} strokeWidth={1.5} style={{ color: "#e4e4e7" }} />}
                <span style={{ fontSize: 12, fontWeight: 400 }}>{item.label}</span>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#f4f4f5", color: "#a1a1aa", fontWeight: 600 }}>
                  soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg transition-all relative"
              style={{
                padding: "6px 12px 6px 20px",
                background: active ? "#f0f7ff" : "transparent",
                color: active ? "#1d4ed8" : "#374151",
                fontWeight: active ? 700 : 500,
                fontSize: 12,
                borderLeft: active ? "2px solid #3b82f6" : "2px solid transparent",
                marginLeft: 2,
              }}
            >
              {/* 하위 항목 들여쓰기 화살표 */}
              <span style={{ color: active ? "#93c5fd" : "#9ca3af", fontSize: 9, flexShrink: 0 }}>↳</span>
              {ItemIcon && (
                <ItemIcon
                  size={12}
                  strokeWidth={active ? 2.5 : 1.5}
                  style={{ color: active ? "#3b82f6" : "#6b7280", flexShrink: 0 }}
                />
              )}
              <span className="flex-1 truncate">{item.label}</span>

              {/* 현재 작업 중 하늘색 펄스 (그룹 보라색과 구분) */}
              {active && (
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: "#1d4ed8",
                    boxShadow: "0 0 0 2px rgba(29,78,216,0.25), 0 0 10px 3px rgba(29,78,216,0.55)",
                    animation: "pulse-blue 1.8s infinite",
                    display: "inline-block",
                  }}
                />
              )}

              {/* NEW 배지 */}
              {hasNew && !active && (
                <span
                  className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: "#ef4444", color: "#fff", letterSpacing: "0.05em" }}
                >
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [newBadges, setNewBadges] = useState<Record<string, boolean>>({});

  // ── NEW 배지 체크 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const checkNew = async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const badges: Record<string, boolean> = {};

      // Q&A
      try {
        const lastSeenQna = getLastSeen("qna");
        const { data: qnaData } = await supabase
          .from("qna_posts")  // 정상: qna_posts (qna_items 아님)
          .select("created_at")
          .gte("created_at", threeDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1);
        if (qnaData && qnaData.length > 0) {
          const newest = new Date(qnaData[0].created_at);
          badges["qna"] = !lastSeenQna || newest > lastSeenQna;
        }
      } catch {}

      // 상담내역 (contact_inquiries)
      try {
        const lastSeenConsult = getLastSeen("consultations");
        const { data: consultData } = await supabase
          .from("contact_inquiries")
          .select("created_at")
          .gte("created_at", threeDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1);
        if (consultData && consultData.length > 0) {
          const newest = new Date(consultData[0].created_at);
          badges["consultations"] = !lastSeenConsult || newest > lastSeenConsult;
        }
      } catch {}

      setNewBadges(badges);
    };

    checkNew();
  }, [pathname]);

  // ── 페이지 진입 시 해당 배지 자동 소멸 ──────────────────────────────────────
  useEffect(() => {
    if (pathname.startsWith("/admin/dashboard/qna")) {
      markSeen("qna");
      setNewBadges(prev => ({ ...prev, qna: false }));
    }
    if (pathname.startsWith("/admin/dashboard/consultations")) {
      markSeen("consultations");
      setNewBadges(prev => ({ ...prev, consultations: false }));
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex admin-layout" style={{ color: "#18181b" }}>
      {/* pulse-blue 애니메이션 */}
      <style>{`
        @keyframes pulse-blue {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(59,130,246,0.2), 0 0 6px 2px rgba(59,130,246,0.3); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(59,130,246,0.1), 0 0 12px 4px rgba(59,130,246,0.5); }
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className="w-52 flex-col z-20 hidden md:flex shrink-0"
        style={{ borderRight: "1px solid #f0f0f0", background: "#ffffff" }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid #f4f4f5" }}>
          <div>
            <p className="text-[13px] text-zinc-900" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>Deep Learning</p>
            <p className="text-[8px] mt-0.5" style={{ color: "#a1a1aa", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Team Parallax
            </p>
          </div>
        </div>

        {/* Nav — 모든 그룹 항상 열림 */}
        <nav className="flex-1 px-2 py-4 flex flex-col overflow-y-auto custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <NavGroup key={group.id} group={group} pathname={pathname} newBadges={newBadges} />
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
        <div
          className="md:hidden h-14 flex items-center px-5 justify-between shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0", background: "#ffffff" }}
        >
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
