'use client';
import { useEffect, useState } from 'react';

/* ── 별: 화면 전체에 넓게 분포 (viewBox 400×800) ── */
const STARS = [
  { cx: 42,  cy: 88  },
  { cx: 335, cy: 72  },
  { cx: 172, cy: 132 },
  { cx: 20,  cy: 318 },
  { cx: 368, cy: 290 },
  { cx: 198, cy: 375 },
  { cx: 82,  cy: 542 },
  { cx: 302, cy: 522 },
  { cx: 148, cy: 688 },
  { cx: 278, cy: 705 },
];

/* 각 별 제멋대로 등장하는 느낌의 딜레이 */
const DELAYS = [0.2, 0.7, 0.1, 1.0, 0.45, 0.85, 0.3, 1.1, 0.6, 0.95];

/* 별자리/뉴런 느낌 — 사각형 외곽 X, 유기적 교차 */
const EDGES: [number, number][] = [
  [0,2],[2,1],[0,3],[2,5],[1,4],[3,5],[4,5],[3,6],[5,7],[6,8],[7,9],[5,8],
];

const FULL_TEXT = 'Connecting the Dots';

export default function SplashV4() {
  const [linesOn, setLinesOn]   = useState(false);
  const [typed, setTyped]       = useState('');
  const [fading, setFading]     = useState(false);
  const [hidden, setHidden]     = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const t1 = setTimeout(() => setLinesOn(true), 2000);
    const t2 = setTimeout(() => setFading(true),  5800);
    const t3 = setTimeout(() => setHidden(true),  6600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  /* 타이핑 효과: 선이 시작되는 순간부터 */
  useEffect(() => {
    if (!linesOn) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) clearInterval(iv);
    }, 72);
    return () => clearInterval(iv);
  }, [linesOn]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes sFade { from{opacity:0} to{opacity:.88} }
        @keyframes lDraw { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        animation: fading ? 'sOut .85s ease forwards' : undefined,
      }}>

        {/* 전체화면 SVG */}
        <svg width="100%" height="100%" viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          style={{ position:'absolute', inset:0 }}>

          {/* 연결선 */}
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

          {/* 별: 글로우 없음, 단순 서클, 제각각 딜레이 */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={3.2}
              fill="#bfcbf7" opacity={0}
              style={{ animation:`sFade .55s ease ${DELAYS[i]}s forwards` }}
            />
          ))}
        </svg>

        {/* Connecting the Dots — 타이핑 효과 */}
        {linesOn && (
          <div style={{
            position:'absolute', bottom:'14%',
            left:0, right:0, textAlign:'center',
            fontFamily:'var(--font-noto-serif), Georgia, serif',
            fontStyle:'italic', fontWeight:700,
            fontSize:17, letterSpacing:'.04em',
            color:'rgba(255,255,255,.6)',
          }}>
            {typed}
            {/* 커서 */}
            {typed.length < FULL_TEXT.length && (
              <span style={{
                display:'inline-block', width:1.5, height:'0.9em',
                background:'rgba(255,255,255,.55)',
                marginLeft:1.5, verticalAlign:'middle',
                animation:'blink .6s ease infinite',
              }}/>
            )}
          </div>
        )}

      </div>
    </>
  );
}
