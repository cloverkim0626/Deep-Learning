"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, ChevronDown, Trophy, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import { getAssignmentsByStudent, logWrongAnswer, getWrongAnswers } from "@/lib/assignment-service";

type Word = {
  id: string;
  word: string;
  posAbbr: string;
  korean: string;
  context: string;
  synonyms: string[];
  antonyms: string[];
  grammarTip: string;
};

type WordSet = {
  id: string;
  workbook: string;
  chapter: string;
  label: string;
  subtitle: string;
  words: Word[];
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VocabDashboard() {
  const [activeTab, setActiveTab] = useState<"library" | "wrong">("library");
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [wrongWords, setWrongWords] = useState<any[]>([]);
  const [setIdx, setSetIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock student ID ( 김가연 s1 )
  const currentStudentId = "s1";

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const assignments = await getAssignmentsByStudent(currentStudentId);
        if (assignments && assignments.length > 0) {
          const formatted: WordSet[] = assignments.map((s: any) => ({
            id: s.id,
            workbook: s.workbook || "배당된 교재",
            chapter: s.chapter || "",
            label: s.label,
            subtitle: s.subtitle || "",
            words: (s.words || []).map((w: any) => ({
              id: w.id,
              word: w.word,
              posAbbr: w.pos_abbr,
              korean: w.korean,
              context: w.context,
              synonyms: typeof w.synonyms === 'string' ? w.synonyms.split(',') : (w.synonyms || []),
              antonyms: typeof w.antonyms === 'string' ? w.antonyms.split(',') : (w.antonyms || []),
              grammarTip: w.grammar_tip
            }))
          }));
          setWordSets(formatted);
        }

        const wrongs = await getWrongAnswers(currentStudentId);
        setWrongWords(wrongs);
      } catch (err) {
        console.warn("Using offline mock or error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentStudentId]);

  const currentSet = wordSets[setIdx];
  const currentWord = currentSet?.words[wordIdx];

  const handleLogWrong = async () => {
    if (!currentWord) return;
    try {
      await logWrongAnswer(currentStudentId, currentWord.id);
      const wrongs = await getWrongAnswers(currentStudentId);
      setWrongWords(wrongs);
      alert(`${currentWord.word} 단어가 '오답 단어장'에 저장되었습니다.`);
    } catch (err) {
       console.error(err);
    }
  };

  const nextWord = () => {
    if (wordIdx < (currentSet?.words.length || 0) - 1) {
      setWordIdx(wordIdx + 1);
      setIsFlipped(false);
    }
  };

  const prevWord = () => {
    if (wordIdx > 0) {
      setWordIdx(wordIdx - 1);
      setIsFlipped(false);
    }
  };

  if (isLoading) return <div className="p-12 text-foreground serif animate-pulse">Deep Learning...</div>;

  return (
    <div className="flex flex-col h-full bg-background px-6 py-8 max-w-2xl mx-auto w-full relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex bg-accent-light p-1 rounded-xl border border-foreground/5 shrink-0">
          <button onClick={() => setActiveTab("library")} className={`px-4 py-2 rounded-lg text-[12px] font-black tracking-widest transition-all ${activeTab === 'library' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}>라이브러리</button>
          <button onClick={() => setActiveTab("wrong")} className={`px-4 py-2 rounded-lg text-[12px] font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'wrong' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}>오답노트 {wrongWords.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{wrongWords.length}</span>}</button>
        </div>

        <Link href="/dashboard/word-test" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[13px] font-bold text-foreground hover:bg-foreground/5 transition-all">
          <Trophy size={14} className="text-accent" />
          TEST 모드
        </Link>
      </div>

      {activeTab === "library" ? (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Passage Selector */}
          <div className="relative mb-8">
            <button 
              onClick={() => setShowSetPicker(!showSetPicker)}
              className="w-full flex items-center justify-between px-6 py-4 rounded-3xl glass border border-foreground/5 shadow-sm hover:border-foreground/20 transition-all text-left group"
            >
              <div>
                <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 block">현재 배당된 지문</span>
                <div className="text-[16px] font-bold text-foreground">
                  {currentSet ? `${currentSet.workbook} · ${currentSet.chapter} · ${currentSet.label}` : "배당된 세트가 없습니다."}
                </div>
              </div>
              <ChevronDown size={20} className={`text-accent transition-transform ${showSetPicker ? "rotate-180" : ""}`} />
            </button>
            
            {showSetPicker && (
              <div className="absolute top-24 left-0 w-full glass border border-foreground/10 rounded-[2rem] overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 p-2">
                {wordSets.map((s, idx) => (
                  <button key={s.id} onClick={() => { setSetIdx(idx); setWordIdx(0); setShowSetPicker(false); }} className={`w-full px-6 py-4 text-left hover:bg-foreground/5 rounded-2xl border-b border-foreground/5 last:border-0 ${setIdx === idx ? "bg-foreground/5" : ""}`}>
                    <div className="text-[9px] font-black text-accent uppercase tracking-tighter mb-1">{s.workbook} · {s.chapter}</div>
                    <div className="text-[14px] font-bold text-foreground">{s.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentWord ? (
            <div className="flex flex-col items-center gap-8">
              <div className="w-full relative preserve-3d h-[380px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                {/* Front */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[3.5rem] border border-foreground/5 p-12 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-700 ${isFlipped ? "rotate-y-180 opacity-0" : "rotate-y-0 opacity-100"}`}>
                  <h2 className="text-[48px] serif font-bold text-foreground mb-4">{currentWord.word}</h2>
                  <p className="text-[15px] text-accent font-black tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="opacity-50" /> {currentWord.posAbbr}
                  </p>
                </div>
                {/* Back */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[3.5rem] border border-foreground/5 p-12 flex flex-col justify-center shadow-2xl transition-all duration-700 ${isFlipped ? "rotate-y-0 opacity-100" : "rotate-y-180 opacity-0"}`}>
                  <p className="text-[20px] font-bold text-foreground mb-6">{currentWord.korean}</p>
                  <p className="text-[14px] leading-relaxed text-foreground font-medium serif opacity-70 mb-8 border-l-2 border-foreground/10 pl-4">
                    {currentWord.context}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentWord.synonyms.map(s => <span key={s} className="px-3 py-1 bg-foreground/5 rounded-lg text-[11px] font-black text-accent">{s}</span>)}
                  </div>
                </div>
              </div>

              <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={prevWord} disabled={wordIdx === 0} className="w-14 h-14 rounded-full border border-foreground/5 flex items-center justify-center text-foreground hover:bg-foreground/5 disabled:opacity-20"><ChevronLeft /></button>
                  <span className="text-[13px] font-black text-accent">{wordIdx + 1} / {currentSet.words.length}</span>
                  <button onClick={nextWord} disabled={wordIdx === currentSet.words.length - 1} className="w-14 h-14 rounded-full border border-foreground/5 flex items-center justify-center text-foreground hover:bg-foreground/5 disabled:opacity-20"><ChevronRight /></button>
                </div>
                <button 
                  onClick={handleLogWrong}
                  className="flex items-center gap-2 px-6 py-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-bold border border-red-100 hover:bg-red-100 transition-all"
                >
                  <AlertCircle size={18} strokeWidth={2.5} />
                  오답 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="p-20 text-center glass rounded-3xl border border-foreground/5 text-accent font-bold">
              배당된 지문이 없습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
           <div className="mb-8 p-6 bg-red-50 rounded-3xl border border-red-100">
             <h3 className="text-[18px] font-black text-red-600 mb-1">나의 오답 노트</h3>
             <p className="text-[12px] text-red-400 font-bold">클리닉 시간에 집중적으로 복원/학습할 단어들입니다.</p>
           </div>
           
           <div className="space-y-4">
              {wrongWords.map(item => (
                <div key={item.id} className="p-6 glass rounded-[2.5rem] border border-foreground/5 flex justify-between items-center group">
                  <div>
                    <div className="text-[17px] font-bold text-foreground">{item.words.word}</div>
                    <div className="text-[13px] text-accent font-medium mt-1">{item.words.korean}</div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter">오답 {item.wrong_count}회</span>
                     <button className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-accent hover:bg-foreground hover:text-background transition-all">
                       <ChevronRight size={18} />
                     </button>
                  </div>
                </div>
              ))}
              {wrongWords.length === 0 && (
                <div className="p-20 text-center text-accent font-bold opacity-40 serif">모든 단어를 완벽히 학습했습니다!</div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
