"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";

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
      if (!selectedClass || !selectedStudent) {
        setError("반과 이름을 선택해주세요.");
        return;
      }
      if (password === "1234") {
        window.location.href = "/dashboard";
      } else {
        setError("비밀번호가 일치하지 않습니다. (초기: 1234)");
      }
    }
  };

  const studentsInClass = CLASS_DATA.find(c => c.name === selectedClass)?.students || [];

  return (
    <div className="w-full max-w-[440px] glass rounded-[2.5rem] p-10 md:p-14 relative z-10 border border-white/20 shadow-2xl">
      <Link href="/" className="absolute top-10 left-10 text-accent hover:text-foreground transition-all duration-500">
        <ArrowLeft strokeWidth={2} size={22} />
      </Link>

      <div className="mt-8 mb-12 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 text-[10px] font-black text-accent uppercase tracking-widest mb-2">
          <CheckCircle2 size={12} className="text-foreground" />
          Official Platform
        </div>
        <h2 className="text-4xl text-foreground serif tracking-tighter font-bold">
          {role === "student" ? "Deep Learning" : "Team Parallax"}
        </h2>
        <p className="text-accent text-[14px] font-medium leading-relaxed">
          {role === "student" ? "자신의 반과 이름을 선택해주세요." : "관리자 계정으로 로그인하세요."}
        </p>
      </div>

      <div className="flex bg-accent-light p-1.5 rounded-2xl mb-10 border border-foreground/5 shadow-inner">
        <button onClick={() => { setRole("student"); setError(""); }} className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-500 ${role === "student" ? "bg-white shadow-md text-foreground" : "text-accent hover:text-foreground"}`}>학생</button>
        <button onClick={() => { setRole("admin"); setError(""); }} className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-500 ${role === "admin" ? "bg-white shadow-md text-foreground" : "text-accent hover:text-foreground"}`}>강사</button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        {role === "student" ? (
          <>
            <div className="relative">
              <select 
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(""); }}
                className="w-full h-14 px-6 rounded-2xl bg-transparent border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all text-foreground font-bold text-[14px] appearance-none cursor-pointer"
              >
                <option value="" disabled>소속 반 선택</option>
                {CLASS_DATA.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
            </div>
            
            <div className="relative">
              <select 
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                disabled={!selectedClass}
                className="w-full h-14 px-6 rounded-2xl bg-transparent border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all text-foreground font-bold text-[14px] appearance-none cursor-pointer disabled:opacity-30"
              >
                <option value="" disabled>학생 이름 선택</option>
                {studentsInClass.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
            </div>

            <input 
              type="password" 
              placeholder="비밀번호 (초기: 1234)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-14 px-6 rounded-2xl bg-transparent border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all placeholder:text-accent font-bold text-[14px]"
            />
          </>
        ) : (
          <>
            <input 
              type="text" 
              placeholder="아이디 (parallax)"
              value={id}
              onChange={e => setId(e.target.value)}
              className="w-full h-14 px-6 rounded-2xl bg-transparent border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all placeholder:text-accent font-bold text-[14px]"
            />
            <input 
              type="password" 
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-14 px-6 rounded-2xl bg-transparent border border-foreground/10 focus:outline-none focus:border-foreground/30 transition-all placeholder:text-accent font-bold text-[14px]"
            />
          </>
        )}

        {error && <p className="text-red-500 text-[12px] font-bold text-center mt-2 animate-in fade-in slide-in-from-top-1">{error}</p>}

        <button 
          type="submit"
          className="w-full h-14 mt-8 bg-foreground text-background font-black tracking-widest text-[14px] rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0.5 transition-all duration-500"
        >
          LOG IN
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex justify-center items-center h-full p-6 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-foreground/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-foreground/5 rounded-full blur-[100px]" />
      
      <Suspense fallback={<div className="text-foreground serif font-bold animate-pulse">Deep Learning...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
