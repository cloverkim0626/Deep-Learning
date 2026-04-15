"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, ChevronDown, Trophy, AlertCircle,
  Sparkles, Clock, Calendar, FilterX
} from "lucide-react";
import { getAssignmentsByStudent, getWrongAnswers, logWrongAnswer, type TimeFilter } from "@/lib/assignment-service";

type Word = {
  id: string; word: string; posAbbr: string; korean: string;
  context: string; synonyms: string[]; antonyms: string[]; grammarTip: string;
};

type WordSet = {
  id: string; workbook: string; chapter: string; label: string; words: Word[];
};

const TIME_FILTERS: { value: TimeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '전체', icon: <FilterX size={11} /> },
  { value: '1d', label: '1일', icon: <Clock size={11} /> },
  { value: '3d', label: '3일', icon: <Clock size={11} /> },
  { value: '1w', label: '1주', icon: <Calendar size={11} /> },
  { value: '1m', label: '1달', icon: <Calendar size={11} /> },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VocabDashboard() {
  const [activeTab, setActiveTab] = useState<"library" | "wrong">("library");
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [wrongWords, setWrongWords] = useState<{ id: string; wrong_count: number; created_at: string; words: { word: string; korean: string } }[]>([]);
  const [setIdx, setSetIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWrong, setIsLoadingWrong] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Get name from localStorage session
  const getStudentName = useCallback((): string => {
    try {
      const saved = localStorage.getItem('stu_session');
      if (saved) return JSON.parse(saved).name || '학생';
    } catch { /* noop */ }
    return '학생';
  }, []);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const name = getStudentName();
      const assignments = await getAssignmentsByStudent(name);
      if (assignments && assignments.length > 0) {
        const formatted: WordSet[] = (assignments as { id: string; workbook?: string; chapter?: string; label: string; words?: { id: string; word: string; pos_abbr: string; korean: string; context?: string; synonyms: string | string[]; antonyms: string | string[]; grammar_tip?: string }[] }[]).map(s => ({
          id: s.id,
          workbook: s.workbook || '배당된 교재',
          chapter: s.chapter || '',
          label: s.label,
          words: (s.words || []).map(w => ({
            id: w.id,
            word: w.word,
            posAbbr: w.pos_abbr,
            korean: w.korean,
            context: w.context || '',
            synonyms: typeof w.synonyms === 'string' ? w.synonyms.split(',').map(x => x.trim()).filter(Boolean) : (w.synonyms || []),
            antonyms: typeof w.antonyms === 'string' ? w.antonyms.split(',').map(x => x.trim()).filter(Boolean) : (w.antonyms || []),
            grammarTip: w.grammar_tip || ''
          }))
        }));
        setWordSets(formatted);
      }
    } catch (err) {
      console.warn('라이브러리 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getStudentName]);

  const loadWrongAnswers = useCallback(async (filter: TimeFilter) => {
    setIsLoadingWrong(true);
    try {
      const name = getStudentName();
      const wrongs = await getWrongAnswers(name, filter);
      setWrongWords(wrongs || []);
    } catch (err) {
      console.warn('오답 로딩 실패:', err);
      setWrongWords([]);
    } finally {
      setIsLoadingWrong(false);
    }
  }, [getStudentName]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  useEffect(() => {
    if (activeTab === 'wrong') {
      loadWrongAnswers(timeFilter);
    }
  }, [activeTab, timeFilter, loadWrongAnswers]);

  const currentSet = wordSets[setIdx];
  const currentWord = currentSet?.words[wordIdx];

  const handleLogWrong = async () => {
    if (!currentWord) return;
    try {
      const name = getStudentName();
      await logWrongAnswer(name, currentWord.id, 'vocab');
      await loadWrongAnswers(timeFilter);
      alert(`"${currentWord.word}" 단어가 오답 노트에 저장되었습니다.`);
    } catch (err) { console.error(err); }
  };

  const nextWord = () => {
    if (wordIdx < (currentSet?.words.length || 0) - 1) {
      setWordIdx(wordIdx + 1); setIsFlipped(false);
    }
  };

  const prevWord = () => {
    if (wordIdx > 0) {
      setWordIdx(wordIdx - 1); setIsFlipped(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-pulse">
        <Sparkles size={24} className="text-accent mx-auto mb-2" />
        <p className="text-[13px] text-accent font-bold">Deep Learning...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background px-6 py-8 max-w-2xl mx-auto w-full relative">
      {/* Tab + Test Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex bg-accent-light p-1 rounded-xl border border-foreground/5 shrink-0">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 rounded-lg text-[12px] font-black tracking-widest transition-all ${activeTab === 'library' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}
          >
            라이브러리
          </button>
          <button
            onClick={() => setActiveTab("wrong")}
            className={`px-4 py-2 rounded-lg text-[12px] font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'wrong' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}
          >
            오답노트
            {wrongWords.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{wrongWords.length}</span>
            )}
          </button>
        </div>

        <Link
          href="/dashboard/word-test"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-foreground/10 text-[13px] font-bold text-foreground hover:bg-foreground/5 transition-all"
        >
          <Trophy size={14} className="text-accent" />
          TEST 모드
        </Link>
      </div>

      {/* ── LIBRARY TAB ─────────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Set Selector */}
          <div className="relative mb-8">
            <button
              onClick={() => setShowSetPicker(!showSetPicker)}
              className="w-full flex items-center justify-between px-6 py-4 rounded-3xl glass border border-foreground/5 shadow-sm hover:border-foreground/20 transition-all text-left group"
            >
              <div>
                <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 block">현재 배당된 지문</span>
                <div className="text-[16px] font-bold text-foreground">
                  {currentSet
                    ? `${currentSet.workbook} · ${currentSet.chapter} · ${currentSet.label}`
                    : "배당된 세트가 없습니다."}
                </div>
              </div>
              <ChevronDown size={20} className={`text-accent transition-transform ${showSetPicker ? "rotate-180" : ""}`} />
            </button>

            {showSetPicker && (
              <div className="absolute top-24 left-0 w-full glass border border-foreground/10 rounded-[2rem] overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 p-2">
                {wordSets.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => { setSetIdx(idx); setWordIdx(0); setShowSetPicker(false); setIsFlipped(false); }}
                    className={`w-full px-6 py-4 text-left hover:bg-foreground/5 rounded-2xl border-b border-foreground/5 last:border-0 ${setIdx === idx ? "bg-foreground/5" : ""}`}
                  >
                    <div className="text-[9px] font-black text-accent uppercase tracking-tighter mb-1">{s.workbook} · {s.chapter}</div>
                    <div className="text-[14px] font-bold text-foreground">{s.label}</div>
                    <div className="text-[11px] text-accent/50 mt-0.5">{s.words.length}개 단어</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentWord ? (
            <div className="flex flex-col items-center gap-8">
              {/* Flashcard */}
              <div className="w-full relative preserve-3d h-[380px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                {/* Front */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[3.5rem] border border-foreground/5 p-12 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-700 ${isFlipped ? "rotate-y-180 opacity-0" : "rotate-y-0 opacity-100"}`}>
                  <h2 className="text-[48px] serif font-bold text-foreground mb-4">{currentWord.word}</h2>
                  <p className="text-[15px] text-accent font-black tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="opacity-50" /> {currentWord.posAbbr}
                  </p>
                  <p className="text-[11px] text-accent/40 mt-4 font-medium">탭하면 뒤집혀</p>
                </div>
                {/* Back */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[3.5rem] border border-foreground/5 p-10 flex flex-col justify-center shadow-2xl transition-all duration-700 ${isFlipped ? "rotate-y-0 opacity-100" : "rotate-y-180 opacity-0"}`}>
                  <p className="text-[22px] font-bold text-foreground mb-4">{currentWord.korean}</p>
                  {currentWord.context && (
                    <p className="text-[13px] leading-relaxed text-foreground font-medium serif opacity-70 mb-6 border-l-2 border-foreground/10 pl-4">
                      {currentWord.context}
                    </p>
                  )}
                  {currentWord.synonyms.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1.5">유의어</p>
                      <div className="flex flex-wrap gap-2">
                        {currentWord.synonyms.map(s => (
                          <span key={s} className="px-3 py-1 bg-foreground/5 rounded-lg text-[11px] font-black text-accent">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentWord.antonyms.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1.5">반의어</p>
                      <div className="flex flex-wrap gap-2">
                        {currentWord.antonyms.map(a => (
                          <span key={a} className="px-3 py-1 bg-red-50 rounded-lg text-[11px] font-black text-red-400">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={prevWord} disabled={wordIdx === 0}
                    className="w-14 h-14 rounded-full border border-foreground/5 flex items-center justify-center text-foreground hover:bg-foreground/5 disabled:opacity-20">
                    <ChevronLeft />
                  </button>
                  <span className="text-[13px] font-black text-accent">{wordIdx + 1} / {currentSet.words.length}</span>
                  <button onClick={nextWord} disabled={wordIdx === currentSet.words.length - 1}
                    className="w-14 h-14 rounded-full border border-foreground/5 flex items-center justify-center text-foreground hover:bg-foreground/5 disabled:opacity-20">
                    <ChevronRight />
                  </button>
                </div>
                <button
                  onClick={handleLogWrong}
                  className="flex items-center gap-2 px-6 py-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-bold border border-red-100 hover:bg-red-100 transition-all"
                >
                  <AlertCircle size={18} strokeWidth={2.5} /> 오답 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="p-20 text-center glass rounded-3xl border border-foreground/5 text-accent font-bold">
              배당된 지문이 없습니다.<br />선생님께 문의하세요.
            </div>
          )}
        </div>
      )}

      {/* ── WRONG ANSWERS TAB ────────────────────────────────────────────── */}
      {activeTab === "wrong" && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Header */}
          <div className="mb-6 p-6 bg-red-50 rounded-3xl border border-red-100">
            <h3 className="text-[18px] font-black text-red-600 mb-1">나의 오답 노트</h3>
            <p className="text-[12px] text-red-400 font-bold">클리닉 또는 TEST 모드에서 집중적으로 복습할 단어들입니다.</p>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            <span className="text-[10px] font-black text-accent uppercase tracking-widest shrink-0">기간:</span>
            {TIME_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-black shrink-0 transition-all border ${
                  timeFilter === f.value
                    ? 'bg-foreground text-background border-foreground shadow-md'
                    : 'bg-white border-foreground/10 text-accent hover:text-foreground'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Wrong Words List */}
          {isLoadingWrong ? (
            <div className="py-12 text-center text-accent animate-pulse font-bold">불러오는 중...</div>
          ) : (
            <div className="space-y-3">
              {wrongWords.map(item => (
                <div key={item.id} className="p-6 glass rounded-[2.5rem] border border-foreground/5 flex justify-between items-center group">
                  <div>
                    <div className="text-[17px] font-bold text-foreground">{item.words?.word}</div>
                    <div className="text-[13px] text-accent font-medium mt-1">{item.words?.korean}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                      오답 {item.wrong_count}회
                    </span>
                    <button className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-accent hover:bg-foreground hover:text-background transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {wrongWords.length === 0 && (
                <div className="p-20 text-center text-accent font-bold opacity-40 serif">
                  {timeFilter === 'all' ? '모든 단어를 완벽히 학습했습니다! 🎉' : `${TIME_FILTERS.find(f => f.value === timeFilter)?.label} 이내 오답이 없습니다.`}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
