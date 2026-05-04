'use client';
import { useEffect, useState } from 'react';

/*
  1-2-3-2-1 diamond (neural / octahedron)
  viewBox 0 0 320 620

  Layer 0 (top)   : node 0
  Layer 1         : node 1, 2
  Layer 2 (wide)  : node 3, 4, 5
  Layer 3         : node 6, 7
  Layer 4 (bottom): node 8
*/
const NODES = [
  { cx: 160, cy: 72  }, // 0 top apex
  { cx: 100, cy: 188 }, // 1 upper-left
  { cx: 222, cy: 168 }, // 2 upper-right
  { cx: 32,  cy: 298 }, // 3 far-left
  { cx: 158, cy: 278 }, // 4 center
  { cx: 282, cy: 290 }, // 5 far-right
  { cx: 96,  cy: 398 }, // 6 lower-left
  { cx: 215, cy: 388 }, // 7 lower-right
  { cx: 158, cy: 510 }, // 8 bottom apex
];

/*
  Lines drawn in order → reveals diamond 3D shape
  Outer frame first, then inner connections
*/
const EDGES: [number, number][] = [
  // outer diamond spine
  [0, 3], [3, 8], [8, 5], [5, 0],
  // inner layer-by-layer
  [0, 1], [0, 2],
  [1, 3], [2, 5],
  [1, 4], [2, 4],
  [3, 6], [5, 7],
  [4, 6], [4, 7],
  [6, 8], [7, 8],
  // cross diagonals — 입체감
  [1, 7], [2, 6],
];

/* 
  Stagger delays — nodes appear as if "scattered" before connection
  (not in layer order, feels random)
*/
const NODE_DELAYS = [0.6, 0.1, 0.85, 0.4, 0.95, 0.2, 0.7, 0.35, 0.55];

const FULL_TEXT = 'Connecting the Dots';

export default function SplashV4() {
  const [linesOn, setLinesOn] = useState(false);
  const [typed,   setTyped]   = useState('');
  const [showDL,  setShowDL]  = useState(false);
  const [fading,  setFading]  = useState(false);
  const [hidden,  setHidden]  = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    // 모든 노드 등장 후 (~1.2s) 선 시작
    const t1 = setTimeout(() => setLinesOn(true), 1800);
    const t2 = setTimeout(() => setFading(true),  6500);
    const t3 = setTimeout(() => setHidden(true),  7300);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  // 타이핑: 선 시작과 동시에
  useEffect(() => {
    if (!linesOn) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(iv);
        setTimeout(() => setShowDL(true), 400);
      }
    }, 72);
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
        @keyframes dlIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>

        {/* SVG 다이아몬드 네트워크 */}
        <svg width="280" height="480" viewBox="0 0 320 600"
          style={{ marginTop: -40 }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* 연결선: 순서대로 그려져 입체 완성 */}
          {linesOn && EDGES.map(([a, b], i) => {
            const s = NODES[a], e = NODES[b];
            const len = Math.hypot(e.cx - s.cx, e.cy - s.cy);
            return (
              <line key={i} x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                stroke="rgba(129,140,248,.35)" strokeWidth="1.2"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lDraw .55s ease ${i * 0.11}s forwards`, opacity:0 }}
              />
            );
          })}

          {/* 노드: 무작위 순서로 먼저 등장 */}
          {NODES.map((n, i) => (
            <g key={i} filter="url(#glow)"
              style={{ opacity:0, animation:`nFade .5s ease ${NODE_DELAYS[i]}s forwards` }}>
              <circle cx={n.cx} cy={n.cy} r={12} fill="rgba(165,180,252,.08)"/>
              <circle cx={n.cx} cy={n.cy} r={5}  fill="rgba(199,210,254,.25)"/>
              <circle cx={n.cx} cy={n.cy} r={2.8} fill="#e0e7ff"/>
            </g>
          ))}
        </svg>

        {/* 하단 텍스트 */}
        <div style={{ textAlign:'center', marginTop: 28 }}>
          {/* Connecting the Dots 타이핑 */}
          {linesOn && (
            <div style={{
              fontFamily:'var(--font-inter), sans-serif',
              fontWeight:300, fontSize:13, letterSpacing:'.14em',
              color:'rgba(255,255,255,.42)', marginBottom:12, minHeight:20,
            }}>
              {typed}
              {typed.length < FULL_TEXT.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.8em',
                  background:'rgba(255,255,255,.4)',
                  marginLeft:2, verticalAlign:'middle',
                  animation:'blink .55s ease infinite',
                }}/>
              )}
            </div>
          )}

          {/* Deep Learning */}
          {showDL && (
            <div style={{
              fontFamily:'var(--font-inter), sans-serif',
              fontWeight:300, fontSize:18, letterSpacing:'.18em',
              textTransform:'uppercase', color:'rgba(255,255,255,.75)',
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
