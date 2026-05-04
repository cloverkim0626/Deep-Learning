'use client';
import { useEffect, useState } from 'react';

/*
  피라미드 투시 (Perspective Pyramid)
  viewBox 0 0 320 480

  P1 = apex (꼭대기)
  P2 = front-left base  (가깝고 왼쪽, 낮음)
  P3 = front-right base (가깝고 오른쪽, 낮음)
  P4 = back-right base  (멀고 오른쪽, 높음)
  P5 = back-left base   (멀고 왼쪽, 높음)
  P6~P9 = 그림자/바닥 윤곽
*/
const NODES = [
  { cx: 160, cy: 58,  fill: '#dde7ff',              r: 3.5 }, // 0 P1 apex
  { cx: 82,  cy: 375, fill: '#dde7ff',              r: 3.5 }, // 1 P2 front-left
  { cx: 240, cy: 375, fill: '#dde7ff',              r: 3.5 }, // 2 P3 front-right
  { cx: 255, cy: 258, fill: 'rgba(165,180,252,.7)', r: 3   }, // 3 P4 back-right
  { cx: 125, cy: 258, fill: 'rgba(165,180,252,.7)', r: 3   }, // 4 P5 back-left
  { cx: 62,  cy: 415, fill: 'rgba(129,140,248,.3)', r: 2   }, // 5 P6 shadow
  { cx: 258, cy: 415, fill: 'rgba(129,140,248,.3)', r: 2   }, // 6 P7 shadow
  { cx: 285, cy: 242, fill: 'rgba(129,140,248,.3)', r: 2   }, // 7 P8 shadow
  { cx: 95,  cy: 242, fill: 'rgba(129,140,248,.3)', r: 2   }, // 8 P9 shadow
];

/* 무작위 등장 — base 노드 먼저, apex 중간, shadow 마지막 */
const ND = [0.45, 0.05, 0.18, 0.72, 0.88, 1.05, 0.95, 0.82, 0.65];

/*
  엣지 순서:
  1단계: 바닥면 (깊이감 형성)
  2단계: 앞기둥 → 뒤기둥 (입체 완성, 뒤는 opacity 낮춤)
  3단계: 그림자 (바닥에 놓인 느낌)
*/
const EDGES = [
  // Phase 1: Base rhombus — P2→P3→P4→P5→P2
  { a:1, b:2, op:'rgba(129,140,248,.50)', d:0    }, // 앞 엣지 (가장 밝음)
  { a:2, b:3, op:'rgba(129,140,248,.38)', d:0.18 }, // 오른쪽
  { a:3, b:4, op:'rgba(129,140,248,.25)', d:0.36 }, // 뒤 엣지 (가장 어두움)
  { a:4, b:1, op:'rgba(129,140,248,.38)', d:0.54 }, // 왼쪽
  // Phase 2: 앞 기둥 (밝음)
  { a:1, b:0, op:'rgba(129,140,248,.60)', d:0.80 }, // P2→P1
  { a:2, b:0, op:'rgba(129,140,248,.60)', d:0.95 }, // P3→P1
  // Phase 2: 뒤 기둥 (dim — 뒤에 숨겨진 느낌)
  { a:3, b:0, op:'rgba(129,140,248,.22)', d:1.10 }, // P4→P1 (비침)
  { a:4, b:0, op:'rgba(129,140,248,.22)', d:1.25 }, // P5→P1 (비침)
  // Phase 3: 그림자 윤곽 (very subtle)
  { a:5, b:6, op:'rgba(129,140,248,.13)', d:1.45 },
  { a:5, b:8, op:'rgba(129,140,248,.11)', d:1.55 },
  { a:6, b:7, op:'rgba(129,140,248,.11)', d:1.65 },
  { a:7, b:8, op:'rgba(129,140,248,.09)', d:1.75 },
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

    const t1 = setTimeout(() => setLinesOn(true), 1700); // 노드 다 뜬 후
    const t2 = setTimeout(() => setFading(true),  7200);
    const t3 = setTimeout(() => setHidden(true),  8000);
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
          0%   { stroke-dashoffset:1; opacity:0 }
          15%  { opacity:1 }
          100% { stroke-dashoffset:0 }
        }
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dlIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#07070e',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>

        <svg width="300" height="420" viewBox="0 0 320 460"
          style={{ marginTop: -30 }}>

          {/* 연결선 — 바닥부터 위로 */}
          {linesOn && EDGES.map((e, i) => {
            const s = NODES[e.a], t = NODES[e.b];
            const len = Math.hypot(t.cx - s.cx, t.cy - s.cy);
            return (
              <line key={i}
                x1={s.cx} y1={s.cy} x2={t.cx} y2={t.cy}
                stroke={e.op} strokeWidth="1.2"
                strokeDasharray={len} strokeDashoffset={len}
                style={{ animation:`lDraw .6s ease ${e.d}s forwards`, opacity:0 }}
              />
            );
          })}

          {/* 노드 — 깊이별 밝기 차등 */}
          {NODES.map((n, i) => (
            <g key={i} style={{ opacity:0, animation:`nFade .4s ease ${ND[i]}s forwards` }}>
              {i < 5 && (
                <circle cx={n.cx} cy={n.cy} r={n.r * 3.5}
                  fill={i < 3 ? 'rgba(129,140,248,.08)' : 'rgba(129,140,248,.04)'}/>
              )}
              <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill}/>
            </g>
          ))}
        </svg>

        {/* 텍스트 */}
        <div style={{ textAlign:'center', marginTop: 24 }}>
          {linesOn && (
            <div style={{
              fontFamily:'var(--font-inter), sans-serif',
              fontWeight:300, fontSize:12, letterSpacing:'.16em',
              color:'rgba(255,255,255,.38)', marginBottom:14, minHeight:18,
            }}>
              {typed}
              {typed.length < FULL.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.8em',
                  background:'rgba(255,255,255,.35)',
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
