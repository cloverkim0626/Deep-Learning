/**
 * Comprehensive patch script for classes/[id]/page.tsx
 * Applies all weekly status improvements
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let content = readFileSync(filePath, 'utf8');

// ── 1. Replace ATT_STYLE and ATT_LABEL with modern design ─────────────────────
// Modern dark styling instead of pastel
content = content.replace(
  /const ATT_STYLE: Record<AttendanceStatus, string> = \{[\s\S]*?\};/,
  `const ATT_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black",
  late:    "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black",
  absent:  "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black",
};`
);

// ── 2. Replace ATT_LABEL and add ATT_SHORT ─────────────────────────────────────
content = content.replace(
  /const ATT_LABEL: Record<AttendanceStatus, string> = \{[\s\S]*?\};/,
  `const ATT_LABEL: Record<AttendanceStatus, string> = {
  present: "출석", late: "지각", absent: "결석",
};
const ATT_SHORT: Record<AttendanceStatus, string> = {
  present: "출", late: "지", absent: "결",
};`
);

// ── 3. Fix HomeworkModal: replace HW_TYPE_LABEL usage ─────────────────────────
content = content.replace(
  /<p className="text\[9px\] text-accent">\{HW_TYPE_DISPLAY\[slot\.hw_type\]\}<\/p>/,
  `<p className="text-[9px] text-accent">{HW_TYPE_LABEL[slot.hw_type] ?? slot.hw_type}</p>`
);

// ── 4. Fix AddHomeworkModal HW_COLORS to add test_prep ────────────────────────
content = content.replace(
  /const HW_COLORS: Record<string, string> = \{[\s\S]*?\};/,
  `const HW_COLORS: Record<string, string> = {
    general: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    passage_read: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    test_prep: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    other: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };`
);

// ── 5. Update color palette (C object) to modern dark design ──────────────────
content = content.replace(
  /const C: Record<string, \{ bg: string; text: string; border: string; badge: string; light: string \}> = \{[\s\S]*?\};/,
  `const C: Record<string, { bg: string; text: string; border: string; badge: string; light: string }> = {
  indigo: { bg: "bg-indigo-950/30", text: "text-indigo-400", border: "border-indigo-500/30", badge: "bg-indigo-500", light: "bg-indigo-500/10" },
  rose:   { bg: "bg-rose-950/30",   text: "text-rose-400",   border: "border-rose-500/30",   badge: "bg-rose-500",   light: "bg-rose-500/10"   },
  teal:   { bg: "bg-teal-950/30",   text: "text-teal-400",   border: "border-teal-500/30",   badge: "bg-teal-500",   light: "bg-teal-500/10"   },
  amber:  { bg: "bg-amber-950/30",  text: "text-amber-400",  border: "border-amber-500/30",  badge: "bg-amber-500",  light: "bg-amber-500/10"  },
  violet: { bg: "bg-violet-950/30", text: "text-violet-400", border: "border-violet-500/30", badge: "bg-violet-500", light: "bg-violet-500/10" },
};`
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Phase 1 patches applied');
