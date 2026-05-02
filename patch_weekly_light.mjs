/**
 * 주간현황 그리드 라이트 테마 패치
 * 모든 #0d0f14, #0f1117, #080a0e 등 다크 배경 → 흰색/슬레이트 계열로 교체
 */
import { readFileSync, writeFileSync } from 'fs';

const file = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let c = readFileSync(file, 'utf8');

// [찾을 문자열, 바꿀 문자열] 쌍 목록
const subs = [
  // ── 주간 네비게이션 바 배경 ──
  [`borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,10,14,0.6)'`,
   `borderColor: '#e2e8f0', background: '#ffffff'`],

  // ── 주간 그리드 전체 배경 ──
  [`style={{background: '#0d0f14'}}`,
   `style={{background: '#f8fafc'}}`],

  // ── 테이블 thead 배경 ──
  [`style={{background: '#0d0f14'}}`,
   `style={{background: '#f8fafc'}}`],

  // ── 학생 컬럼 헤더 (sticky) ──
  [`style={{background: '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}`,
   `style={{background: '#f8fafc', borderColor: '#e2e8f0'}}`],

  // ── 날짜 컬럼 헤더 today/일반 ──
  [`style={{background: today ? 'rgba(99,102,241,0.08)' : '#0d0f14', borderColor: 'rgba(255,255,255,0.08)'}}`,
   `style={{background: today ? '#eef2ff' : '#f8fafc', borderColor: '#e2e8f0'}}`],

  // ── 학생 이름 셀 (sticky) ──
  [`style={{ background: si % 2 === 0 ? '#0d0f14' : '#0f1117', borderColor: 'rgba(255,255,255,0.06)' }}`,
   `style={{ background: si % 2 === 0 ? '#ffffff' : '#f8fafc', borderColor: '#e2e8f0' }}`],

  // ── 데이터 셀 배경 ──
  [`style={{borderColor: 'rgba(255,255,255,0.05)', background: isToday(col.date) ? 'rgba(99,102,241,0.05)' : (si % 2 === 0 ? '#0d0f14' : '#0f1117')}}`,
   `style={{borderColor: '#e2e8f0', background: isToday(col.date) ? '#eef2ff' : (si % 2 === 0 ? '#ffffff' : '#f8fafc')}}`],

  // ── 수업내역 행 헤더 셀 ──
  [`style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.08)'}}`,
   `style={{background: '#f1f5f9', borderColor: '#e2e8f0'}}`],

  // ── 수업내역 날짜 셀 ──
  [`style={{background: '#080a0e', borderColor: 'rgba(255,255,255,0.07)'}}`,
   `style={{background: '#f1f5f9', borderColor: '#e2e8f0'}}`],

  // ── 수업 메모 textarea ──
  [`className="w-full px-2 py-1.5 rounded-lg border border-white/8 bg-white/3 text-[10px] outline-none focus:border-white/20 resize-none text-white/60"`,
   `className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] outline-none focus:border-slate-400 resize-none text-slate-600"`],

  // ── 과제/테스트 버튼 (다크 배경 전용) ──
  // 과제 버튼
  [`className="flex items-center gap-1 h-5 px-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md text-[9px] font-black hover:bg-blue-500/25 transition-all"`,
   `className="flex items-center gap-1 h-5 px-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[9px] font-black hover:bg-blue-100 transition-all"`],

  // 테스트 버튼
  [`className="flex items-center gap-1 h-5 px-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-black hover:bg-amber-500/25 transition-all"`,
   `className="flex items-center gap-1 h-5 px-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] font-black hover:bg-amber-100 transition-all"`],

  // ── 일반과제 상태별 셀 배경 ──
  [`status === 'done' ? 'bg-emerald-500/15 text-emerald-400 line-through opacity-70' :\n                           status === 'delayed' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :\n                           'bg-foreground/5 text-foreground/50 hover:bg-foreground/10 border border-foreground/8'`,
   `status === 'done' ? 'bg-emerald-50 text-emerald-700 line-through opacity-70' :\n                           status === 'delayed' ? 'bg-amber-50 text-amber-700 border border-amber-200' :\n                           'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'`],

  // ── 출결 미입력 버튼 ──
  [`'border border-dashed border-foreground/15 text-foreground/20 hover:border-foreground/30'`,
   `'border border-dashed border-slate-300 text-slate-400 hover:border-slate-400'`],

  // ── 이월과제 표시 (다크) ──
  [`className="flex-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 truncate"`,
   `className="flex-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200 truncate"`],

  // ── 학생 이름 텍스트 (다크 foreground) ──
  [`className="text-[11px] font-black text-foreground/90 leading-tight truncate"`,
   `className="text-[11px] font-black text-slate-700 leading-tight truncate"`],

  // ── 배당없음 텍스트 ──
  [`className="text-[9px] text-foreground/25 text-center py-0.5"`,
   `className="text-[9px] text-slate-400 text-center py-0.5"`],

  // ── 세션없음 '—' ──
  [`className="text-center text-[10px] text-foreground/20 py-1"`,
   `className="text-center text-[10px] text-slate-300 py-1"`],

  // ── 날짜 텍스트 ──
  ['`text-[11px] font-black ${today ? colColor : \'text-foreground/70\'}`',
   '`text-[11px] font-black ${today ? colColor : \'text-slate-700\'}`'],

  // ── 날짜 시간 텍스트 ──
  [`className="text-[9px] text-foreground/30"`,
   `className="text-[9px] text-slate-400"`],

  // ── 학생수 텍스트 ──
  [`className="text-[9px] text-foreground/25"`,
   `className="text-[9px] text-slate-400"`],

  // ── 수업내역 '—' 없을때 ──
  [`className="text-[9px] text-foreground/20 text-center"`,
   `className="text-[9px] text-slate-400 text-center"`],

  // ── 이월과제 '⏩ 이월과제' 텍스트 (완료버튼) ──
  [`className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"`,
   `className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"`],

  // ── 일반과제 완료 버튼 ──
  [`className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all border border-emerald-500/20"\n                                            title="완료 처리">`,
   `className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200"\n                                            title="완료 처리">`],

  // ── 일반과제 이월 버튼 ──
  [`className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-all border border-orange-500/20"\n                                             title="이월 처리">`,
   `className="shrink-0 px-1 py-0.5 rounded-md text-[8px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all border border-orange-200"\n                                             title="이월 처리">`],

  // ── 오늘 뱃지 ──
  [`className="ml-1 text-[8px] bg-foreground/80 text-background px-1 py-0.5 rounded font-black"`,
   `className="ml-1 text-[8px] bg-slate-800 text-white px-1 py-0.5 rounded font-black"`],

  // ── 클리닉 뱃지 ──
  [`className="ml-1 text-[8px] bg-teal-500/20 text-teal-400 px-1 py-0.5 rounded font-black"`,
   `className="ml-1 text-[8px] bg-teal-100 text-teal-700 px-1 py-0.5 rounded font-black"`],

  // ── 출석 ATT_STYLE ──
  [`present: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black"`,
   `present: "bg-emerald-100 text-emerald-700 border border-emerald-300 font-black"`],
  [`late:    "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black"`,
   `late:    "bg-amber-100 text-amber-700 border border-amber-300 font-black"`],
  [`absent:  "bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black"`,
   `absent:  "bg-rose-100 text-rose-700 border border-rose-300 font-black"`],

  // ── '+ 수업 기록' 버튼 ──
  [`'border-foreground/20 text-foreground/60 bg-foreground/5 hover:bg-foreground/10' : 'border-foreground/8 text-foreground/20'`,
   `'border-slate-300 text-slate-600 bg-white hover:bg-slate-50' : 'border-slate-200 text-slate-300'`],
];

let count = 0;
for (const [from, to] of subs) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
  } else {
    console.warn('NOT FOUND:', from.slice(0, 60));
  }
}

writeFileSync(file, c, 'utf8');
console.log(`✅ ${count}/${subs.length} replaced`);
