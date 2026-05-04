'use client';
import { useEffect, useState } from 'react';

/* ── 별 위치: 화면 중앙에 유기적으로 분포 ── */
const STARS = [
  { cx: 110, cy: 195 },
  { cx: 255, cy: 175 },
  { cx: 75,  cy: 315 },
  { cx: 195, cy: 270 },
  { cx: 308, cy: 335 },
  { cx: 145, cy: 415 },
  { cx: 278, cy: 455 },
  { cx: 175, cy: 530 },
  { cx: 72,  cy: 495 },
];

/* ── 별자리/뉴런 느낌 — 외곽 사각형 X, 교차 대각선 위주 ── */
const EDGES: [number, number][] = [
  [0,3],[1,3],[0,2],[2,3],[1,4],[3,4],[3,5],[4,6],[5,8],[5,7],[6,7],[8,5],
];

type Ph = 'stars' | 'lines' | 'w1' | 'w2' | 'w3' | 'out';

export default function SplashV4() {
  const [ph, setPh]       = useState<Ph>('stars');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const t = [
      setTimeout(() => setPh('lines'), 1800), // 별 다 뜬 뒤 선 시작
      setTimeout(() => setPh('w1'),    3000), // 1 · connecting
      setTimeout(() => setPh('w2'),    4500), // 2 · the
      setTimeout(() => setPh('w3'),    6000), // 3 · dots
      setTimeout(() => setPh('out'),   7200),
      setTimeout(() => setHidden(true),8000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  if (hidden) return null;

  const numVisible  = ph === 'w1' || ph === 'w2' || ph === 'w3';
  const showNum1    = ph === 'w1' || ph === 'w2' || ph === 'w3';
  const showNum2    = ph === 'w2' || ph === 'w3';
  const showNum3    = ph === 'w3';
  const showWord1   = ph === 'w1' || ph === 'w2' || ph === 'w3';
  const showWord2   = ph === 'w2' || ph === 'w3';
  const showWord3   = ph === 'w3';

  return (
    <>
      <style>{`
        @keyframes sFade { from{opacity:0} to{opacity:1} }
        @keyframes lDraw { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes tIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'space-between', paddingTop:'18%', paddingBottom:'14%',
        animation: ph==='out' ? 'sOut .9s ease forwards' : undefined,
        overflow:'hidden',
      }}>

        {/* ── 상단: 숫자 1 · 2 · 3 ── */}
        <div style={{
          display:'flex', gap:28, alignItems:'center', height:36,
          fontFamily:'var(--font-inter),sans-serif',
          fontSize:15, fontWeight:300, letterSpacing:'.4em',
          color:'rgba(199,210,254,.7)',
        }}>
          {showNum1 && <span style={{ animation:'tIn .6s ease forwards', opacity:0 }}>1</span>}
          {showNum2 && <span style={{ animation:'tIn .6s ease forwards', opacity:0 }}>2</span>}
          {showNum3 && <span style={{ animation:'tIn .6s ease forwards', opacity:0 }}>3</span>}
        </div>

        {/* ── 중앙: SVG 별자리 ── */}
        <svg width="360" height="400" viewBox="0 0 360 740"
          style={{ flex:1, maxHeight:420 }}>

          {/* 연결선: 별 다 뜬 뒤에만 */}
          {ph !== 'stars' && EDGES.map(([a, b], i) => {
            const s = STARS[a], e = STARS[b];
            const len = Math.hypot(e.cx-s.cx, e.cy-s.cy);
            return (
              <line key={i} x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                stroke="rgba(129,140,248,.28)" strokeWidth="1"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lDraw .6s ease ${i*0.07}s forwards` }}
              />
            );
          })}

          {/* 별: 그룹(3개씩)으로 fade-in, scale 없이 순수 opacity */}
          {STARS.map((s, i) => (
            <g key={i} opacity={0}
              style={{ animation:`sFade .7s ease ${Math.floor(i/3)*0.4}s forwards` }}>
              {/* 외곽 헤일로 */}
              <circle cx={s.cx} cy={s.cy} r={16} fill="rgba(129,140,248,.05)"/>
              {/* 중간 */}
              <circle cx={s.cx} cy={s.cy} r={8}  fill="rgba(165,180,252,.12)"/>
              {/* 핵 */}
              <circle cx={s.cx} cy={s.cy} r={3.2} fill="#dde7ff" opacity={.9}/>
            </g>
          ))}
        </svg>

        {/* ── 하단: Connecting / the / Dots ── */}
        <div style={{
          textAlign:'center', lineHeight:1.55,
          fontFamily:'var(--font-noto-serif),Georgia,serif',
          fontStyle:'italic', fontWeight:700,
          color:'rgba(255,255,255,.62)', letterSpacing:'.04em',
        }}>
          {showWord1 && (
            <div style={{ fontSize:16, animation:'tIn .7s ease forwards', opacity:0 }}>
              Connecting
            </div>
          )}
          {showWord2 && (
            <div style={{ fontSize:16, animation:'tIn .7s ease forwards', opacity:0 }}>
              the
            </div>
          )}
          {showWord3 && (
            <div style={{ fontSize:16, animation:'tIn .7s ease forwards', opacity:0 }}>
              Dots
            </div>
          )}
        </div>

      </div>
    </>
  );
}
