"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown, Trophy, AlertCircle,
  Sparkles, Clock, Calendar, FilterX, Volume2, Star,
  CheckCircle, XCircle
} from "lucide-react";
import { getAssignmentsByStudent, getWrongAnswers, logWrongAnswer, type TimeFilter } from "@/lib/assignment-service";
import { getTestSessionsByStudent } from "@/lib/database-service";

type Word = {
  id: string; word: string; posAbbr: string; korean: string;
  context: string; contextKorean?: string; synonyms: string[]; antonyms: string[]; grammarTip: string;
};

type WordSet = {
  id: string; workbook: string; chapter: string; passageNumber: string; label: string; words: Word[];
  _rawLesson?: string; _rawPassage?: string;
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

// ─── Bold Headword in Context (English) ───────────────────────────────────────
function BoldWord({ text, word }: { text: string; word: string }) {
  if (!text || !word) return <>{text}</>;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped}\\w*)`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <strong key={i} className="font-black text-foreground not-italic">{part}</strong>
          : part
      )}
    </>
  );
}

// ─── Bold Korean meaning: just display as-is (no regex) ─────────────────────
function KoreanContextLine({ contextKorean }: { contextKorean: string }) {
  return <>{contextKorean}</>;
}

// ─── Star / Bookmark helpers ─────────────────────────────────────────────────
function getStarKey(studentName: string) {
  return `starred_words_${studentName}`;
}
function loadStarred(studentName: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStarKey(studentName));
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* noop */ }
  return new Set();
}
function saveStarred(studentName: string, ids: Set<string>) {
  try {
    localStorage.setItem(getStarKey(studentName), JSON.stringify([...ids]));
  } catch { /* noop */ }
}


export default function VocabDashboard() {
  const [activeTab, setActiveTab] = useState<"library" | "wrong">("library");
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [wrongWords, setWrongWords] = useState<{ 
    id: string; wrong_count: number; created_at: string; 
    question_type?: string; selected_answer?: string; correct_answer?: string;
    words?: { word: string; korean: string } 
  }[]>([]);
  const [setIdx, setSetIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWrong, setIsLoadingWrong] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  // Remaining tests count
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

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
      // Load starred once on mount
      setStarredIds(loadStarred(name));
      const [assignments, sessions] = await Promise.all([
        getAssignmentsByStudent(name),
        getTestSessionsByStudent(name).catch(() => []),
      ]);

      if (assignments && assignments.length > 0) {
        const formatted: WordSet[] = (assignments as {
          id: string;
          workbook?: string;
          chapter?: string;          // sub_category = 상위분류 (예: Part1)
          sub_category?: string;     // same as chapter if stored separately
          sub_sub_category?: string; // 하위분류 (예: 3강)
          passage_number?: string;   // 지문 번호 (예: 2)
          label: string;
          words?: {
            id: string; word: string; pos_abbr: string; korean: string;
            context?: string; context_korean?: string;
            synonyms: string | string[]; antonyms: string | string[];
            grammar_tip?: string;
          }[];
        }[]).map(s => {
          // Build hierarchy: workbook · chapter(=sub_cat) · sub_sub_cat · passage_number
          // Displayed as e.g. "수능특강 영어 · Part1 · 3강 · 2번"
          const chapterLabel = s.chapter || s.sub_category || '';
          const lessonLabel  = s.sub_sub_category || '';  // e.g. "3강"
          const passageLabel = s.passage_number || '';     // e.g. "2"
          return {
            id: s.id,
            workbook: s.workbook || '배당된 교재',
            chapter: [chapterLabel, lessonLabel].filter(Boolean).join(' · '),  // "Part1 · 3강"
            passageNumber: passageLabel ? `${passageLabel}번` : '',          // "2번"
            label: s.label,
          // 정렬용 원시 값 보존
          _rawLesson: s.sub_sub_category || '',
          _rawPassage: s.passage_number || '',
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
        };
      });

      // 정렬: gateway(지문번호 없음) 먼저, 강 오름차순, 같은 강내 지문번호 오름차순
      const parseLessonNum = (lesson: string) => {
        const m = lesson.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      };
      formatted.sort((a, b) => {
        const aIsGateway = !a._rawPassage;
        const bIsGateway = !b._rawPassage;
        if (aIsGateway !== bIsGateway) return aIsGateway ? -1 : 1;
        const lessonDiff = parseLessonNum(a._rawLesson ?? '') - parseLessonNum(b._rawLesson ?? '');
        if (lessonDiff !== 0) return lessonDiff;
        return parseInt(a._rawPassage || '0', 10) - parseInt(b._rawPassage || '0', 10);
      });

        setWordSets(formatted);
      }

      // Only COMPLETED sessions count as tested (completed_at not null)
      const doneIds = new Set<string>(
        (sessions as { set_id?: string; completed_at?: string | null }[])
          .filter(s => s.completed_at)
          .map(s => s.set_id)
          .filter(Boolean) as string[]
      );
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

  const toggleStar = (wordId: string) => {
    const name = getStudentName();
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      saveStarred(name, next);
      return next;
    });
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

  // ── Swipe handlers ────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0));
    // Only track horizontal swipe
    if (Math.abs(dx) > dy) setSwipeDelta(dx);
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeDelta) > 60) {
      if (swipeDelta < 0) nextWord();
      else prevWord();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeDelta(0);
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
                  {currentSet ? currentSet.label : "배당된 세트가 없습니다."}
                </div>
                {currentSet && (
                  <div className="text-[10px] text-accent mt-0.5">
                    {[currentSet.workbook, currentSet.chapter, currentSet.passageNumber].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <ChevronDown size={18} className={`text-accent transition-transform shrink-0 ml-2 ${showSetPicker ? "rotate-180" : ""}`} />
            </button>

            {showSetPicker && (
              <div className="absolute top-20 left-0 w-full bg-white border border-foreground/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 p-2">
                {wordSets.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => { setSetIdx(idx); setWordIdx(0); setShowSetPicker(false); setIsFlipped(false); }}
                    className={`w-full px-5 py-3.5 text-left hover:bg-foreground/5 rounded-xl border-b border-foreground/5 last:border-0 ${setIdx === idx ? "bg-foreground/5" : ""}`}
                  >
                    <div className="text-[9px] font-black text-accent uppercase tracking-tighter mb-0.5">
                      {[s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ')}
                    </div>
                    <div className="text-[13px] font-bold text-foreground">{s.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-accent/50">{s.words.length}개 단어</span>
                      {completedSetIds.has(s.id) ? (
                        <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full tracking-widest">PASS ✓</span>
                      ) : (
                        <span className="text-[9px] text-accent/40 font-bold">미응시</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

            {currentWord ? (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              {/* Flashcard — 3D flip */}
              <div
                className="flex-1 min-h-0 relative"
                style={{ minHeight: '200px', perspective: '1200px' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Swipe direction overlay */}
                {swipeDelta !== 0 && (
                  <div className={`absolute inset-0 z-20 rounded-[2.5rem] pointer-events-none ${
                    swipeDelta < -30 ? 'bg-gradient-to-r from-transparent to-foreground/10' :
                    swipeDelta > 30 ? 'bg-gradient-to-l from-transparent to-foreground/10' : ''
                  }`} />
                )}

                {/* 3D flipper */}
                <div
                  className="absolute inset-0"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `translateX(${swipeDelta * 0.08}px) rotateY(${isFlipped ? 180 : 0}deg)`,
                    transition: swipeDelta !== 0 ? 'none' : 'transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1)',
                  }}
                >
                  {/* FRONT */}
                  <div
                    onClick={() => setIsFlipped(true)}
                    className="absolute inset-0 glass rounded-[2.5rem] border border-foreground/5 p-8 flex flex-col items-center justify-center text-center shadow-xl cursor-pointer select-none"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as React.CSSProperties}
                  >
                    {/* 진행상황 — 좌상단 */}
                    <div className="absolute top-4 left-5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-accent/50">{wordIdx + 1}</span>
                      <span className="text-[8px] text-accent/30 font-bold">/</span>
                      <span className="text-[10px] font-bold text-accent/30">{currentSet.words.length}</span>
                    </div>
                    {/* 별표 우상단 */}
                    <button
                      className={`absolute top-4 right-5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        starredIds.has(currentWord.id)
                          ? 'text-amber-400 bg-amber-50 scale-110'
                          : 'text-accent/30 hover:text-amber-300 hover:bg-amber-50/60'
                      }`}
                      onClick={e => { e.stopPropagation(); toggleStar(currentWord.id); }}
                      title="어려운 단어 별표"
                    >
                      <Star size={16} strokeWidth={2} fill={starredIds.has(currentWord.id) ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-4 ${isSpeaking ? 'bg-foreground text-background scale-110' : 'bg-accent-light/60 text-accent hover:bg-foreground/10'}`}
                      title="발음 듣기"
                      onClick={(e) => { e.stopPropagation(); handleSpeak(e); }}
                    >
                      <Volume2 size={16} strokeWidth={2} />
                    </button>
                    <h2 className="text-[42px] serif font-bold text-foreground mb-3">{currentWord.word}</h2>
                    <p className="text-[14px] text-accent font-black tracking-widest flex items-center gap-2">
                      <Sparkles size={13} className="opacity-50" /> {currentWord.posAbbr}
                    </p>
                    <p className="text-[10px] text-accent/40 font-bold mt-3">← 스와이프 · 탭하면 뒤집기 →</p>
                  </div>

                  {/* BACK */}
                  <div
                    onClick={() => setIsFlipped(false)}
                    className="absolute inset-0 glass rounded-[2.5rem] border border-foreground/5 shadow-xl cursor-pointer select-none overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    } as React.CSSProperties}
                  >
                    <div className="h-full overflow-y-auto custom-scrollbar p-7">
                      <p className="text-[20px] font-bold text-foreground mb-1">{currentWord.korean}</p>
                      {currentWord.context && (
                        <div className="mb-4 border-l-2 border-foreground/10 pl-4">
                          <p className="text-[12px] leading-relaxed text-foreground/70 serif italic">
                            <BoldWord text={currentWord.context} word={currentWord.word} />
                          </p>
                          {currentWord.contextKorean && (
                            <p className="text-[11px] text-accent mt-1">
                              {currentWord.contextKorean}
                            </p>
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
                      <p className="text-[10px] text-accent/30 font-bold mt-5 text-center">탭하면 다시 앞면으로</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dot progress indicators (replaces arrow buttons) */}
              <div className="flex items-center justify-center gap-1.5 shrink-0 py-1">
                {currentSet.words.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setWordIdx(i); setIsFlipped(false); }}
                    className={`rounded-full transition-all ${
                      i === wordIdx
                        ? 'w-5 h-2 bg-foreground'
                        : 'w-2 h-2 bg-foreground/15 hover:bg-foreground/30'
                    }`}
                    aria-label={`${i + 1}번 단어`}
                  />
                ))}
              </div>



              {/* Bottom bar — 별표 단어 보기 링크 자리 */}
              <div className="flex items-center justify-center gap-3 shrink-0 pb-1">
                {starredIds.size > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-bold">
                    <Star size={12} fill="currentColor" />
                    별표 단어 {[...starredIds].filter(id => currentSet.words.some(w => w.id === id)).length}개
                  </div>
                )}
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
                <div key={item.id} className="glass rounded-[2rem] border border-foreground/5 overflow-hidden">
                  {/* 표제어 행 */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-[16px] font-bold text-foreground flex items-center gap-2">
                        {item.words?.word}
                        <button
                          onClick={() => speakWord(item.words?.word || '')}
                          className="w-7 h-7 rounded-lg bg-accent-light/60 flex items-center justify-center text-accent hover:bg-foreground/10 transition-all"
                        >
                          <Volume2 size={13} />
                        </button>
                        {/* 유/반의어 배지 */}
                        {item.question_type && item.question_type !== 'vocab' && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            item.question_type === 'synonym' 
                              ? 'bg-sky-100 text-sky-600' 
                              : 'bg-rose-100 text-rose-600'
                          }`}>
                            {item.question_type === 'synonym' ? '유의어' : '반의어'}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-accent font-medium mt-0.5">{item.words?.korean}</div>
                    </div>
                    <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter shrink-0">
                      오답 {item.wrong_count}회
                    </span>
                  </div>
                  {/* 내 답 / 정답 행 */}
                  {(item.selected_answer || item.correct_answer) && (
                    <div className="px-5 pb-4 flex items-center gap-3 text-[12px] border-t border-foreground/5 pt-3">
                      <div className="flex items-center gap-1.5 text-red-500">
                        <XCircle size={12} strokeWidth={2.5} />
                        <span className="font-bold">내 답:</span>
                        <span>{item.selected_answer || '—'}</span>
                      </div>
                      <span className="text-foreground/20 font-black">→</span>
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle size={12} strokeWidth={2.5} />
                        <span className="font-bold">정답:</span>
                        <span className="font-black">{item.correct_answer || '—'}</span>
                      </div>
                    </div>
                  )}
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
