"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ParentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1|2|3>(1);
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [selClass, setSelClass] = useState("");
  const [selStudent, setSelStudent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id, name, academy_name").order("opened_at", { ascending: true })
      .then(({ data }) => {
        setClasses((data || []).map(r => ({
          id: r.id, name: r.name,
          displayName: r.academy_name ? `[${r.academy_name}] ${r.name}` : r.name,
        })));
      });
  }, []);

  const handleSelectClass = async (className: string) => {
    setSelClass(className);
    setLoading(true);
    const { data } = await supabase.from("students").select("name").eq("class_name", className).order("name");
    setStudents((data || []).map(r => r.name));
    setLoading(false);
    setStep(2);
  };

  const handleSelectStudent = (name: string) => {
    setSelStudent(name);
    setStep(3);
  };

  const handleLogin = async () => {
    if (!password) { setError("비밀번호를 입력해 주세요."); return; }
    setLoading(true); setError("");
    try {
      // 계정 조회
      const { data: acc } = await supabase
        .from("parent_accounts")
        .select("id, password")
        .eq("student_name", selStudent)
        .eq("class_name", selClass)
        .maybeSingle();

      if (!acc) {
        // 계정 없으면 자동 생성 (초기 비번 1234)
        if (password !== "1234") { setError("초기 비밀번호는 1234입니다."); setLoading(false); return; }
        await supabase.from("parent_accounts").insert({ student_name: selStudent, class_name: selClass, password: "1234" });
      } else {
        if (acc.password !== password) { setError("비밀번호가 올바르지 않습니다."); setLoading(false); return; }
      }

      sessionStorage.setItem("parentSession", JSON.stringify({ studentName: selStudent, className: selClass }));
      router.push("/parent");
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "#000000" }}>

      {/* 블랙홀 배경 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <style>{`
          @keyframes lbhCore { 0%,100%{opacity:0.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
          @keyframes lbhOrbit1 { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          @keyframes lbhOrbit2 { 0%{transform:rotate(0deg)} 100%{transform:rotate(-360deg)} }
          @keyframes lbhDrift { 0%,100%{opacity:0.25;transform:translate(0,0)} 50%{opacity:0.6;transform:translate(4%,6%)} }
        `}</style>

        {/* 코어 그로우 - 오른쪽 아래 */}
        <div style={{ position:'absolute', bottom:'-15%', right:'-10%', width:'70vw', height:'70vw',
          background:'radial-gradient(ellipse, rgba(80,50,220,0.5) 0%, rgba(40,20,140,0.28) 25%, transparent 65%)',
          borderRadius:'50%', filter:'blur(45px)', animation:'lbhCore 7s ease-in-out infinite' }}/>
        {/* 첫 번째 강착 원반 */}
        <div style={{ position:'absolute', bottom:'-20%', right:'-15%', width:'85vw', height:'85vw',
          background:'conic-gradient(from 0deg, transparent 0%, rgba(100,70,255,0.1) 20%, rgba(150,100,255,0.2) 35%, transparent 55%, rgba(60,30,200,0.07) 75%, transparent 92%)',
          borderRadius:'50%', filter:'blur(14px)', animation:'lbhOrbit1 22s linear infinite' }}/>
        {/* 두 번째 - 역방향 */}
        <div style={{ position:'absolute', bottom:'-25%', right:'-20%', width:'100vw', height:'100vw',
          background:'conic-gradient(from 180deg, transparent 0%, rgba(60,30,180,0.07) 25%, rgba(100,60,220,0.14) 42%, transparent 58%)',
          borderRadius:'50%', filter:'blur(20px)', animation:'lbhOrbit2 35s linear infinite' }}/>
        {/* 좌상단 드리프트 */}
        <div style={{ position:'absolute', top:'-5%', left:'-15%', width:'60vw', height:'60vw',
          background:'radial-gradient(ellipse, rgba(40,20,120,0.14) 0%, transparent 65%)',
          borderRadius:'50%', filter:'blur(50px)', animation:'lbhDrift 14s ease-in-out infinite' }}/>
        {/* 중력 왜곡 오버레이 */}
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(ellipse 70% 70% at 90% 90%, rgba(60,20,180,0.18) 0%, transparent 60%)' }}/>
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity mb-8 text-[13px]"
          style={{ color: 'rgba(160,130,255,0.5)' }}>
          <ArrowLeft size={14} /> 홈으로
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black mb-2" style={{ color: 'rgba(220,210,255,0.95)', letterSpacing: '-0.5px' }}>리포트 열람</h1>
          <p className="text-[13px]" style={{ color: "rgba(160,130,255,0.6)" }}>
            {step === 1 ? "반을 선택해 주세요" : step === 2 ? "자녀를 선택해 주세요" : `${selStudent} 학부모님, 반갑습니다`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all`}
                style={{ background: s <= step ? "rgba(100,70,255,0.25)" : "rgba(255,255,255,0.05)", color: s <= step ? "rgba(160,130,255,0.95)" : "rgba(255,255,255,0.2)", border: s <= step ? "1px solid rgba(120,80,255,0.45)" : "1px solid rgba(255,255,255,0.08)" }}>
                {s}
              </div>
              {s < 3 && <div className="h-px w-8 transition-all" style={{ background: s < step ? "rgba(100,70,255,0.3)" : "rgba(255,255,255,0.07)" }} />}
            </div>
          ))}
          <span className="ml-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {step === 1 ? "반 선택" : step === 2 ? "이름 선택" : "비밀번호"}
          </span>
        </div>

        <div className="space-y-3">
          {/* Step 1: 반 선택 */}
          {step === 1 && (
            <div className="space-y-2">
              {classes.length === 0 ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(160,130,255,0.4)' }}>로딩 중...</div>
              ) : classes.map(cls => (
                <button key={cls.id} onClick={() => handleSelectClass(cls.name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:scale-[1.01] group"
                  style={{ background: "rgba(80,50,200,0.12)", border: "1px solid rgba(100,70,255,0.22)", color: "rgba(210,200,255,0.9)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                  <span className="text-[14px] font-bold">{cls.displayName}</span>
                  <ChevronDown size={14} className="rotate-[-90deg] opacity-40" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 학생 선택 */}
          {step === 2 && (
            <div className="space-y-2">
              <button onClick={() => setStep(1)} className="text-[12px] flex items-center gap-1 mb-2 hover:opacity-80"
                style={{ color: 'rgba(120,80,255,0.5)' }}>
                <ArrowLeft size={12} /> {selClass} 변경
              </button>
              {loading ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(160,130,255,0.4)' }}>로딩 중...</div>
              ) : students.map(name => (
                <button key={name} onClick={() => handleSelectStudent(name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(80,50,200,0.12)", border: "1px solid rgba(100,70,255,0.22)", color: "rgba(210,200,255,0.9)" }}>
                  <span className="text-[14px] font-bold">{name}</span>
                  <ChevronDown size={14} className="rotate-[-90deg] opacity-40" />
                </button>
              ))}
            </div>
          )}

          {/* Step 3: 비밀번호 */}
          {step === 3 && (
            <div className="space-y-3">
              <button onClick={() => setStep(2)} className="text-[12px] flex items-center gap-1 hover:opacity-80"
                style={{ color: 'rgba(120,80,255,0.5)' }}>
                <ArrowLeft size={12} /> {selStudent} 변경
              </button>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="비밀번호 (초기: 1234)"
                autoFocus
                className="w-full h-14 px-5 rounded-2xl text-[15px] font-bold outline-none transition-all"
                style={{ background: "rgba(80,50,200,0.1)", border: error ? "1px solid rgba(255,80,80,0.6)" : "1px solid rgba(100,70,255,0.25)", color: "rgba(210,200,255,0.95)", caretColor: 'rgba(160,130,255,0.9)' }}
              />
              {error && <p className="text-[12px] px-1" style={{ color: '#ff8080' }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full h-14 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(80,50,200,0.35) 0%, rgba(120,70,255,0.35) 100%)", color: "rgba(210,200,255,0.95)", border: "1px solid rgba(100,70,255,0.3)", boxShadow: "0 0 30px rgba(80,50,200,0.15)" }}>
                {loading ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <><LogIn size={16} /> 입장하기</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
