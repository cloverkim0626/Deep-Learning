'use client';
import { useEffect, useState } from 'react';

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const GLOW: Record<number, string> = {
  0: '#4f46e5',
  1: '#818cf8',
  2: '#c084fc',
  3: '#f953c6',
  4: '#ffffff',
  5: '#ffffff',
};

export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const t = [
      setTimeout(() => setPhase(1), 800),   // 3초전
      setTimeout(() => setPhase(2), 1600),  // 2초전
      setTimeout(() => setPhase(3), 2400),  // 1초전
      setTimeout(() => setPhase(4), 3100),  // 발화!
      setTimeout(() => setPhase(5), 3600),  // fade out
      setTimeout(() => setHidden(true), 4200),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  if (hidden) return null;

  const glow = GLOW[phase];
  const isFire = phase === 4;
  const isFade = phase === 5;
  const countNum = phase === 1 ? '3' : phase === 2 ? '2' : phase === 3 ? '1' : null;
  const pulseSpeed = phase === 3 ? '0.35s' : phase === 2 ? '0.55s' : '0.9s';

  // SVG nodes and connections
  const nodes = [
    { cx: 160, cy: 42 },
    { cx: 268, cy: 105 },
    { cx: 268, cy: 215 },
    { cx: 160, cy: 278 },
    { cx: 52,  cy: 215 },
    { cx: 52,  cy: 105 },
    { cx: 160, cy: 160 }, // center
  ];
  const lines = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0], // hexagon
    [0,6],[1,6],[2,6],[3,6],[4,6],[5,6], // spokes
    [0,3],[1,4],[2,5], // cross
  ];

  return (
    <>
      <style>{`
        @keyframes splashNodeIn {
          from { opacity:0; r:0; }
          to   { opacity:1; r:7; }
        }
        @keyframes splashLineIn {
          from { stroke-dashoffset:300; opacity:0; }
          to   { stroke-dashoffset:0;   opacity:0.55; }
        }
        @keyframes splashPulse {
          0%,100% { transform:scale(1);   opacity:.8; }
          50%      { transform:scale(1.3); opacity:1;  }
        }
        @keyframes splashCountIn {
          0%   { opacity:0; transform:scale(2.2) translateY(10px); }
          18%  { opacity:1; transform:scale(1)   translateY(0); }
          78%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(.8); }
        }
        @keyframes splashFireBg {
          0%   { opacity:0; }
          25%  { opacity:1; }
          100% { opacity:.85; }
        }
        @keyframes splashFireText {
          0%   { opacity:0; transform:scale(.4); }
          35%  { opacity:1; transform:scale(1.25); }
          65%  { transform:scale(1); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes splashFadeOut {
          from { opacity:1; }
          to   { opacity:0; }
        }
        @keyframes splashScreenFlash {
          0%,100% { background:#08080f; }
          50%     { background:rgba(249,83,198,.18); }
        }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999,
        background: isFire
          ? 'radial-gradient(ellipse at center, rgba(249,83,198,.35) 0%, #08080f 65%)'
          : '#08080f',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        animation: isFade ? 'splashFadeOut .6s ease forwards'
                 : isFire  ? 'splashScreenFlash .5s ease' : undefined,
        overflow:'hidden',
      }}>

        {/* ── NEURAL NETWORK ── */}
        <svg width="280" height="280" viewBox="0 0 320 320"
          style={{ position:'absolute', opacity: isFire ? 0 : 1, transition:'opacity .3s' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {lines.map(([a, b], i) => {
            const n1 = nodes[a], n2 = nodes[b];
            const len = Math.hypot(n2.cx - n1.cx, n2.cy - n1.cy);
            return (
              <line key={i}
                x1={n1.cx} y1={n1.cy} x2={n2.cx} y2={n2.cy}
                stroke={glow} strokeWidth="1.2" filter="url(#glow)"
                strokeDasharray={len} strokeDashoffset={len}
                style={{
                  animation: `splashLineIn .5s ease ${i * 0.05}s forwards`,
                  transition: 'stroke .5s',
                }}
              />
            );
          })}

          {nodes.map((n, i) => (
            <g key={i} filter="url(#glow)"
              style={{ transformOrigin:`${n.cx}px ${n.cy}px`,
                animation: phase >= 1
                  ? `splashPulse ${pulseSpeed} ease ${i*0.08}s infinite`
                  : `splashNodeIn .35s ease ${i * 0.08}s forwards`,
              }}>
              <circle cx={n.cx} cy={n.cy} r={22} fill={glow} opacity={.08}/>
              <circle cx={n.cx} cy={n.cy} r={7}  fill={glow} opacity={.95}/>
            </g>
          ))}
        </svg>

        {/* ── COUNTDOWN ── */}
        {countNum && (
          <div key={phase}
            style={{ position:'absolute', display:'flex', flexDirection:'column',
              alignItems:'center', gap:6, animation:'splashCountIn .8s ease forwards' }}>
            <span style={{ color:'rgba(255,255,255,.45)', fontSize:11, fontWeight:800,
              letterSpacing:6, textTransform:'uppercase', marginBottom:4 }}>
              시냅스 발화
            </span>
            <span style={{
              fontSize:108, fontWeight:900, lineHeight:1, color: glow,
              textShadow:`0 0 50px ${glow}, 0 0 100px ${glow}60`,
              fontVariantNumeric:'tabular-nums',
            }}>
              {countNum}
            </span>
            <span style={{ color:'rgba(255,255,255,.35)', fontSize:14, fontWeight:700,
              letterSpacing:5 }}>
              초 전
            </span>
          </div>
        )}

        {/* ── FIRE ── */}
        {isFire && (
          <>
            <div style={{
              position:'absolute', inset:0,
              background:'radial-gradient(ellipse at center, rgba(249,83,198,.55) 0%, rgba(249,83,198,.1) 45%, transparent 70%)',
              animation:'splashFireBg .5s ease forwards',
            }}/>
            {/* burst rings */}
            {[80,140,200].map((r, i) => (
              <div key={i} style={{
                position:'absolute', width:r*2, height:r*2,
                borderRadius:'50%',
                border:'1.5px solid rgba(249,83,198,.4)',
                animation:`splashFireBg .5s ease ${i*.08}s forwards`,
              }}/>
            ))}
            <div style={{
              position:'absolute', display:'flex', flexDirection:'column',
              alignItems:'center', gap:10,
              animation:'splashFireText .45s cubic-bezier(.2,0,.3,1.4) forwards',
            }}>
              <span style={{ fontSize:72, lineHeight:1 }}>⚡</span>
              <span style={{
                fontSize:32, fontWeight:900, letterSpacing:8,
                color:'#fff', textShadow:'0 0 40px #f953c6, 0 0 80px rgba(249,83,198,.5)',
              }}>발 화 !</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
