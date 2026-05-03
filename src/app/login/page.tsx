"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";



function LoginForm() {
  const searchParams = useSearchParams();
  const roleFromQuery = searchParams.get("role");
  const [role] = useState<"student" | "admin">(roleFromQuery === "admin" ? "admin" : "student");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 수업관리(classes + class_students)에서 동적 로드한 반 목록
  const [syncedClasses, setSyncedClasses] = useState<{ name: string; students: string[] }[]>([]);
  // GUEST 학생 목록
  const [guestStudents, setGuestStudents] = useState<string[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingDb(true);
      try {
        // 1) classes 테이블의 모든 반 로드
        const { data: classRows } = await supabase
          .from('classes')
          .select('id, academy_name, name')
          .order('opened_at', { ascending: true });

        // 2) 각 반의 학생 목록을 students.class_name 기준으로 로드 (단일 소스)
        const classResults: { name: string; students: string[] }[] = [];
        for (const cls of classRows || []) {
          const { data: stuRows } = await supabase
            .from('students')
            .select('name')
            .eq('class_name', cls.name)
            .order('name', { ascending: true });

          const prefix = cls.academy_name ? `[${cls.academy_name}] ` : '';
          classResults.push({
            name: `${prefix}${cls.name}`,
            students: (stuRows || []).map((r: { name: string }) => r.name),
          });
        }
        setSyncedClasses(classResults);

        // 3) GUEST 학생 (students 테이블)
        const { data: guestData } = await supabase
          .from('students')
          .select('name')
          .ilike('class_name', '%guest%')
          .order('name', { ascending: true });
        setGuestStudents((guestData || []).map((s: { name: string }) => s.name));
      } finally {
        setLoadingDb(false);
      }
    };
    fetchAll();
  }, []);

  // 최종 CLASS_DATA: classes 테이블 반 + GUEST
  const CLASS_DATA = [
    ...syncedClasses,
    { name: "[WOODOK] GUEST", students: guestStudents },
  ];


  const handleLogin = async () => {
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
      // GUEST 반 — 비밀번호 불필요
      if (selectedClass === "[WOODOK] GUEST") {
        localStorage.setItem("stu_session", JSON.stringify({
          name: selectedStudent.split(" - ")[0],
          class: selectedClass
        }));
        window.location.href = "/dashboard";
        return;
      }
      // 정규 학생 — DB에서 비밀번호 검증
      const studentName = selectedStudent.split(" - ")[0];
      const { data, error: dbErr } = await supabase
        .from('students')
        .select('id, name, class_name, password')
        .eq('name', studentName)
        .single();

      if (dbErr || !data) {
        setError("학생 정보를 찾을 수 없습니다. 선생님께 문의하세요.");
        return;
      }
      if (data.password !== password) {
        setError("비밀번호가 틀렸습니다.");
        return;
      }
      localStorage.setItem("stu_session", JSON.stringify({
        name: data.name,
        class: selectedClass,
      }));
      window.location.href = "/dashboard";
    }
  };

  const currentClassObj = CLASS_DATA.find(c => c.name === selectedClass);
  const studentsInClass = currentClassObj?.students || [];
  const isGuestClass = selectedClass === "[WOODOK] GUEST";
  // 수업관리 동기화 반 여부 (로딩 중 UI용)
  const isSyncedClass = syncedClasses.some(cls => cls.name === selectedClass);

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000
      rounded-3xl px-7 py-8"
      style={{
        background:'rgba(5,18,32,0.62)',
        backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        border:'1px solid rgba(40,180,220,0.2)',
        boxShadow:'0 8px 48px rgba(0,60,120,0.35), inset 0 1px 0 rgba(100,220,255,0.12)',
      }}>

      <Link href="/" className="mb-12 flex items-center gap-2 text-[12px] font-black tracking-[0.2em] transition-all uppercase"
        style={{color:'rgba(100,210,240,0.7)'}}>
        <ArrowLeft size={16} strokeWidth={3} /> 메인으로
      </Link>

      <div className="mb-12 space-y-3 text-center">
        <h2 className="text-[36px] serif font-black leading-tight tracking-tighter" style={{color:'rgba(220,245,255,0.97)'}}>
          {role === "student" ? "학생 로그인" : "선생님 로그인"}
        </h2>
        <p className="text-[13px] font-medium" style={{color:'rgba(100,200,235,0.65)'}}>
          {role === "student" ? "반과 이름을 선택한 후 비밀번호를 입력하세요." : "관리자 암호를 입력해 주세요."}
        </p>
      </div>

      <div className="space-y-6">
        {role === "admin" ? (
          <div className="space-y-4">
            <div className="relative">
              <input type="password" placeholder="선생님 비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-16 px-8 rounded-3xl appearance-none font-bold text-[15px] outline-none transition-all"
                style={{background:'rgba(10,30,55,0.6)',border:'1px solid rgba(40,180,220,0.25)',color:'rgba(220,245,255,0.95)',caretColor:'rgba(80,210,240,0.9)'}} />
            </div>
            {error && <p className="text-[12px] font-black text-center pt-2" style={{color:'rgba(255,120,120,0.9)'}}>{error}</p>}
            <button onClick={handleLogin}
              className="w-full h-16 rounded-3xl font-black tracking-[0.2em] text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              style={{background:'linear-gradient(135deg,rgba(15,160,210,0.9) 0%,rgba(10,130,185,0.95) 100%)',color:'rgba(220,248,255,0.97)',boxShadow:'0 4px 24px rgba(10,140,200,0.4)'}}>
              <LogIn size={20} strokeWidth={2.5} /> 입장하기
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. 반 선택 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black pl-4 uppercase tracking-widest block" style={{color:'rgba(80,200,235,0.6)'}}>1. 소속 반</label>
              <div className="relative">
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(""); }}
                  className="w-full h-16 px-6 rounded-3xl appearance-none font-bold text-[15px] outline-none transition-all cursor-pointer"
                  style={{background:'rgba(10,30,55,0.6)',border:'1px solid rgba(40,180,220,0.22)',color:'rgba(220,245,255,0.92)'}}>
                  <option value="" disabled style={{background:'#0a1e36'}}>반을 선택해 주세요</option>
                  {CLASS_DATA.map(c => <option key={c.name} value={c.name} style={{background:'#0a1e36'}}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" size={18} style={{color:'rgba(80,200,235,0.55)'}} />
              </div>
            </div>

            {/* 2. 이름 선택 */}
            <div className={`space-y-1.5 transition-all duration-500 ${selectedClass ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
              <label className="text-[11px] font-black pl-4 uppercase tracking-widest block" style={{color:'rgba(80,200,235,0.6)'}}>2. 본인 이름</label>
              <div className="relative">
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full h-16 px-6 rounded-3xl appearance-none font-bold text-[15px] outline-none transition-all cursor-pointer"
                  style={{background:'rgba(10,30,55,0.6)',border:'1px solid rgba(40,180,220,0.22)',color:'rgba(220,245,255,0.92)'}}>
                  <option value="" disabled style={{background:'#0a1e36'}}>
                    {loadingDb && (isGuestClass || isSyncedClass) ? "불러오는 중..." : "이름을 선택해 주세요"}
                  </option>
                  {studentsInClass.map(s => <option key={s} value={s} style={{background:'#0a1e36'}}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" size={18} style={{color:'rgba(80,200,235,0.55)'}} />
              </div>
              {isGuestClass && !loadingDb && studentsInClass.length === 0 && (
                <p className="text-[11px] font-bold pl-4" style={{color:'rgba(255,180,80,0.9)'}}>등록된 체험 학생이 없습니다. 선생님께 문의하세요.</p>
              )}
              {isSyncedClass && !loadingDb && studentsInClass.length === 0 && (
                <p className="text-[11px] font-bold pl-4" style={{color:'rgba(255,180,80,0.9)'}}>등록된 학생이 없습니다. 수업관리에서 학생을 등록해 주세요.</p>
              )}
            </div>

            {/* 3. 비밀번호 */}
            {!isGuestClass && (
              <div className={`space-y-1.5 transition-all duration-500 pt-2 ${selectedStudent ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
                <label className="text-[11px] font-black pl-4 uppercase tracking-widest block" style={{color:'rgba(80,200,235,0.6)'}}>3. 비밀번호</label>
                <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-16 px-6 rounded-3xl font-black text-[18px] text-center outline-none transition-all"
                  style={{background:'rgba(10,30,55,0.6)',border:'1px solid rgba(40,180,220,0.22)',color:'rgba(220,245,255,0.95)',caretColor:'rgba(80,210,240,0.9)'}} />
              </div>
            )}

            {isGuestClass && selectedStudent && (
              <div className="px-4 py-3 rounded-2xl" style={{background:'rgba(10,100,160,0.25)',border:'1px solid rgba(40,180,220,0.25)'}}>
                <p className="text-[12px] font-bold text-center" style={{color:'rgba(140,230,255,0.9)'}}>🎉 체험 계정 — 비밀번호 없이 바로 입장!</p>
              </div>
            )}

            {error && <p className="text-[12px] font-black text-center pt-2 animate-in fade-in zoom-in" style={{color:'rgba(255,120,120,0.9)'}}>{error}</p>}

            <div className="pt-4">
              <button onClick={handleLogin} disabled={!selectedClass || !selectedStudent}
                className="w-full h-16 rounded-3xl font-black tracking-[0.2em] text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-25 disabled:pointer-events-none"
                style={{background:'linear-gradient(135deg,rgba(15,160,210,0.9) 0%,rgba(10,130,185,0.95) 100%)',color:'rgba(220,248,255,0.97)',boxShadow:'0 4px 24px rgba(10,140,200,0.4)'}}>
                입장하기 <LogIn size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-16 text-center text-[10px] font-black tracking-[0.3em] uppercase select-none pb-2" style={{color:'rgba(60,160,200,0.3)'}}>Produced by Team Parallax</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex justify-center items-center min-h-screen p-6 relative overflow-hidden">
      {/* Shape of Water 배경 */}
      <style>{`
        @keyframes sotWaterRay2 {
          0%,100%{opacity:0.08;transform:rotate(var(--ra)) scaleX(1)}
          40%{opacity:0.18;transform:rotate(calc(var(--ra)+1deg)) scaleX(1.05)}
          70%{opacity:0.1;transform:rotate(calc(var(--ra)-0.6deg)) scaleX(0.97)}
        }
        @keyframes sotGlow2 { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.07)} }
        @keyframes sotBio2 {
          0%,100%{opacity:0.12;transform:translate(0,0) scale(1)}
          50%{opacity:0.3;transform:translate(3px,5px) scale(1.08)}
        }
        @keyframes sotCaustic2 { 0%,100%{opacity:0.06} 50%{opacity:0.15} }
        @keyframes sotRipple2 {
          0%,100%{transform:scaleX(1) scaleY(1);opacity:0.05}
          50%{transform:scaleX(1.04) scaleY(0.97) translateX(5px);opacity:0.1}
        }
        .sot-ray2 { position:absolute;top:-5%;left:50%;transform-origin:top center;
          animation:sotWaterRay2 var(--pd) ease-in-out infinite; }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{background:'linear-gradient(180deg,#040e18 0%,#071828 18%,#0a2438 45%,#0c3050 70%,#061420 100%)'}}>
        {/* 수면 황금빛 */}
        <div style={{
          position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',
          width:'300px',height:'140px',
          background:'radial-gradient(ellipse at 50% 0%,rgba(255,215,100,0.16) 0%,rgba(80,210,240,0.08) 48%,transparent 72%)',
          filter:'blur(18px)',animation:'sotCaustic2 5s ease-in-out infinite',
        }}/>
        {/* 중심 청록 발광 기둥 */}
        <div style={{
          position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',
          width:'360px',height:'80%',
          background:'linear-gradient(0deg,rgba(15,160,200,0.2) 0%,rgba(10,140,180,0.1) 38%,transparent 100%)',
          filter:'blur(30px)',animation:'sotGlow2 10s ease-in-out infinite',
        }}/>
        <div className="sot-ray2" style={{
          width:'80px',height:'78%',marginLeft:'-40px',
          background:'linear-gradient(180deg,rgba(150,235,255,0.22) 0%,rgba(50,205,240,0.12) 32%,transparent 100%)',
          filter:'blur(6px)','--ra':'0deg','--pd':'7s',
        } as React.CSSProperties}/>
        <div className="sot-ray2" style={{
          width:'300px',height:'90%',marginLeft:'-150px',
          background:'linear-gradient(180deg,rgba(20,175,210,0.09) 0%,rgba(10,145,190,0.05) 42%,transparent 100%)',
          filter:'blur(24px)','--ra':'-0.8deg','--pd':'9s',
        } as React.CSSProperties}/>
        {/* 보조 광선 */}
        {[{l:'18%',r:'-3deg',d:'6.2s'},{l:'35%',r:'-1deg',d:'4.8s'},{l:'65%',r:'1.5deg',d:'5.6s'},{l:'82%',r:'4deg',d:'7.2s'}].map((t,i)=>(
          <div key={i} style={{
            position:'absolute',top:0,left:t.l,width:'28px',height:'68%',
            background:'linear-gradient(180deg,rgba(40,200,232,0.16) 0%,transparent 100%)',
            filter:'blur(8px)',transformOrigin:'top center',transform:`rotate(${t.r})`,
            animation:`sotCaustic2 ${t.d} ease-in-out infinite`,animationDelay:`${i*0.7}s`,
          }}/>
        ))}
        {/* 생물발광 */}
        {[
          {x:'10%',y:'30%',s:90,d:'5.5s',c:'rgba(20,200,240,0.18)'},
          {x:'80%',y:'22%',s:65,d:'7s',c:'rgba(30,210,230,0.15)'},
          {x:'72%',y:'60%',s:55,d:'6.2s',c:'rgba(10,180,220,0.17)'},
          {x:'22%',y:'66%',s:78,d:'4.9s',c:'rgba(40,220,250,0.14)'},
          {x:'88%',y:'45%',s:50,d:'5.8s',c:'rgba(50,215,240,0.13)'},
        ].map((b,i)=>(
          <div key={i} style={{
            position:'absolute',left:b.x,top:b.y,width:b.s+'px',height:b.s+'px',
            background:`radial-gradient(ellipse,${b.c} 0%,transparent 70%)`,
            borderRadius:'50%',filter:'blur(10px)',
            animation:`sotBio2 ${b.d} ease-in-out infinite`,animationDelay:`${i*0.9}s`,
          }}/>
        ))}
        {/* 수류 */}
        <div style={{
          position:'absolute',inset:0,
          background:'radial-gradient(ellipse 120% 45% at 38% 58%,rgba(10,140,180,0.09) 0%,transparent 55%)',
          animation:'sotRipple2 16s ease-in-out infinite',
        }}/>
        {/* 하단 깊이 */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{background:'linear-gradient(0deg,rgba(3,8,14,0.8) 0%,transparent 100%)'}}/>
        {/* 전체 청록 틴트 */}
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse 85% 65% at 50% 55%,rgba(10,130,175,0.15) 0%,rgba(5,80,130,0.06) 55%,transparent 80%)'}}/>
      </div>

      <Suspense fallback={<div className="serif font-bold animate-pulse" style={{color:'rgba(100,210,240,0.8)'}}>Deep Learning...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
