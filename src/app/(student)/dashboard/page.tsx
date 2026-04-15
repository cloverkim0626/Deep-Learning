"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, ChevronDown, Trophy, AlertCircle,
  Sparkles, Clock, Calendar, FilterX, Volume2
} from "lucide-react";
import { getAssignmentsByStudent, getWrongAnswers, logWrongAnswer, type TimeFilter } from "@/lib/assignment-service";
import { getTestSessionsByStudent } from "@/lib/database-service";

type Word = {
  id: string; word: string; posAbbr: string; korean: string;
  context: string; contextKorean?: string; synonyms: string[]; antonyms: string[]; grammarTip: string;
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

// ─── TTS Helper ───────────────────────────────────────────────────────────────
function speakWord(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(word);
  utt.lang = "en-US";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VocabDashboard() {
  const [activeTab, setActiveTab] = useState<"library" | "wrong">("library");
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [wrongWords, setWrongWords] = useState<{ id: string; wrong_count: number; created_at: string; words?: { word: string; korean: string } }[]>([]);
  const [setIdx, setSetIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWrong, setIsLoadingWrong] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Remaining tests count
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());

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
      const [assignments, sessions] = await Promise.all([
        getAssignmentsByStudent(name),
        getTestSessionsByStudent(name).catch(() => []),
      ]);

      if (assignments && assignments.length > 0) {
        const formatted: WordSet[] = (assignments as {
          id: string; workbook?: string; chapter?: string; label: string;
          words?: { id: string; word: string; pos_abbr: string; korean: string; context?: string; context_korean?: string; synonyms: string | string[]; antonyms: string | string[]; grammar_tip?: string }[]
        }[]).map(s => ({
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
            contextKorean: w.context_korean || '',
            synonyms: typeof w.synonyms === 'string' ? w.synonyms.split(',').map(x => x.trim()).filter(Boolean) : (w.synonyms || []),
            antonyms: typeof w.antonyms === 'string' ? w.antonyms.split(',').map(x => x.trim()).filter(Boolean) : (w.antonyms || []),
            grammarTip: w.grammar_tip || ''
          }))
        }));
        setWordSets(formatted);
      }

      // Track which sets have been tested
      const doneIds = new Set<string>((sessions as { set_id?: string }[]).map(s => s.set_id).filter(Boolean) as string[]);
      setCompletedSetIds(doneIds);
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

  // Remaining tests = sets not yet completed
  const remainingTests = wordSets.filter(s => !completedSetIds.has(s.id)).length;

  const handleLogWrong = async () => {
    if (!currentWord) return;
    try {
      const name = getStudentName();
      await logWrongAnswer(name, currentWord.id, 'vocab');
      await loadWrongAnswers(timeFilter);
      alert(`"${currentWord.word}" 단어가 오답 노트에 저장되었습니다.`);
    } catch (err) { console.error(err); }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWord) return;
    setIsSpeaking(true);
    speakWord(currentWord.word);
    setTimeout(() => setIsSpeaking(false), 1200);
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
    <div className="flex flex-col h-full bg-background px-4 py-6 max-w-2xl mx-auto w-full relative">
      {/* Tab + Test Button */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex bg-accent-light p-1 rounded-xl border border-foreground/5 shrink-0">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-3 py-2 rounded-lg text-[11px] font-black tracking-widest transition-all ${activeTab === 'library' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}
          >
            라이브러리
          </button>
          <button
            onClick={() => setActiveTab("wrong")}
            className={`px-3 py-2 rounded-lg text-[11px] font-black tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'wrong' ? 'bg-white shadow-md text-foreground' : 'text-accent hover:text-foreground'}`}
          >
            오답노트
            {wrongWords.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{wrongWords.length}</span>
            )}
          </button>
        </div>

        <Link
          href="/dashboard/word-test"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-foreground/10 text-[12px] font-bold text-foreground hover:bg-foreground/5 transition-all"
        >
          <Trophy size={13} className="text-accent" />
          TEST
          {remainingTests > 0 && (
            <span className="bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded-full font-black">{remainingTests}</span>
          )}
        </Link>
      </div>

      {/* ── LIBRARY TAB ─────────────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Set Selector */}
          <div className="relative mb-4 shrink-0">
            <button
              onClick={() => setShowSetPicker(!showSetPicker)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl glass border border-foreground/5 shadow-sm hover:border-foreground/20 transition-all text-left"
            >
              <div>
                <span className="text-[9px] font-black text-accent uppercase tracking-widest mb-0.5 block">현재 배당된 지문</span>
                <div className="text-[14px] font-bold text-foreground">
                  {currentSet
                    ? `${currentSet.workbook} · ${currentSet.chapter} · ${currentSet.label}`
                    : "배당된 세트가 없습니다."}
                </div>
              </div>
              <ChevronDown size={18} className={`text-accent transition-transform shrink-0 ml-2 ${showSetPicker ? "rotate-180" : ""}`} />
            </button>

            {showSetPicker && (
              <div className="absolute top-20 left-0 w-full glass border border-foreground/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 p-2">
                {wordSets.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => { setSetIdx(idx); setWordIdx(0); setShowSetPicker(false); setIsFlipped(false); }}
                    className={`w-full px-5 py-3.5 text-left hover:bg-foreground/5 rounded-xl border-b border-foreground/5 last:border-0 ${setIdx === idx ? "bg-foreground/5" : ""}`}
                  >
                    <div className="text-[9px] font-black text-accent uppercase tracking-tighter mb-0.5">{s.workbook} · {s.chapter}</div>
                    <div className="text-[13px] font-bold text-foreground">{s.label}</div>
                    <div className="text-[10px] text-accent/50 mt-0.5">{s.words.length}개 단어 {completedSetIds.has(s.id) ? "· ✓ 시험 완료" : "· 미응시"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentWord ? (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              {/* Flashcard — 3-zone touch */}
              <div
                className="flex-1 min-h-0 relative preserve-3d"
                style={{ minHeight: '200px' }}
              >
                {/* Front */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[2.5rem] border border-foreground/5 p-8 flex flex-col items-center justify-center text-center shadow-xl transition-all duration-700 ${isFlipped ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 opacity-100"}`}>
                  {/* Speak button */}
                  <button
                    className={`absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-30 ${isSpeaking ? "bg-foreground text-background scale-110" : "bg-accent-light/60 text-accent hover:bg-foreground/10"}`}
                    title="발음 듣기"
                    onClick={(e) => { e.stopPropagation(); handleSpeak(e); }}
                  >
                    <Volume2 size={16} strokeWidth={2} />
                  </button>
                  <h2 className="text-[42px] serif font-bold text-foreground mb-3">{currentWord.word}</h2>
                  <p className="text-[14px] text-accent font-black tracking-widest flex items-center gap-2">
                    <Sparkles size={13} className="opacity-50" /> {currentWord.posAbbr}
                  </p>

                </div>

                {/* Back */}
                <div className={`absolute inset-0 backface-hidden glass rounded-[2.5rem] border border-foreground/5 p-7 flex flex-col justify-center shadow-xl transition-all duration-700 overflow-y-auto ${isFlipped ? "rotate-y-0 opacity-100" : "rotate-y-180 opacity-0 pointer-events-none"}`}>
                  <p className="text-[20px] font-bold text-foreground mb-3">{currentWord.korean}</p>
                  {currentWord.context && (
                    <div className="mb-4 border-l-2 border-foreground/10 pl-4">
                      <p className="text-[12px] leading-relaxed text-foreground/70 serif italic">{currentWord.context}</p>
                      {currentWord.contextKorean && (
                        <p className="text-[11px] text-accent mt-1">{currentWord.contextKorean}</p>
                      )}
                    </div>
                  )}
                  {currentWord.synonyms.length > 0 && (
                    <div className="mb-2.5">
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1.5">유의어</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentWord.synonyms.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-foreground/5 rounded-lg text-[11px] font-black text-accent">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentWord.antonyms.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1.5">반의어</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentWord.antonyms.map(a => (
                          <span key={a} className="px-2.5 py-1 bg-red-50 rounded-lg text-[11px] font-black text-red-400">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card click area: full card = flip */}
                <div
                  className="absolute inset-0 z-20 cursor-pointer rounded-[2.5rem]"
                  onClick={() => setIsFlipped(!isFlipped)}
                />

                {/* Precise arrow buttons — float over card edges */}
                {wordIdx > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); prevWord(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-background/70 backdrop-blur-sm border border-foreground/10 flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-background transition-all active:scale-90 shadow-sm"
                    aria-label="이전 단어"
                  >
                    <ChevronLeft size={18} strokeWidth={2} />
                  </button>
                )}
                {wordIdx < currentSet.words.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); nextWord(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-background/70 backdrop-blur-sm border border-foreground/10 flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-background transition-all active:scale-90 shadow-sm"
                    aria-label="다음 단어"
                  >
                    <ChevronRight size={18} strokeWidth={2} />
                  </button>
                )}
              </div>


              {/* Bottom bar — counter + 오답 */}
              <div className="flex items-center justify-between gap-3 shrink-0 pb-1">
                <span className="text-[13px] font-black text-accent min-w-[50px]">{wordIdx + 1} / {currentSet.words.length}</span>
                <button
                  onClick={handleLogWrong}
                  className="flex items-center gap-1.5 px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-[12px] font-bold border border-red-100 hover:bg-red-100 transition-all active:scale-95"
                >
                  <AlertCircle size={15} strokeWidth={2.5} /> 오답 추가
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-16 text-center glass rounded-3xl border border-foreground/5 text-accent font-bold">
                배당된 지문이 없습니다.<br />선생님께 문의하세요.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WRONG ANSWERS TAB ────────────────────────────────────────────── */}
      {activeTab === "wrong" && (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="mb-5 p-5 bg-red-50 rounded-3xl border border-red-100">
            <h3 className="text-[17px] font-black text-red-600 mb-1">나의 오답 노트</h3>
            <p className="text-[12px] text-red-400 font-bold">클리닉 또는 TEST 모드에서 집중적으로 복습할 단어들입니다.</p>
          </div>

          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            <span className="text-[10px] font-black text-accent uppercase tracking-widest shrink-0">기간:</span>
            {TIME_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTimeFilter(f.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black shrink-0 transition-all border ${
                  timeFilter === f.value
                    ? 'bg-foreground text-background border-foreground shadow-md'
                    : 'bg-white border-foreground/10 text-accent hover:text-foreground'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {isLoadingWrong ? (
            <div className="py-12 text-center text-accent animate-pulse font-bold">불러오는 중...</div>
          ) : (
            <div className="space-y-3 pb-4">
              {wrongWords.map(item => (
                <div key={item.id} className="p-5 glass rounded-[2rem] border border-foreground/5 flex justify-between items-center">
                  <div>
                    <div className="text-[16px] font-bold text-foreground flex items-center gap-2">
                      {item.words?.word}
                      <button
                        onClick={() => speakWord(item.words?.word || '')}
                        className="w-7 h-7 rounded-lg bg-accent-light/60 flex items-center justify-center text-accent hover:bg-foreground/10 transition-all"
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>
                    <div className="text-[12px] text-accent font-medium mt-0.5">{item.words?.korean}</div>
                  </div>
                  <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                    오답 {item.wrong_count}회
                  </span>
                </div>
              ))}
              {wrongWords.length === 0 && (
                <div className="p-16 text-center text-accent font-bold opacity-40 serif">
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
