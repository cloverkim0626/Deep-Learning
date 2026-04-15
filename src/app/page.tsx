"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, Zap, Target, Brain } from "lucide-react";
import { useEffect, useState } from "react";

function getDday() {
  const today = new Date();
  const year = today.getFullYear();
  // 수능: 11월 둘째주 목요일 (approx Nov 13)
  const csat = new Date(year, 10, 13);
  if (today > csat) csat.setFullYear(year + 1);
  const diff = Math.ceil((csat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

const ROTATING_WORDS = ["어휘력", "독해력", "논리력", "사고력", "실전력"];

export default function Home() {
  const [dday, setDday] = useState<number | null>(null);
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    setDday(getDday());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIdx(i => (i + 1) % ROTATING_WORDS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      
      {/* Background — subtle gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-foreground/[0.04] rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-foreground/[0.04] rounded-full blur-[130px]" />
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">

        {/* D-DAY Badge */}
        {dday !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-[11px] font-black tracking-wider animate-in zoom-in duration-700 delay-300">
            <Zap size={11} strokeWidth={3} />
            수능까지 D-{dday}
          </div>
        )}

        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-[1.6rem] bg-foreground text-background flex items-center justify-center shadow-2xl mx-auto mb-6 hover:rotate-12 transition-transform duration-500 cursor-default">
              <BookOpen strokeWidth={1.5} size={28} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-[54px] md:text-[64px] text-foreground serif leading-[0.88] tracking-[-0.04em] font-black">
              Deep<br />Learning
            </h1>
            <p className="text-[12px] font-black uppercase tracking-[0.25em] text-accent/50">
              Produced by Team Parallax
            </p>
          </div>

          {/* Rotating value prop */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-[1px] w-6 bg-foreground/15" />
            <div className="text-[13px] font-bold text-foreground/60 min-w-[60px] text-center transition-all duration-500">
              <span key={wordIdx} className="inline-block animate-in fade-in slide-in-from-bottom-2 duration-400">
                {ROTATING_WORDS[wordIdx]}
              </span>을 키워드립니다
            </div>
            <div className="h-[1px] w-6 bg-foreground/15" />
          </div>
        </div>

        {/* Stats Row — 현실감 */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { icon: <Target size={14} />, label: "어휘 DB", value: "10~20개" },
            { icon: <Brain size={14} />, label: "AI 분석", value: "지문당" },
            { icon: <Zap size={14} />, label: "수능·내신", value: "완전 대비" },
          ].map((s, i) => (
            <div key={i} className="bg-foreground/[0.03] border border-foreground/5 rounded-2xl p-3 text-center hover:bg-foreground/[0.06] transition-colors">
              <div className="flex items-center justify-center text-accent/60 mb-1">{s.icon}</div>
              <p className="text-[14px] font-black text-foreground leading-tight">{s.value}</p>
              <p className="text-[9px] font-bold text-accent/50 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col w-full gap-4">
          <Link
            href="/login?role=student"
            className="group relative flex flex-col items-start w-full p-7 bg-foreground rounded-[2rem] text-background shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-500 overflow-hidden"
          >
            {/* Glow orb */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/8 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="flex items-center gap-2 font-black text-[19px] mb-1.5 relative z-10">
              학습 공간 입장하기
            </div>
            <p className="text-[12px] text-background/55 font-medium relative z-10 leading-relaxed">
              배당된 지문 · 어휘 카드 · AI 튜터 · 테스트
            </p>
            <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-foreground transition-all duration-400">
              <ArrowRight strokeWidth={2.5} size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            href="/login?role=admin"
            className="group flex items-center justify-between w-full h-[68px] px-6 bg-white/50 backdrop-blur-sm rounded-[1.8rem] text-foreground border border-foreground/8 shadow-sm hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors duration-400">
                <Briefcase strokeWidth={1.5} size={16} />
              </div>
              <div>
                <span className="text-[14px] font-black block leading-tight">선생님 페이지</span>
                <span className="text-[10px] text-accent/50 font-bold uppercase tracking-wider">Teacher Dashboard</span>
              </div>
            </div>
            <ArrowRight strokeWidth={2} size={17} className="text-accent/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <p className="text-[10px] font-black tracking-[0.35em] text-foreground/20 uppercase select-none">
          © 2026 Team Parallax
        </p>
      </div>
    </main>
  );
}
