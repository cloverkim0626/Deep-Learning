/**
 * Phase 4: Dark theme for weekly grid + table headers/cells
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let content = readFileSync(filePath, 'utf8');

// ── Patch 1: Table header student column - dark bg ────────────────────────────
content = content.replace(
  `className="sticky left-0 z-30 bg-background border-b border-r border-foreground/10 px-2 py-2 text-left min-w-[80px] max-w-[100px]">`,
  `className="sticky left-0 z-30 border-b border-r px-2 py-2 text-left min-w-[80px] max-w-[100px]" style={{background: '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}>`,
);

// ── Patch 2: Date column headers - dark theme ─────────────────────────────────
content = content.replace(
  `className={\`border-b border-r border-foreground/10 px-2 py-2 min-w-[140px] \${today ? 'bg-foreground/4' : 'bg-background'}\`}>`,
  `className="border-b border-r px-2 py-2 min-w-[140px]" style={{background: today ? 'rgba(99,102,241,0.08)' : '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}>`
);

// ── Patch 3: Student name cell - dark bg ───────────────────────────────────────
content = content.replace(
  `className="sticky left-0 bg-background border-b border-r border-foreground/8 px-2 py-1.5 z-10 min-w-[80px] max-w-[100px]"
                        style={{ background: si % 2 === 0 ? undefined : 'hsl(var(--foreground)/0.015)' }}>`,
  `className="sticky left-0 border-b border-r px-2 py-1.5 z-10 min-w-[80px] max-w-[100px]"
                        style={{ background: si % 2 === 0 ? '#0d0f14' : '#0f1117', borderColor: 'rgba(255,255,255,0.06)' }}>`
);

// ── Patch 4: Data cells - dark alternating rows ────────────────────────────────
content = content.replace(
  `className={\`border-b border-r border-foreground/8 px-1.5 py-1 align-top \${isToday(col.date) ? 'bg-foreground/3' : ''}\`}>`,
  `className="border-b border-r px-1.5 py-1 align-top" style={{borderColor: 'rgba(255,255,255,0.05)', background: isToday(col.date) ? 'rgba(99,102,241,0.05)' : (si % 2 === 0 ? '#0d0f14' : '#0f1117')}}>`,
);

// ── Patch 5: Header row container ─────────────────────────────────────────────
content = content.replace(
  `<thead className="sticky top-0 z-20">`,
  `<thead className="sticky top-0 z-20" style={{background: '#0d0f14'}}>`
);

// ── Patch 6: Lesson notes row ─────────────────────────────────────────────────
content = content.replace(
  `<tr className="bg-foreground/3">
                    <td className="sticky left-0 bg-foreground/5 border-t border-b border-r border-foreground/10 px-4 py-2 z-10">`,
  `<tr>
                    <td className="sticky left-0 border-t border-b border-r px-4 py-2 z-10" style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.08)'}}>`
);

content = content.replace(
  `<td key={col.date} className="border-t border-b border-r border-foreground/8 px-2 py-2 align-top">`,
  `<td key={col.date} className="border-t border-b border-r px-2 py-2 align-top" style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.07)'}}>`
);

// ── Patch 7: Lesson note textarea ─────────────────────────────────────────────
content = content.replace(
  `className="w-full px-2 py-1.5 rounded-lg border border-foreground/10 bg-background text-[10px] outline-none focus:border-foreground/30 resize-none"`,
  `className="w-full px-2 py-1.5 rounded-lg border border-white/8 bg-white/3 text-[10px] outline-none focus:border-white/20 resize-none text-white/60"`
);

// ── Patch 8: Header area ───────────────────────────────────────────────────────
content = content.replace(
  `<div className={\`px-6 py-4 border-b border-foreground/10 glass shrink-0\`}>`,
  `<div className="px-5 py-3 border-b shrink-0" style={{borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,12,18,0.8)'}}>`,
);

// ── Patch 9: Week nav bar ──────────────────────────────────────────────────────
content = content.replace(
  `<div className="px-6 py-2 border-b border-foreground/8 flex items-center justify-between shrink-0 bg-foreground/2">`,
  `<div className="px-5 py-2 border-b flex items-center justify-between shrink-0" style={{borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,10,14,0.6)'}}>`,
);

// ── Patch 10: Table container ────────────────────────────────────────────────
content = content.replace(
  `<div className="flex-1 overflow-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0">`,
  `<div className="flex-1 overflow-auto custom-scrollbar" style={{background: '#0d0f14'}}>
              <table className="min-w-full border-separate border-spacing-0">`,
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Phase 4 dark theme patches applied');
