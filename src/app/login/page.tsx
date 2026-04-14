"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, ChevronDown } from "lucide-react";

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
  const [role] = useState<"student" | "admin">(roleFromQuery === "admin" ? "admin" : "student");

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
      if (!selectedClass || !selectedStudent) {
        setError("반과 이름을 모두 선택해 주세요.");
        return;
      }
      if (password === "1234") {
        // Save session data to localStorage so it persists
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
    <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      <Link href="/" className="mb-12 flex items-center gap-2 text-[12px] font-black tracking-[0.2em] text-accent hover:text-foreground transition-all uppercase">
          <ArrowLeft size={16} strokeWidth={3} /> 메인으로
      </Link>

      <div className="mb-12 space-y-3 text-center">
        <h2 className="text-[36px] text-foreground serif font-black leading-tight tracking-tighter">
          {role === "student" ? "학생 로그인" : "선생님 로그인"}
        </h2>
        <p className="text-[13px] text-accent font-medium">
            {role === "student" ? "반과 이름을 선택한 후 비밀번호를 입력하세요." : "관리자 암호를 입력해 주세요."}
        </p>
      </div>

      <div className="space-y-6">
        {role === "admin" ? (
          <div className="space-y-4">
               <div className="relative group">
                    <input type="password" placeholder="선생님 비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full h-16 px-8 rounded-3xl bg-white border border-foreground/10 focus:ring-4 focus:ring-foreground/5 outline-none transition-all font-bold text-[15px] placeholder:text-accent/40 shadow-sm" />
               </div>
               {error && <p className="text-error text-[12px] font-black text-center pt-2">{error}</p>}
               <button onClick={handleLogin} className="w-full h-16 bg-foreground text-background rounded-3xl font-black tracking-[0.2em] text-[15px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                   <LogIn size={20} strokeWidth={2.5} /> 입장하기
               </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Elegant Form Items */}
            <div className="space-y-1.5 focus-within:text-foreground text-accent transition-colors">
              <label className="text-[11px] font-black pl-4 uppercase tracking-widest block">1. 소속 반</label>
              <div className="relative">
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(""); }}
                  className="w-full h-16 px-6 bg-white border border-foreground/10 rounded-3xl appearance-none font-bold text-[15px] text-foreground focus:ring-4 focus:ring-foreground/5 outline-none transition-all shadow-sm cursor-pointer">
                  <option value="" disabled>반을 선택해 주세요</option>
                  {CLASS_DATA.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" size={18} />
              </div>
            </div>

            <div className={`space-y-1.5 transition-all duration-500 ${selectedClass ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="text-[11px] font-black pl-4 uppercase tracking-widest block text-accent focus-within:text-foreground">2. 본인 이름</label>
              <div className="relative">
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full h-16 px-6 bg-white border border-foreground/10 rounded-3xl appearance-none font-bold text-[15px] text-foreground focus:ring-4 focus:ring-foreground/5 outline-none transition-all shadow-sm cursor-pointer">
                  <option value="" disabled>이름을 선택해 주세요</option>
                  {studentsInClass.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-accent" size={18} />
              </div>
            </div>

            <div className={`space-y-1.5 transition-all duration-500 pt-2 ${selectedStudent ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="text-[11px] font-black pl-4 uppercase tracking-widest block text-accent focus-within:text-foreground">3. 비밀번호</label>
              <input type="password" placeholder="초기 비밀번호 1234" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-16 px-6 bg-white border border-foreground/10 rounded-3xl font-black text-[18px] text-foreground text-center focus:ring-4 focus:ring-foreground/5 outline-none transition-all shadow-sm placeholder:text-[14px] placeholder:font-bold placeholder:text-accent/30" />
            </div>

            {error && <p className="text-error text-[12px] font-black text-center pt-2 animate-in fade-in zoom-in">{error}</p>}

            <div className="pt-4">
               <button onClick={handleLogin} disabled={!selectedClass || !selectedStudent}
                   className="w-full h-16 bg-foreground text-background rounded-3xl font-black tracking-[0.2em] text-[15px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:bg-foreground/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:pointer-events-none">
                   입장하기 <LogIn size={20} strokeWidth={2.5} />
               </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-16 text-center text-[10px] font-black text-accent tracking-[0.3em] uppercase opacity-40 select-none pb-8">
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
