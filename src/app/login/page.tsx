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
    <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 px-7 py-8 relative z-10">


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
              <label className="text-[11px] font-black pl-1 uppercase tracking-widest block" style={{color:'rgba(180,230,255,0.8)'}}>1. 소속 반</label>
              <div className="relative">
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(""); }}
                  className="w-full h-16 px-6 rounded-3xl appearance-none font-bold text-[15px] outline-none transition-all cursor-pointer"
                  style={{background:'rgba(255,255,255,0.96)',border:'1.5px solid rgba(200,230,255,0.4)',color:'#0f2035'}}>
                  <option value="" disabled style={{background:'#fff'}}>반을 선택해 주세요</option>
                  {CLASS_DATA.map(c => <option key={c.name} value={c.name} style={{background:'#fff'}}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" size={18} style={{color:'rgba(10,80,140,0.5)'}} />
              </div>
            </div>

            {/* 2. 이름 선택 */}
            <div className={`space-y-1.5 transition-all duration-500 ${selectedClass ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
              <label className="text-[11px] font-black pl-1 uppercase tracking-widest block" style={{color:'rgba(180,230,255,0.8)'}}>2. 본인 이름</label>
              <div className="relative">
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                  className="w-full h-16 px-6 rounded-3xl appearance-none font-bold text-[15px] outline-none transition-all cursor-pointer"
                  style={{background:'rgba(255,255,255,0.96)',border:'1.5px solid rgba(200,230,255,0.4)',color:'#0f2035'}}>
                  <option value="" disabled style={{background:'#fff'}}>
                    {loadingDb && (isGuestClass || isSyncedClass) ? "불러오는 중..." : "이름을 선택해 주세요"}
                  </option>
                  {studentsInClass.map(s => <option key={s} value={s} style={{background:'#fff'}}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" size={18} style={{color:'rgba(10,80,140,0.5)'}} />
              </div>
              {isGuestClass && !loadingDb && studentsInClass.length === 0 && (
                <p className="text-[11px] font-bold pl-1" style={{color:'rgba(255,180,80,0.9)'}}>등록된 체험 학생이 없습니다. 선생님께 문의하세요.</p>
              )}
              {isSyncedClass && !loadingDb && studentsInClass.length === 0 && (
                <p className="text-[11px] font-bold pl-1" style={{color:'rgba(255,180,80,0.9)'}}>등록된 학생이 없습니다. 수업관리에서 학생을 등록해 주세요.</p>
              )}
            </div>

            {/* 3. 비밀번호 */}
            {!isGuestClass && (
              <div className={`space-y-1.5 transition-all duration-500 pt-2 ${selectedStudent ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
                <label className="text-[11px] font-black pl-1 uppercase tracking-widest block" style={{color:'rgba(180,230,255,0.8)'}}>3. 비밀번호</label>
                <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-16 px-6 rounded-3xl font-black text-[18px] text-center outline-none transition-all"
                  style={{background:'rgba(255,255,255,0.96)',border:'1.5px solid rgba(200,230,255,0.4)',color:'#0f2035',caretColor:'#0a5080'}} />
              </div>
            )}

            {isGuestClass && selectedStudent && (
              <div className="px-4 py-3 rounded-2xl" style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'1px solid rgba(40,180,220,0.3)'}}>
                <p className="text-[12px] font-bold text-center" style={{color:'rgba(200,245,255,0.95)'}}>🎉 체험 계정 — 비밀번호 없이 바로 입장!</p>
              </div>
            )}

            {error && <p className="text-[12px] font-black text-center pt-2 animate-in fade-in zoom-in" style={{color:'rgba(255,120,120,0.9)'}}>{error}</p>}

            <div className="pt-4">
              <button onClick={handleLogin} disabled={!selectedClass || !selectedStudent}
                className="w-full h-16 rounded-3xl font-black tracking-[0.2em] text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-25 disabled:pointer-events-none"
                style={{
                  background: role === 'student'
                    ? 'linear-gradient(135deg,#405DE6 0%,#833AB4 40%,#E1306C 75%,#F77737 100%)'
                    : 'linear-gradient(135deg,rgba(15,160,210,0.9) 0%,rgba(10,130,185,0.95) 100%)',
                  color:'rgba(255,255,255,0.97)',
                  boxShadow: role === 'student'
                    ? '0 4px 24px rgba(225,48,108,0.45), 0 2px 8px rgba(64,93,230,0.35)'
                    : '0 4px 24px rgba(10,140,200,0.4)',
                }}>
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

function LoginBg({ isStudent }: { isStudent: boolean }) {
  if (isStudent) return null; // 학생은 main에서 직접 CSS 그라디언트 처리
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div style={{ position:'absolute', inset:0, background:'rgba(3,12,25,0.52)' }}/>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(10,130,175,0.22) 0%, transparent 70%)',
      }}/>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'35%',
        background:'linear-gradient(0deg, rgba(2,8,18,0.6) 0%, transparent 100%)',
      }}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'20%',
        background:'linear-gradient(180deg, rgba(2,8,18,0.4) 0%, transparent 100%)',
      }}/>
    </div>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const isStudent = (searchParams.get("role") ?? "student") === "student";
  return (
    <main className="flex justify-center items-center min-h-screen p-6 relative overflow-hidden"
      style={isStudent ? {
        /* 심해 CSS 그라디언트 — 이미지 없이 홈과 동일 계열 */
        background: `
          radial-gradient(ellipse 80% 55% at 50% 30%, rgba(0,120,160,0.28) 0%, transparent 65%),
          radial-gradient(ellipse 60% 40% at 20% 70%, rgba(0,80,120,0.18) 0%, transparent 60%),
          linear-gradient(170deg, #030c19 0%, #050f20 25%, #060e1c 50%, #071828 75%, #050d1a 100%)
        `,
      } : {
        backgroundImage: "url('/sotw-poster.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}>
      <LoginBg isStudent={isStudent} />
      <Suspense fallback={<div className="serif font-bold animate-pulse z-10 relative" style={{color:'rgba(255,255,255,0.7)'}}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
