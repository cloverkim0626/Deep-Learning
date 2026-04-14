"use client";

import { useState } from "react";
import { Key, Search, MoreVertical, GraduationCap, Users } from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([
    // 고3 금토반
    { id: "s1", name: "김가연 - 백석고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s2", name: "장서현 - 백석고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s3", name: "박시연 - 백석고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s4", name: "이예윤 - 백석고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s5", name: "이은서 - 검단고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s6", name: "김슬기 - 검단고", class: "[WOODOK] 고3 금토반", password: "****" },
    { id: "s7", name: "김가빈 - 원당고", class: "[WOODOK] 고3 금토반", password: "****" },
    // 고2 아라고반
    { id: "s8", name: "이동기", class: "[WOODOK] 고2 아라고반", password: "****" },
    { id: "s9", name: "임다은", class: "[WOODOK] 고2 아라고반", password: "****" },
    { id: "s10", name: "민채이", class: "[WOODOK] 고2 아라고반", password: "****" },
    // 고1 아라원당 연합반
    { id: "s11", name: "송시후", class: "[WOODOK] 고1 아라원당 연합반", password: "****" },
    { id: "s12", name: "정준", class: "[WOODOK] 고1 아라원당 연합반", password: "****" },
    { id: "s13", name: "한상혁", class: "[WOODOK] 고1 아라원당 연합반", password: "****" },
  ]);

  const [search, setSearch] = useState("");

  const handleResetPassword = (id: string, name: string) => {
    alert(`${name} 학생의 패스워드를 '1234'로 강제 초기화했습니다.`);
  };

  return (
    <div className="p-8 md:p-12 pb-24 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-foreground/5 text-accent border border-foreground/5">
              <Users size={18} />
            </div>
            <h1 className="text-4xl text-foreground serif font-black tracking-tight">Student Roster</h1>
          </div>
          <p className="text-[15px] text-accent font-medium pl-1">학급별 수강생 명단 및 계정 권한을 중앙 제어합니다.</p>
        </div>
        <button className="h-14 px-8 bg-foreground text-background text-[14px] font-black tracking-widest rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2">
          ADD NEW STUDENT
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="glass rounded-[3rem] border border-foreground/5 p-4 md:p-10 shadow-sm">
         <div className="relative mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-accent" size={20} strokeWidth={2.5} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="학생 이름이나 반 명칭으로 스마트 검색..."
              className="w-full h-16 pl-14 pr-6 bg-accent-light rounded-[1.5rem] border border-transparent focus:border-foreground/20 focus:bg-white transition-all text-[16px] text-foreground font-bold"
            />
         </div>

         <div className="space-y-4">
            <div className="hidden md:grid grid-cols-12 gap-6 px-10 py-5 text-[11px] font-black text-accent uppercase tracking-[0.2em] border-b border-foreground/5 opacity-50">
              <div className="col-span-4">Student Profile</div>
              <div className="col-span-4">Assigned Class</div>
              <div className="col-span-3">Security</div>
              <div className="col-span-1 text-right">More</div>
            </div>

            {students.filter(s => s.name.includes(search) || s.class.includes(search)).map(student => (
              <div key={student.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 px-8 py-6 md:px-10 md:py-5 items-center bg-white/50 rounded-[2rem] border border-foreground/5 hover:border-foreground/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all group">
                
                <div className="col-span-4 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center text-[16px] font-black shadow-lg">
                    {student.name[0]}
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-foreground mb-0.5">{student.name}</div>
                    <div className="text-[11px] font-black text-accent uppercase tracking-widest">Active Member</div>
                  </div>
                </div>
                
                <div className="col-span-4">
                   <div className="text-[13px] font-bold text-foreground/70 bg-accent-light px-4 py-1.5 rounded-full inline-block">
                     {student.class}
                   </div>
                </div>
                
                <div className="col-span-3">
                  <button 
                    onClick={() => handleResetPassword(student.id, student.name)}
                    className="flex items-center gap-2 text-[12px] font-black text-accent hover:text-foreground transition-all uppercase tracking-widest border border-foreground/5 bg-background px-4 py-2 rounded-xl active:scale-95"
                  >
                    <Key size={14} strokeWidth={2.5} /> 
                    Reset PWD
                  </button>
                </div>

                <div className="hidden md:flex col-span-1 justify-end">
                  <button className="text-accent hover:text-foreground transition-colors p-2 rounded-xl hover:bg-foreground/5 opacity-0 group-hover:opacity-100">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))}
            
            {students.filter(s => s.name.includes(search) || s.class.includes(search)).length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4 text-accent">
                  <Search size={24} />
                </div>
                <p className="text-accent font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

import { Plus } from "lucide-react";
