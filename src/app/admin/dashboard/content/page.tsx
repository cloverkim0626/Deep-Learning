"use client";

import { useState, useEffect } from "react";
import { 
  FileText, BookOpen, PenTool, Plus, Trash2, ChevronDown, ChevronUp, X, Check, Upload, Sparkles, Filter, Search, Users, ChevronRight
} from "lucide-react";
import { saveIngestedPassage, getWordSets } from "@/lib/database-service";
import { assignSetToStudents } from "@/lib/assignment-service";

// ─── Constants ────────────────────────────────────────────────────────────────
const WORKBOOKS = ["수능특강", "수능완성", "교과서 (고난도)", "기타 모의고사"];
const CHAPTERS = Array.from({ length: 30 }, (_, i) => `${i + 1}강`);

const MOCK_STUDENTS = [
  { id: "s1", name: "김가연", class: "고3 금토반" },
  { id: "s2", name: "장서현", class: "고3 금토반" },
  { id: "s8", name: "이동기", class: "고2 아라고반" },
  { id: "s11", name: "송시후", class: "고1 아라원당 연합반" },
];

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ set, onClose }: { set: any, onClose: () => void }) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedStudents.length === 0) return;
    setIsAssigning(true);
    try {
      await assignSetToStudents(set.id, selectedStudents);
      alert(`${selectedStudents.length}명의 학생에게 배당되었습니다.`);
      onClose();
    } catch (err: any) {
      alert("배당 실패: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center bg-accent-light/30">
          <div>
            <h3 className="text-[18px] font-black text-foreground tracking-tight">학습 세트 배당</h3>
            <p className="text-[12px] text-accent font-bold mt-0.5">{set.workbook} · {set.chapter} · {set.label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-3">
          <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-4">Select Students</p>
          {MOCK_STUDENTS.map(student => (
            <button 
              key={student.id} 
              onClick={() => toggleStudent(student.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedStudents.includes(student.id) ? 'bg-foreground border-foreground text-background shadow-lg' : 'bg-white border-foreground/5 text-foreground hover:border-foreground/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px] ${selectedStudents.includes(student.id) ? 'bg-background text-foreground' : 'bg-accent-light text-accent'}`}>
                  {student.name[0]}
                </div>
                <div className="text-left">
                  <div className="text-[14px] font-bold">{student.name}</div>
                  <div className={`text-[10px] font-bold ${selectedStudents.includes(student.id) ? 'opacity-60' : 'text-accent'}`}>{student.class}</div>
                </div>
              </div>
              {selectedStudents.includes(student.id) && <Check size={18} strokeWidth={3} />}
            </button>
          ))}
        </div>

        <div className="p-8 border-t border-foreground/5 bg-accent-light/10">
          <button 
            onClick={handleAssign}
            disabled={isAssigning || selectedStudents.length === 0}
            className="w-full h-14 bg-foreground text-background rounded-2xl font-black tracking-widest text-[14px] shadow-xl hover:-translate-y-1 active:translate-y-0.5 transition-all disabled:opacity-20"
          >
            {isAssigning ? "배당 중..." : `${selectedStudents.length}명에게 배당 완료`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Smart AI Ingest Component ────────────────────────────────────────────────
function SmartAIIngest({ onComplete }: { onComplete: () => void }) {
  const [rawText, setRawText] = useState("");
  const [workbook, setWorkbook] = useState(WORKBOOKS[0]);
  const [chapter, setChapter] = useState(CHAPTERS[0]);
  const [label, setLabel] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleScan = async () => {
    if (!rawText.trim() || !label.trim()) return;
    setIsScanning(true);
    try {
      const res = await fetch("/api/ai-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, workbook, chapter, passageLabel: label }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (err: any) {
      alert("AI 스캔 실패: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    try {
      await saveIngestedPassage({
        workbook: preview.workbook,
        chapter: preview.chapter,
        label: preview.label,
        full_text: rawText,
        sentences: preview.sentences,
        words: preview.words
      });
      alert("성공적으로 저장되었습니다! 이제 라이브러리에서 배당 기능을 사용하세요.");
      setPreview(null);
      setRawText("");
      setLabel("");
      onComplete();
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass rounded-[2.5rem] p-8 border border-foreground/5 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">AI 스마트 인제스트</h3>
            <p className="text-[12px] text-accent font-medium">지문 원문을 넣으면 AI가 모든 정보를 자동으로 추출합니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">교재 선택</label>
            <select value={workbook} onChange={e => setWorkbook(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[13px] font-medium outline-none">
              {WORKBOOKS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">강/챕터</label>
            <select value={chapter} onChange={e => setChapter(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-accent-light text-[13px] font-medium outline-none">
              {CHAPTERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5 block px-1">지문 번호/라벨</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="예: 3번 지문" className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-transparent text-[13px] font-medium outline-none" />
          </div>
        </div>

        <div className="mb-6">
          <textarea 
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="지문 원문을 이곳에 붙여넣으세요..."
            className="w-full min-h-[200px] p-6 rounded-2xl border border-foreground/10 bg-transparent text-[14px] leading-relaxed font-serif outline-none"
          />
        </div>

        <button 
          onClick={handleScan}
          disabled={isScanning || !rawText.trim()}
          className="w-full h-14 bg-foreground text-background rounded-2xl flex items-center justify-center gap-3 font-bold shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-20"
        >
          {isScanning ? "AI가 지문을 분석 중입니다..." : "지문 분석 및 데이터 추출 시작"}
          <Sparkles size={18} strokeWidth={2.5} />
        </button>
      </div>

      {preview && (
        <div className="glass rounded-[2rem] p-8 border border-success/20 bg-success/5 animate-in slide-in-from-bottom-5 duration-700">
          <h4 className="text-[15px] font-bold text-success mb-6 flex items-center gap-2">
            <Check size={18} strokeWidth={3} /> AI 분석 결과 미리보기
          </h4>
          <button onClick={handleSave} className="w-full h-14 bg-success text-white rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-success/20 transition-all">
            데이터 일괄 저장 및 배포 <ChevronDown size={18} className="-rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────
export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"explorer" | "ingest">("explorer");
  const [filterWorkbook, setFilterWorkbook] = useState("전체");
  const [wordSets, setWordSets] = useState<any[]>([]);
  const [assignTarget, setAssignTarget] = useState<any>(null);

  const loadData = async () => {
    try {
      const data = await getWordSets();
      setWordSets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredSets = filterWorkbook === "전체" 
    ? wordSets 
    : wordSets.filter(s => s.workbook === filterWorkbook);

  return (
    <div className="p-8 md:p-12 pb-24 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar bg-background">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl text-foreground serif font-black tracking-tight">콘텐츠 라이브러리</h1>
          <p className="text-[15px] text-accent mt-2 font-medium">학습 세트를 관리하고 특정 학생에게 배당할 수 있습니다.</p>
        </div>
        
        <div className="flex gap-1.5 bg-accent-light p-1.5 rounded-[1.2rem] border border-foreground/5 shadow-inner">
          <button onClick={() => setActiveTab("explorer")} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'explorer' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}>탐색기</button>
          <button onClick={() => setActiveTab("ingest")} className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'ingest' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}>AI 인제스트</button>
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === "ingest" && <SmartAIIngest onComplete={() => { setActiveTab("explorer"); loadData(); }} />}

        {activeTab === "explorer" && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-xl text-[12px] font-black text-accent uppercase tracking-widest border border-foreground/5">
                <Filter size={14} /> 교재 필터
              </div>
              <select value={filterWorkbook} onChange={e => setFilterWorkbook(e.target.value)} className="h-10 px-4 rounded-xl border border-foreground/5 bg-white text-[13px] font-bold outline-none shadow-sm min-w-[150px]">
                <option value="전체">전체 교재</option>
                {WORKBOOKS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSets.map(set => (
                <div key={set.id} className="glass rounded-[2rem] p-8 border border-foreground/5 hover:border-foreground/10 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white/50 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black text-accent bg-accent-light px-2.5 py-1 rounded-lg uppercase tracking-tight">
                      {set.workbook} · {set.chapter}
                    </span>
                    <button onClick={() => setAssignTarget(set)} className="text-[10px] font-black text-foreground hover:bg-foreground hover:text-background border border-foreground/10 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5">
                      <Users size={12} strokeWidth={3} /> 배당하기
                    </button>
                  </div>
                  <h4 className="text-[18px] font-bold text-foreground mb-2 line-clamp-1">{set.label}</h4>
                  <p className="text-[12px] text-accent line-clamp-3 leading-relaxed mb-8 flex-1 opacity-70 serif italic font-medium">
                    {set.full_text || "내용이 비어있는 지문입니다."}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-foreground/5">
                    <span className="text-[11px] font-bold text-accent">단어 {set.words?.length || 0}개</span>
                    <button className="text-[11px] font-black text-foreground hover:underline flex items-center gap-1 group/btn">
                      세트 상세 <ChevronRight size={12} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
              
              <button onClick={() => setActiveTab("ingest")} className="rounded-[2.5rem] border-2 border-dashed border-foreground/10 flex flex-col items-center justify-center p-12 text-accent hover:border-foreground/30 hover:text-foreground transition-all group h-full min-h-[250px]">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="text-[14px] font-bold">새 학습 세트 추가 </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {assignTarget && <AssignModal set={assignTarget} onClose={() => setAssignTarget(null)} />}

      <div className="mt-20 pt-10 border-t border-foreground/5 text-center">
        <p className="text-[12px] font-black text-accent tracking-[0.3em] uppercase opacity-40">
          Managed by Team Parallax Adaptive Engine
        </p>
      </div>
    </div>
  );
}
