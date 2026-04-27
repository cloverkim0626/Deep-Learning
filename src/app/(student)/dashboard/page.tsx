"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown, Trophy, AlertCircle,
  Sparkles, Clock, Calendar, FilterX, Volume2, Star,
  CheckCircle, XCircle
} from "lucide-react";
import { getAssignmentsByStudent, getWrongAnswers, logWrongAnswer, deleteWrongAnswer, type TimeFilter } from "@/lib/assignment-service";
import { getTestSessionsByStudent } from "@/lib/database-service";


type Word = {
  id: string; word: string; posAbbr: string; korean: string;
  context: string; contextKorean?: string; synonyms: string[]; antonyms: string[]; grammarTip: string;
};

type WordSet = {
  id: string; workbook: string; chapter: string; passageNumber: string; label: string; words: Word[];
  _rawLesson?: string; _rawPassage?: string; assigned_at?: string;
};

// ─── Assignment age badge ─────────────────────────────────────────────────────
function getAgeBadge(assignedAt?: string): { label: string; cls: string } | null {
  if (!assignedAt) return null;
  const days = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 86400000);
  if (days === 0) return { label: 'NEW', cls: 'bg-emerald-500 text-white' };
  if (days <= 2) return { label: `+${days}일`, cls: 'bg-amber-400 text-white' };
  return { label: `+${days}일`, cls: 'bg-red-500 text-white' };
}
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

