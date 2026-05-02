/**
 * 어드민 라이트 테마 패치
 * TestSessionModal의 다크 색상 → 라이트 색상으로 교체
 */
import { readFileSync, writeFileSync } from 'fs';

const file = 'src/app/admin/dashboard/classes/[id]/page.tsx';
let c = readFileSync(file, 'utf8');
const before = c.length;

// 1) TestSessionModal 배경색 교체
const replacements = [
  // 모달 전체 배경 (진한 네이비 → 흰색)
  ["background:BG,border:\"1.5px solid rgba(99,102,241,0.35)\"",
   "background:'#fff',border:'1.5px solid #e0e7ff'"],
  
  // BG / BD / TXT 변수 정의
  ["const BG=\"#1a2236\"; const BD=\"rgba(255,255,255,0.13)\"; const TXT=\"#f0f4ff\";",
   "const BG=\"#ffffff\"; const BD=\"#e2e8f0\"; const TXT=\"#1e293b\";"],
  
  // 헤더 배경
  ["background:\"rgba(99,102,241,0.1)\"",
   "background:'#eef2ff'"],
  
  // 헤더 타이틀 색
  ["style={{color:\"#c7d2fe\"}}",
   "style={{color:'#4f46e5'}}"],
  
  // 헤더 서브텍스트
  ["style={{color:\"#818cf8\"}}",
   "style={{color:'#6366f1'}}"],
  
  // 닫기 버튼
  ["background:\"rgba(255,255,255,0.08)\",color:\"#94a3b8\"",
   "background:'#f1f5f9',color:'#64748b'"],
  
  // 탭 영역
  ["background: activeTest===i?\"rgba(99,102,241,0.25)\":\"rgba(255,255,255,0.05)\"",
   "background: activeTest===i?'#eef2ff':'#f8fafc'"],
  ["color: activeTest===i?\"#a5b4fc\":\"#64748b\"",
   "color: activeTest===i?'#4f46e5':'#94a3b8'"],
  
  // + 추가 버튼
  ["color:\"#6366f1\",background:\"rgba(99,102,241,0.08)\"",
   "color:'#4f46e5',background:'#eef2ff'"],
  
  // 테스트 설정 영역 배경
  ["background:\"rgba(255,255,255,0.03)\"",
   "background:'#f8fafc'"],
  
  // 테스트명 입력
  ["background:\"rgba(99,102,241,0.15)\",border:\"1px solid rgba(99,102,241,0.3)\",color:\"#c7d2fe\"",
   "background:'#eef2ff',border:'1px solid #c7d2fe',color:'#4f46e5'"],
  
  // 범위 입력
  ["background:\"rgba(255,255,255,0.07)\",border:\"1px solid rgba(255,255,255,0.12)\",color:\"#94a3b8\"",
   "background:'#f8fafc',border:'1px solid #e2e8f0',color:'#475569'"],
  
  // 만점 라벨
  ["style={{color:\"#818cf8\"}}",
   "style={{color:'#6366f1'}}"],
  
  // 만점 입력 (bg/border/color)
  ["background:\"rgba(255,255,255,0.07)\",border:\"1px solid rgba(255,255,255,0.12)\",color:TXT",
   "background:'#f8fafc',border:'1px solid #e2e8f0',color:TXT"],
  
  // 합격기준 라벨
  ["style={{color:\"#f59e0b\"}}",
   "style={{color:'#d97706'}}"],
  
  // 합격기준 입력
  ["background:\"rgba(245,158,11,0.1)\",border:\"1px solid rgba(245,158,11,0.25)\",color:\"#fcd34d\"",
   "background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'"],
  
  // 합격기준 % 텍스트
  ["style={{color:\"#64748b\"}}",
   "style={{color:'#94a3b8'}}"],
  
  // 헤더 행 배경/색
  ["background:\"rgba(255,255,255,0.03)\"}}>",
   "background:'#f8fafc'}}>"],
  ["color:\"#475569\",background:\"rgba(255,255,255,0.03)\"",
   "color:'#64748b',background:'#f8fafc'"],
  
  // 학생 목록 배경
  ["style={{background:\"#1a2236\"}}",
   "style={{background:'#f8fafc'}}"],
  
  // 학생 행 배경 - pass/fail/absent/default
  ["background: !e.included?\"rgba(255,255,255,0.01)\":isPass?\"rgba(16,185,129,0.13)\":isFail?\"rgba(239,68,68,0.1)\":isAbsent?\"rgba(245,158,11,0.09)\":\"rgba(255,255,255,0.05)\"",
   "background: !e.included?'#f8fafc':isPass?'#f0fdf4':isFail?'#fef2f2':isAbsent?'#fffbeb':'#ffffff'"],
  
  // 학생 행 opacity
  ["opacity:e.included?1:0.25",
   "opacity:e.included?1:0.4"],
  
  // 학생 행 border
  ["border: isPass?\"1px solid rgba(16,185,129,0.25)\":isFail?\"1px solid rgba(239,68,68,0.25)\":isAbsent?\"1px solid rgba(245,158,11,0.2)\":\"1px solid rgba(255,255,255,0.06)\"",
   "border: isPass?'1px solid #bbf7d0':isFail?'1px solid #fecaca':isAbsent?'1px solid #fde68a':'1px solid #f1f5f9'"],
  
  // 학생 이름 색
  ["style={{color:e.included?TXT:\"#334155\"}}",
   "style={{color:e.included?'#1e293b':'#94a3b8'}}"],
  
  // 결과 뱃지 색
  ["style={{color:isPass?\"#4ade80\":isFail?\"#f87171\":isAbsent?\"#fbbf24\":\"#94a3b8\"}}",
   "style={{color:isPass?'#16a34a':isFail?'#dc2626':isAbsent?'#d97706':'#94a3b8'}}"],
  
  // 점수 입력
  ["background:e.score?\"rgba(99,102,241,0.2)\":\"rgba(255,255,255,0.07)\",border:e.score?\"1px solid rgba(99,102,241,0.5)\":\"1px solid rgba(255,255,255,0.12)\",color:\"#c7d2fe\"",
   "background:e.score?'#eef2ff':'#f8fafc',border:e.score?'1px solid #a5b4fc':'1px solid #e2e8f0',color:'#4f46e5'"],
  
  // 점수 /만점 텍스트
  ["style={{color:\"#475569\"}}",
   "style={{color:'#94a3b8'}}"],
  
  // 결과 없을때 드롭다운 (황색계)
  ["background:\"rgba(245,158,11,0.12)\",border:\"1px solid rgba(245,158,11,0.3)\",color:\"#fde68a\",colorScheme:\"dark\"",
   "background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'"],
  
  // Fail 드롭다운
  ["background:\"rgba(239,68,68,0.12)\",border:\"1px solid rgba(239,68,68,0.3)\",color:\"#fca5a5\",colorScheme:\"dark\"",
   "background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626'"],
  
  // 취소 버튼
  ["background:\"rgba(245,158,11,0.15)\",color:\"#fde68a\",border:\"1px solid rgba(245,158,11,0.3)\"",
   "background:'#fffbeb',color:'#92400e',border:'1px solid #fde68a'"],
  
  // 재응시일 입력
  ["background:\"rgba(99,102,241,0.1)\",border:\"1px solid rgba(99,102,241,0.25)\",color:\"#a5b4fc\",colorScheme:\"dark\"",
   "background:'#eef2ff',border:'1px solid #c7d2fe',color:'#4f46e5'"],
  
  // 저장 버튼 행 배경
  ["background:\"rgba(255,255,255,0.03)\"",
   "background:'#f8fafc'"],
  
  // 취소 버튼 (footer)
  ["border:\"1px solid rgba(255,255,255,0.12)\",color:\"#64748b\"",
   "border:'1px solid #e2e8f0',color:'#64748b'"],
];

let count = 0;
for (const [from, to] of replacements) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
  }
}

writeFileSync(file, c, 'utf8');
console.log(`✅ ${count}/${replacements.length} replacements. Size: ${before} → ${c.length}`);
