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
      style={{ background: "linear-gradient(180deg, #010812 0%, #020e14 30%, #040e1a 60%, #060212 100%)" }}>

      {/* ══ 오로라 배경 ══ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <style>{`
          @keyframes auroraA { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(8%,12%) scale(1.2)} }
          @keyframes auroraB { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(-10%,8%) scale(1.25)} }
          @keyframes auroraC { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(6%,-10%) scale(1.15)} }
          @keyframes auroraD { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(-8%,15%) scale(1.22)} }
          @keyframes auroraE { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(10%,-6%) scale(1.1)} }
          @keyframes curtainWave {
            0%,100%{opacity:0.5; transform:scaleX(1) skewY(0deg)}
            50%{opacity:1; transform:scaleX(1.06) skewY(0.5deg)}
          }
        `}</style>

        {/* ── 주요 오로라 글로우 블롭 5개 ── */}
        <div style={{ position:'absolute', top:'-25%', left:'-15%', width:'80%', height:'70%',
          background:'radial-gradient(ellipse, rgba(0,255,140,0.32) 0%, rgba(0,200,120,0.08) 50%, transparent 70%)',
          animation:'auroraA 10s ease-in-out infinite alternate', borderRadius:'50%', filter:'blur(35px)' }}/>
        <div style={{ position:'absolute', top:'-10%', right:'-25%', width:'75%', height:'65%',
          background:'radial-gradient(ellipse, rgba(80,40,255,0.28) 0%, rgba(60,20,200,0.07) 50%, transparent 70%)',
          animation:'auroraB 14s ease-in-out infinite alternate', borderRadius:'50%', filter:'blur(40px)' }}/>
        <div style={{ position:'absolute', top:'25%', left:'10%', width:'65%', height:'55%',
          background:'radial-gradient(ellipse, rgba(0,200,255,0.22) 0%, rgba(0,150,220,0.06) 50%, transparent 70%)',
          animation:'auroraC 17s ease-in-out infinite alternate', borderRadius:'50%', filter:'blur(38px)' }}/>
        <div style={{ position:'absolute', bottom:'-20%', right:'5%', width:'70%', height:'60%',
          background:'radial-gradient(ellipse, rgba(180,0,255,0.18) 0%, rgba(120,0,200,0.05) 50%, transparent 70%)',
          animation:'auroraD 20s ease-in-out infinite alternate', borderRadius:'50%', filter:'blur(45px)' }}/>
        <div style={{ position:'absolute', bottom:'10%', left:'-10%', width:'55%', height:'45%',
          background:'radial-gradient(ellipse, rgba(0,255,200,0.2) 0%, transparent 70%)',
          animation:'auroraE 12s ease-in-out infinite alternate', borderRadius:'50%', filter:'blur(30px)' }}/>

        {/* ── 빛의 커튼 (수직 광선들) ── */}
        {[
          {l:'15%', color:'rgba(0,255,160,0.12)', d:'5.5s', delay:'0s', w:'3px', h:'70%', top:'0'},
          {l:'28%', color:'rgba(0,220,255,0.09)', d:'7s',   delay:'1s', w:'2px', h:'55%', top:'5%'},
          {l:'42%', color:'rgba(0,255,120,0.14)', d:'6s',   delay:'0.5s', w:'4px', h:'80%', top:'0'},
          {l:'58%', color:'rgba(120,60,255,0.1)', d:'8s',   delay:'1.5s', w:'2px', h:'60%', top:'10%'},
          {l:'72%', color:'rgba(0,200,255,0.11)', d:'5s',   delay:'0.3s', w:'3px', h:'75%', top:'0'},
          {l:'85%', color:'rgba(80,0,255,0.09)',  d:'9s',   delay:'2s',   w:'2px', h:'50%', top:'15%'},
        ].map((ray,i) => (
          <div key={i} style={{
            position:'absolute', top:ray.top, left:ray.l, width:ray.w, height:ray.h,
            background:`linear-gradient(180deg, transparent 0%, ${ray.color} 20%, ${ray.color} 60%, transparent 100%)`,
            filter:'blur(4px)',
            animation:`curtainWave ${ray.d} ease-in-out infinite`,
            animationDelay:ray.delay,
          }}/>
        ))}

        {/* ── 수평 오로라 띠 ── */}
        {[
          {top:'18%', color:'rgba(0,255,160,0.12)', d:'6s', delay:'0s'},
          {top:'35%', color:'rgba(0,180,255,0.1)',  d:'8s', delay:'1.5s'},
          {top:'52%', color:'rgba(100,60,255,0.09)',d:'7s', delay:'0.8s'},
          {top:'70%', color:'rgba(0,220,180,0.08)', d:'9s', delay:'2s'},
        ].map((band,i) => (
          <div key={i} style={{
            position:'absolute', top:band.top, left:0, right:0, height:'60px',
            background:`radial-gradient(ellipse 80% 50% at 50% 50%, ${band.color} 0%, transparent 100%)`,
            filter:'blur(8px)',
            animation:`curtainWave ${band.d} ease-in-out infinite`,
            animationDelay:band.delay,
          }}/>
        ))}

        {/* ── 별빛 반짝임 ── */}
        {[
          {top:'8%', left:'12%', s:'1.2s', delay:'0s', size:'2px'},
          {top:'15%',left:'78%', s:'0.8s', delay:'0.4s', size:'3px'},
          {top:'22%',left:'45%', s:'1.5s', delay:'0.9s', size:'2px'},
          {top:'35%',left:'88%', s:'0.9s', delay:'0.2s', size:'2px'},
          {top:'50%',left:'5%',  s:'1.3s', delay:'1.1s', size:'3px'},
          {top:'62%',left:'92%', s:'1.0s', delay:'0.6s', size:'2px'},
          {top:'75%',left:'33%', s:'0.7s', delay:'1.4s', size:'2px'},
          {top:'88%',left:'67%', s:'1.1s', delay:'0.3s', size:'3px'},
          {top:'5%', left:'55%', s:'1.4s', delay:'0.7s', size:'2px'},
          {top:'42%',left:'22%', s:'0.9s', delay:'1.8s', size:'2px'},
        ].map((st,i) => (
          <div key={i} style={{
            position:'absolute', top:st.top, left:st.left,
            width:st.size, height:st.size,
            background:'white', borderRadius:'50%',
            boxShadow:`0 0 6px 2px rgba(180,255,220,0.9)`,
            animation:`${i%2===0?'starBlink':'starBlink2'} ${st.s} ease-in-out infinite`,
            animationDelay:st.delay,
          }}/>
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity mb-8 text-[13px]"
          style={{ color: 'rgba(0,255,180,0.5)' }}>
          <ArrowLeft size={14} /> 홈으로
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black mb-2" style={{ color: '#e2ffe8', letterSpacing: '-0.5px' }}>리포트 열람</h1>
          <p className="text-[13px]" style={{ color: "rgba(0,255,180,0.6)" }}>
            {step === 1 ? "반을 선택해 주세요" : step === 2 ? "자녀를 선택해 주세요" : `${selStudent} 학부모님, 반갑습니다`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${s <= step ? "" : ""}`}
                style={{ background: s <= step ? "rgba(0,255,160,0.25)" : "rgba(255,255,255,0.05)", color: s <= step ? "#00ffa8" : "rgba(255,255,255,0.2)", border: s <= step ? "1px solid rgba(0,255,160,0.4)" : "1px solid rgba(255,255,255,0.08)" }}>
                {s}
              </div>
              {s < 3 && <div className="h-px w-8 transition-all" style={{ background: s < step ? "rgba(0,255,160,0.3)" : "rgba(255,255,255,0.07)" }} />}
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
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(0,255,160,0.3)' }}>로딩 중...</div>
              ) : classes.map(cls => (
                <button key={cls.id} onClick={() => handleSelectClass(cls.name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:scale-[1.01]"
                  style={{ background: "rgba(0,255,160,0.06)", border: "1px solid rgba(0,255,160,0.15)", color: "rgba(220,255,240,0.9)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
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
                style={{ color: 'rgba(0,255,160,0.4)' }}>
                <ArrowLeft size={12} /> {selClass} 변경
              </button>
              {loading ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'rgba(0,255,160,0.3)' }}>로딩 중...</div>
              ) : students.map(name => (
                <button key={name} onClick={() => handleSelectStudent(name)}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(0,255,160,0.06)", border: "1px solid rgba(0,255,160,0.15)", color: "rgba(220,255,240,0.9)" }}>
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
                style={{ color: 'rgba(0,255,160,0.4)' }}>
                <ArrowLeft size={12} /> {selStudent} 변경
              </button>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="비밀번호 (초기: 1234)"
                autoFocus
                className="w-full h-14 px-5 rounded-2xl text-[15px] font-bold outline-none transition-all"
                style={{ background: "rgba(0,255,160,0.06)", border: error ? "1px solid rgba(255,80,80,0.6)" : "1px solid rgba(0,255,160,0.2)", color: "rgba(220,255,240,0.95)", caretColor: '#00ffa8' }}
              />
              {error && <p className="text-[12px] px-1" style={{ color: '#ff8080' }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className="w-full h-14 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(0,200,120,0.3) 0%, rgba(100,60,255,0.3) 100%)", color: "#e2ffe8", border: "1px solid rgba(0,255,160,0.25)", boxShadow: "0 0 30px rgba(0,255,120,0.1)" }}>
                {loading ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <><LogIn size={16} /> 입장하기</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
