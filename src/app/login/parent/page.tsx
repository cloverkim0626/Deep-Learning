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
      style={{
        backgroundImage: "url('/parent-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}>

      {/* 오버레이 레이어들 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {/* 따뜻한 크림 틴트 */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(175deg, rgba(240,235,220,0.22) 0%, rgba(220,228,200,0.1) 40%, rgba(200,218,185,0.15) 100%)' }}/>
        {/* 하단 부드러운 페이드 */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to bottom, transparent 25%, rgba(215,210,195,0.3) 100%)' }}/>
      </div>

      {/* Frosted Glass 카드 */}
      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700
        rounded-3xl px-7 py-8"
        style={{
          background: 'rgba(248,244,238,0.72)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 40px rgba(100,120,80,0.13), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>

        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity mb-8 text-[13px]"
          style={{ color: 'rgba(74,112,85,0.6)' }}>
          <ArrowLeft size={14} /> 홈으로
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black mb-2" style={{ color: '#2d3d2d', letterSpacing: '-0.5px' }}>리포트 열람</h1>
          <p className="text-[13px]" style={{ color: "rgba(74,112,85,0.65)" }}>
            {step === 1 ? "반을 선택해 주세요" : step === 2 ? "자녀를 선택해 주세요" : `${selStudent} 학부모님, 반갑습니다`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all"
                style={{ background: s <= step ? "rgba(74,112,85,0.18)" : "rgba(150,170,130,0.08)", color: s <= step ? "rgba(45,65,40,0.9)" : "rgba(74,112,85,0.35)", border: s <= step ? "1px solid rgba(74,112,85,0.4)" : "1px solid rgba(150,170,130,0.2)" }}>
                {s}
              </div>
              {s < 3 && <div className="h-px w-8 transition-all" style={{ background: s < step ? "rgba(74,112,85,0.3)" : "rgba(150,170,130,0.15)" }} />}
            </div>
          ))}
          <span className="ml-2 text-[11px]" style={{ color: 'rgba(74,112,85,0.5)' }}>
            {step === 1 ? "반 선택" : step === 2 ? "이름 선택" : "비밀번호"}
          </span>
        </div>

        <div className="space-y-3">
          {/* Step 1: 반 선택 */}
          {step === 1 && (
            <div className="space-y-2">
              {classes.length === 0 ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(74,112,85,0.4)' }}>로딩 중...</div>
              ) : classes.map(cls => (
                <button key={cls.id} onClick={() => handleSelectClass(cls.name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:scale-[1.01]"
                  style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(180,200,160,0.35)", color: "#2d3d2d", backdropFilter:'blur(8px)', boxShadow: "0 2px 10px rgba(80,110,60,0.07)" }}>
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
                style={{ color: 'rgba(74,112,85,0.65)' }}>
                <ArrowLeft size={12} /> {selClass} 변경
              </button>
              {loading ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(74,112,85,0.4)' }}>로딩 중...</div>
              ) : students.map(name => (
                <button key={name} onClick={() => handleSelectStudent(name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(180,200,160,0.35)", color: "#2d3d2d", backdropFilter:'blur(8px)' }}>
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
                style={{ color: 'rgba(74,112,85,0.65)' }}>
                <ArrowLeft size={12} /> {selStudent} 변경
              </button>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="비밀번호 (초기: 1234)"
                autoFocus
                className="w-full h-14 px-5 rounded-2xl text-[15px] font-bold outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.55)", border: error ? "1px solid rgba(220,80,80,0.5)" : "1px solid rgba(180,200,160,0.35)", color: "#2d3d2d", caretColor: 'rgba(74,112,85,0.9)', backdropFilter:'blur(8px)' }}
              />
              {error && <p className="text-[12px] px-1" style={{ color: '#c0504a' }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full h-14 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(65,105,72,0.92) 0%, rgba(48,80,54,0.96) 100%)", color: "rgba(225,242,215,0.96)", border: "1px solid rgba(90,140,80,0.3)", boxShadow: "0 4px 20px rgba(50,90,50,0.22)" }}>
                {loading ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <><LogIn size={16} /> 입장하기</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
