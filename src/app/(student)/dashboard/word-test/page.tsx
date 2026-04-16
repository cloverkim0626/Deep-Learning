"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw,
  BookOpen, Sparkles, AlertCircle, LogOut, Gamepad2, ClipboardList, X, Stamp
} from "lucide-react";
import { getAssignmentsByStudent, logWrongAnswer } from "@/lib/assignment-service";
import {
  createTestSession, completeTestSession, saveTestResult, getTestSessionsByStudent
} from "@/lib/database-service";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type TestWord = {
  id: string;
  word: string;
  posAbbr: string;
  korean: string;
  context?: string;
  contextKorean?: string;
  synonyms: string[];
  antonyms: string[];
  testSynonym: boolean;
  testAntonym: boolean;
};

type QuestionMode = "synonym" | "antonym";
type Question = {
  word: TestWord;
  mode: QuestionMode;
  correct: string;
  choices: string[];
};
type ResultEntry = { question: Question; selected: string; correct: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Fisher-Yates 완전 랜덤 셔플 */
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseList(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

function buildQuestions(words: TestWord[]): Question[] {
  const allSynonyms = words.filter(w => w.testSynonym).flatMap(w => w.synonyms);
  const allAntonyms = words.filter(w => w.testAntonym).flatMap(w => w.antonyms);
  const synQ: Question[] = [];
  const antQ: Question[] = [];

  words.forEach(word => {
    if (word.testSynonym && word.synonyms.length > 0) {
      const correct = word.synonyms[0];
      const d = allSynonyms.filter(w => !word.synonyms.includes(w) && w !== correct);
      if (d.length >= 3)
        synQ.push({ word, mode: "synonym", correct, choices: fisherYates([correct, ...fisherYates(d).slice(0, 3)]) });
    }
    if (word.testAntonym && word.antonyms.length > 0) {
      const correct = word.antonyms[0];
      const d = allAntonyms.filter(w => !word.antonyms.includes(w) && w !== correct);
      if (d.length >= 3)
        antQ.push({ word, mode: "antonym", correct, choices: fisherYates([correct, ...fisherYates(d).slice(0, 3)]) });
    }
  });

  // 같은 단어 연속 방지: syn/ant 교대 배치
  const result: Question[] = [];
  const syn = fisherYates(synQ);
  const ant = fisherYates(antQ);
  let si = 0, ai = 0;
  while (si < syn.length || ai < ant.length) {
    if (si < syn.length) result.push(syn[si++]);
    if (ai < ant.length) result.push(ant[ai++]);
  }
  return result;
}

// ─── PASS Stamp Badge ─────────────────────────────────────────────────────────
function PassStamp() {
  return (
    <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md rotate-6 border border-emerald-400 select-none">
      <Stamp size={8} />PASS
    </div>
  );
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({ sets, passedSetIds, onStartQuiz, onStartGame }: {
  sets: { id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[];
  passedSetIds: Set<string>;
  onStartQuiz: (selectedSetId: string | null) => void;
  onStartGame: (selectedSetId: string | null) => void;
}) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);
  const selected = sets.find(s => s.id === selectedSetId);
  const totalWords = selected ? selected.words.length : sets.reduce((a, s) => a + s.words.length, 0);
  const totalSyn = selected
    ? selected.words.filter(w => w.testSynonym).length
    : sets.reduce((a, s) => a + s.words.filter(w => w.testSynonym).length, 0);
  const totalAnt = selected
    ? selected.words.filter(w => w.testAntonym).length
    : sets.reduce((a, s) => a + s.words.filter(w => w.testAntonym).length, 0);
  const estQ = totalSyn + totalAnt;

  const allPassed = sets.length > 0 && sets.every(s => passedSetIds.has(s.id));

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6 pb-20">
      <div className="w-16 h-16 rounded-[1.3rem] bg-foreground text-background flex items-center justify-center shadow-xl">
        <Trophy size={26} strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-2xl text-foreground serif mb-2">유반의어 테스트</h1>
        <p className="text-[13px] text-accent font-medium leading-relaxed">
          선생님이 지정한 단어만 출제돼요.<br />
          <span className="text-sky-500 font-black">하늘색</span> = 유의어 &nbsp;·&nbsp; <span className="text-rose-500 font-black">빨간색</span> = 반의어
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <p className="text-[11px] font-black text-accent uppercase tracking-widest mb-3">시험 범위 선택</p>
        {/* 전체 선택 버튼 */}
        <div className="relative">
          {allPassed && <PassStamp />}
          <button
            onClick={() => setSelectedSetId(null)}
            className={`w-full px-5 py-3.5 rounded-2xl border text-[13px] font-bold text-left transition-all ${selectedSetId === null ? 'bg-foreground text-background border-foreground shadow-lg' : 'bg-background border-foreground/10 hover:border-foreground/30'}`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className={selectedSetId === null ? 'text-background' : 'text-accent'} />
              전체 배당 세트 ({totalWords}단어)
            </div>
            <div className={`text-[10px] mt-0.5 flex gap-2 ${selectedSetId === null ? 'opacity-60' : 'text-accent'}`}>
              <span className="text-sky-400">유의어 {sets.reduce((a,s) => a + s.words.filter(w => w.testSynonym).length, 0)}문제</span>
              <span className="text-rose-400">반의어 {sets.reduce((a,s) => a + s.words.filter(w => w.testAntonym).length, 0)}문제</span>
            </div>
          </button>
        </div>
        {sets.map(s => {
          const sSyn = s.words.filter(w => w.testSynonym).length;
          const sAnt = s.words.filter(w => w.testAntonym).length;
          const label = [s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ');
          const isPassed = passedSetIds.has(s.id);
          return (
            <div key={s.id} className="relative">
              {isPassed && <PassStamp />}
              <button onClick={() => setSelectedSetId(s.id)}
                className={`w-full px-5 py-3.5 rounded-2xl border text-[13px] font-bold text-left transition-all ${selectedSetId === s.id ? 'bg-foreground text-background border-foreground shadow-lg' : 'bg-background border-foreground/10 hover:border-foreground/30'}`}>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className={selectedSetId === s.id ? 'text-background' : 'text-accent'} />
                  <span className="truncate">{s.label}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${selectedSetId === s.id ? 'opacity-60' : 'text-accent'}`}>
                  {label && <span className="mr-2">{label}</span>}
                  <span className="text-sky-400">유 {sSyn}</span>
                  <span className="mx-1">·</span>
                  <span className="text-rose-400">반 {sAnt}</span>
                  <span className="mx-1">·</span>총 {sSyn + sAnt}문제
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {estQ === 0 ? (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-[13px] font-bold">
          <AlertCircle size={15} /> 출제할 단어가 없습니다. 선생님께 문의하세요.
        </div>
      ) : (
        <div className="text-center">
          <p className="text-[12px] text-accent font-bold mb-3">
            예상 문제 수: <span className="text-foreground font-black">{estQ}문제</span>
            <span className="ml-2 text-sky-400">유의어 {totalSyn}</span>
            <span className="mx-1 text-accent">+</span>
            <span className="text-rose-400">반의어 {totalAnt}</span>
          </p>
          <button
            onClick={() => setShowModeModal(true)}
            className="h-14 px-10 bg-foreground text-background font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all mx-auto"
          >
            테스트 시작 <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* 모드 선택 모달 */}
      {showModeModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-background rounded-[2rem] border border-foreground/10 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-black text-foreground">테스트 방식 선택</h3>
              <button onClick={() => setShowModeModal(false)} className="p-1.5 rounded-xl hover:bg-foreground/5 text-accent">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setShowModeModal(false); onStartQuiz(selectedSetId); }}
                className="w-full p-5 rounded-2xl border-2 border-foreground/10 hover:border-foreground/30 bg-white text-left transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all">
                    <ClipboardList size={18} />
                  </div>
                  <span className="text-[15px] font-black text-foreground">객관식</span>
                </div>
                <p className="text-[12px] text-accent leading-relaxed pl-12">4지선다로 유의어/반의어 선택<br/>정답률을 오답 노트에 기록해요.</p>
              </button>
              <button
                onClick={() => { setShowModeModal(false); onStartGame(selectedSetId); }}
                className="w-full p-5 rounded-2xl border-2 border-sky-200 hover:border-sky-400 bg-sky-50 text-left transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                    <Gamepad2 size={18} className="text-sky-600 group-hover:text-white" />
                  </div>
                  <span className="text-[15px] font-black text-foreground">🎮 짝 찾기 게임</span>
                  <span className="text-[10px] px-2 py-0.5 bg-sky-500 text-white rounded-full font-black">NEW</span>
                </div>
                <p className="text-[12px] text-accent leading-relaxed pl-12">표제어↔유/반의어를 짝 맞추기<br/>제한시간 안에 모두 제거하면 PASS!</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ results, onRestart }: { results: ResultEntry[], onRestart: () => void }) {
  const router = useRouter();
  const score = results.filter(r => r.correct).length;
  const pct = Math.round((score / results.length) * 100);
  const wrong = results.filter(r => !r.correct);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-6 py-10 pb-24">
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-xl mx-auto mb-4 ${pct >= 70 ? 'bg-emerald-500 text-white' : pct >= 50 ? 'bg-amber-400 text-white' : 'bg-foreground text-background'}`}>
          <span className="text-3xl font-black">{pct}</span>
        </div>
        <h2 className="text-2xl text-foreground serif">테스트 완료</h2>
        <p className="text-[13px] text-accent mt-1 font-medium">
          {score}/{results.length}개 정답 · {pct >= 80 ? "아주 잘했어 👍" : pct >= 50 ? "오답을 다시 확인해봐" : "오답 위주로 집중 복습이 필요해"}
        </p>
        {pct >= 70 && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-[11px] font-black">
            <Stamp size={12} /> PASS 인장이 찍혔어요!
          </div>
        )}
      </div>

      {wrong.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-black text-rose-500 uppercase tracking-widest mb-3">오답 목록 ({wrong.length}개) — 오답 노트에 자동 저장됨</h3>
          <div className="space-y-2.5">
            {wrong.map((r, i) => (
              <div key={i} className={`rounded-2xl border overflow-hidden ${r.question.mode === 'synonym' ? 'border-sky-200' : 'border-rose-200'}`}>
                {/* 헤더: 표제어 + 뜻 + 유/반 배지 */}
                <div className={`flex items-center gap-2 px-4 py-2.5 ${r.question.mode === 'synonym' ? 'bg-sky-50' : 'bg-rose-50'}`}>
                  <XCircle size={14} className="text-rose-500 shrink-0" />
                  <span className="text-[14px] font-black text-foreground">{r.question.word.word}</span>
                  <span className="text-[11px] text-accent/70 font-medium italic">{r.question.word.korean}</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-lg font-black shrink-0 ${r.question.mode === 'synonym' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'}`}>
                    {r.question.mode === "synonym" ? "유의어" : "반의어"}
                  </span>
                </div>
                {/* 오답/정답 */}
                <div className="px-4 py-2.5 bg-white flex items-center gap-3 text-[12px]">
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <XCircle size={12} strokeWidth={2.5} />
                    <span className="font-bold">내 답:</span>
                    <span>{r.selected}</span>
                  </div>
                  <span className="text-foreground/20 font-black">→</span>
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle size={12} strokeWidth={2.5} />
                    <span className="font-bold">정답:</span>
                    <span className="font-black">{r.question.correct}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.filter(r => r.correct).length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-black text-emerald-600 uppercase tracking-widest mb-3">정답 ({results.filter(r => r.correct).length}개)</h3>
          <div className="space-y-1.5">
            {results.filter(r => r.correct).map((r, i) => (
              <div key={i} className="px-4 py-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex items-center gap-2">
                <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                <span className="text-[13px] font-bold text-foreground">{r.question.word.word}</span>
                <span className="text-[10px] text-accent/60">{r.question.word.korean}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ml-auto ${r.question.mode === 'synonym' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'}`}>
                  {r.question.mode === "synonym" ? "유" : "반"}
                </span>
                <span className="text-[12px] text-emerald-600 font-black">{r.question.correct}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onRestart} className="flex-1 h-[52px] bg-foreground text-background font-bold rounded-2xl flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-all shadow">
          <RotateCcw size={16} strokeWidth={2} /> 다시 풀기
        </button>
        <button onClick={() => router.push('/dashboard')} className="h-[52px] px-5 bg-accent-light text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-foreground/10 transition-all">
          <LogOut size={16} strokeWidth={2} /> 나가기
        </button>
      </div>
    </div>
  );
}

// ─── Game Mode ────────────────────────────────────────────────────────────────
type GameCard = {
  id: string;
  pairId: string;
  content: string;
  isHeadword: boolean;
  matched: boolean;
};

type GameRound = 'synonym' | 'antonym';
type GamePhase = 'playing' | 'round_result' | 'final_result';

function GameMode({ words, onExit, onGamePass }: {
  words: TestWord[];
  onExit: () => void;
  onGamePass: () => void;
}) {
  const buildRound = useCallback((round: GameRound): GameCard[] => {
    const eligible = words.filter(w =>
      round === 'synonym' ? w.testSynonym && w.synonyms.length > 0
                          : w.testAntonym && w.antonyms.length > 0
    );
    const cards: GameCard[] = [];
    eligible.forEach((w, i) => {
      const pairId = `pair_${i}`;
      const partner = round === 'synonym' ? w.synonyms[0] : w.antonyms[0];
      cards.push({ id: `hw_${i}`, pairId, content: w.word, isHeadword: true, matched: false });
      cards.push({ id: `pt_${i}`, pairId, content: partner, isHeadword: false, matched: false });
    });
    return fisherYates(cards);
  }, [words]);

  const hasSynRound = words.some(w => w.testSynonym && w.synonyms.length > 0);
  const hasAntRound = words.some(w => w.testAntonym && w.antonyms.length > 0);
  const firstRound: GameRound = hasSynRound ? 'synonym' : 'antonym';

  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [currentRound, setCurrentRound] = useState<GameRound>(firstRound);
  const [cards, setCards] = useState<GameCard[]>(() => buildRound(firstRound));
  const [selected, setSelected] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]); // 틀렸을 때 빨강 효과
  const [playTimer, setPlayTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [synResult, setSynResult] = useState<{passed: boolean; pairs: number} | null>(null);
  const [antResult, setAntResult] = useState<{passed: boolean; pairs: number} | null>(null);

  const pairs = cards.length / 2;

  const endRound = useCallback((passed: boolean) => {
    clearInterval(timerRef.current!);
    const result = { passed, pairs };
    if (currentRound === 'synonym') {
      setSynResult(result);
      if (hasAntRound) {
        setGamePhase('round_result');
      } else {
        setGamePhase('final_result');
        if (passed) onGamePass();
      }
    } else {
      setAntResult(result);
      setGamePhase('final_result');
      if (passed) onGamePass();
    }
  }, [currentRound, pairs, hasAntRound, onGamePass]);

  // 플레이 타이머: 쌍 수 × 4초
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const total = Math.max(pairs * 4, 8);
    setPlayTimer(total);
    timerRef.current = setInterval(() => {
      setPlayTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endRound(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, pairs]);

  const handleCardClick = (cardId: string) => {
    if (gamePhase !== 'playing') return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.matched || selected.includes(cardId) || wrong.includes(cardId)) return;
    if (selected.length >= 2) return;

    const newSel = [...selected, cardId];
    setSelected(newSel);

    if (newSel.length === 2) {
      const [a, b] = newSel.map(id => cards.find(c => c.id === id)!);
      const isMatch = a.pairId === b.pairId;

      if (isMatch) {
        setTimeout(() => {
          setCards(prev => prev.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c));
          setSelected([]);
          // 모든 짝 맞았는지 체크
          setCards(prev => {
            const remaining = prev.filter(c => !c.matched && !newSel.includes(c.id)).length;
            if (remaining === 0) endRound(true);
            return prev;
          });
        }, 250);
      } else {
        setWrong(newSel);
        setTimeout(() => {
          setSelected([]);
          setWrong([]);
        }, 600);
      }
    }
  };

  const nextRound = () => {
    const newCards = buildRound('antonym');
    setCards(newCards);
    setCurrentRound('antonym');
    setSelected([]);
    setWrong([]);
    setGamePhase('playing');
  };

  const timerPct = pairs > 0 ? (playTimer / Math.max(pairs * 4, 8)) * 100 : 100;
  const timerColor = timerPct > 50 ? 'bg-emerald-500' : timerPct > 25 ? 'bg-amber-400' : 'bg-rose-500';

  const roundLabel = currentRound === 'synonym' ? '유의어' : '반의어';
  const roundBg = currentRound === 'synonym'
    ? 'from-sky-600 to-indigo-700'
    : 'from-rose-600 to-pink-700';

  // ── 플레이 화면 ──────────────────────────────────────────────────────────────
  if (gamePhase === 'playing') {
    const matchedCount = cards.filter(c => c.matched).length / 2;
    const remaining = pairs - matchedCount;

    return (
      <div className={`flex flex-col h-full bg-gradient-to-br ${roundBg} select-none`}>
        {/* 상단 HUD */}
        <div className="flex items-center justify-between px-5 py-4 text-white shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{roundLabel} 짝 찾기</p>
            <p className="text-[16px] font-black">남은 짝 <span className="text-white/80">{remaining}</span></p>
          </div>
          {/* 타이머 원형 */}
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="white" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - timerPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-[15px] font-black text-white ${playTimer <= 5 ? 'animate-pulse' : ''}`}>
              {playTimer}
            </span>
          </div>
        </div>

        {/* 타이머 바 */}
        <div className="h-1 mx-5 rounded-full bg-white/20 shrink-0 mb-3">
          <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
        </div>

        {/* 카드 그리드 — portrait: 4열, landscape: 더 많은 열 */}
        <div className="flex-1 px-3 pb-3 overflow-hidden">
          <div className="grid grid-cols-4 landscape:grid-cols-6 gap-2 h-full auto-rows-fr">
            {cards.map(card => {
              const isSelected = selected.includes(card.id);
              const isWrong = wrong.includes(card.id);

              if (card.matched) {
                return <div key={card.id} className="rounded-2xl bg-white/10 border border-white/10 animate-in fade-out zoom-out-95 duration-300" />;
              }

              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`
                    relative rounded-2xl border-2 flex flex-col items-center justify-center p-2
                    text-center font-black transition-all duration-200 active:scale-95 cursor-pointer
                    min-h-[60px] overflow-hidden
                    ${isWrong
                      ? 'border-rose-300 bg-rose-100 text-rose-700 scale-95 animate-bounce'
                      : isSelected
                        ? 'border-amber-300 bg-amber-50 text-foreground scale-105 shadow-2xl shadow-amber-400/30'
                        : card.isHeadword
                          ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:scale-105 backdrop-blur-sm'
                          : currentRound === 'synonym'
                            ? 'border-sky-200/40 bg-sky-400/20 text-white hover:bg-sky-400/35 hover:scale-105 backdrop-blur-sm'
                            : 'border-pink-200/40 bg-pink-400/20 text-white hover:bg-pink-400/35 hover:scale-105 backdrop-blur-sm'
                    }
                  `}
                >
                  {/* 카드 유형 인디케이터 */}
                  <span className={`absolute top-1 right-1 text-[6px] font-black uppercase opacity-50 ${card.isHeadword ? 'text-white' : 'text-white/70'}`}>
                    {card.isHeadword ? 'word' : roundLabel === '유의어' ? 'syn' : 'ant'}
                  </span>
                  <span className="text-[11px] leading-tight break-words w-full landscape:text-[10px]">
                    {card.content}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onExit} className="shrink-0 text-[11px] text-white/40 font-bold py-3 text-center">← 포기하기</button>
      </div>
    );
  }

  // ── 라운드 결과 ──────────────────────────────────────────────────────────────
  if (gamePhase === 'round_result' && synResult) {
    const passed = synResult.passed;
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-br ${passed ? 'from-sky-500 to-indigo-600' : 'from-slate-700 to-slate-900'} text-white px-8 text-center gap-6`}>
        <div className={`w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-5xl shadow-2xl ${passed ? 'bg-white/20' : 'bg-white/10'}`}>
          {passed ? '🎉' : '⏰'}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">유의어 라운드</p>
          <h2 className="text-3xl font-black">{passed ? 'PASS!' : 'FAIL'}</h2>
          <p className="text-[13px] opacity-70 mt-2">{passed ? '완벽해! 반의어도 도전해봐' : '아쉽다… 반의어도 도전해봐!'}</p>
        </div>
        {hasAntRound && (
          <button onClick={nextRound}
            className="h-14 px-10 bg-white text-foreground font-black rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">
            반의어 라운드 시작 →
          </button>
        )}
        <button onClick={onExit} className="text-[12px] opacity-50 underline">종료</button>
      </div>
    );
  }

  // ── 최종 결과 ────────────────────────────────────────────────────────────────
  const synPassed = !synResult || synResult.passed;
  const antPassed = !antResult || antResult.passed;
  const overallPass = synPassed && antPassed;

  return (
    <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-br ${overallPass ? 'from-emerald-500 to-teal-700' : 'from-slate-700 to-slate-900'} text-white px-8 text-center gap-6`}>
      <div className="w-28 h-28 rounded-[2rem] bg-white/20 flex items-center justify-center text-6xl shadow-2xl backdrop-blur">
        {overallPass ? '🏆' : '📖'}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">최종 결과</p>
        <h2 className="text-4xl font-black">{overallPass ? 'PASS! 🎉' : 'FAIL'}</h2>
        <p className="text-[13px] opacity-70 mt-2">
          {overallPass ? 'PASS 인장이 찍혔어요! 👏' : '한 번 더 연습하면 분명 통과할 수 있어!'}
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {synResult && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 border ${synPassed ? 'border-white/30' : 'border-rose-300/30'}`}>
            <span className="text-[13px] font-bold">유의어 라운드</span>
            <span className={`text-[12px] font-black ${synPassed ? 'text-white' : 'text-rose-300'}`}>
              {synPassed ? 'PASS ✓' : 'FAIL ✗'}
            </span>
          </div>
        )}
        {antResult && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 border ${antPassed ? 'border-white/30' : 'border-rose-300/30'}`}>
            <span className="text-[13px] font-bold">반의어 라운드</span>
            <span className={`text-[12px] font-black ${antPassed ? 'text-white' : 'text-rose-300'}`}>
              {antPassed ? 'PASS ✓' : 'FAIL ✗'}
            </span>
          </div>
        )}
      </div>
      <button onClick={onExit}
        className="h-14 px-10 bg-white text-foreground font-black rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">
        다시 선택
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WordTestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "intro" | "test" | "result" | "game">("loading");
  const [allSets, setAllSets] = useState<{ id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [gameWords, setGameWords] = useState<TestWord[]>([]);
  const [passedSetIds, setPassedSetIds] = useState<Set<string>>(new Set());

  const getStudentName = () => {
    try {
      const saved = localStorage.getItem('stu_session');
      if (saved) return JSON.parse(saved).name || '학생';
    } catch { /* noop */ }
    return '학생';
  };

  const loadSets = useCallback(async () => {
    const name = getStudentName();
    try {
      const [assignments, sessions] = await Promise.all([
        getAssignmentsByStudent(name),
        getTestSessionsByStudent(name).catch(() => []),
      ]);

      // PASS 인장: 완료된 세션(completed_at 있음) 중 70%+ 정답률을 보유한 set_id
      const passed = new Set<string>(
        (sessions as { set_id?: string; completed_at?: string | null; correct_count?: number; total_questions?: number }[])
          .filter(s => s.completed_at && s.set_id)
          .filter(s => {
            // correct_count/total_questions가 있으면 70% 이상만 PASS
            if (s.total_questions && s.total_questions > 0 && s.correct_count !== undefined) {
              return s.correct_count / s.total_questions >= 0.7;
            }
            return true; // 게임으로 완료된 경우 (total_questions=0) 무조건 PASS
          })
          .map(s => s.set_id as string)
      );
      setPassedSetIds(passed);

      const sets = (assignments || [])
        .filter(Boolean)
        .map((s: {
          id: string; workbook?: string; chapter?: string; label: string;
          passage_number?: string; sub_category?: string; sub_sub_category?: string;
          words?: {
            id: string; word: string; pos_abbr: string; korean: string;
            context?: string; context_korean?: string;
            synonyms: string | string[]; antonyms: string | string[];
            test_synonym?: boolean; test_antonym?: boolean;
          }[]
        }) => ({
          id: s.id,
          workbook: s.workbook || '배당 교재',
          chapter: [s.chapter || s.sub_category || '', s.sub_sub_category || ''].filter(Boolean).join(' '),
          passageNumber: s.passage_number ? `${s.passage_number}번` : '',
          label: s.label,
          words: (s.words || []).map(w => ({
            id: w.id,
            word: w.word,
            posAbbr: w.pos_abbr,
            korean: w.korean,
            context: w.context,
            contextKorean: w.context_korean,
            synonyms: parseList(w.synonyms),
            antonyms: parseList(w.antonyms),
            testSynonym: w.test_synonym ?? false,
            testAntonym: w.test_antonym ?? false,
          }))
        }));
      setAllSets(sets);
    } catch (err) {
      console.error('세트 로딩 실패:', err);
      setAllSets([]);
    }
    setPhase("intro");
  }, []);

  useEffect(() => { loadSets(); }, [loadSets]);

  const handleStart = async (setId: string | null) => {
    setSelectedSetId(setId);
    const targetSets = setId ? allSets.filter(s => s.id === setId) : allSets;
    const words = targetSets.flatMap(s => s.words);
    const qs = buildQuestions(words);

    if (qs.length === 0) {
      alert('출제 가능한 문항이 없습니다. 선생님이 아직 출제할 단어를 지정하지 않았어요.');
      return;
    }

    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setResults([]);

    const name = getStudentName();
    try {
      const session = await createTestSession({
        student_name: name,
        set_id: setId || undefined,
        total_questions: qs.length
      });
      setSessionId(session?.id || null);
    } catch (err) {
      console.error('세션 생성 실패:', err);
      setSessionId(null);
    }

    setPhase("test");
  };

  const handleStartGame = (setId: string | null) => {
    const targetSets = setId ? allSets.filter(s => s.id === setId) : allSets;
    const words = targetSets.flatMap(s => s.words);
    const eligible = words.filter(w => (w.testSynonym && w.synonyms.length > 0) || (w.testAntonym && w.antonyms.length > 0));
    if (eligible.length === 0) {
      alert('게임에 출제할 단어가 없습니다. 선생님이 유/반의어 출제 단어를 지정하지 않았어요.');
      return;
    }
    setSelectedSetId(setId);
    setGameWords(words);
    setPhase("game");
  };

  /** 게임 PASS 시: DB에 세션 기록 후 passedSetIds 업데이트 */
  const handleGamePass = async () => {
    const name = getStudentName();
    try {
      const session = await createTestSession({
        student_name: name,
        set_id: selectedSetId || undefined,
        total_questions: 0, // 게임이므로 0
      });
      if (session?.id) {
        await completeTestSession(session.id, 0); // total=0이면 PASS로 처리
      }
    } catch (err) {
      console.error('게임 세션 저장 실패:', err);
    }
    // 로컬 상태 즉시 반영
    if (selectedSetId) {
      setPassedSetIds(prev => new Set([...prev, selectedSetId]));
    }
  };

  const handleSelect = async (choice: string) => {
    if (selected) return;
    const q = questions[currentIdx];
    const isCorrect = choice === q.correct;
    setSelected(choice);

    const newResult: ResultEntry = { question: q, selected: choice, correct: isCorrect };

    if (sessionId) {
      try {
        await saveTestResult({
          session_id: sessionId,
          word_id: q.word.id,
          question_type: q.mode,
          student_answer: choice,
          correct_answer: q.correct,
          is_correct: isCorrect
        });
      } catch (err) { console.error(err); }
    }

    if (!isCorrect) {
      const name = getStudentName();
      try { await logWrongAnswer(name, q.word.id, q.mode); } catch (err) { console.error(err); }
    }

    setTimeout(async () => {
      const newResults = [...results, newResult];
      if (currentIdx + 1 >= questions.length) {
        if (sessionId) {
          const correctCount = newResults.filter(r => r.correct).length;
          try { await completeTestSession(sessionId, correctCount); } catch (err) { console.error(err); }
          // 70% 이상이면 PASS 인장
          const pct = correctCount / newResults.length;
          if (pct >= 0.7 && selectedSetId) {
            setPassedSetIds(prev => new Set([...prev, selectedSetId]));
          }
        }
        setResults(newResults);
        setPhase("result");
      } else {
        setResults(newResults);
        setCurrentIdx(i => i + 1);
        setSelected(null);
      }
    }, 900);
  };

  const handleQuit = () => {
    if (!confirm("시험을 중단하고 나가시겠습니까?\n현재까지의 답변은 저장되지 않습니다.")) return;
    router.push('/dashboard');
  };

  const handleRestart = () => {
    setPhase("intro");
    setSelectedSetId(null);
    setSessionId(null);
    setResults([]);
    setCurrentIdx(0);
    setSelected(null);
  };

  if (phase === "loading") return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Sparkles size={20} className="text-accent" />
        </div>
        <p className="text-[13px] text-accent font-bold">세트 불러오는 중...</p>
      </div>
    </div>
  );

  if (phase === "intro") return <IntroScreen sets={allSets} passedSetIds={passedSetIds} onStartQuiz={handleStart} onStartGame={handleStartGame} />;
  if (phase === "game") return <GameMode words={gameWords} onExit={() => setPhase("intro")} onGamePass={handleGamePass} />;
  if (phase === "result") return <ResultScreen results={results} onRestart={handleRestart} />;

  // ─── 객관식 테스트 화면 ────────────────────────────────────────────────────
  const q = questions[currentIdx];
  const isSynonym = q.mode === "synonym";

  const cardBg = isSynonym ? "bg-sky-50 border-sky-200" : "bg-rose-50 border-rose-200";
  const modeBadge = isSynonym ? "text-sky-600 bg-sky-100 border-sky-200" : "text-rose-600 bg-rose-100 border-rose-200";
  const modeLabel = isSynonym ? "유의어를 골라봐" : "반의어를 골라봐";

  const wordSet = allSets.find(s => s.words.some(w => w.id === q.word.id));
  const setInfo = wordSet ? [wordSet.chapter, wordSet.passageNumber].filter(Boolean).join(' · ') : '';

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar px-6 py-8 pb-36">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-accent">{currentIdx + 1} / {questions.length}</span>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-emerald-500">{results.filter(r => r.correct).length}정답</span>
          <button onClick={handleQuit}
            className="flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-foreground/10 transition-all">
            <LogOut size={12} /> 나가기
          </button>
        </div>
      </div>
      <div className={`h-[3px] rounded-full mb-6 overflow-hidden ${isSynonym ? 'bg-sky-100' : 'bg-rose-100'}`}>
        <div className={`h-full transition-all duration-500 ${isSynonym ? 'bg-sky-500' : 'bg-rose-500'}`} style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      <div className={`rounded-[2rem] border p-7 mb-5 text-center ${cardBg}`}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className={`text-[11px] font-black px-3 py-1 rounded-xl border ${modeBadge}`}>
            {modeLabel}
          </span>
          {setInfo && (
            <span className="text-[10px] font-bold text-accent/60 bg-white/60 px-2 py-0.5 rounded-lg border border-foreground/5">
              {setInfo}
            </span>
          )}
        </div>
        <h2 className="text-4xl text-foreground serif mb-1">{q.word.word}</h2>
        <p className="text-[13px] text-accent font-medium">{q.word.posAbbr} &nbsp; {q.word.korean}</p>
        {q.word.context && (
          <div className="mt-4 px-4 py-3 bg-white/70 rounded-2xl text-left">
            <p className="text-[11px] text-foreground/70 font-medium italic leading-relaxed">{q.word.context}</p>
            {q.word.contextKorean && (
              <p className="text-[11px] text-accent mt-1 font-medium">{q.word.contextKorean}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {q.choices.map((choice, idx) => {
          const isSelected = selected === choice;
          const isRight = choice === q.correct;
          let style = "bg-background border-foreground/10 text-foreground hover:border-foreground/30 hover:bg-accent-light";
          if (selected) {
            if (isRight) style = "bg-emerald-50 border-emerald-300 text-emerald-700";
            else if (isSelected) style = "bg-rose-50 border-rose-300 text-rose-700";
            else style = "bg-background border-foreground/5 text-foreground/30";
          }
          return (
            <button key={idx} onClick={() => handleSelect(choice)} disabled={!!selected}
              className={`w-full min-h-[56px] px-6 py-3 rounded-2xl border text-[14px] font-medium text-left flex items-center gap-4 transition-all ${style}`}>
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-black shrink-0 opacity-50">
                {["A", "B", "C", "D"][idx]}
              </span>
              <span className="flex-1 break-words">{choice}</span>
              {selected && isRight && <CheckCircle size={16} className="ml-auto shrink-0 text-emerald-500" />}
              {selected && isSelected && !isRight && <XCircle size={16} className="ml-auto shrink-0 text-rose-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
