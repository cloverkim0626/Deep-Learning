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
      style={{ background: "#f2ede4" }}>

      {/* 봄 창문 너머 녹음 — 노스텔지아 배경 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <style>{`
          @keyframes sHaze { 0%,100%{opacity:0.45;transform:translate(0,0) scale(1)} 40%{opacity:0.62;transform:translate(1%,2%) scale(1.02)} 70%{opacity:0.5;transform:translate(-0.5%,1%) scale(0.99)} }
          @keyframes sLight { 0%,100%{opacity:0.32;transform:translateX(0)} 50%{opacity:0.5;transform:translateX(1.5%)} }
          @keyframes sDrift { 0%,100%{opacity:0.18;transform:translate(0,0)} 50%{opacity:0.35;transform:translate(-1.5%,3%)} }
        `}</style>

        {/* 봄 햇살 — 따뜻한 크림-그린 상단 */}
        <div style={{ position:'absolute', top:'-20%', left:'-20%', width:'80vw', height:'80vw',
          background:'radial-gradient(ellipse, rgba(205,225,175,0.32) 0%, rgba(185,210,155,0.16) 28%, rgba(210,220,185,0.07) 52%, transparent 70%)',
          borderRadius:'50%', filter:'blur(55px)', animation:'sLight 14s ease-in-out infinite' }}/>

        {/* 녹음 보케 — 창문 밖 나뭇잎 */}
        <div style={{ position:'absolute', top:'-5%', right:'-25%', width:'70vw', height:'70vw',
          background:'radial-gradient(ellipse, rgba(175,210,148,0.24) 0%, rgba(158,195,132,0.1) 38%, transparent 65%)',
          borderRadius:'50%', filter:'blur(65px)', animation:'sHaze 18s ease-in-out infinite' }}/>

        {/* 오후 따뜻한 안개 — 중앙 */}
        <div style={{ position:'absolute', top:'28%', left:'-5%', width:'60vw', height:'55vw',
          background:'radial-gradient(ellipse, rgba(222,218,188,0.2) 0%, rgba(210,215,178,0.08) 45%, transparent 68%)',
          borderRadius:'50%', filter:'blur(52px)', animation:'sDrift 22s ease-in-out infinite' }}/>

        {/* 하단 깊은 녹음 그늘 */}
        <div style={{ position:'absolute', bottom:'-10%', right:'-10%', width:'65vw', height:'50vw',
          background:'radial-gradient(ellipse, rgba(148,185,128,0.17) 0%, rgba(128,168,108,0.06) 48%, transparent 70%)',
          borderRadius:'50%', filter:'blur(45px)', animation:'sHaze 26s ease-in-out infinite 4s' }}/>

        {/* 필름 그레인 — 전체 따뜻한 베이스 */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(168deg, rgba(218,228,198,0.13) 0%, rgba(242,238,224,0.09) 40%, transparent 62%, rgba(178,208,158,0.08) 100%)' }}/>

        {/* 비네팅 — 노스텔지아 가장자리 */}
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(ellipse 88% 88% at 50% 50%, transparent 42%, rgba(198,188,168,0.13) 78%, rgba(182,172,150,0.2) 100%)' }}/>
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity mb-8 text-[13px]"
          style={{ color: 'rgba(74,112,85,0.55)' }}>
          <ArrowLeft size={14} /> 홈으로
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black mb-2" style={{ color: '#2d3d2d', letterSpacing: '-0.5px' }}>리포트 열람</h1>
          <p className="text-[13px]" style={{ color: "rgba(74,112,85,0.6)" }}>
            {step === 1 ? "반을 선택해 주세요" : step === 2 ? "자녀를 선택해 주세요" : `${selStudent} 학부모님, 반갑습니다`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all`}
                style={{ background: s <= step ? "rgba(74,112,85,0.15)" : "rgba(100,150,80,0.06)", color: s <= step ? "rgba(45,61,45,0.9)" : "rgba(74,112,85,0.35)", border: s <= step ? "1px solid rgba(74,112,85,0.4)" : "1px solid rgba(100,150,80,0.15)" }}>
                {s}
              </div>
              {s < 3 && <div className="h-px w-8 transition-all" style={{ background: s < step ? "rgba(74,112,85,0.3)" : "rgba(100,150,80,0.12)" }} />}
            </div>
          ))}
          <span className="ml-2 text-[11px]" style={{ color: 'rgba(74,112,85,0.45)' }}>
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
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:scale-[1.01] group"
                  style={{ background: "rgba(100,160,80,0.07)", border: "1px solid rgba(90,140,70,0.2)", color: "#2d3d2d", boxShadow: "0 2px 12px rgba(60,100,50,0.08)" }}>
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
                style={{ color: 'rgba(74,112,85,0.6)' }}>
                <ArrowLeft size={12} /> {selClass} 변경
              </button>
              {loading ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(74,112,85,0.4)' }}>로딩 중...</div>
              ) : students.map(name => (
                <button key={name} onClick={() => handleSelectStudent(name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(100,160,80,0.07)", border: "1px solid rgba(90,140,70,0.2)", color: "#2d3d2d" }}>
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
                style={{ color: 'rgba(74,112,85,0.6)' }}>
                <ArrowLeft size={12} /> {selStudent} 변경
              </button>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="비밀번호 (초기: 1234)"
                autoFocus
                className="w-full h-14 px-5 rounded-2xl text-[15px] font-bold outline-none transition-all"
                style={{ background: "rgba(100,160,80,0.06)", border: error ? "1px solid rgba(220,80,80,0.6)" : "1px solid rgba(90,140,70,0.22)", color: "#2d3d2d", caretColor: 'rgba(74,112,85,0.9)' }}
              />
              {error && <p className="text-[12px] px-1" style={{ color: '#e05555' }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full h-14 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(60,100,70,0.9) 0%, rgba(45,75,55,0.95) 100%)", color: "rgba(220,240,210,0.95)", border: "1px solid rgba(80,130,70,0.3)", boxShadow: "0 4px 20px rgba(50,90,50,0.2)" }}>
                {loading ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <><LogIn size={16} /> 입장하기</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
