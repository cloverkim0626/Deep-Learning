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

      {/* Shape of Water — 길예르모 델 토로 수중 감성 배경 */}
      <style>{`
        @keyframes sotWaterRay {
          0%,100%{opacity:0.08;transform:rotate(var(--ra)) scaleX(1)}
          40%{opacity:0.16;transform:rotate(calc(var(--ra)+1deg)) scaleX(1.05)}
          70%{opacity:0.1;transform:rotate(calc(var(--ra)-0.6deg)) scaleX(0.97)}
        }
        @keyframes sotGlow {
          0%,100%{opacity:0.5;transform:scale(1)}
          50%{opacity:0.8;transform:scale(1.06)}
        }
        @keyframes sotBio {
          0%,100%{opacity:0.15;transform:translate(0,0) scale(1)}
          40%{opacity:0.35;transform:translate(2px,4px) scale(1.1)}
          70%{opacity:0.2;transform:translate(-3px,2px) scale(0.95)}
        }
        @keyframes sotCaustic {
          0%,100%{opacity:0.06} 50%{opacity:0.14}
        }
        @keyframes sotRipple {
          0%,100%{transform:scaleX(1) scaleY(1);opacity:0.04}
          33%{transform:scaleX(1.03) scaleY(0.97) translateX(6px);opacity:0.08}
          66%{transform:scaleX(0.97) scaleY(1.02) translateX(-4px);opacity:0.05}
        }
        .sot-ray {
          position:absolute;top:-5%;left:50%;
          transform-origin:top center;
          animation:sotWaterRay var(--pd) ease-in-out infinite;
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{background:'linear-gradient(180deg,#040e18 0%,#071828 18%,#0a2438 45%,#0c3050 70%,#061420 100%)'}}>

        {/* ── 수면 황금빛 입수 ── */}
        <div style={{
          position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
          width:'320px', height:'160px',
          background:'radial-gradient(ellipse at 50% 0%, rgba(255,215,100,0.18) 0%, rgba(100,220,240,0.1) 45%, transparent 72%)',
          filter:'blur(18px)', animation:'sotCaustic 5s ease-in-out infinite',
        }}/>

        {/* ── 중심 발광 상승 — 포스터의 핵심 청록 빛기둥 ── */}
        <div style={{
          position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'380px', height:'85%',
          background:'linear-gradient(0deg,rgba(15,160,200,0.22) 0%,rgba(10,140,180,0.12) 35%,rgba(5,100,150,0.04) 65%,transparent 100%)',
          filter:'blur(28px)', animation:'sotGlow 10s ease-in-out infinite',
        }}/>
        {/* 코어 밝은 기둥 */}
        <div className="sot-ray" style={{
          width:'90px', height:'80%', marginLeft:'-45px',
          background:'linear-gradient(180deg,rgba(160,240,255,0.24) 0%,rgba(60,210,240,0.14) 30%,rgba(20,170,210,0.06) 60%,transparent 100%)',
          filter:'blur(6px)', '--ra':'0deg','--pd':'7s',
        } as React.CSSProperties}/>
        <div className="sot-ray" style={{
          width:'320px', height:'92%', marginLeft:'-160px',
          background:'linear-gradient(180deg,rgba(20,180,210,0.1) 0%,rgba(10,150,190,0.06) 40%,transparent 100%)',
          filter:'blur(22px)', '--ra':'-0.8deg','--pd':'9s',
        } as React.CSSProperties}/>

        {/* ── 보조 광선 ── */}
        {[{l:'18%',r:'-3deg',d:'6s'},{l:'34%',r:'-1deg',d:'4.5s'},{l:'66%',r:'1.5deg',d:'5.5s'},{l:'82%',r:'4deg',d:'7s'}].map((t,i)=>(
          <div key={i} style={{
            position:'absolute', top:0, left:t.l, width:'30px', height:'70%',
            background:'linear-gradient(180deg,rgba(40,200,230,0.18) 0%,transparent 100%)',
            filter:'blur(8px)', transformOrigin:'top center', transform:`rotate(${t.r})`,
            animation:`sotCaustic ${t.d} ease-in-out infinite`, animationDelay:`${i*0.7}s`,
          }}/>
        ))}

        {/* ── 생물발광 — 포스터의 파란 반짝임들 ── */}
        {[
          {x:'12%',y:'32%',s:100,d:'5.5s',c:'rgba(20,200,240,0.2)'},
          {x:'80%',y:'25%',s:75,d:'7.2s',c:'rgba(30,210,230,0.16)'},
          {x:'68%',y:'58%',s:60,d:'6.3s',c:'rgba(10,180,220,0.18)'},
          {x:'25%',y:'68%',s:85,d:'4.9s',c:'rgba(40,220,250,0.15)'},
          {x:'50%',y:'40%',s:110,d:'8.5s',c:'rgba(15,190,225,0.12)'},
          {x:'88%',y:'48%',s:55,d:'5.8s',c:'rgba(50,215,240,0.14)'},
        ].map((b,i)=>(
          <div key={i} style={{
            position:'absolute', left:b.x, top:b.y, width:b.s+'px', height:b.s+'px',
            background:`radial-gradient(ellipse,${b.c} 0%,transparent 70%)`,
            borderRadius:'50%', filter:'blur(10px)',
            animation:`sotBio ${b.d} ease-in-out infinite`, animationDelay:`${i*0.9}s`,
          }}/>
        ))}

        {/* ── 수류 물결 ── */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse 120% 45% at 40% 60%,rgba(10,140,180,0.09) 0%,transparent 55%)',
          animation:'sotRipple 16s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse 100% 38% at 60% 38%,rgba(20,160,195,0.07) 0%,transparent 52%)',
          animation:'sotRipple 22s ease-in-out infinite reverse', animationDelay:'5s',
        }}/>

        {/* ── 하단 깊이감 ── */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{background:'linear-gradient(0deg,rgba(3,8,14,0.8) 0%,transparent 100%)'}}/>
        {/* ── 전체 청록 틴트 (포스터 특유의 투명한 청록 물) ── */}
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse 85% 65% at 50% 55%,rgba(10,130,175,0.16) 0%,rgba(5,80,130,0.06) 55%,transparent 80%)'}}/>
      </div>



      <div className="z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">

        {/* D-DAY Badge */}
        {dday !== null && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold tracking-wider animate-in zoom-in duration-700 delay-300"
            style={{
              background:'rgba(255,255,255,0.07)',
              border:'1px solid transparent',
              backgroundClip:'padding-box',
              boxShadow:'0 0 0 1px rgba(80,200,240,0.35), 0 0 12px rgba(80,200,240,0.15)',
              color:'rgba(160,230,255,0.9)',
            }}>
            <span style={{background:'linear-gradient(90deg,#50c8eb,#b87fff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:800}}>D-{dday}</span>
            <span style={{color:'rgba(160,210,255,0.7)'}}>·&nbsp;수능까지</span>
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-5">
          {/* 돋보기 로고 — 깊이 있는 학습의 상징 */}
          <div className="w-14 h-14 rounded-[1.4rem] flex items-center justify-center mx-auto hover:rotate-12 transition-transform duration-500 cursor-default relative"
            style={{
              background:'rgba(255,255,255,0.10)',
              backdropFilter:'blur(12px)',
              color:'rgba(220,240,255,0.95)',
            }}>
            {/* IG 스타일 ring */}
            <div style={{
              position:'absolute', inset:'-3px',
              borderRadius:'calc(1.4rem + 3px)',
              background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C,#F77737)',
              zIndex:-1, padding:'2px',
            }}>
              <div style={{
                background:'#050d1a', borderRadius:'calc(1.4rem + 1px)', width:'100%', height:'100%',
              }}/>
            </div>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11.5" cy="11.5" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="11.5" cy="11.5" r="4.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
              <line x1="17.5" y1="17.5" x2="24" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
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
            <div key={i} className="rounded-2xl p-3 text-center transition-all hover:scale-105 duration-300 relative overflow-hidden"
              style={{
                background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.08)',
                backdropFilter:'blur(10px)',
              }}>
              {/* IG 그라디언트 상단 라인 */}
              <div style={{
                position:'absolute', top:0, left:'15%', right:'15%', height:'1.5px',
                background:'linear-gradient(90deg,transparent,rgba(80,200,240,0.6),rgba(184,127,255,0.6),transparent)',
              }}/>
              <div className="flex items-center justify-center mb-1" style={{color:'rgba(100,200,255,0.7)'}}>{s.icon}</div>
              <p className="text-[14px] font-semibold text-white leading-tight">{s.value}</p>
              <p className="text-[9px] font-medium uppercase tracking-wider mt-0.5" style={{color:'rgba(100,180,255,0.4)'}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col w-full gap-3">
          <style>{`
            @keyframes igGlow {
              0%,100%{opacity:0.7;transform:translateX(0)}
              50%{opacity:1;transform:translateX(4px)}
            }
            @keyframes igPulseRing {
              0%{box-shadow:0 0 0 0 rgba(225,48,108,0.4)}
              70%{box-shadow:0 0 0 8px rgba(225,48,108,0)}
              100%{box-shadow:0 0 0 0 rgba(225,48,108,0)}
            }
          `}</style>
          <Link
            href="/login?role=student"
            className="group relative flex flex-col items-start w-full p-5 rounded-[2rem] overflow-hidden hover:-translate-y-1 transition-all duration-500"
            style={{
              background:'linear-gradient(145deg,#071e38 0%,#0a2d50 45%,#082440 100%)',
              boxShadow:'0 8px 32px rgba(64,93,230,0.30), 0 2px 8px rgba(0,0,0,0.5)',
              border:'1.5px solid transparent',
              backgroundClip:'padding-box',
              outline:'1.5px solid transparent',
              position:'relative',
            }}
          >
            {/* IG 그라디언트 보더 */}
            <div style={{
              position:'absolute', inset:0, borderRadius:'2rem', padding:'1.5px', zIndex:0,
              background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C,#F77737)',
              WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite:'xor',
              maskComposite:'exclude',
            }}/>
            {/* 수중 발광 */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background:'linear-gradient(135deg,rgba(64,93,230,0.20) 0%,rgba(131,58,180,0.12) 50%,rgba(10,130,180,0.15) 100%)',
            }}/>
            <div className="absolute pointer-events-none" style={{
              top:'-20%', left:'20%', width:'200px', height:'100px',
              background:'radial-gradient(ellipse,rgba(80,200,240,0.18) 0%,transparent 65%)',
              borderRadius:'50%', filter:'blur(18px)',
            }}/>
            <div className="flex items-center gap-2 font-semibold text-[15px] mb-1 relative z-10">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-widest text-white"
                style={{background:'linear-gradient(90deg,#405DE6,#E1306C)', boxShadow:'0 2px 8px rgba(225,48,108,0.35)'}}>STUDENT</span>
              <span className="text-[13px] font-black" style={{color:'rgba(210,245,255,0.97)'}}>학습 공간 입장</span>
            </div>
            <p className="text-[11px] font-semibold relative z-10 leading-relaxed" style={{color:'rgba(160,210,255,0.65)'}}>지문 · 어휘 · AI 튜터 · 테스트</p>
            <div className="absolute bottom-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
              style={{background:'linear-gradient(135deg,#405DE6,#E1306C)', boxShadow:'0 0 12px rgba(225,48,108,0.5)', animation:'igPulseRing 2s ease-in-out infinite'}}>
              <ArrowRight strokeWidth={2.5} size={14} className="group-hover:translate-x-0.5 transition-all text-white" />
            </div>
          </Link>

          {/* 리포트 열람 — 여름 풀내음 frosted glass */}
          <style>{`
            @keyframes summerBreeze {
              0%,100%{opacity:0.4;transform:translate(0,0) scale(1)}
              50%{opacity:0.65;transform:translate(2px,3px) scale(1.04)}
            }
          `}</style>
          <Link
            href="/login/parent"
            className="group relative flex flex-col items-start w-full p-5 rounded-[2rem] overflow-hidden hover:-translate-y-0.5 transition-all duration-500"
            style={{
              background:'rgba(235,248,232,0.18)',
              backdropFilter:'blur(18px)',
              WebkitBackdropFilter:'blur(18px)',
              boxShadow:'0 4px 24px rgba(60,120,60,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
              border:'1px solid rgba(160,210,155,0.32)',
            }}
          >
            {/* 풀밭 녹음 보케 — 창문 너머 여름 */}
            <div className="absolute pointer-events-none" style={{
              top:'-25%', right:'-10%', width:'160px', height:'160px',
              background:'radial-gradient(ellipse,rgba(120,210,110,0.28) 0%,rgba(80,180,80,0.1) 45%,transparent 70%)',
              borderRadius:'50%', filter:'blur(24px)',
              animation:'summerBreeze 9s ease-in-out infinite',
            }}/>
            <div className="absolute pointer-events-none" style={{
              bottom:'-20%', left:'-8%', width:'130px', height:'130px',
              background:'radial-gradient(ellipse,rgba(100,200,95,0.22) 0%,transparent 68%)',
              borderRadius:'50%', filter:'blur(20px)',
              animation:'summerBreeze 12s ease-in-out infinite 3s',
            }}/>
            {/* 햇살 오버레이 */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background:'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 55%)',
            }}/>
            <div className="relative z-10 flex items-center gap-2 font-semibold text-[15px] mb-1">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-widest"
                style={{background:'rgba(255,255,255,0.25)',color:'rgba(50,100,45,0.9)',border:'1px solid rgba(160,210,155,0.4)'}}>REPORT</span>
              <span className="text-[13px] font-black" style={{color:'rgba(230,248,225,0.97)'}}>리포트 열람하기</span>
            </div>
            <p className="relative z-10 text-[11px] font-semibold leading-relaxed" style={{color:'rgba(180,230,175,0.75)'}}>일간·월간 리포트 · 학습 현황 · 질의응답</p>
            <div className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
              style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(160,215,155,0.35)'}}>
              <ArrowRight strokeWidth={2} size={14} style={{color:'rgba(200,240,195,0.9)'}}
                className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>


          <button
            onClick={() => setShowGuide(true)}
            className="group relative flex items-center justify-between w-full h-[64px] px-5 rounded-[2rem] overflow-hidden hover:-translate-y-0.5 transition-all duration-300"
            style={{
              background:'linear-gradient(135deg,rgba(64,93,230,0.15) 0%,rgba(131,58,180,0.12) 50%,rgba(225,48,108,0.10) 100%)',
              border:'1px solid transparent',
              boxShadow:'0 0 0 1px rgba(131,58,180,0.30), 0 4px 20px rgba(64,93,230,0.20)',
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                  style={{background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C)'}}>
                  <Sparkles size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 flex items-center justify-center" style={{borderColor:'#050d1a'}}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-black text-white leading-tight">기능 안내 &amp; 체험 계정</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider text-white"
                    style={{background:'linear-gradient(90deg,#405DE6,#E1306C)'}}>CHECK</span>
                </div>
                <span className="text-[10px] font-bold" style={{color:'rgba(160,180,255,0.55)'}}>사용법 · 장학 혜택 · 홈화면 설치</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative z-10"
              style={{background:'rgba(255,255,255,0.08)'}}>
              <ArrowRight size={14} className="text-white/50 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          <Link
            href="/login?role=admin"
            className="group flex items-center justify-between w-full h-[64px] px-6 rounded-[2rem] hover:-translate-y-0.5 transition-all duration-400"
            style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.10)',
              backdropFilter:'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-400"
                style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)'}}>
                <Briefcase strokeWidth={1.5} size={16} className="text-white/60" />
              </div>
              <div>
                <span className="text-[13px] font-medium block leading-tight text-white/80">선생님 페이지</span>
                <span className="text-[10px] font-normal uppercase tracking-wider" style={{color:'rgba(120,160,255,0.4)'}}>Teacher Dashboard</span>
              </div>
            </div>
            <ArrowRight strokeWidth={1.5} size={16} className="text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <p className="text-[10px] font-medium tracking-[0.3em] uppercase select-none" style={{color:'rgba(80,140,200,0.35)'}}>
          © 2026 Team Parallax
        </p>
      </div>

      {/* ═══ Guide Modal ══════════════════════════════════════════════════════════ */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative w-full max-w-sm max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-400"
            style={{background:'#fafafa'}}>

            {/* IG 그라디언트 헤더 */}
            <div className="shrink-0 relative overflow-hidden"
              style={{background:'linear-gradient(135deg,#405DE6 0%,#5851DB 18%,#833AB4 38%,#C13584 58%,#E1306C 78%,#FD1D1D 90%,#F77737 100%)'}}>
              <div className="px-5 pt-5 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-[16px]">📖</div>
                    <span className="text-white text-[13px] font-black tracking-wide">@deep.learning</span>
                  </div>
                  <button onClick={() => setShowGuide(false)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors">
                    <X size={15} className="text-white" />
                  </button>
                </div>
                <p className="text-white/60 text-[9px] font-black tracking-[4px] uppercase mb-1.5">Deep Learning</p>
                <p className="text-white text-[22px] font-black leading-tight">공부도 이제<br/><span className="text-yellow-200">인스타 하듯</span> 해 🔥</p>
                <p className="text-white/70 text-[11px] mt-2 font-medium">카드 · 테스트 · AI튜터 · 리더보드까지</p>
              </div>
              <div style={{height:'20px',background:'#fafafa',borderRadius:'50% 50% 0 0 / 100% 100% 0 0',marginTop:'-2px'}}/>
            </div>

            {/* 스크롤 바디 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

              {/* 어휘 카드 */}
              <div className="rounded-[1.3rem] overflow-hidden" style={{border:'1px solid #efefef'}}>
                <div className="px-4 py-3 flex items-center gap-3" style={{background:'#fff'}}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{background:'linear-gradient(135deg,#405DE6,#833AB4)'}}>
                    <Layers size={16} color="white"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-gray-900">어휘 카드</p>
                    <p className="text-[10px] text-gray-400 font-medium">탭하면 플립 · 어원까지 한번에</p>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                    style={{background:'linear-gradient(90deg,#405DE6,#833AB4)'}}>홈 탭</span>
                </div>
                <div className="px-4 py-2.5 text-[11px] text-gray-500 leading-relaxed" style={{borderTop:'1px solid #f3f3f3'}}>
                  단어 탭 → <strong className="text-gray-800">앞뒤 플립</strong> 뜻·예문 확인! <strong className="text-gray-800">어근 카드</strong>로 단어 구조까지.
                </div>
              </div>

              {/* 테스트 3종 */}
              <div className="rounded-[1.3rem] overflow-hidden" style={{border:'1px solid #efefef'}}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{background:'linear-gradient(135deg,#E1306C,#FD1D1D)'}}>
                    <BookOpen size={16} color="white"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-gray-900">어휘 테스트 3종</p>
                    <p className="text-[10px] text-gray-400 font-medium">90% 넘으면 PASS 인장 🔖</p>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                    style={{background:'linear-gradient(90deg,#E1306C,#F77737)'}}>TEST 탭</span>
                </div>
                <div className="px-4 py-2.5 flex gap-1.5" style={{borderTop:'1px solid #f3f3f3'}}>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white" style={{background:'#20C997'}}>뜻고르기</span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white" style={{background:'#405DE6'}}>유반의어 객관식</span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white" style={{background:'#F77737'}}>카드게임</span>
                </div>
              </div>

              {/* AI 튜터 */}
              <div className="rounded-[1.3rem] overflow-hidden" style={{border:'1px solid #efefef'}}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{background:'linear-gradient(135deg,#833AB4,#5851DB)'}}>
                    <Brain size={16} color="white"/>
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-gray-900">AI 튜터</p>
                    <p className="text-[10px] text-gray-400 font-medium">1등급 심화 ~ 기초 전수준 맞춤</p>
                  </div>
                </div>
                <div className="px-4 py-2.5 text-[11px] text-gray-500 leading-relaxed" style={{borderTop:'1px solid #f3f3f3'}}>
                  지문 선택 → AI가 <strong className="text-gray-800">서술형·어법·구조 분석 + 1:1 튜터 풀이</strong>까지.
                </div>
              </div>

              {/* Streak & 리더보드 — 강조 (IG 오렌지-레드) */}
              <div className="rounded-[1.3rem] overflow-hidden"
                style={{background:'linear-gradient(135deg,#FD1D1D,#F77737)'}}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Flame size={16} color="white"/>
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-white">Streak &amp; 리더보드 🏆</p>
                    <p className="text-[10px] text-white/70 font-bold">🎁 월간 1등 → 장학 혜택!</p>
                  </div>
                </div>
                <div className="px-4 pb-3 pt-0 text-[11px] text-white/85 leading-relaxed">
                  매일 2세트 통과하면 🔥 연속 Streak! <strong className="text-white">주 2일 휴식 허용</strong>. 상위권엔 <strong className="text-white">실제 장학 혜택</strong>.
                  <div className="flex gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[9px] font-black">어휘 1개 = 1점</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[9px] font-black">Q&amp;A 질문 = 10점</span>
                  </div>
                </div>
              </div>

              {/* Q&A + 홈화면 (한 줄 카드) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[1.3rem] px-3 py-3 flex flex-col gap-1.5" style={{border:'1px solid #efefef'}}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{background:'linear-gradient(135deg,#20C997,#12B886)'}}>
                    <HelpCircle size={14} color="white"/>
                  </div>
                  <p className="text-[11.5px] font-black text-gray-900">Q&amp;A · 클리닉</p>
                  <p className="text-[9.5px] text-gray-400 leading-relaxed">선생님 직접 답변<br/>1:1 상담 예약</p>
                </div>
                <div className="rounded-[1.3rem] px-3 py-3 flex flex-col gap-1.5" style={{background:'#f5f5f5'}}>
                  <span className="text-[22px] leading-none">📲</span>
                  <p className="text-[11.5px] font-black text-gray-700">홈화면에 추가</p>
                  <p className="text-[9.5px] text-gray-400 leading-relaxed">Android: ⋮메뉴<br/>iPhone: 공유 □↑</p>
                </div>
              </div>

              {/* 체험 계정 — IG 풀 그라디언트 강조 */}
              <div className="rounded-[1.3rem] overflow-hidden"
                style={{background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C)'}}>
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[20px]">🔑</span>
                    <div>
                      <p className="text-white font-black text-[14px]">지금 바로 체험해봐!</p>
                      <p className="text-white/60 text-[10px]">비밀번호 없이 · 즉시 입장</p>
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.18)'}}>
                    <div className="grid grid-cols-2" style={{borderBottom:'1px solid rgba(255,255,255,0.15)'}}>
                      <div className="px-3 py-2.5" style={{borderRight:'1px solid rgba(255,255,255,0.15)'}}>
                        <p className="text-white/50 text-[9px] font-bold mb-0.5">학원</p>
                        <p className="text-white font-black text-[12px]">[WOODOK]</p>
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-white/50 text-[9px] font-bold mb-0.5">비밀번호</p>
                        <p className="text-white font-black text-[12px]">없음 🙌</p>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-white/50 text-[9px] font-bold mb-1.5">계정 선택</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-white/25 text-white text-[10px] font-black">학생1 (학생 체험)</span>
                        <span className="px-2.5 py-1 rounded-full bg-white/25 text-white text-[10px] font-black">GUEST (학부모)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-white/35 text-[9px] mt-2">실제 학습 기록에는 영향을 주지 않아요.</p>
                </div>
              </div>

              <div className="h-1" />
            </div>

            {/* 하단 CTA */}
            <div className="shrink-0 px-4 pb-5 pt-3" style={{borderTop:'1px solid #efefef'}}>
              <Link
                href="/login?role=student"
                onClick={() => setShowGuide(false)}
                className="flex w-full h-12 rounded-2xl text-[13px] font-black items-center justify-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95 text-white"
                style={{background:'linear-gradient(90deg,#405DE6,#833AB4,#E1306C,#F77737)'}}
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

