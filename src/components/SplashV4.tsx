'use client';
import { useEffect, useRef, useState } from 'react';

/* ── 뉴런 노드 12개 (정팔면체 + 내부) ── */
const V: number[][] = [
  [ 0,    1.15,  0   ],
  [ 0,   -1.15,  0   ],
  [ 1.05, 0,     0   ],
  [-1.05, 0,     0   ],
  [ 0,    0,     1.05],
  [ 0,    0,    -1.05],
  [ 0.48, 0.52,  0.48],
  [-0.48, 0.52,  0.48],
  [ 0.48, 0.52, -0.48],
  [-0.48, 0.52, -0.48],
  [ 0.48,-0.52,  0.48],
  [-0.48,-0.52,  0.48],
];

/* ── 시냅스 31개 ── */
const E: number[][] = [
  [0,2],[0,3],[0,4],[0,5],
  [1,2],[1,3],[1,4],[1,5],
  [2,4],[4,3],[3,5],[5,2],
  [0,6],[0,7],[0,8],[0,9],
  [6,2],[6,4],[7,3],[7,4],
  [8,2],[8,5],[9,3],[9,5],
  [10,1],[11,1],
  [10,2],[10,4],[11,3],[11,4],
  [6,10],[7,11],
];

const T_DOT  = 1200;
const T_LS   = 800;
const T_LD   = 1800;
const T_IDLE = T_LS + T_LD;
const T_FADE = 5500;
const T_END  = 7000;

const dDot  = V.map((_, i) => (i / V.length) * T_DOT);
const dLine = E.map((_, i) => (i / E.length) * T_LD);

const FULL = 'Connecting the Dots';

type Pt = { x: number; y: number; z: number; s: number };

export default function SplashV4() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [typed,    setTyped]    = useState('');
  const [showText, setShowText] = useState(false);
  const [showDL,   setShowDL]   = useState(false);
  const [fading,   setFading]   = useState(false);
  const [hidden,   setHidden]   = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, cx = 0, cy = 0, sc = 0;
    let rafId = 0, t0: number | null = null, ended = false, txtShown = false;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2 - 16;
      sc = Math.min(W, H) * 0.26;
    }
    resize();
    window.addEventListener('resize', resize);

    function proj(v: number[], rY: number, rX: number): Pt {
      const [x, y, z] = v;
      const cY = Math.cos(rY), sY = Math.sin(rY);
      const x1 = x*cY - z*sY, z1 = x*sY + z*cY;
      const cX = Math.cos(rX), sX = Math.sin(rX);
      const y1 = y*cX - z1*sX, z2 = y*sX + z1*cX;
      const p = 2.8 / (2.8 + z2);
      return { x: cx + x1*sc*p, y: cy - y1*sc*p, z: z2, s: p };
    }

    function easeOut(t: number) { return 1 - (1-t)*(1-t)*(1-t); }

    function drawDot(px: number, py: number, s: number, a: number) {
      const r  = Math.max(2.2, 3.5 * s);
      const gr = r * 4.5;
      const g  = ctx.createRadialGradient(px, py, 0, px, py, gr);
      g.addColorStop(0,   `rgba(165,175,255,${0.55 * a})`);
      g.addColorStop(0.3, `rgba(125,140,255,${0.14 * a})`);
      g.addColorStop(1,   'rgba(100,120,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, gr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(228,232,255,${a})`;
      ctx.beginPath(); ctx.arc(px, py, r,  0, Math.PI*2); ctx.fill();
    }

    function drawLine(a: Pt, b: Pt, prog: number, alpha: number) {
      const mx = a.x + (b.x - a.x) * prog;
      const my = a.y + (b.y - a.y) * prog;
      const bright = 0.3 + 0.25 * ((1 - (a.z + b.z) / 2) / 2);
      ctx.strokeStyle = `rgba(130,148,255,${bright * alpha})`;
      ctx.lineWidth   = 0.7;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke();
    }

    function frame(now: number) {
      if (ended) return;
      if (!t0) t0 = now;
      const ms = now - t0;

      if (ms >= T_END) {
        ended = true;
        setFading(true);
        setTimeout(() => setHidden(true), 900);
        return;
      }

      const ma = ms > T_FADE ? 1 - (ms - T_FADE) / (T_END - T_FADE) : 1;

      let rY: number, rX: number;
      if (ms < T_IDLE) {
        const p = ms / T_IDLE;
        rY = -0.35 + p * 0.25;
        rX =  0.28 + p * 0.12;
      } else {
        const t = ms - T_IDLE;
        rY = -0.1 + t * 0.00035;
        rX =  0.4 + Math.sin(t * 0.0007) * 0.13;
      }

      ctx.clearRect(0, 0, W, H);
      const P = V.map(v => proj(v, rY, rX));

      /* 선 (z-sort 뒤→앞) */
      if (ms > T_LS) {
        const lms = ms - T_LS;
        if (!txtShown) { setShowText(true); txtShown = true; }

        const sorted = E.map((e, i) => ({
          e, i, z: (P[e[0]].z + P[e[1]].z) / 2,
        })).sort((a, b) => b.z - a.z);

        for (const { e, i } of sorted) {
          const t = lms - dLine[i];
          if (t <= 0) continue;
          const prog = Math.min(1, easeOut(Math.min(t / 350, 1)));
          drawLine(P[e[0]], P[e[1]], prog, ma);
        }
      }

      /* 점 (z-sort) */
      const sd = P.map((p, i) => ({ p, i })).sort((a, b) => b.p.z - a.p.z);
      for (const { p, i } of sd) {
        const t = ms - dDot[i];
        if (t <= 0) continue;
        let ap = Math.min(1, easeOut(Math.min(t / 220, 1)));
        if (ms > T_IDLE) ap *= 0.82 + 0.18 * Math.sin((ms - T_IDLE) * 0.003 + i * 0.65);
        drawDot(p.x, p.y, p.s, ap * ma);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* 타이핑 효과 */
  useEffect(() => {
    if (!showText) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL.slice(0, i));
      if (i >= FULL.length) {
        clearInterval(iv);
        setTimeout(() => setShowDL(true), 450);
      }
    }, 68);
    return () => clearInterval(iv);
  }, [showText]);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes sOut  { from{opacity:1} to{opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dlIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999, background:'#000',
        animation: fading ? 'sOut .9s ease forwards' : undefined,
      }}>
        <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />

        {/* 텍스트 오버레이 */}
        <div style={{
          position:'absolute', bottom:'26%', left:0, width:'100%',
          textAlign:'center', pointerEvents:'none',
        }}>
          {showText && (
            <div style={{
              fontFamily:'var(--font-inter), -apple-system, sans-serif',
              fontSize:12, letterSpacing:'5.5px',
              textTransform:'uppercase',
              color:'rgba(175,185,255,0.88)',
              fontWeight:300, marginBottom:14,
            }}>
              {typed}
              {typed.length < FULL.length && (
                <span style={{
                  display:'inline-block', width:1.5, height:'0.8em',
                  background:'rgba(175,185,255,0.6)',
                  marginLeft:2, verticalAlign:'middle',
                  animation:'blink .5s ease infinite',
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
