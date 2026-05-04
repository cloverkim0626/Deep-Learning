'use client';
import { useEffect, useState } from 'react';

/* ── 별 좌표 — SVG 360×800, 화면 중앙 집중 ── */
const STARS = [
  { cx: 80,  cy: 220 }, // 상단 왼
  { cx: 280, cy: 200 }, // 상단 오른
  { cx: 180, cy: 240 }, // 상단 중
  { cx: 50,  cy: 350 }, // 중간 왼
  { cx: 310, cy: 330 }, // 중간 오른
  { cx: 165, cy: 370 }, // 중간 중
  { cx: 100, cy: 480 }, // 하단 왼
  { cx: 270, cy: 490 }, // 하단 오른
  { cx: 190, cy: 520 }, // 하단 중
];
const EDGES: [number, number][] = [
  [0,2],[1,2],[0,3],[2,4],[2,5],[3,5],[4,5],[3,6],[5,8],[4,7],[6,8],[7,8],
];

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export default function SplashV4() {
  const [phase, setPhase] = useState<Phase>(0);
  const [count, setCount] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');
    const t = [
      setTimeout(() => setPhase(1),               550),  // 별 등장
      setTimeout(() => setPhase(2),               1450), // 선 연결
      setTimeout(() => setPhase(3),               1850), // 텍스트
      setTimeout(() => { setPhase(4); setCount(3); }, 2300),
      setTimeout(() => setCount(2),               3050),
      setTimeout(() => setCount(1),               3750),
      setTimeout(() => setPhase(5),               4300), // 페이드
      setTimeout(() => setHidden(true),           5000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  if (hidden) return null;

  // 별 그룹별 딜레이 (3개씩 동시 fade)
  const starDelay = (i: number) => `${Math.floor(i / 3) * 220}ms`;

  return (
    <>
      <style>{`
        @keyframes starFade  { from{opacity:0} to{opacity:1} }
        @keyframes lineIn    { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes quoteIn   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes brandIn   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes brandOut  { from{opacity:1} to{opacity:0} }
        @keyframes cntIn     { from{opacity:0} to{opacity:.3} }
        @keyframes v4Out     { from{opacity:1} to{opacity:0} }
        @keyframes twinkle   { 0%,100%{opacity:.85} 50%{opacity:1} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        animation: phase===5 ? 'v4Out .75s ease forwards' : undefined,
        overflow:'hidden',
      }}>

        {/* ── 브랜드 타이틀 (phase 0) ── */}
        <div style={{
          position:'absolute',
          textAlign:'center',
          animation: phase === 0 ? 'brandIn .5s ease forwards'
                   : phase >= 1  ? 'brandOut .4s ease forwards' : undefined,
          opacity: phase === 0 ? 0 : undefined,
        }}>
          <div style={{
            fontFamily:'var(--font-inter), sans-serif',
            fontSize:22, fontWeight:300, letterSpacing:'.18em',
            color:'rgba(255,255,255,.85)', textTransform:'uppercase',
          }}>
            Deep Learning
          </div>
          <div style={{
            fontFamily:'var(--font-inter), sans-serif',
            fontSize:11, fontWeight:400, letterSpacing:'.3em',
            color:'rgba(255,255,255,.35)', textTransform:'uppercase', marginTop:8,
          }}>
            Team Parallax
          </div>
        </div>

        {/* ── SVG 신경망 ── */}
        {phase >= 1 && (
          <svg width="360" height="800" viewBox="0 0 360 800"
            style={{ position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%,-50%)', maxHeight:'100vh' }}>
            <defs>
              <filter id="starGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2"/>
                <feMerge>
                  <feMergeNode in="blur1"/>
                  <feMergeNode in="blur2"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* 연결선 */}
            {phase >= 2 && EDGES.map(([a, b], i) => {
              const s = STARS[a], e = STARS[b];
              const len = Math.hypot(e.cx - s.cx, e.cy - s.cy);
              return (
                <line key={i} x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                  stroke="rgba(129,140,248,.3)" strokeWidth=".9"
                  strokeDasharray={len} strokeDashoffset={len}
                  style={{ animation:`lineIn .55s ease ${i * 0.055}s forwards` }}
                />
              );
            })}

            {/* 별 — 3겹 글로우 */}
            {STARS.map((s, i) => (
              <g key={i} filter="url(#starGlow)"
                style={{
                  opacity: 0,
                  animation: `starFade .6s ease ${starDelay(i)} forwards, `
                           + (phase >= 3 ? `twinkle 2.2s ease ${i*0.15}s infinite` : ''),
                }}>
                {/* 외곽 헤일로 */}
                <circle cx={s.cx} cy={s.cy} r={18} fill="rgba(129,140,248,0.06)"/>
                {/* 중간 글로우 */}
                <circle cx={s.cx} cy={s.cy} r={9}  fill="rgba(165,180,252,0.18)"/>
                {/* 핵심 */}
                <circle cx={s.cx} cy={s.cy} r={4}  fill="#e0e7ff"/>
              </g>
            ))}
          </svg>
        )}

        {/* ── Connecting the Dots ── */}
        {phase >= 3 && (
          <div style={{
            position:'absolute', bottom:'20%', textAlign:'center',
            animation:'quoteIn .7s ease forwards',
          }}>
            <span style={{
              fontFamily:'var(--font-noto-serif), Georgia, serif',
              fontStyle:'italic', fontWeight:700,
              fontSize:17, letterSpacing:'.05em',
              color:'rgba(255,255,255,.72)',
            }}>
              Connecting the Dots
            </span>
          </div>
        )}

        {/* ── 카운트다운 ── */}
        {phase === 4 && count !== null && (
          <div key={count} style={{
            position:'absolute', bottom:'14%',
            fontFamily:'var(--font-inter), sans-serif',
            fontSize:10, fontWeight:400, letterSpacing:'.3em',
            color:'rgba(255,255,255,.22)',
            animation:'cntIn .4s ease forwards',
          }}>
            {count}
          </div>
        )}
      </div>
    </>
  );
}
