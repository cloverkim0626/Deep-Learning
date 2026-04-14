"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, User, Users, Lock, ChevronRight, LogIn, ChevronDown } from "lucide-react";

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

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (role === "admin") {
      if (password === "parallax2026") {
        localStorage.setItem("stu_session", JSON.stringify({ name: "선생님", class: "관리자" }));
        window.location.href = "/admin/dashboard";
      } else {
        setError("비밀번호가 일치하지 않습니다.");
      }
    } else {
      if (password === "1234") {
        // Save session data to localStorage so it persists in the layout
        localStorage.setItem("stu_session", JSON.stringify({ 
          name: selectedStudent.split(" - ")[0], 
          class: selectedClass 
        }));
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
      
      <Link href="/" className="mb-10 flex items-center gap-2 text-[12px] font-black tracking-[0.2em] text-accent hover:text-foreground transition-all uppercase">
          <ArrowLeft size={16} strokeWidth={3} /> 메인으로
      </Link>

      <div className="mb-14 space-y-4">
        <h2 className="text-[42px] text-foreground serif font-black leading-tight tracking-tighter">
          {role === "student" ? "학생 로그인" : "선생님 로그인"}
        </h2>
        <p className="text-[14px] text-accent font-medium">
            {role === "student" ? "자신의 반과 이름을 선택해 주세요." : "관리자 암호를 입력해 주세요."}
        </p>
      </div>

      <div className="space-y-8">
        {role === "admin" ? (
          <div className="space-y-4">
               <div className="relative group">
                    <input type="password" placeholder="선생님 비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full h-16 px-8 rounded-3xl bg-white border border-foreground/5 focus:ring-4 focus:ring-foreground/5 outline-none transition-all font-bold text-[15px] placeholder:text-accent/30 shadow-sm" />
               </div>
               {error && <p className="text-error text-[12px] font-black text-center pt-2">{error}</p>}
               <button onClick={handleLogin} className="w-full h-16 bg-foreground text-background rounded-3xl font-black tracking-[0.2em] text-[14px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                   <LogIn size={20} strokeWidth={2.5} /> 입장하기
               </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
                <p className="text-[11px] font-black text-accent uppercase tracking-widest pl-2">1. 반 선택</p>
                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto px-1 py-1 custom-scrollbar">
                    {CLASS_DATA.map(c => (
                        <button key={c.name} onClick={() => { setSelectedClass(c.name); setSelectedStudent(""); }}
                            className={`flex items-center justify-between w-full p-5 rounded-2xl border transition-all text-left ${selectedClass === c.name ? "bg-foreground text-background border-foreground shadow-lg" : "bg-white text-foreground border-foreground/5 hover:border-foreground/20"}`}>
                            <span className="text-[15px] font-black">{c.name}</span>
                            {selectedClass === c.name && <CheckCircle2 size={18} />}
                        </button>
                    ))}
                </div>
            </div>

            {selectedClass && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[11px] font-black text-accent uppercase tracking-widest pl-2">2. 이름 선택</p>
                    <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto px-1 py-1 custom-scrollbar">
                        {studentsInClass.map(s => (
                            <button key={s} onClick={() => setSelectedStudent(s)}
                                className={`p-5 rounded-2xl border transition-all text-center flex flex-col items-center gap-2 ${selectedStudent === s ? "bg-foreground text-background border-foreground shadow-lg" : "bg-white text-foreground border-foreground/5 hover:border-foreground/20"}`}>
                                <span className="text-[14px] font-black">{s.split(" - ")[0]}</span>
                                <span className={`text-[10px] font-bold opacity-60 ${selectedStudent === s ? "text-background/60" : "text-accent"}`}>{s.split(" - ")[1] || "Student"}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedStudent && (
              <div className="space-y-6 pt-6 border-t border-foreground/5 animate-in fade-in zoom-in-95">
                <div className="relative group">
                    <input type="password" placeholder="비밀번호 (초기 1234)" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full h-18 px-10 rounded-[2.5rem] bg-white border border-foreground/10 focus:ring-8 focus:ring-foreground/5 outline-none transition-all font-black text-[18px] text-center placeholder:text-accent/20 shadow-inner" />
                </div>
                {error && <p className="text-error text-[12px] font-black text-center">{error}</p>}
                <button onClick={handleLogin} className="w-full h-18 bg-foreground text-background rounded-[2.5rem] font-black tracking-[0.3em] text-[16px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                    입장하기 <LogIn size={22} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-20 text-center text-[11px] font-black text-accent tracking-[0.3em] uppercase opacity-30 select-none">
        Produced by Team Parallax
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
