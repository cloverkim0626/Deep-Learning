"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Zap, Brain, Sparkles, X, Layers, Flame, BarChart2, HelpCircle, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TrialApplicationForm from "@/components/TrialApplicationForm";
import ContactModal from "@/components/ContactModal";

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
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [showContact, setShowContact] = useState(false);

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

      {/* DM 플로팅 버튼 — 우상단 */}
      <button
        onClick={() => setShowContact(true)}
        className="fixed top-5 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg,#1e293b,#334155)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(255,255,255,0.08)",
        }}
        aria-label="문의하기">
        <Send size={18} className="text-white" strokeWidth={2} style={{ transform: "rotate(45deg)" }} />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#08080f]">
          <span className="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-75" />
        </span>
      </button>

      {/* ── IG 다크 Ambient 배경 ── */}
      <style>{`
        @keyframes igOrb1 {
          0%,100%{transform:translate(0,0) scale(1);opacity:0.55}
          40%{transform:translate(12px,-8px) scale(1.08);opacity:0.75}
          70%{transform:translate(-8px,5px) scale(0.95);opacity:0.60}
        }
        @keyframes igOrb2 {
          0%,100%{transform:translate(0,0) scale(1);opacity:0.40}
          33%{transform:translate(-10px,14px) scale(1.06);opacity:0.60}
          66%{transform:translate(8px,-6px) scale(0.97);opacity:0.45}
        }
        @keyframes igOrb3 {
          0%,100%{transform:translate(0,0) scale(1);opacity:0.30}
          50%{transform:translate(6px,-10px) scale(1.10);opacity:0.50}
        }
        @keyframes igShimmer {
          0%,100%{opacity:0.4} 50%{opacity:0.7}
        }
      `}</style>

      {/* 베이스: 거의 블랙 */}
      <div className="absolute inset-0" style={{background:'#08080f'}}/>

      {/* IG 그라디언트 ambient 오브들 */}
      {/* 좌상단 — 보라/파랑 */}
      <div style={{
        position:'absolute', top:'-10%', left:'-15%',
        width:'500px', height:'500px',
        background:'radial-gradient(ellipse, rgba(64,93,230,0.35) 0%, rgba(88,81,219,0.15) 40%, transparent 70%)',
        borderRadius:'50%', filter:'blur(60px)',
        animation:'igOrb1 12s ease-in-out infinite',
      }}/>
      {/* 우하단 — 핑크/오렌지 */}
      <div style={{
        position:'absolute', bottom:'-15%', right:'-10%',
        width:'450px', height:'450px',
        background:'radial-gradient(ellipse, rgba(225,48,108,0.30) 0%, rgba(247,119,55,0.15) 50%, transparent 70%)',
        borderRadius:'50%', filter:'blur(65px)',
        animation:'igOrb2 15s ease-in-out infinite',
      }}/>
      {/* 중앙 위 — 보라 */}
      <div style={{
        position:'absolute', top:'10%', left:'30%',
        width:'320px', height:'280px',
        background:'radial-gradient(ellipse, rgba(131,58,180,0.22) 0%, transparent 65%)',
        borderRadius:'50%', filter:'blur(50px)',
        animation:'igOrb3 18s ease-in-out infinite',
      }}/>
      {/* 좌하단 — 핑크 */}
      <div style={{
        position:'absolute', bottom:'15%', left:'-5%',
        width:'280px', height:'280px',
        background:'radial-gradient(ellipse, rgba(193,53,132,0.20) 0%, transparent 65%)',
        borderRadius:'50%', filter:'blur(55px)',
        animation:'igOrb1 20s ease-in-out infinite reverse',
      }}/>
      {/* 전체 IG 그라디언트 미세 틴트 */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(135deg,rgba(64,93,230,0.06) 0%,rgba(131,58,180,0.04) 35%,rgba(225,48,108,0.05) 65%,rgba(247,119,55,0.03) 100%)',
      }}/>
      {/* 하단 페이드 */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'30%',
        background:'linear-gradient(0deg,rgba(0,0,0,0.6) 0%,transparent 100%)',
      }}/>



      <div className="z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">

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
        <div className="text-center space-y-6 py-2">
          {/* 앱 아이콘 로고 */}
          <div className="w-16 h-16 rounded-[1.4rem] mx-auto hover:scale-110 transition-transform duration-500 cursor-default overflow-hidden shadow-2xl"
            style={{ boxShadow:'0 0 0 2px rgba(249,83,198,0.5), 0 8px 30px rgba(185,29,115,0.4)' }}>
            <img src="/app-icon.jpg" alt="Deep Learning" className="w-full h-full object-cover" />
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
        <div className="grid grid-cols-3 gap-2 w-full">
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
            @keyframes cardShimmer1 {
              0%   { transform: translateX(-120%) skewX(-15deg); opacity:0; }
              8%   { opacity:1; }
              92%  { opacity:1; }
              100% { transform: translateX(520%) skewX(-15deg); opacity:0; }
            }
            @keyframes cardShimmer2 {
              0%   { transform: translateX(-120%) skewX(-15deg); opacity:0; }
              8%   { opacity:1; }
              92%  { opacity:1; }
              100% { transform: translateX(520%) skewX(-15deg); opacity:0; }
            }
            @keyframes emojiFloat1 {
              0%,100%{ transform: translateY(0px) scale(1); }
              50%    { transform: translateY(-3px) scale(1.06); }
            }
            @keyframes emojiFloat2 {
              0%,100%{ transform: translateY(0px) scale(1); }
              45%    { transform: translateY(-2.5px) scale(1.05); }
            }
            @keyframes accentPulse1 {
              0%,100%{ opacity:0.55; } 50%{ opacity:1; }
            }
            @keyframes accentPulse2 {
              0%,100%{ opacity:0.55; } 60%{ opacity:1; }
            }
          `}</style>
          <Link
            href="/login?role=student"
            className="group relative flex flex-col items-start w-full p-4 rounded-[2rem] overflow-hidden hover:-translate-y-1 transition-all duration-500"
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


          {/* 기능 안내 — 학습공간 바로 아래 */}
          <button
            onClick={() => setShowGuide(true)}
            className="group relative flex items-center justify-between w-full h-[56px] px-5 rounded-[2rem] overflow-hidden hover:-translate-y-0.5 transition-all duration-300"
            style={{
              background:'linear-gradient(135deg,rgba(64,93,230,0.15) 0%,rgba(131,58,180,0.12) 50%,rgba(225,48,108,0.10) 100%)',
              border:'1px solid transparent',
              boxShadow:'0 0 0 1px rgba(131,58,180,0.30), 0 4px 20px rgba(64,93,230,0.20)',
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                style={{background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C)'}}>
                <Sparkles size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-black text-white leading-tight">기능 안내 &amp; 체험 계정</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-wider text-white"
                    style={{background:'linear-gradient(90deg,#405DE6,#E1306C)'}}>CHECK</span>
                </div>
                <span className="text-[9px] font-bold" style={{color:'rgba(160,180,255,0.55)'}}>사용법 · 장학 혜택 · 홈화면 설치</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
              style={{background:'rgba(255,255,255,0.08)'}}>
              <ArrowRight size={13} className="text-white/50 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
          {/* === IG-gradient CTA cards === */}
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
            @keyframes greenRing {
              0%  { box-shadow:0 0 0 0 rgba(56,249,215,0.55); }
              70% { box-shadow:0 0 0 7px rgba(56,249,215,0); }
              100%{ box-shadow:0 0 0 0 rgba(56,249,215,0); }
            }
            @keyframes purpleRing {
              0%  { box-shadow:0 0 0 0 rgba(184,127,255,0.55); }
              70% { box-shadow:0 0 0 7px rgba(184,127,255,0); }
              100%{ box-shadow:0 0 0 0 rgba(184,127,255,0); }
            }
            @keyframes cardGleam {
              0%   { transform:translateX(-160%) skewX(-20deg); }
              100% { transform:translateX(700%) skewX(-20deg); }
            }
          `}</style>
          <div className="grid grid-cols-2 gap-3 w-full">

            {/* REPORT — green-teal IG gradient */}
            <Link href="/login/parent"
              className="group relative overflow-hidden active:scale-[0.97] transition-transform duration-100"
              style={{
                borderRadius:'1.4rem', height:'84px',
                display:'flex', alignItems:'center',
                gap:'10px', padding:'0 12px',
                background:'linear-gradient(145deg,#0a7c50 0%,#1ab876 35%,#2ed8a8 70%,#38f9d7 100%)',
                boxShadow:'0 6px 22px rgba(30,200,140,0.38), 0 2px 8px rgba(0,0,0,0.35)',
                border:'1px solid rgba(255,255,255,0.18)',
              }}>
              {/* shimmer */}
              <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',borderRadius:'1.4rem'}}>
                <div style={{position:'absolute',top:0,left:0,width:'25%',height:'100%',
                  background:'linear-gradient(105deg,transparent 25%,rgba(255,255,255,0.22) 50%,transparent 75%)',
                  animation:'cardGleam 4.5s ease-in-out infinite',animationDelay:'1.2s',
                }}/>
              </div>
              {/* ambient glow bottom */}
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:'40%',
                background:'linear-gradient(0deg,rgba(0,0,0,0.18) 0%,transparent 100%)',
                pointerEvents:'none',borderRadius:'0 0 1.4rem 1.4rem',
              }}/>
              {/* NEW badge — top-left corner */}
              <div style={{position:'absolute',top:'8px',left:'10px',
                fontSize:'7px',fontWeight:800,color:'#0a7c50',
                background:'rgba(255,255,255,0.94)',padding:'2px 6px',borderRadius:'4px',
                letterSpacing:'0.07em',lineHeight:1,zIndex:2,
              }}>NEW</div>
              {/* text */}
              <div style={{flex:1,minWidth:0,paddingTop:'2px'}}>
                <p style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.97)',
                  letterSpacing:'0.01em',lineHeight:1,whiteSpace:'nowrap',marginBottom:'6px'}}>학습 리포트</p>
                <p style={{fontSize:9,color:'rgba(255,255,255,0.68)',fontWeight:400,
                  letterSpacing:'0.02em',lineHeight:1,whiteSpace:'nowrap'}}>성취도 · 어휘 · 독해 분석</p>
              </div>
              {/* pulsing CTA arrow */}
              <div style={{flexShrink:0,width:'26px',height:'26px',borderRadius:'50%',
                background:'rgba(255,255,255,0.22)',border:'1.5px solid rgba(255,255,255,0.45)',
                display:'flex',alignItems:'center',justifyContent:'center',
                animation:'greenRing 1.8s ease-out infinite',
              }}>
                <ArrowRight size={12} color="white" strokeWidth={2.5}
                  className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </Link>

            {/* TEACHER — purple-blue IG gradient */}
            <Link href="/login?role=admin"
              className="group relative overflow-hidden active:scale-[0.97] transition-transform duration-100"
              style={{
                borderRadius:'1.4rem', height:'84px',
                display:'flex', alignItems:'center',
                gap:'10px', padding:'0 12px',
                background:'linear-gradient(145deg,#2d1b8e 0%,#5851DB 35%,#833AB4 70%,#b06eef 100%)',
                boxShadow:'0 6px 22px rgba(131,58,180,0.38), 0 2px 8px rgba(0,0,0,0.35)',
                border:'1px solid rgba(255,255,255,0.14)',
              }}>
              {/* shimmer */}
              <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',borderRadius:'1.4rem'}}>
                <div style={{position:'absolute',top:0,left:0,width:'25%',height:'100%',
                  background:'linear-gradient(105deg,transparent 25%,rgba(255,255,255,0.16) 50%,transparent 75%)',
                  animation:'cardGleam 5s ease-in-out infinite',animationDelay:'3s',
                }}/>
              </div>
              {/* ambient */}
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:'40%',
                background:'linear-gradient(0deg,rgba(0,0,0,0.20) 0%,transparent 100%)',
                pointerEvents:'none',borderRadius:'0 0 1.4rem 1.4rem',
              }}/>
              {/* text */}
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.97)',
                  letterSpacing:'0.01em',lineHeight:1,whiteSpace:'nowrap',marginBottom:'6px'}}>선생님 페이지</p>
                <p style={{fontSize:9,color:'rgba(255,255,255,0.62)',fontWeight:400,
                  letterSpacing:'0.02em',lineHeight:1,whiteSpace:'nowrap'}}>수업 관리 · 성적 입력</p>
              </div>
              {/* pulsing CTA */}
              <div style={{flexShrink:0,width:'26px',height:'26px',borderRadius:'50%',
                background:'rgba(255,255,255,0.18)',border:'1.5px solid rgba(255,255,255,0.35)',
                display:'flex',alignItems:'center',justifyContent:'center',
                animation:'purpleRing 2.2s ease-out infinite',animationDelay:'0.4s',
              }}>
                <ArrowRight size={12} color="white" strokeWidth={2.5}
                  className="group-hover:translate-x-0.5 transition-transform"/>
              </div>
            </Link>

          </div>

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

              {/* 체험 계정 — 신청 CTA */}
              <div className="rounded-[1.3rem] overflow-hidden"
                style={{background:'linear-gradient(135deg,#405DE6,#833AB4,#E1306C)'}}>
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[20px]">🔑</span>
                    <div>
                      <p className="text-white font-black text-[14px]">앱 체험 신청</p>
                      <p className="text-white/60 text-[10px]">신청 후 문자로 계정 발급 · 체험 기간 3일</p>
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden mb-3" style={{background:'rgba(255,255,255,0.18)'}}>
                    <div className="px-3 py-2.5 space-y-1.5">
                      <p className="text-white/50 text-[9px] font-bold">체험 포함 내용</p>
                      {['어휘 카드 · 테스트 3종', 'AI 튜터 Genie', '리더보드 & 스트릭'].map(t => (
                        <div key={t} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white/60" />
                          <span className="text-white/80 text-[11px] font-bold">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowGuide(false); setShowTrialForm(true); }}
                    className="w-full h-11 rounded-2xl text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                    style={{background:'rgba(255,255,255,0.22)',border:'1.5px solid rgba(255,255,255,0.4)'}}>
                    신청 폼 작성하기 <ArrowRight size={14} />
                  </button>
                  <p className="text-white/35 text-[9px] mt-2 text-center">신청자에게만 계정이 발급됩니다.</p>
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

      {/* ═══ Trial Application Form ═════════════════════════════════════════════ */}
      {showTrialForm && (
        <TrialApplicationForm onClose={() => setShowTrialForm(false)} />
      )}

      {/* ═══ Contact Modal ═══════════════════════════════════════════════════════ */}
      {showContact && (
        <ContactModal
          onClose={() => setShowContact(false)}
          onTrialRequest={() => { setShowContact(false); setShowTrialForm(true); }}
        />
      )}
    </main>
  );
}

