'use client';
import { useEffect, useState } from 'react';

/*
  이미지 그대로: 옥타헤드론 9-node
  viewBox 0 0 320 530

       0          ← top apex
      1   2       ← upper row
    3   4   5     ← widest row
      6   7       ← lower row
        8         ← bottom apex
*/
const NODES = [
  { cx: 160, cy: 68  }, // 0 top
  { cx: 105, cy: 188 }, // 1 upper-left
  { cx: 215, cy: 165 }, // 2 upper-right
  { cx: 28,  cy: 290 }, // 3 far-left
  { cx: 158, cy: 272 }, // 4 center
  { cx: 285, cy: 282 }, // 5 far-right
  { cx: 92,  cy: 390 }, // 6 lower-left
  { cx: 208, cy: 378 }, // 7 lower-right
  { cx: 153, cy: 488 }, // 8 bottom
];

/* 무작위 등장 순서 */
const ND = [0.4, 0.08, 0.72, 0.52, 0.88, 0.18, 0.62, 0.32, 0.78];

/*
  엣지: 외곽 다이아몬드 → 상단 → 중단 → 하단 순으로 그려져
  점들이 입체 형태로 완성되는 "aha" 순간 연출
*/
const EDGES: [number, number][] = [
  // 1. 외곽 다이아몬드 프레임
  [0, 3], [3, 8], [8, 5], [5, 0],
  // 2. 상단 삼각
  [0, 1], [0, 2], [1, 2],
  // 3. 상단 → 중간
  [1, 3], [2, 5], [1, 4], [2, 4],
  // 4. 중간 교차
  [3, 4], [4, 5],
  // 5. 중간 → 하단
  [3, 6], [5, 7], [4, 6], [4, 7], [6, 7],
  // 6. 하단 삼각
  [6, 8], [7, 8],
];

const FULL = 'Connecting the Dots';

export default function SplashV4() {
  const [linesOn, setLinesOn] = useState(false);
  const [typed,   setTyped]   = useState('');
  const [showDL,  setShowDL]  = useState(false);
  const [fading,  setFading]  = useState(false);
  const [hidden,  setHidden]  = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const t1 = setTimeout(() => setLinesOn(true), 1600);
    const t2 = setTimeout(() => setFading(true),  6800);
    const t3 = setTimeout(() => setHidden(true),  7600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!linesOn) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL.slice(0, i));
      if (i >= FULL.length) { clearInterval(iv); setTimeout(() => setShowDL(true), 400); }
    }, 70);
    return () => clearInterval(iv);
  }, [linesOn]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes nFade { from{opacity:0} to{opacity:1} }
        @keyframes lDraw {
          from { stroke-dashoffset: 1; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dlIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>

        {/* ── 옥타헤드론 SVG ── */}
        <svg width="300" height="460" viewBox="0 0 320 530"
          style={{ marginTop: -20 }}>

          {/* 연결선: 순서대로 → 입체 완성 */}
          {linesOn && EDGES.map(([a, b], i) => {
            const s = NODES[a], e = NODES[b];
            const len = Math.hypot(e.cx - s.cx, e.cy - s.cy);
            return (
              <line key={i}
                x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                stroke="rgba(129,140,248,.40)" strokeWidth="1.2"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lDraw .5s ease ${i * 0.1}s forwards`, opacity:0 }}
              />
            );
          })}

          {/* 노드: 글로우 레이어 (필터 없이) */}
          {NODES.map((n, i) => (
            <g key={i} style={{ opacity:0, animation:`nFade .45s ease ${ND[i]}s forwards` }}>
              <circle cx={n.cx} cy={n.cy} r={16} fill="rgba(129,140,248,.06)"/>
              <circle cx={n.cx} cy={n.cy} r={9}  fill="rgba(165,180,252,.16)"/>
              <circle cx={n.cx} cy={n.cy} r={3.5} fill="#dde7ff"/>
            </g>
          ))}
        </svg>

        {/* ── 텍스트 ── */}
        <div style={{ textAlign:'center', marginTop:20 }}>

          {linesOn && (
            <div style={{
              fontFamily:'var(--font-inter), sans-serif',
              fontWeight:300, fontSize:12, letterSpacing:'.16em',
              color:'rgba(255,255,255,.4)', marginBottom:14, minHeight:18,
            }}>
              {typed}
              {typed.length < FULL.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.8em',
                  background:'rgba(255,255,255,.38)',
                  marginLeft:2, verticalAlign:'middle',
                  animation:'blink .55s ease infinite',
                }}/>
              )}
            </div>
          )}

          {showDL && (
            <div style={{
              fontFamily:'var(--font-inter), sans-serif',
              fontWeight:600, fontSize:18, letterSpacing:'.16em',
              textTransform:'uppercase', color:'rgba(255,255,255,.88)',
              animation:'dlIn .7s ease forwards', opacity:0,
            }}>
              Deep Learning
            </div>
          )}
        </div>

      </div>
    </>
  );
}
