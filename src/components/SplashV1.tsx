'use client';
import { useEffect, useState } from 'react';

/* ── 단어 노드 위치 (SVG 320×500 좌표계) ── */
const WORDS = [
  { text: 'syntax',  cx: 58,  cy: 90  },
  { text: 'recall',  cx: 258, cy: 76  },
  { text: 'pattern', cx: 28,  cy: 238 },
  { text: 'fire',    cx: 292, cy: 222 },
  { text: 'link',    cx: 78,  cy: 390 },
  { text: 'connect', cx: 242, cy: 400 },
];
const EDGES: [number,number][] = [
  [0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,5],
];

export default function SplashV1() {
  const [phase, setPhase] = useState(0); // 0=words 1=lines 2=count 3=title 4=fade
  const [count, setCount] = useState(3);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');
    const t = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => { setPhase(2); setCount(3); }, 1600),
      setTimeout(() => setCount(2), 2400),
      setTimeout(() => setCount(1), 3100),
      setTimeout(() => setPhase(3), 3700),
      setTimeout(() => setPhase(4), 4100),
      setTimeout(() => setHidden(true), 4700),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes wordIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes lineIn   { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes titleIn  { from{opacity:0;letter-spacing:.3em} to{opacity:1;letter-spacing:.15em} }
        @keyframes splashOut{ from{opacity:1} to{opacity:0} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        animation: phase===4 ? 'splashOut .6s ease forwards' : undefined,
      }}>
        <svg width="320" height="500" viewBox="0 0 320 500" style={{position:'absolute'}}>
          <defs>
            <filter id="gw"><feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* 연결선 */}
          {phase >= 1 && EDGES.map(([a,b], i) => {
            const n1=WORDS[a], n2=WORDS[b];
            const len = Math.hypot(n2.cx-n1.cx, n2.cy-n1.cy);
            return (
              <line key={i} x1={n1.cx} y1={n1.cy} x2={n2.cx} y2={n2.cy}
                stroke="rgba(129,140,248,.5)" strokeWidth="1"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lineIn .45s ease ${i*.07}s forwards` }}
              />
            );
          })}

          {/* 단어 노드 */}
          {WORDS.map((w, i) => (
            <g key={i} filter="url(#gw)"
              style={{ animation:`wordIn .4s ease ${i*.14}s both` }}>
              <circle cx={w.cx} cy={w.cy} r={3.5} fill="#c7d2fe" opacity={.9}/>
              <text x={w.cx} y={w.cy - 10} textAnchor="middle"
                fill="rgba(199,210,254,.75)" fontSize="11" fontFamily="'Inter',sans-serif"
                fontWeight="500" letterSpacing="1.5">
                {w.text.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>

        {/* 카운트다운 */}
        {phase === 2 && (
          <div style={{
            position:'absolute', bottom:'22%',
            fontSize:11, color:'rgba(255,255,255,.3)', letterSpacing:6,
            fontFamily:'Inter,sans-serif', fontWeight:500,
          }}>
            {count}
          </div>
        )}

        {/* DEEP LEARNING */}
        {phase >= 3 && (
          <div style={{
            position:'absolute',
            color:'rgba(255,255,255,.92)', fontFamily:"'Inter',sans-serif",
            fontSize:22, fontWeight:300, letterSpacing:'.15em',
            textTransform:'uppercase',
            animation:'titleIn .6s ease forwards',
          }}>
            Deep Learning
          </div>
        )}
      </div>
    </>
  );
}
