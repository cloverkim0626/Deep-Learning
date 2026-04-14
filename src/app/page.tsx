import Link from "next/link";
import { ArrowRight, BookOpen, User, Briefcase } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="z-10 w-full max-w-2xl flex flex-col items-center text-center gap-10 framer-card glass rounded-[2rem] p-10 md:p-16">

        <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg mb-2">
          <BookOpen strokeWidth={1.5} size={28} />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl text-foreground serif leading-tight">
            Deep Learning
          </h1>
          <p className="text-[15px] md:text-base text-accent max-w-lg mx-auto font-medium leading-relaxed">
            Team Parallax의 AI 기반 영어 학습 플랫폼입니다.<br className="hidden md:block" />
            단편적인 암기를 넘어 본질적인 감각을 일깨우는 공간입니다.
          </p>
        </div>

        <div className="flex flex-col w-full gap-4 mt-6">
          <Link
            href="/login?role=student"
            className="group relative flex items-center justify-between w-full h-16 px-6 bg-foreground rounded-2xl text-background shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden"
          >
            <div className="flex items-center gap-3 font-medium text-lg relative z-10">
              <User strokeWidth={1.5} size={20} />
              학습 공간으로 들어가기
            </div>
            <ArrowRight strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform opacity-70 group-hover:opacity-100" />
          </Link>

          <Link
            href="/login?role=admin"
            className="group relative flex items-center justify-between w-full h-16 px-6 bg-transparent rounded-2xl text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-accent-light transition-all duration-500"
          >
            <div className="flex items-center gap-3 font-medium text-[15px]">
              <Briefcase strokeWidth={1.5} size={18} className="text-accent" />
              강사 및 관리자
            </div>
            <ArrowRight strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform opacity-40 group-hover:opacity-80" />
          </Link>
        </div>
      </div>

      <p className="absolute bottom-6 text-[11px] font-bold tracking-widest text-foreground/25 uppercase z-10 select-none">
        Provided by Team Parallax
      </p>
    </main>
  );
}
