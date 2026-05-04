'use client';
import { useEffect, useState } from 'react';

/* ── 별: cx 110~290 (400 기준 60%), cy 130~620 ── */
const STARS = [
  { cx: 118, cy: 138 },
  { cx: 285, cy: 118 },
  { cx: 195, cy: 185 },
  { cx: 112, cy: 295 },
  { cx: 288, cy: 272 },
  { cx: 205, cy: 355 },
  { cx: 122, cy: 455 },
  { cx: 278, cy: 438 },
  { cx: 168, cy: 568 },
  { cx: 258, cy: 595 },
];

/* 각자 다른 타이밍 — 제멋대로 등장 */
const DELAYS = [0.15, 0.75, 0.05, 1.05, 0.45, 0.85, 0.35, 1.2, 0.6, 0.95];

/* 별자리/뉴런 느낌 (외곽 사각 X) */
const EDGES: [number, number][] = [
  [0,2],[1,2],[0,3],[2,5],[1,4],[3,5],[4,5],[3,6],[5,7],[5,8],[6,8],[7,9],
];

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

    const t1 = setTimeout(() => setLinesOn(true), 2000);
    const t2 = setTimeout(() => setFading(true),  6200);
    const t3 = setTimeout(() => setHidden(true),  7000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  /* 타이핑 → 완료 후 "deep learning" 등장 */
  useEffect(() => {
    if (!linesOn) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(iv);
        setTimeout(() => setShowDL(true), 300);
      }
    }, 72);
    return () => clearInterval(iv);
  }, [linesOn]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes sFade { from{opacity:0} to{opacity:.85} }
        @keyframes lDraw { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dlIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>

        {/* SVG 별자리 */}
        <svg width="100%" height="100%" viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid meet"
          style={{ position:'absolute', inset:0 }}>

          {linesOn && EDGES.map(([a, b], i) => {
            const s = STARS[a], e = STARS[b];
            const len = Math.hypot(e.cx - s.cx, e.cy - s.cy);
            return (
              <line key={i} x1={s.cx} y1={s.cy} x2={e.cx} y2={e.cy}
                stroke="rgba(129,140,248,.22)" strokeWidth="1"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lDraw .75s ease ${i * 0.09}s forwards` }}
              />
            );
          })}

          {STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={3}
              fill="#c4cffc" opacity={0}
              style={{ animation:`sFade .5s ease ${DELAYS[i]}s forwards` }}
            />
          ))}
        </svg>

        {/* 하단 텍스트 */}
        {linesOn && (
          <div style={{
            position:'absolute', bottom:'12%',
            left:0, right:0, textAlign:'center',
          }}>
            {/* Connecting the Dots — 타이핑 */}
            <div style={{
              fontFamily:'var(--font-noto-serif), Georgia, serif',
              fontStyle:'italic', fontWeight:700,
              fontSize:16, letterSpacing:'.04em',
              color:'rgba(255,255,255,.55)',
              marginBottom: 10,
            }}>
              {typed}
              {typed.length < FULL_TEXT.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.85em',
                  background:'rgba(255,255,255,.5)',
                  marginLeft:2, verticalAlign:'middle',
                  animation:'blink .55s ease infinite',
                }}/>
              )}
            </div>

            {/* deep learning — Inter 라이트, 타이핑 완료 후 */}
            {showDL && (
              <div style={{
                fontFamily:'var(--font-inter), sans-serif',
                fontWeight:300, fontSize:18,
                letterSpacing:'.18em', textTransform:'uppercase',
                color:'rgba(255,255,255,.75)',
                animation:'dlIn .7s ease forwards', opacity:0,
              }}>
                Deep Learning
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
