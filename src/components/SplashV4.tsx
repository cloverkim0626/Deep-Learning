'use client';
import { useEffect, useState } from 'react';

/* ── 별 좌표 (SVG 360×600) ── */
const STARS = [
  { cx:80,  cy:100 }, { cx:280, cy:80  }, { cx:180, cy:140 },
  { cx:50,  cy:270 }, { cx:310, cy:250 }, { cx:130, cy:330 },
  { cx:230, cy:360 }, { cx:90,  cy:460 }, { cx:270, cy:480 },
];
const EDGES: [number,number][] = [
  [0,2],[1,2],[2,3],[2,4],[3,5],[4,6],[5,7],[6,8],[5,6],
];

export default function SplashV4() {
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState<number|null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');
    const t = [
      setTimeout(() => setPhase(1),              1300), // quote
      setTimeout(() => setPhase(2),              1700), // lines
      setTimeout(() => { setPhase(3); setCount(3); }, 2100),
      setTimeout(() => setCount(2),              2850),
      setTimeout(() => setCount(1),              3550),
      setTimeout(() => setPhase(4),              4100), // flash & fade
      setTimeout(() => setHidden(true),          4800),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes starIn  { from{opacity:0;transform:scale(0)} to{opacity:1;transform:scale(1)} }
        @keyframes quoteIn { from{opacity:0;transform:translateY(4px)} to{opacity:.45;transform:none} }
        @keyframes lineIn  { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes cntIn   { from{opacity:0} to{opacity:.25} }
        @keyframes cntOut  { from{opacity:.25} to{opacity:0} }
        @keyframes v4Fade  { from{opacity:1} to{opacity:0} }
        @keyframes starPulse { 0%,100%{r:4;opacity:.9} 50%{r:6;opacity:1} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        animation: phase===4 ? 'v4Fade .7s ease forwards' : undefined,
      }}>
        <svg width="360" height="600" viewBox="0 0 360 600"
          style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)' }}>
          <defs>
            <filter id="sg"><feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* 연결선 */}
          {phase >= 2 && EDGES.map(([a,b], i) => {
            const s=STARS[a], e=STARS[b];
            const len = Math.hypot(e.cx-s.cx, e.cy-s.cy);
            return (
              <line key={i} x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                stroke="rgba(129,140,248,.35)" strokeWidth=".8"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lineIn .5s ease ${i*.06}s forwards` }}
              />
            );
          })}

          {/* 별 */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={4} fill="#e0e7ff"
              filter="url(#sg)" opacity={0}
              style={{
                animation: phase >= 3
                  ? `starPulse 1.2s ease ${i*.1}s infinite`
                  : `starIn .35s ease ${i*.13}s forwards`,
              }}
            />
          ))}
        </svg>

        {/* 인용구 */}
        {phase >= 1 && (
          <div style={{
            position:'absolute', bottom:'28%', textAlign:'center',
            animation:'quoteIn .8s ease forwards',
            fontFamily:'var(--font-noto-serif), Georgia, serif',
            fontStyle:'italic', fontSize:13,
            color:'rgba(255,255,255,.45)', letterSpacing:'.06em', lineHeight:1.7,
          }}>
            connecting the dots
          </div>
        )}

        {/* 카운트다운 */}
        {phase === 3 && count !== null && (
          <div key={count} style={{
            position:'absolute', bottom:'22%',
            fontFamily:'var(--font-inter), sans-serif',
            fontSize:11, fontWeight:400, letterSpacing:'.25em',
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
