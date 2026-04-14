import Link from "next/link";
import { ArrowRight, BookOpen, User, Briefcase, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-16 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Branding Area */}
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-4 bg-foreground/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="w-20 h-20 rounded-[2rem] bg-foreground text-background flex items-center justify-center shadow-2xl relative z-10 hover:rotate-6 transition-transform duration-500">
              <BookOpen strokeWidth={1.5} size={36} />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-[52px] md:text-[64px] text-foreground serif leading-[0.9] tracking-[-0.04em] font-black">
              Deep<br />Learning
            </h1>
            <div className="flex items-center justify-center gap-2 text-accent mt-4">
              <div className="h-[1px] w-8 bg-foreground/10" />
              <span className="text-[12px] font-black uppercase tracking-[0.3em] opacity-60">Team Parallax</span>
              <div className="h-[1px] w-8 bg-foreground/10" />
            </div>
          </div>
        </div>

        {/* Sophisticated Arrangement of Entry Points */}
        <div className="flex flex-col w-full gap-6 px-4">
          <Link
            href="/login?role=student"
            className="group relative flex flex-col items-start w-full p-8 bg-foreground rounded-[2.5rem] text-background shadow-2xl hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] transition-all duration-700 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
            <div className="flex items-center gap-3 font-black text-[20px] mb-2 relative z-10 transition-transform duration-500 group-hover:translate-x-1">
              <User strokeWidth={2.5} size={22} className="opacity-80" />
              학습 공간으로 입장
            </div>
            <p className="text-[13px] text-background/60 font-medium relative z-10 max-w-[200px] leading-relaxed">
              자신의 성취를 기록하고 AI 튜터를 통해 감각적으로 사고하세요.
            </p>
            <div className="absolute bottom-8 right-8 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500 group-hover:bg-white group-hover:text-foreground">
              <ArrowRight strokeWidth={2.5} size={20} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            href="/login?role=admin"
            className="group relative flex items-center justify-between w-full h-20 px-8 bg-white/40 backdrop-blur-xl rounded-[2rem] text-foreground border border-foreground/5 shadow-sm hover:bg-white hover:shadow-xl hover:border-foreground/10 transition-all duration-500"
          >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors duration-500">
                    <Briefcase strokeWidth={1.5} size={18} className="opacity-80" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[14px] font-black tracking-tight">강사 전용관</span>
                    <span className="text-[10px] text-accent font-bold uppercase tracking-widest opacity-60">Admin & Educator</span>
                </div>
            </div>
            <ArrowRight strokeWidth={2} size={18} className="text-accent group-hover:text-foreground group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Decorative Quote or Label */}
        <div className="flex flex-col items-center gap-4 text-center pb-8 opacity-40 hover:opacity-100 transition-opacity duration-1000">
           <Sparkles size={16} className="text-accent animate-pulse" />
           <p className="text-[11px] font-bold tracking-[0.2em] uppercase max-w-[180px] leading-loose">
            Beyond memorization,<br />to intuitive reasoning.
           </p>
        </div>
      </div>

      <p className="absolute bottom-8 text-[10px] font-black tracking-[0.4em] text-foreground/20 uppercase z-10 select-none">
        © 2026 Team Parallax
      </p>
    </main>
  );
}
