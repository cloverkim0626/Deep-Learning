"use client";

import { Lock } from "lucide-react";

export default function EssayComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in duration-1000 mt-[15vh]">
      <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mb-6 shadow-inner relative group hover:scale-105 transition-transform duration-500">
        <Lock className="text-accent w-10 h-10 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
        <div className="absolute inset-0 bg-foreground/5 rounded-full animate-ping opacity-20" />
      </div>
      <h1 className="text-[28px] font-black text-foreground serif mb-3 tracking-tight">Coming Soon</h1>
      <p className="text-[14px] text-accent font-medium leading-[1.6]">
        선생님께서 서술형 학습 콘텐츠를<br/>
        업데이트하고 계십니다.<br/>
        <span className="opacity-60 text-[12px] block mt-4 font-bold tracking-widest">(수정 완료 후 공개 예정)</span>
      </p>
    </div>
  );
}