// ─── POS full name ────────────────────────────────────────────────────────────
const POS_FULL: Record<string, string> = {
  n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb',
  prep: 'preposition', conj: 'conjunction', pron: 'pronoun',
  interj: 'interjection', det: 'determiner', aux: 'auxiliary verb',
  vt: 'transitive verb', vi: 'intransitive verb',
  noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb',
};
function expandPOS(abbr: string): string {
  if (!abbr) return '';
  const key = abbr.toLowerCase().trim();
  return POS_FULL[key] || abbr;
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
  const [vocabPassedIds, setVocabPassedIds] = useState<Set<string>>(new Set());
  const [synPassedIds, setSynPassedIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Etymology
  const [etymology, setEtymology] = useState<{part: string; meaning: string; type: string}[]>([]);
  const etymCacheRef = useRef<Map<string, {part: string; meaning: string; type: string}[]>>(new Map());

  const getStudentName = useCallback((): string => {
    try {
      const saved = localStorage.getItem('stu_session');
      if (saved) return JSON.parse(saved).name || '학생';
    } catch { /* noop */ }
    return '학생';
  }, []);

  // Fetch etymology when current word changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const currentSet = wordSets[setIdx];
    const currentWord = currentSet?.words[wordIdx];
    if (!currentWord) { setEtymology([]); return; }
    if (etymCacheRef.current.has(currentWord.id)) {
      setEtymology(etymCacheRef.current.get(currentWord.id)!);
      return;
    }
    setEtymology([]);
    fetch(`/api/etymology?word=${encodeURIComponent(currentWord.word)}&id=${currentWord.id}`)
      .then(r => r.json())
      .then(data => {
        const parts = data.parts || [];
        etymCacheRef.current.set(currentWord.id, parts);
        setEtymology(parts);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIdx, wordIdx, wordSets.length]);


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
          assigned_at?: string;      // set_assignments.created_at
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
          assigned_at: (s as { assigned_at?: string }).assigned_at || undefined,
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

      // 정렬: 최신 배당 순(assigned_at 내림차순) → gateway 먼저 → 강 오름차순 → 지문번호 오름차순
      const parseLessonNum = (lesson: string) => {
        const m = lesson.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      };
      formatted.sort((a, b) => {
        // 1차: 배당 날짜 최신순 (없으면 맨 뒤)
        const aDate = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
        const bDate = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
        if (aDate !== bDate) return bDate - aDate; // 최신이 위

        // 2차(같은 날짜 내): gateway 먼저
        const aIsGateway = !a._rawPassage;
        const bIsGateway = !b._rawPassage;
        if (aIsGateway !== bIsGateway) return aIsGateway ? -1 : 1;

        // 3차: 강 번호 오름차순, 지문번호 오름차순
        const lessonDiff = parseLessonNum(a._rawLesson ?? '') - parseLessonNum(b._rawLesson ?? '');
        if (lessonDiff !== 0) return lessonDiff;
        return parseInt(a._rawPassage || '0', 10) - parseInt(b._rawPassage || '0', 10);
      });

        setWordSets(formatted);
      }

      const st = sessions as { set_id?: string; completed_at?: string | null; correct_count?: number; total_questions?: number; test_type?: string }[];

      // 유의어/반의어 계열 판정 (vocab_drill, vocab 제외)
      const isSynType = (t?: string) => t === 'synonym' || t === 'antonym' || t === 'card_game';

      // 뜻고르기 PASS (90% 이상)
      setVocabPassedIds(new Set(
        st.filter(s => s.completed_at && s.set_id && s.test_type === 'vocab')
          .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
          .map(s => s.set_id as string)
      ));
      // 유반의어 PASS (90% 이상) — vocab, vocab_drill 제외
      setSynPassedIds(new Set(
        st.filter(s => s.completed_at && s.set_id && isSynType(s.test_type))
          .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
          .map(s => s.set_id as string)
      ));
      // 두 시험 모두 통과한 세트만 '완료'
      const vocabSet = new Set<string>();
      const synSet = new Set<string>();
      st.filter(s => s.completed_at && s.set_id && s.test_type === 'vocab')
        .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
        .forEach(s => vocabSet.add(s.set_id as string));
      st.filter(s => s.completed_at && s.set_id && isSynType(s.test_type))
        .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
        .forEach(s => synSet.add(s.set_id as string));
      const doneIds = new Set<string>([...vocabSet].filter(id => synSet.has(id)));
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

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteWrongAnswer(confirmDeleteId);
      setWrongWords(prev => prev.filter(w => w.id !== confirmDeleteId));
    } catch (err) { console.error('오답 삭제 실패:', err); }
    finally { setIsDeleting(false); setConfirmDeleteId(null); }
  };


  useEffect(() => { loadLibrary(); }, [loadLibrary]);
  // 라이브러리 페이지 (/dashboard) 로 돌아올 때마다 최신 PASS 정보 재로드
  const pathname = usePathname();
  useEffect(() => { if (pathname === '/dashboard') loadLibrary(); }, [pathname, loadLibrary]);
  // 탭 전환 후 돌아올 때도 갱신
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadLibrary(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadLibrary]);

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
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">
                    {currentSet ? currentSet.label : "배당된 세트가 없습니다."}
                  </span>
                  {currentSet && (() => { const b = getAgeBadge(currentSet.assigned_at); return b ? (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${b.cls}`}>{b.label}</span>
                  ) : null; })()}
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
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">{s.label}</span>
                      {(() => { const b = getAgeBadge(s.assigned_at); return b ? (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${b.cls}`}>{b.label}</span>
                      ) : null; })()}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-accent/50">{s.words.length}개 단어</span>
                      {completedSetIds.has(s.id) ? (
                        <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[8.5px] font-black tracking-wide"
                          style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.25)', fontFamily: 'Georgia, serif', transform: 'rotate(-1deg)', letterSpacing: '0.05em' }}>
                          ✱ ALL PASS
                        </span>
                      ) : (
                        <>
                          {vocabPassedIds.has(s.id) && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-[2px] rounded-full bg-teal-600 text-white text-[8.5px] font-black tracking-wide">
                              ✱ PASS <span className="opacity-75 text-[7.5px]">뜻고르기</span>
                            </span>
                          )}
                          {synPassedIds.has(s.id) && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-[2px] rounded-full bg-blue-600 text-white text-[8.5px] font-black tracking-wide">
                              ✱ PASS <span className="opacity-75 text-[7.5px]">유반의어</span>
                            </span>
                          )}
                          {!vocabPassedIds.has(s.id) && !synPassedIds.has(s.id) && (
                            <span className="text-[9px] text-accent/40 font-bold">미응시</span>
                          )}
                        </>
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
                    className="absolute inset-0 glass rounded-[2.5rem] border border-foreground/5 shadow-xl cursor-pointer select-none overflow-hidden"
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

                    {/* ── 스피커 버튼 — 독립 고정 (상단) ── */}
                    <div className="absolute inset-x-0 flex justify-center" style={{ top: '13%' }}>
                      <button
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSpeaking ? 'bg-foreground text-background scale-110' : 'bg-accent-light/60 text-accent hover:bg-foreground/10'}`}
                        title="발음 듣기"
                        onClick={(e) => { e.stopPropagation(); handleSpeak(e); }}
                      >
                        <Volume2 size={16} strokeWidth={2} />
                      </button>
                    </div>

                    {/* ── 영단어 + 품사 — POS 위, 단어 아래 ── */}
                    <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: '35%' }}>
                      <p className="text-[13px] text-accent/70 font-semibold tracking-[0.22em] flex items-center gap-1.5 mb-3">
                        <Sparkles size={11} className="opacity-35" /> {expandPOS(currentWord.posAbbr)}
                      </p>
                      <h2 className={`serif font-bold text-foreground leading-none text-center px-4 ${currentWord.word.length >= 14 ? 'text-[34px]' : 'text-[42px]'}`}>
                        {currentWord.word}
                      </h2>
                    </div>

                    {/* ── 어원 — 반짝이는 골드 금장 ── */}
                    <div className="absolute inset-x-5 flex flex-col items-center justify-start" style={{ top: '67%', bottom: '32px' }}>
                      {etymology.length > 0 && (
                        <div className="text-center">
                          {/* ETYMOLOGY 라벨 — 부드러운 골드 */}
                          <p
                            className="text-[7.5px] font-bold uppercase tracking-[0.45em] mb-2.5"
                            style={{
                              background: "linear-gradient(90deg, #a87820 0%, #d4a830 40%, #c89820 60%, #a87820 100%)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >✦ ETYMOLOGY ✦</p>

                          <div className="flex items-start justify-center flex-wrap gap-x-3 gap-y-2">
                            {etymology.map((p, i) => (
                              <span key={i} className="flex items-start gap-3">
                                <span className="flex flex-col items-center">
                                  {/* 어원 파트 — 샤프한 골드, 흰띠 없음 */}
                                  <span
                                    className="text-[21px] font-semibold tracking-tight leading-tight"
                                    style={{
                                      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
                                      background: "linear-gradient(160deg, #c89010 0%, #e8b820 35%, #d4a010 65%, #b87c10 100%)",
                                      WebkitBackgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                      backgroundClip: "text",
                                      filter: "drop-shadow(0 1px 2px rgba(180,130,0,0.35))",
                                    }}
                                  >{p.part}</span>
                                  {/* 뜻 — 따뜻한 앰버 골드 */}
                                  <span
                                    className="text-[10px] font-medium mt-0.5"
                                    style={{ color: "#b08010" }}
                                  >({p.meaning})</span>
                                </span>
                                {i < etymology.length - 1 && (
                                  <span
                                    className="font-light text-[18px] leading-none mt-1"
                                    style={{ color: "#c89820", opacity: 0.65 }}
                                  >+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 하단 힌트 */}
                    <p className="absolute bottom-4 inset-x-0 text-center text-[10px] text-accent/30 font-bold">탭하면 뒤집기</p>
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
                      {/* 뜻 + 괄호 해설 분리 표시 */}
                      {(() => {
                        const m = currentWord.korean.match(/^([^(]+?)\s*\((.+)\)\s*$/);
                        if (m) {
                          return (
                            <div className="flex items-start gap-2 mb-1">
                              <p className="text-[20px] font-bold text-foreground shrink-0">{m[1].trim()}</p>
                              <p className="text-[12px] text-accent/70 font-medium leading-snug mt-1.5">{m[2].trim()}</p>
                            </div>
                          );
                        }
                        return <p className="text-[20px] font-bold text-foreground mb-1">{currentWord.korean}</p>;
                      })()}
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
                  <div className="p-5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
                        오답 {item.wrong_count}회
                      </span>
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        ✓ 암기완료
                      </button>
                    </div>
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

      {/* 암기완료 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-background rounded-[2.5rem] p-7 shadow-2xl w-full max-w-xs text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-500" size={28} strokeWidth={2} />
            </div>
            <h3 className="text-[17px] font-black text-foreground mb-2">정말 외웠나요? 🧠</h3>
            <p className="text-[12px] text-accent leading-relaxed mb-6">
              이 단어를 오답 노트에서 삭제합니다.<br />
              나중에 다시 틀리면 자동으로 추가돼요.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-foreground/5 text-accent font-bold text-[13px] hover:bg-foreground/10 transition-all">취소</button>
              <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-[13px] hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50">
                {isDeleting ? '삭제 중...' : '✓ 암기완료!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
