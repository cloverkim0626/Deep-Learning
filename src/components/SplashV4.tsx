'use client';
import { useEffect, useState } from 'react';

/* 9 nodes — viewport % coordinates */
const DEF = [
  { x:0.50, y:0.25, fx:-0.55, fy:-0.35, d:0.40 }, // 0 P1 apex
  { x:0.20, y:0.70, fx:-0.65, fy: 0.20, d:0.05 }, // 1 P2 front-L
  { x:0.80, y:0.70, fx: 0.65, fy: 0.20, d:0.15 }, // 2 P3 front-R
  { x:0.70, y:0.55, fx: 0.50, fy:-0.25, d:0.60 }, // 3 P4 back-R
  { x:0.30, y:0.55, fx:-0.50, fy:-0.25, d:0.72 }, // 4 P5 back-L
  { x:0.15, y:0.75, fx:-0.60, fy: 0.25, d:0.85 }, // 5 P6 shadow
  { x:0.85, y:0.75, fx: 0.60, fy: 0.25, d:0.90 }, // 6 P7 shadow
  { x:0.50, y:0.80, fx: 0.00, fy: 0.45, d:0.78 }, // 7 P8 shadow center
  { x:0.50, y:0.62, fx: 0.30, fy:-0.40, d:0.52 }, // 8 P9 base center
];

/* edges: a→b, stroke opacity, delay after linesOn (s) */
const EDGES = [
  // Phase 1: Base floor P2→P3→P4→P5→P2
  { a:1, b:2, op:.55, d:0.00 },
  { a:2, b:3, op:.40, d:0.28 },
  { a:3, b:4, op:.25, d:0.56 }, // back — dim
  { a:4, b:1, op:.40, d:0.84 },
  // Phase 2: 4 pillars fire simultaneously → apex
  { a:1, b:0, op:.65, d:1.30 },
  { a:2, b:0, op:.65, d:1.30 },
  { a:3, b:0, op:.20, d:1.30 }, // back — very dim
  { a:4, b:0, op:.20, d:1.30 },
  // Phase 3: shadow (very faint)
  { a:5, b:6, op:.14, d:1.85 },
  { a:5, b:7, op:.10, d:1.95 },
  { a:6, b:7, op:.10, d:2.05 },
  { a:7, b:8, op:.12, d:1.90 },
  { a:8, b:4, op:.10, d:2.00 },
];

const FULL = 'Connecting the Dots';

type Pt = { cx: number; cy: number; tx: number; ty: number };

export default function SplashV4() {
  const [pts,     setPts]     = useState<Pt[]>([]);
  const [landed,  setLanded]  = useState(false);
  const [linesOn, setLinesOn] = useState(false);
  const [typed,   setTyped]   = useState('');
  const [showDL,  setShowDL]  = useState(false);
  const [fading,  setFading]  = useState(false);
  const [hidden,  setHidden]  = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const W = window.innerWidth, H = window.innerHeight;
    setPts(DEF.map(d => ({
      cx: W * d.x, cy: H * d.y,
      tx: W * d.fx, ty: H * d.fy,
    })));

    // land nodes → lines → typing → fade
    requestAnimationFrame(() => setTimeout(() => setLanded(true), 60));
    const t1 = setTimeout(() => setLinesOn(true),  1900);
    const t2 = setTimeout(() => setFading(true),   7500);
    const t3 = setTimeout(() => setHidden(true),   8300);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);

  /* typing starts after all edges drawn (2.1s after linesOn) */
  useEffect(() => {
    if (!linesOn) return;
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setTyped(FULL.slice(0, i));
        if (i >= FULL.length) { clearInterval(iv); setTimeout(() => setShowDL(true), 400); }
      }, 68);
      return () => clearInterval(iv);
    }, 2300);
    return () => clearTimeout(t);
  }, [linesOn]);

  if (hidden || pts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes lDraw {
          0%   { stroke-dashoffset:1; stroke:rgba(0,229,255,0); }
          8%   { stroke:rgba(0,229,255,1); }
          100% { stroke-dashoffset:0; stroke:rgba(255,255,255,.7); }
        }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dlIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>
        {/* SVG: full-screen, pixel coordinates */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}>

          {/* lines — SVG SMIL animate: from=len(숨김) → to=0(완성) */}
          {linesOn && EDGES.map((e, i) => {
            const s = pts[e.a], t = pts[e.b];
            const len = Math.hypot(t.cx-s.cx, t.cy-s.cy);
            return (
              <line key={i} x1={s.cx} y1={s.cy} x2={t.cx} y2={t.cy}
                stroke="#00E5FF" strokeWidth={e.op > 0.3 ? 1.3 : 0.9}
                strokeOpacity={0} strokeDasharray={len} strokeDashoffset={len}>
                <animate attributeName="stroke-dashoffset"
                  from={len} to={0} dur="0.7s" begin={`${e.d}s`} fill="freeze"/>
                <animate attributeName="stroke-opacity"
                  from={0} to={e.op} dur="0.25s" begin={`${e.d}s`} fill="freeze"/>
                <animate attributeName="stroke"
                  values="#00E5FF;rgba(255,255,255,0.65)"
                  keyTimes="0;1" dur="0.7s" begin={`${e.d + 0.3}s`} fill="freeze"/>
              </line>
            );
          })}

          {/* nodes: fly-in via CSS transition */}
          {pts.map((p, i) => (
            <circle key={i}
              cx={p.cx} cy={p.cy}
              r={i < 5 ? 4 : 2.5}
              fill={i === 0 ? '#ffffff' : i < 3 ? '#e0e7ff' : i < 5 ? 'rgba(165,180,252,.8)' : 'rgba(99,102,241,.5)'}
              style={{
                opacity: landed ? 1 : 0,
                transform: landed
                  ? 'translate(0,0)'
                  : `translate(${p.tx}px,${p.ty}px)`,
                transition: `transform .65s cubic-bezier(0.34,1.56,0.64,1) ${DEF[i].d}s,
                             opacity .3s ease ${DEF[i].d}s`,
              }}
            />
          ))}
        </svg>

        {/* text — bottom center */}
        <div style={{
          position:'absolute', bottom:'10%', left:0, right:0, textAlign:'center',
        }}>
          {linesOn && typed.length > 0 && (
            <div style={{
              fontFamily:'var(--font-inter),sans-serif',
              fontWeight:300, fontSize:12, letterSpacing:'.18em',
              color:'rgba(255,255,255,.4)', marginBottom:14,
            }}>
              {typed}
              {typed.length < FULL.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.8em',
                  background:'rgba(0,229,255,.6)', marginLeft:2, verticalAlign:'middle',
                  animation:'blink .5s ease infinite',
                }}/>
              )}
            </div>
          )}
          {showDL && (
            <div style={{
              fontFamily:'var(--font-inter),sans-serif',
              fontWeight:600, fontSize:18, letterSpacing:'.16em',
              textTransform:'uppercase', color:'rgba(255,255,255,.9)',
              animation:'dlIn .7s ease forwards', opacity:0,
            }}>Deep Learning</div>
          )}
        </div>
      </div>
    </>
  );
}
