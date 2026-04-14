"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, User, Users, Lock, ChevronRight, LogIn } from "lucide-react";

const CLASS_DATA = [
  { 
    name: "[WOODOK] 고3 금토반", 
    students: ["김가연 - 백석고", "장서현 - 백석고", "박시연 - 백석고", "이예윤 - 백석고", "이은서 - 검단고", "김슬기 - 검단고", "김가빈 - 원당고"] 
  },
  { 
    name: "[WOODOK] 고2 아라고반", 
    students: ["이동기", "임다은", "민채이"] 
  },
  { 
    name: "[WOODOK] 고1 아라원당 연합반", 
    students: ["송시후", "정준", "한상혁"] 
  }
];

function LoginForm() {
  const searchParams = useSearchParams();
  const roleFromQuery = searchParams.get("role");
  const [role, setRole] = useState<"student" | "admin">(
    roleFromQuery === "admin" ? "admin" : "student"
  );

  const [step, setStep] = useState(1); // 1: Class Selection, 2: Student Selection, 3: Password
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (role === "admin") {
      if (id === "parallax" && password === "parallax2026") {
        window.location.href = "/admin/dashboard";
      } else {
        setError("아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } else {
      if (password === "1234") {
        window.location.href = "/dashboard";
      } else {
        setError("비밀번호가 틀렸습니다. (초기: 1234)");
      }
    }
  };

  const currentClassObj = CLASS_DATA.find(c => c.name === selectedClass);
  const studentsInClass = currentClassObj?.students || [];

  return (
    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Back Button */}
      {step > 1 && role === "student" ? (
         <button onClick={() => setStep(step - 1)} className="mb-10 flex items-center gap-2 text-[12px] font-black tracking-[0.2em] text-accent hover:text-foreground transition-all uppercase">
            <ArrowLeft size={16} strokeWidth={3} /> 뒤로가기
         </button>
      ) : (
        <Link href="/" className="mb-10 flex items-center gap-2 text-[12px] font-black tracking-[0.2em] text-accent hover:text-foreground transition-all uppercase">
            <ArrowLeft size={16} strokeWidth={3} /> 메인으로
        </Link>
      )}

      <div className="mb-14 space-y-4">
        <h2 className="text-[42px] text-foreground serif font-black leading-tight tracking-tighter">
          {role === "student" ? "학습자 로그인" : "교육자 로그인"}
        </h2>
        <div className="flex items-center gap-3">
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-foreground" : "bg-foreground/5"}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${role === "admin" || step >= 2 ? "bg-foreground" : "bg-foreground/5"}`} />
            <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${role === "admin" || step >= 3 ? "bg-foreground" : "bg-foreground/5"}`} />
        </div>
      </div>

      <div className="space-y-8">
        {role === "admin" ? (
          <div className="space-y-4">
               <div className="relative group">
                    <input type="text" placeholder="아이디" value={id} onChange={e => setId(e.target.value)}
                        className="w-full h-16 px-8 rounded-3xl bg-white border border-foreground/5 focus:ring-4 focus:ring-foreground/5 outline-none transition-all font-bold text-[15px] placeholder:text-accent/30 shadow-sm" />
               </div>
               <div className="relative group">
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full h-16 px-8 rounded-3xl bg-white border border-foreground/5 focus:ring-4 focus:ring-foreground/5 outline-none transition-all font-bold text-[15px] placeholder:text-accent/30 shadow-sm" />
               </div>
               {error && <p className="text-error text-[12px] font-black text-center pt-2">{error}</p>}
               <button onClick={handleLogin} className="w-full h-16 bg-foreground text-background rounded-3xl font-black tracking-[0.2em] text-[14px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                   <LogIn size={20} strokeWidth={2.5} /> 접근하기
               </button>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[13px] font-black text-accent uppercase tracking-widest pl-2">소속 반 선택</p>
                {CLASS_DATA.map(c => (
                  <button key={c.name} onClick={() => { setSelectedClass(c.name); setStep(2); }}
                    className="flex items-center justify-between w-full p-6 bg-white border border-foreground/5 rounded-[2rem] hover:border-foreground/20 hover:shadow-xl transition-all group text-left">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
                            <Users size={20} strokeWidth={2} />
                        </div>
                        <span className="text-[16px] font-black text-foreground">{c.name}</span>
                    </div>
                    <ChevronRight size={20} className="text-accent group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="col-span-2 text-[13px] font-black text-accent uppercase tracking-widest pl-2 mb-2">학생 이름 선택</p>
                {studentsInClass.map(s => (
                  <button key={s} onClick={() => { setSelectedStudent(s); setStep(3); }}
                    className="p-6 bg-white border border-foreground/5 rounded-[2rem] hover:border-foreground/20 hover:shadow-xl transition-all group text-center flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-[20px] font-black group-hover:bg-foreground group-hover:text-background transition-colors">
                        {s[0]}
                    </div>
                    <span className="text-[15px] font-black text-foreground">{s.split(" - ")[0]}</span>
                    {s.includes(" - ") && <span className="text-[10px] text-accent font-bold opacity-60 uppercase">{s.split(" - ")[1]}</span>}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-2 mb-8">
                    <p className="text-[14px] font-black text-foreground">{selectedClass}</p>
                    <h3 className="text-[28px] font-black text-foreground serif">{selectedStudent.split(" - ")[0]} 학생</h3>
                </div>
                <div className="relative group">
                    <input type="password" placeholder="비밀번호 (초기: 1234)" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full h-18 px-10 rounded-[2.5rem] bg-white border border-foreground/10 focus:ring-8 focus:ring-foreground/5 outline-none transition-all font-black text-[18px] text-center placeholder:text-accent/20 shadow-inner" />
                </div>
                {error && <p className="text-error text-[12px] font-black text-center">{error}</p>}
                <button onClick={handleLogin} className="w-full h-18 bg-foreground text-background rounded-[2.5rem] font-black tracking-[0.3em] text-[16px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                    LOGIN <LogIn size={22} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-20 text-center text-[11px] font-black text-accent tracking-[0.4em] uppercase opacity-30 select-none">
        Developed for Parallax English
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex justify-center items-center min-h-screen p-6 bg-background relative overflow-hidden">
      {/* Aesthetic Background Shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-foreground/[0.02] rounded-full blur-[100px] pointer-events-none" />
      
      <Suspense fallback={<div className="text-foreground serif font-bold animate-pulse">Deep Learning...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
