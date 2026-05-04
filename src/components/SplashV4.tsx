'use client';
import { useEffect, useRef, useState } from 'react';

const TARGET: number[][] = [
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
const N = TARGET.length;

const EDGES: number[][] = [
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

const T_SCATTER = 1000;
const T_GATHER  = 2600;
const T_GSTART  = T_SCATTER;
const T_GEND    = T_SCATTER + T_GATHER;
const T_LINE_S  = 2200;
const T_LINE_DUR= 1400;
const T_FADE_S  = 5500;
const T_END     = 7000;

const lineDelay = EDGES.map((_,i) => (i / EDGES.length) * T_LINE_DUR);

type Pt = { x:number; y:number; z:number; s:number };
type Drift = { ax:number; ay:number; az:number; fx:number; fy:number; fz:number; px:number; py:number; pz:number };

function rand(lo:number, hi:number){ return lo + Math.random()*(hi-lo); }

export default function SplashV4() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showText, setShowText] = useState(false);
  const [showDL,   setShowDL]   = useState(false);
  const [fading,   setFading]   = useState(false);
  const [hidden,   setHidden]   = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) { setHidden(true); return; }
    sessionStorage.setItem('splashShown', '1');

    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W=0, H=0, cx=0, cy=0, sc=0;
    let rafId=0, t0:number|null=null, ended=false, txtShown=false;

    const scattered = TARGET.map(() => [rand(-3.5,3.5), rand(-3.5,3.5), rand(-1.5,1.5)]);
    const drift: Drift[] = TARGET.map(() => ({
      ax:rand(0.3,0.8), ay:rand(0.3,0.8), az:rand(0.2,0.5),
      fx:rand(0.8,1.5), fy:rand(0.8,1.5), fz:rand(0.6,1.2),
      px:rand(0,6.28),  py:rand(0,6.28),  pz:rand(0,6.28),
    }));

    function resize(){
      W=window.innerWidth; H=window.innerHeight;
      el.width=W*dpr; el.height=H*dpr;
      el.style.width=W+'px'; el.style.height=H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cx=W/2; cy=H/2-10; sc=Math.min(W,H)*0.24;
    }
    resize();
    window.addEventListener('resize', resize);

    function getPos(i:number, ms:number): number[] {
      const s=scattered[i], tgt=TARGET[i], d=drift[i];
      if(ms < T_GSTART){
        const sec=ms/1000;
        return [s[0]+Math.sin(sec*d.fx+d.px)*d.ax*0.15, s[1]+Math.sin(sec*d.fy+d.py)*d.ay*0.15, s[2]+Math.sin(sec*d.fz+d.pz)*d.az*0.1];
      }
      if(ms < T_GEND){
        const raw=(ms-T_GSTART)/T_GATHER;
        const t=easeInOut(Math.min(raw,1));
        const sec=ms/1000, ds=1-t;
        return [lerp(s[0],tgt[0],t)+Math.sin(sec*d.fx+d.px)*d.ax*0.15*ds, lerp(s[1],tgt[1],t)+Math.sin(sec*d.fy+d.py)*d.ay*0.15*ds, lerp(s[2],tgt[2],t)+Math.sin(sec*d.fz+d.pz)*d.az*0.1*ds];
      }
      return [...tgt];
    }

    function lerp(a:number,b:number,t:number){ return a+(b-a)*t; }
    function easeInOut(t:number){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
    function easeOut(t:number){ return 1-(1-t)*(1-t)*(1-t); }

    function proj(v:number[], rY:number, rX:number): Pt {
      const[x,y,z]=v;
      const cY=Math.cos(rY),sY=Math.sin(rY);
      const x1=x*cY-z*sY, z1=x*sY+z*cY;
      const cX=Math.cos(rX),sX=Math.sin(rX);
      const y1=y*cX-z1*sX, z2=y*sX+z1*cX;
      const p=2.8/(2.8+z2);
      return{x:cx+x1*sc*p, y:cy-y1*sc*p, z:z2, s:p};
    }

    function drawDot(px:number,py:number,s:number,a:number,pulse:number){
      const r=Math.max(2,3.2*s)*pulse, gr=r*5;
      const g=ctx.createRadialGradient(px,py,0,px,py,gr);
      g.addColorStop(0,`rgba(165,175,255,${0.5*a})`);
      g.addColorStop(0.25,`rgba(125,140,255,${0.13*a})`);
      g.addColorStop(1,'rgba(100,120,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,gr,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=`rgba(228,232,255,${a})`; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    }

    function drawLine(a:Pt,b:Pt,prog:number,alpha:number){
      const mx=a.x+(b.x-a.x)*prog, my=a.y+(b.y-a.y)*prog;
      const bright=0.28+0.28*((1-(a.z+b.z)/2)/2);
      ctx.strokeStyle=`rgba(130,150,255,${bright*alpha})`; ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mx,my); ctx.stroke();
    }

    function drawGhostLines(projs:Pt[], alpha:number){
      const threshold=sc*1.2; ctx.lineWidth=0.3;
      for(let i=0;i<N;i++){
        for(let j=i+1;j<N;j++){
          const dx=projs[i].x-projs[j].x, dy=projs[i].y-projs[j].y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<threshold){
            const fade=(1-dist/threshold)*0.12*alpha;
            ctx.strokeStyle=`rgba(130,150,255,${fade})`;
            ctx.beginPath(); ctx.moveTo(projs[i].x,projs[i].y); ctx.lineTo(projs[j].x,projs[j].y); ctx.stroke();
          }
        }
      }
    }

    function frame(now:number){
      if(ended) return;
      if(!t0) t0=now;
      const ms=now-t0;
      if(ms>=T_END){
        ended=true; setFading(true);
        setTimeout(()=>setHidden(true),460);
        return;
      }
      const ma=ms>T_FADE_S?Math.max(0,1-(ms-T_FADE_S)/(T_END-T_FADE_S)):1;
      let rY:number, rX:number;
      if(ms<T_GSTART){ rY=-0.3; rX=0.25; }
      else if(ms<T_GEND){ const p=(ms-T_GSTART)/T_GATHER; rY=-0.3+p*0.2; rX=0.25+p*0.15; }
      else{ const t=ms-T_GEND; rY=-0.1+t*0.0003; rX=0.4+Math.sin(t*0.0006)*0.12; }

      ctx.clearRect(0,0,W,H);
      const positions: number[][] = [];
      const projs: Pt[] = [];
      for(let i=0;i<N;i++){
        const pos=getPos(i,ms); positions.push(pos); projs.push(proj(pos,rY,rX));
      }

      if(ms<T_LINE_S) drawGhostLines(projs,ma);

      if(ms>=T_LINE_S){
        if(!txtShown){ setShowText(true); txtShown=true; }
        const lms=ms-T_LINE_S;
        const sorted=EDGES.map((e,i)=>({e,i,z:(projs[e[0]].z+projs[e[1]].z)/2})).sort((a,b)=>b.z-a.z);
        for(const{e,i}of sorted){
          const t=lms-lineDelay[i]; if(t<=0) continue;
          const prog=Math.min(1,easeOut(Math.min(t/320,1)));
          drawLine(projs[e[0]],projs[e[1]],prog,ma);
        }
      }

      const sd=projs.map((p,i)=>({p,i})).sort((a,b)=>b.p.z-a.p.z);
      for(const{p,i}of sd){
        let pulse=1;
        if(ms<T_GEND) pulse=0.7+0.3*Math.sin(ms*0.004+i*1.2);
        else pulse=0.85+0.15*Math.sin((ms-T_GEND)*0.003+i*0.65);
        drawDot(p.x,p.y,p.s,ma,pulse);
      }

      if(ms>T_GSTART && ms<T_GEND+400){
        const gp=Math.min(1,(ms-T_GSTART)/T_GATHER);
        if(gp>0.3){
          const ta=(1-gp)*0.3*ma;
          for(let i=0;i<N;i++){
            const prev=getPos(i,ms-80), pp=proj(prev,rY,rX);
            ctx.fillStyle=`rgba(160,170,255,${ta})`;
            ctx.beginPath(); ctx.arc(pp.x,pp.y,Math.max(1,1.5*pp.s),0,Math.PI*2); ctx.fill();
          }
        }
      }

      rafId=requestAnimationFrame(frame);
    }
    rafId=requestAnimationFrame(frame);
    return()=>{ cancelAnimationFrame(rafId); window.removeEventListener('resize',resize); };
  },[]);

  useEffect(()=>{
    if(!showText) return;
    const t=setTimeout(()=>setShowDL(true), 1200);
    return()=>clearTimeout(t);
  },[showText]);

  if(hidden) return null;
  return(
    <>
      <style>{`
        @keyframes sOut { from{opacity:1} to{opacity:0} }
        @keyframes dlIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{position:'fixed',inset:0,zIndex:9999,background:'#000',animation:fading?'sOut .45s ease forwards':undefined}}>
        <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%'}}/>
        <div style={{
          position:'absolute',bottom:'24%',left:0,width:'100%',textAlign:'center',pointerEvents:'none',
          opacity:showText?1:0, transform:showText?'translateY(0)':'translateY(12px)',
          transition:'opacity 1s ease, transform 1s ease',
        }}>
          <span style={{fontFamily:'var(--font-inter),-apple-system,sans-serif',fontSize:13,letterSpacing:'5.5px',textTransform:'uppercase',color:'rgba(175,185,255,0.88)',fontWeight:300}}>
            Connecting the Dots
          </span>
        </div>
        {showDL && (
          <div style={{position:'absolute',bottom:'17%',left:0,width:'100%',textAlign:'center',pointerEvents:'none',animation:'dlIn .7s ease forwards',opacity:0}}>
            <span style={{fontFamily:'var(--font-inter),sans-serif',fontWeight:600,fontSize:18,letterSpacing:'.16em',textTransform:'uppercase',color:'rgba(255,255,255,.88)'}}>
              Deep Learning
            </span>
          </div>
        )}
      </div>
    </>
  );
}