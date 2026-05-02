"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Zap, Brain, Sparkles, X, Layers, Flame, BarChart2, HelpCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function getDday() {
  const today = new Date();
  const year = today.getFullYear();
  const csat = new Date(year, 10, 13);
  if (today > csat) csat.setFullYear(year + 1);
  return Math.ceil((csat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const ROTATING_WORDS = ["어휘력", "독해력", "논리력", "사고력", "실전력"];

export default function Home() {
  const [dday, setDday] = useState<number | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [passageCount, setPassageCount] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    supabase.from('word_sets').select('id', { count: 'exact', head: true })
      .then(({ count }) => setPassageCount(count ?? 0));
  }, []);

  useEffect(() => { setDday(getDday()); }, []);

  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % ROTATING_WORDS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Deep Sea Animated Background */}
      <style>{`
        /* ── 실제 기포: 구면 하이라이트 + 경로 흔들림 ── */
        @keyframes bubbleFloat {
          0%   { transform: translateY(0px)   translateX(0px);   opacity:0; }
          8%   { opacity: var(--op); }
          50%  { transform: translateY(-50vh)  translateX(var(--d1)); opacity: var(--op); }
          92%  { opacity: calc(var(--op)*0.4); }
          100% { transform: translateY(-108vh) translateX(var(--d2)); opacity:0; }
        }
        .real-bubble {
          position:absolute; border-radius:50%;
          /* 유리구슬: 왼쪽 상단 하이라이트 + 오른쪽 하단 반사 */
          background:
            radial-gradient(circle at 30% 28%, rgba(220,245,255,0.92) 0%, rgba(180,230,255,0.0) 38%),
            radial-gradient(circle at 68% 72%, rgba(80,160,220,0.18) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(40,120,200,0.06) 0%, transparent 100%);
          border: 1px solid rgba(160,220,255,0.35);
          box-shadow:
            inset 0 0 4px rgba(100,180,255,0.2),
            0 0 6px rgba(80,160,255,0.08);
          animation: bubbleFloat var(--dur) var(--delay) infinite cubic-bezier(0.45,0,0.55,1);
        }

        /* ── 메인 심해 빛줄기 (god-ray) ── */
        @keyframes godRayPulse {
          0%,100% { opacity:0.07; transform:rotate(var(--ra)) scaleX(1);   }
          30%     { opacity:0.13; transform:rotate(calc(var(--ra)+1.2deg)) scaleX(1.06); }
          60%     { opacity:0.09; transform:rotate(calc(var(--ra)-0.8deg)) scaleX(0.97); }
        }
        @keyframes causticsShimmer {
          0%,100% { opacity:0.04; }
          50%     { opacity:0.09; }
        }
        .god-ray {
          position:absolute; top:-5%; left:50%;
          transform-origin: top center;
          animation: godRayPulse var(--pd) ease-in-out infinite;
        }

        /* ── 보조 가느다란 광선들 ── */
        @keyframes thinRay {
          0%,100% { opacity:0.03; }
          50%     { opacity:0.07; }
        }
        .thin-ray {
          position:absolute; top:0;
          width:40px; height:75%;
          background:linear-gradient(180deg, rgba(140,210,255,0.2) 0%, transparent 100%);
          transform-origin:top center;
          animation: thinRay var(--td) ease-in-out infinite alternate;
          filter: blur(6px);
        }

        /* ── 발광 심해 생명체 ── */
        @keyframes creatureDrift {
          0%   { transform:translateX(-120px) translateY(0px) scaleX(1);   opacity:0; }
          8%   { opacity:var(--cop); }
          45%  { transform:translateX(var(--cx)) translateY(var(--cy)) scaleX(1);   opacity:var(--cop); }
          55%  { transform:translateX(var(--cx)) translateY(var(--cy)) scaleX(-1);  opacity:var(--cop); }
          92%  { opacity:calc(var(--cop)*0.3); }
          100% { transform:translateX(calc(100vw + 120px)) translateY(calc(var(--cy)*0.6)) scaleX(-1); opacity:0; }
        }
        .creature {
          position:absolute;
          animation: creatureDrift var(--cd) var(--cdelay) infinite linear;
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{background:'linear-gradient(180deg,#020d1a 0%,#041325 25%,#031020 60%,#050e18 100%)'}}>

        {/* ══ 메인 GOD-RAY: 수면에서 내려오는 한 줄기 빛 ══ */}
        {/* 넓은 원뿔형 빛 */}
        <div className="god-ray" style={{
          width:'340px', height:'100%', marginLeft:'-170px',
          background:'linear-gradient(180deg, rgba(100,200,255,0.18) 0%, rgba(60,160,240,0.06) 35%, rgba(20,80,160,0.02) 65%, transparent 100%)',
          filter:'blur(18px)',
          '--ra':'-1deg','--pd':'7s',
        } as React.CSSProperties} />
        {/* 중심 밝은 코어 */}
        <div className="god-ray" style={{
          width:'80px', height:'78%', marginLeft:'-40px',
          background:'linear-gradient(180deg, rgba(200,235,255,0.22) 0%, rgba(120,200,255,0.08) 40%, transparent 100%)',
          filter:'blur(5px)',
          '--ra':'0.5deg','--pd':'5.5s',
        } as React.CSSProperties} />
        {/* 수면 입수 지점 광원 */}
        <div style={{
          position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
          width:'180px', height:'60px',
          background:'radial-gradient(ellipse at 50% 0%, rgba(160,220,255,0.25) 0%, transparent 100%)',
          filter:'blur(8px)',
          animation:'causticsShimmer 3.8s ease-in-out infinite',
        }} />
        {/* 코스틱 패턴 (caustics: 빛이 물에 굴절되는 패턴) */}
        {[{x:'46%',w:'12px',h:'55%',d:'4.1s'},{x:'52%',w:'8px',h:'48%',d:'3.3s'},{x:'49%',w:'5px',h:'40%',d:'5.2s'}].map((c,i)=>(
          <div key={i} style={{
            position:'absolute', top:0, left:c.x, width:c.w, height:c.h,
            background:'linear-gradient(180deg,rgba(180,230,255,0.28) 0%,transparent 100%)',
            filter:'blur(2px)', transformOrigin:'top center',
            animation:`causticsShimmer ${c.d} ease-in-out infinite`,
            animationDelay:`${i*0.7}s`,
          }} />
        ))}

        {/* ══ 보조 가느다란 광선들 ══ */}
        {[{l:'22%',r:'-3deg',td:'6.1s'},{l:'35%',r:'-1deg',td:'4.8s'},{l:'65%',r:'2deg',td:'5.5s'},{l:'78%',r:'4deg',td:'7.2s'}].map((t,i)=>(
          <div key={i} className="thin-ray" style={{left:t.l,transform:`rotate(${t.r})`,'--td':t.td} as React.CSSProperties} />
        ))}

        {/* ══ 실제 기포 ══ */}
        {[
          {l:'7%', s:9, dur:'13s',del:'0s',  d1:'8px',  d2:'-5px', op:0.75},
          {l:'15%',s:5, dur:'17s',del:'3.2s',d1:'-6px', d2:'10px', op:0.65},
          {l:'27%',s:12,dur:'11s',del:'1.5s',d1:'14px', d2:'4px',  op:0.55},
          {l:'38%',s:4, dur:'19s',del:'5.1s',d1:'-4px', d2:'-9px', op:0.7},
          {l:'52%',s:7, dur:'14s',del:'0.7s',d1:'10px', d2:'-6px', op:0.6},
          {l:'63%',s:5, dur:'16s',del:'4.3s',d1:'-8px', d2:'12px', op:0.65},
          {l:'71%',s:10,dur:'12s',del:'2.8s',d1:'6px',  d2:'-4px', op:0.5},
          {l:'80%',s:4, dur:'20s',del:'6.0s',d1:'-5px', d2:'7px',  op:0.7},
          {l:'88%',s:7, dur:'15s',del:'1.1s',d1:'9px',  d2:'-3px', op:0.55},
          {l:'23%',s:3, dur:'22s',del:'8.0s',d1:'-3px', d2:'5px',  op:0.8},
        ].map((b,i)=>(
          <div key={i} className="real-bubble" style={{
            left:b.l, bottom:'-16px',
            width:b.s+'px', height:b.s+'px',
            '--dur':b.dur,'--delay':b.del,'--d1':b.d1,'--d2':b.d2,'--op':b.op,
          } as React.CSSProperties} />
        ))}

        {/* ══ 발광 심해 생명체 ══ */}
        {[
          {top:'28%',cd:'32s',cdelay:'0s',   cx:'40vw', cy:'-12px', cop:0.55, color:'#7dd3fc', r:8, ry:3},
          {top:'52%',cd:'45s',cdelay:'8s',   cx:'55vw', cy:'8px',   cop:0.4,  color:'#a5f3fc', r:5, ry:2},
          {top:'38%',cd:'60s',cdelay:'18s',  cx:'48vw', cy:'-5px',  cop:0.35, color:'#93c5fd', r:11,ry:4},
          {top:'65%',cd:'38s',cdelay:'25s',  cx:'35vw', cy:'15px',  cop:0.45, color:'#6ee7b7', r:6, ry:2},
          {top:'20%',cd:'52s',cdelay:'33s',  cx:'52vw', cy:'-8px',  cop:0.3,  color:'#c4b5fd', r:4, ry:1.5},
        ].map((c,i)=>(
          <div key={i} className="creature" style={{
            top:c.top,'--cd':c.cd,'--cdelay':c.cdelay,
            '--cx':c.cx,'--cy':c.cy,'--cop':c.cop,
          } as React.CSSProperties}>
            {/* 몸통 */}
            <div style={{
              width:c.r*2+'px', height:c.ry*2+'px', borderRadius:'50%',
              background:`radial-gradient(ellipse at 40% 40%, ${c.color} 0%, transparent 70%)`,
              boxShadow:`0 0 ${c.r+4}px ${c.r/2}px ${c.color}55, 0 0 ${c.r*2}px ${c.color}22`,
              position:'relative',
            }}>
              {/* 꼬리 */}
              <div style={{
                position:'absolute', right:-(c.r*0.8)+'px', top:'50%',
                transform:'translateY(-50%)',
                width:c.r*0.9+'px', height:c.ry*1.2+'px',
                borderRadius:'0 50% 50% 0',
                background:`${c.color}44`,
                clipPath:'polygon(0 30%, 100% 0%, 100% 100%, 0 70%)',
              }} />
            </div>
          </div>
        ))}

        {/* 심해 배경 glow 유지 */}
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(0,80,160,0.18) 0%, transparent 70%)'}} />
        <div className="absolute bottom-0 left-0 right-0 h-[30%]" style={{background:'linear-gradient(0deg, rgba(0,20,40,0.7) 0%, transparent 100%)'}} />
      </div>

      <div className="z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">

        {/* D-DAY Badge */}
        {dday !== null && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold tracking-wider animate-in zoom-in duration-700 delay-300"
            style={{background:'rgba(0,100,200,0.25)',border:'1px solid rgba(100,180,255,0.3)',color:'rgba(150,210,255,0.9)'}}>
            <Zap size={10} strokeWidth={2.5} />
            수능까지 D-{dday}
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-5">
          {/* 돋보기 로고 — 깊이 있는 학습의 상징 */}
          <div className="w-14 h-14 rounded-[1.4rem] flex items-center justify-center mx-auto hover:rotate-12 transition-transform duration-500 cursor-default"
            style={{
              background:'rgba(255,255,255,0.12)',
              border:'1.5px solid rgba(200,235,255,0.6)',
              backdropFilter:'blur(12px)',
              boxShadow:'0 0 20px rgba(120,200,255,0.35), 0 0 40px rgba(80,160,255,0.15), inset 0 1px 1px rgba(255,255,255,0.5)',
              color:'rgba(220,240,255,0.95)',
            }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 렌즈 외각 */}
              <circle cx="11.5" cy="11.5" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              {/* 렌즈 내부 - 깊이감 */}
              <circle cx="11.5" cy="11.5" r="4.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
              {/* 손잡이 */}
              <line x1="17.5" y1="17.5" x2="24" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* 렌즈 위 하이라이트 */}
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" fillOpacity="0.25" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-[42px] md:text-[52px] text-white serif leading-[0.9] tracking-[-0.03em] font-light">
              Deep<br />Learning
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] mt-1" style={{color:'rgba(120,180,255,0.5)'}}>
              Produced by Team Parallax
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-[1px] w-6 bg-foreground/15" />
            <div className="text-[13px] font-normal mt-1" style={{color:'rgba(120,180,255,0.6)'}}>
              <span key={wordIdx} className="inline-block animate-in fade-in slide-in-from-bottom-2 duration-400">
                {ROTATING_WORDS[wordIdx]}
              </span>을 키워드립니다
            </div>
            <div className="h-[1px] w-6 bg-foreground/15" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { icon: <Search size={14} />, label: "등록 지문", value: passageCount !== null ? `${passageCount}개` : '...' },
            { icon: <Brain size={14} />, label: "AI 선생님", value: "친절한" },
            { icon: <Zap size={14} />, label: "수능·내신", value: "완전 대비" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center transition-colors"
              style={{background:'rgba(0,60,120,0.25)',border:'1px solid rgba(80,160,255,0.15)'}}>
              <div className="flex items-center justify-center mb-1" style={{color:'rgba(100,180,255,0.6)'}}>{s.icon}</div>
              <p className="text-[14px] font-semibold text-white leading-tight">{s.value}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider mt-0.5" style={{color:'rgba(100,180,255,0.4)'}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col w-full gap-3">
          {/* 학생 입장 */}
          <Link
            href="/login?role=student"
            className="group relative flex flex-col items-start w-full p-7 rounded-[2rem] shadow-2xl hover:-translate-y-0.5 transition-all duration-500 overflow-hidden"
            style={{background:'linear-gradient(135deg, rgba(0,80,180,0.7) 0%, rgba(0,40,100,0.8) 100%)', border:'1px solid rgba(80,160,255,0.25)', backdropFilter:'blur(12px)'}}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" style={{background:'rgba(100,180,255,0.08)'}} />
            <div className="flex items-center gap-2 font-semibold text-[18px] mb-1.5 relative z-10 text-white">학습 공간 입장하기</div>
            <p className="text-[12px] font-normal relative z-10 leading-relaxed" style={{color:'rgba(180,220,255,0.6)'}}>배당된 지문 · 어휘 카드 · AI 튜터 · 테스트</p>
            <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all duration-400" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
              <ArrowRight strokeWidth={2} size={17} className="text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 사용법 보기 버튼 — eye-catching */}
          <button
            onClick={() => setShowGuide(true)}
            className="group relative flex items-center justify-between w-full h-[64px] px-5 rounded-[1.8rem] overflow-hidden border border-foreground/10 hover:-translate-y-0.5 transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #f8f8f8 0%, #efefef 100%)' }}
          >
            {/* 배경 glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center gap-3 relative z-10">
              {/* 아이콘 + 펄스 */}
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Sparkles size={16} className="text-background" strokeWidth={2.5} />
                </div>
                {/* 빨간 알림 도트 */}
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-black text-foreground leading-tight">기능 안내 &amp; 체험 계정</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-foreground text-background tracking-wider">CHECK</span>
                </div>
                <span className="text-[10px] font-bold text-accent/60">사용법 · 장학 혜택 · 홈화면 설치</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-foreground/8 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all duration-300 relative z-10">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* 선생님 페이지 */}
          <Link
            href="/login?role=admin"
            className="group flex items-center justify-between w-full h-[64px] px-6 rounded-[1.8rem] text-white border hover:opacity-80 hover:-translate-y-0.5 transition-all duration-400"
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',backdropFilter:'blur(8px)'}}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-400" style={{background:'rgba(255,255,255,0.1)'}}>
                <Briefcase strokeWidth={1.5} size={16} className="text-white/70" />
              </div>
              <div>
                <span className="text-[13px] font-medium block leading-tight text-white">선생님 페이지</span>
                <span className="text-[10px] font-normal uppercase tracking-wider" style={{color:'rgba(150,200,255,0.5)'}}>Teacher Dashboard</span>
              </div>
            </div>
            <ArrowRight strokeWidth={1.5} size={16} className="text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <p className="text-[10px] font-medium tracking-[0.3em] uppercase select-none" style={{color:'rgba(80,140,200,0.35)'}}>
          © 2026 Team Parallax
        </p>
      </div>

      {/* ═══ Guide Modal ══════════════════════════════════════════════════════════ */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative w-full max-w-sm max-h-[88vh] bg-background rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-400">

            {/* 헤더 */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-foreground/5 flex items-center justify-between">
              <div>
                <p className="text-[17px] font-black text-foreground leading-tight">어플 사용법</p>
                <p className="text-[11px] font-medium text-accent mt-0.5">Deep Learning 완전 정복 가이드 ✨</p>
              </div>
              <button onClick={() => setShowGuide(false)} className="w-9 h-9 rounded-2xl bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors">
                <X size={16} className="text-foreground/60" />
              </button>
            </div>

            {/* 스크롤 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* 헤로 배너 */}
              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
                <p className="text-[12px] font-black text-white/50 mb-1">📚 Deep Learning</p>
                <p className="text-[18px] font-black leading-tight mb-2">깊은 재미와<br />학습효과를 동시에!</p>
                <p className="text-[11px] text-white/55 leading-relaxed">카드 · 객관식 · 카드게임 · AI 튜터<br />한 앱에서 완결되는 스마트 영어 학습</p>
              </div>

              {/* 어휘 카드 */}
              <div className="rounded-[1.5rem] border border-foreground/8 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center"><Layers size={15} className="text-teal-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">어휘 카드</p><p className="text-[10px] text-accent">홈 탭 · 플립 학습</p></div>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed">단어를 탭하면 <strong className="text-foreground">앞뒤 플립</strong>으로 뜻·예문 확인! <strong className="text-foreground">어근(어원) 카드</strong>로 단어 구조까지 한번에 이해할 수 있어요.</p>
              </div>

              {/* TEST */}
              <div className="rounded-[1.5rem] border border-foreground/8 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><BookOpen size={15} className="text-blue-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">어휘 테스트</p><p className="text-[10px] text-accent">TEST 탭 → 3가지 모드</p></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-black">뜻고르기</span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black">유반의어 객관식</span>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-black">유반의어 카드게임</span>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed"><strong className="text-foreground">90% 이상</strong> 통과하면 SET 완료! <strong className="text-foreground">⚡ One More!</strong> 드릴로 틀린 단어를 즉시 재도전하고, 오답노트에서 약점을 꾸준히 관리해요.</p>
              </div>

              {/* AI 튜터 */}
              <div className="rounded-[1.5rem] border border-purple-200/60 bg-purple-50/30 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center"><Brain size={15} className="text-purple-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">AI 튜터</p><p className="text-[10px] text-accent">모든 등급대 맞춤</p></div>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed mb-2">지문을 선택하면 AI가 <strong className="text-foreground">서술형 문장 선정, 어법·구조 분석, 1:1 튜터 풀이</strong>까지 해줘요. 1등급 심화부터 기초 개념까지 모든 수준에 맞게 활용할 수 있어요.</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">서술형 선정</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">어법·구조</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">1:1 튜터 모드</span>
                </div>
              </div>

              {/* Streak & 리더보드 */}
              <div className="rounded-[1.5rem] border border-orange-200/60 bg-orange-50/30 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center"><Flame size={15} className="text-orange-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">Streak &amp; 리더보드</p><p className="text-[10px] text-amber-600 font-bold">🎁 장학 혜택 있음</p></div>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed mb-2">매일 2세트 이상 통과하면 🔥 Streak 쌓여요. <strong className="text-foreground">주당 2일 휴식도 허용</strong>! 리더보드는 어휘 점수 + Q&amp;A 활동으로 집계, <strong className="text-foreground">월간 1등 및 Streak 상위</strong>에겐 장학 혜택! 자세한 사항은 선생님께 문의하세요.</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">어휘 1개 = 1점</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Q&amp;A 질문하기 = 10점</span>
                </div>
              </div>

              {/* Q&A / 클리닉 */}
              <div className="rounded-[1.5rem] border border-foreground/8 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><HelpCircle size={15} className="text-emerald-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">Q&amp;A · 클리닉 신청</p></div>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed"><strong className="text-foreground">Q&amp;A</strong>에서 궁금한 점을 올리면 선생님이 직접 답변! <strong className="text-foreground">클리닉 신청</strong>으로 1:1 집중 상담도 예약할 수 있어요.</p>
              </div>

              {/* 개인 대시보드 */}
              <div className="rounded-[1.5rem] border border-foreground/8 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center"><BarChart2 size={15} className="text-indigo-600" /></div>
                  <div><p className="text-[13px] font-black text-foreground">개인 대시보드</p><p className="text-[10px] text-accent">로그인 후 오른쪽 상단 이름 클릭</p></div>
                </div>
                <p className="text-[11.5px] text-foreground/70 leading-relaxed">어휘 성취도, 남은 시험 수, 클리닉 완료 횟수, 🔥 연속 학습 streak을 한눈에 확인할 수 있어요.</p>
              </div>

              {/* 준비 중 */}
              <div className="rounded-[1.5rem] border border-dashed border-foreground/15 p-4">
                <p className="text-[10px] font-black text-foreground/35 mb-1">🔜 준비 중</p>
                <p className="text-[11.5px] text-foreground/45 leading-relaxed">서술형 연습 및 AI 자동채점 기능이 열심히 준비 중이에요. 잠시만 기다려주세요~ 🙏</p>
              </div>

              {/* 홈화면 추가 */}
              <div className="rounded-[1.5rem] bg-slate-50 border border-foreground/8 p-4">
                <p className="text-[11px] font-black text-foreground/50 mb-3">📲 앱처럼 홈화면에 추가하기</p>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <span className="text-xl leading-none mt-0.5">🤖</span>
                    <div>
                      <p className="text-[11px] font-black text-foreground">Android (크롬)</p>
                      <p className="text-[10.5px] text-foreground/55 leading-relaxed mt-0.5">주소창 우측 <strong className="text-foreground">⋮ 메뉴</strong> 탭 →<br /><strong className="text-foreground">홈 화면에 추가</strong> 선택</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-xl leading-none mt-0.5">🍎</span>
                    <div>
                      <p className="text-[11px] font-black text-foreground">iPhone (Safari)</p>
                      <p className="text-[10.5px] text-foreground/55 leading-relaxed mt-0.5">하단 <strong className="text-foreground">공유 버튼(□↑)</strong> 탭 →<br /><strong className="text-foreground">홈 화면에 추가</strong> 선택</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-foreground/30 mt-3">* Safari·Chrome 브라우저에서만 지원됩니다.</p>
              </div>

              {/* 체험 계정 */}
              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-700 to-slate-800 p-4 text-white">
                <p className="text-[11px] font-black text-white/50 mb-1.5">🔑 학부모·학생 체험 계정</p>
                <p className="text-[13px] font-black mb-3">비밀번호 없이 바로 체험해보세요!</p>
                <div className="bg-white/10 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/50 font-bold">학원 선택</span>
                    <span className="text-[12px] font-black tracking-wide">[WOODOK]</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/50 font-bold">계정 선택</span>
                    <div className="text-right">
                      <span className="text-[11px] font-black block">GUEST - 학부모</span>
                      <span className="text-[10px] text-white/50">또는 학생1 (학생 체험)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/50 font-bold">비밀번호</span>
                    <span className="text-[11px] font-black text-white/60">없음 (바로 입장)</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/35 mt-2.5 leading-relaxed">
                  로그인 화면에서 학원을 선택한 뒤 계정을 고르면 돼요.<br />실제 학습 기록에는 영향을 주지 않습니다.
                </p>
              </div>

              <div className="h-2" />
            </div>

            {/* 하단 CTA */}
            <div className="shrink-0 px-5 pb-5 pt-3 border-t border-foreground/5">
              <Link
                href="/login?role=student"
                onClick={() => setShowGuide(false)}
                className="flex w-full h-12 bg-foreground text-background rounded-2xl text-[13px] font-black items-center justify-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95"
              >
                학습 공간 입장하기 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
