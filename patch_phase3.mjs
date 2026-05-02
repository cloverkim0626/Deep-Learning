/**
 * Phase 3: Fix TestSessionModal absent reason + rollover date + design improvements
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let content = readFileSync(filePath, 'utf8');

// ── Patch 1: Extend TestEntry type with absentReason and rolloverDate ──────────
const oldTestEntry = `// ─── 테스트 세션 모달 (칼럼헤더 테스트 버튼) ─────────────────────────────────
type TestEntry = { score: string; isPass: boolean | null; absent: boolean };`;

const newTestEntry = `// ─── 테스트 세션 모달 (칼럼헤더 테스트 버튼) ─────────────────────────────────
type TestEntry = { score: string; isPass: boolean | null; absent: boolean; absentReason: string; rolloverDate: string };`;

if (content.includes(oldTestEntry)) {
  content = content.replace(oldTestEntry, newTestEntry);
  console.log('✅ Patch 1: TestEntry type extended');
} else {
  console.log('❌ Patch 1 not found');
}

// ── Patch 2: Initialize TestEntry with absentReason and rolloverDate ──────────
const oldInitEntry = `      init[s.student_name] = { score: c?.score?.toString() || '', isPass: c?.is_pass ?? null, absent: c?.status === 'skipped' };`;
const newInitEntry = `      init[s.student_name] = { score: c?.score?.toString() || '', isPass: c?.is_pass ?? null, absent: c?.status === 'skipped', absentReason: c?.delay_reason || '결석', rolloverDate: c?.rollover_date || '' };`;

if (content.includes(oldInitEntry)) {
  content = content.replace(oldInitEntry, newInitEntry);
  console.log('✅ Patch 2: TestEntry init');
} else {
  console.log('❌ Patch 2 not found');
}

// ── Patch 3: handleSave - include absentReason and rolloverDate ────────────────
const oldSavePayload = `        const payload = {
          slot_id: slot!.id, student_name: s.student_name, status,
          score: !e.absent && e.score ? Number(e.score) : null,
          is_pass: e.absent ? null : (isPF ? e.isPass : autoPass),
        };`;
const newSavePayload = `        const payload = {
          slot_id: slot!.id, student_name: s.student_name, status,
          score: !e.absent && e.score ? Number(e.score) : null,
          is_pass: e.absent ? null : (isPF ? e.isPass : autoPass),
          delay_reason: e.absent ? e.absentReason : null,
          rollover_date: e.absent && e.rolloverDate ? e.rolloverDate : null,
        };`;

if (content.includes(oldSavePayload)) {
  content = content.replace(oldSavePayload, newSavePayload);
  console.log('✅ Patch 3: handleSave absent reason/rollover');
} else {
  console.log('❌ Patch 3 not found');
}

// ── Patch 4: Replace absent UI in TestSessionModal tab content ────────────────
const oldAbsentUI = `            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={curEntry.absent} onChange={e => updateEntry(curStudent.student_name, { absent: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-[12px] font-bold text-rose-600">미응시</span>
            </label>
            {!curEntry.absent && (`;

const newAbsentUI = `            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={curEntry.absent} onChange={e => updateEntry(curStudent.student_name, { absent: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-[12px] font-bold text-rose-600">미응시</span>
            </label>
            {curEntry.absent && (
              <div className="space-y-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">미응시 사유</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['결석', '미암기', '기타'] as const).map(r => (
                    <button key={r} onClick={() => updateEntry(curStudent.student_name, { absentReason: r })}
                      className={\`py-1.5 rounded-lg text-[11px] font-black border-2 transition-all \${curEntry.absentReason === r ? 'bg-rose-500 text-white border-rose-500' : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/20'}\`}>
                      {r}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-[9px] font-black text-rose-400/70 mb-1">연기 일자 (선택)</p>
                  <input type="date" value={curEntry.rolloverDate} onChange={e => updateEntry(curStudent.student_name, { rolloverDate: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-rose-500/20 bg-transparent text-[12px] outline-none" />
                </div>
              </div>
            )}
            {!curEntry.absent && (`;

if (content.includes(oldAbsentUI)) {
  content = content.replace(oldAbsentUI, newAbsentUI);
  console.log('✅ Patch 4: absent UI in TestSessionModal');
} else {
  console.log('❌ Patch 4 not found');
}

// ── Patch 5: Global design - improve overall look ─────────────────────────────
// Make the overall page background better, style the nav
const oldWeekNav = `          <div className="px-6 py-3 border-b border-foreground/5 flex items-center justify-between shrink-0 bg-accent-light/10">`;
const newWeekNav = `          <div className="px-6 py-2 border-b border-foreground/8 flex items-center justify-between shrink-0 bg-foreground/2">`;

if (content.includes(oldWeekNav)) {
  content = content.replace(oldWeekNav, newWeekNav);
  console.log('✅ Patch 5: week nav bg');
}

// ── Patch 6: Improve test session modal design ────────────────────────────────
const oldTestModalBg = `      <div className="glass w-full max-w-lg max-h-[90vh] rounded-3xl border border-blue-200 shadow-2xl flex flex-col">`;
const newTestModalBg = `      <div className="glass w-full max-w-lg max-h-[90vh] rounded-3xl border border-blue-500/20 shadow-2xl flex flex-col" style={{background: 'hsl(220 20% 10%)'}}>`;

if (content.includes(oldTestModalBg)) {
  content = content.replace(oldTestModalBg, newTestModalBg);
  console.log('✅ Patch 6: test modal dark bg');
}

// ── Patch 7: Make test modal score input dark ─────────────────────────────────
const oldScoreInput = `                    className="w-28 h-12 px-3 rounded-xl border border-blue-200 bg-white text-[18px] font-black outline-none text-center" />`;
const newScoreInput = `                    className="w-28 h-12 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-[18px] font-black outline-none text-center text-blue-200" />`;

if (content.includes(oldScoreInput)) {
  content = content.replace(oldScoreInput, newScoreInput);
  console.log('✅ Patch 7: test modal score input dark');
}

// ── Patch 8: Make test modal setting inputs dark ──────────────────────────────
content = content.replace(
  `className="w-full h-9 px-3 rounded-xl border border-blue-200 bg-white text-[13px] font-bold outline-none" />`,
  `className="w-full h-9 px-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-[13px] font-bold outline-none text-blue-200" />`
);

content = content.replace(
  `className="w-20 h-8 px-2 rounded-xl border border-blue-200 bg-white text-[12px] outline-none text-center" />`,
  `className="w-20 h-8 px-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-[12px] outline-none text-center text-blue-200" />`
);

console.log('✅ Patch 8: test modal dark inputs');

writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Phase 3 patches applied');
