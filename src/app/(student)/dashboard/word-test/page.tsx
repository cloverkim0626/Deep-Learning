"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw,
  BookOpen, Sparkles, AlertCircle, LogOut, Gamepad2, ClipboardList, X
} from "lucide-react";
import { getAssignmentsByStudent, logWrongAnswer } from "@/lib/assignment-service";
import {
  createTestSession, completeTestSession, saveTestResult
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
  testSynonym: boolean; // 유의어 출제
  testAntonym: boolean; // 반의어 출제
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
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function parseList(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Build questions based on manual test_synonym/test_antonym flags.
 * - Separate synonym and antonym pools then interleave so same-word syn+ant are never consecutive.
 * - Correct answer = closest match (first in list, which AI provides in priority order).
 */
function buildQuestions(words: TestWord[]): Question[] {
  const allSynonyms = words.filter(w => w.testSynonym).flatMap(w => w.synonyms);
  const allAntonyms = words.filter(w => w.testAntonym).flatMap(w => w.antonyms);

  const synQuestions: Question[] = [];
  const antQuestions: Question[] = [];

  words.forEach(word => {
    if (word.testSynonym && word.synonyms.length > 0) {
      const correct = word.synonyms[0]; // first = closest
      const distractors = allSynonyms.filter(w => !word.synonyms.includes(w) && w !== correct);
      if (distractors.length >= 3) {
        synQuestions.push({ word, mode: "synonym", correct, choices: shuffle([correct, ...shuffle(distractors).slice(0, 3)]) });
      }
    }
    if (word.testAntonym && word.antonyms.length > 0) {
      const correct = word.antonyms[0]; // first = closest
      const distractors = allAntonyms.filter(w => !word.antonyms.includes(w) && w !== correct);
      if (distractors.length >= 3) {
        antQuestions.push({ word, mode: "antonym", correct, choices: shuffle([correct, ...shuffle(distractors).slice(0, 3)]) });
      }
    }
  });

  // Interleave: alternate syn/ant so same-word pairs never touch
  const result: Question[] = [];
  const syn = shuffle(synQuestions);
  const ant = shuffle(antQuestions);
  let si = 0, ai = 0;
  while (si < syn.length || ai < ant.length) {
    if (si < syn.length) result.push(syn[si++]);
    if (ai < ant.length) result.push(ant[ai++]);
  }
  return result;
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({ sets, onStartQuiz, onStartGame }: {
  sets: { id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[];
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
        {sets.map(s => {
          const sSyn = s.words.filter(w => w.testSynonym).length;
          const sAnt = s.words.filter(w => w.testAntonym).length;
          const label = [s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ');
          return (
            <button key={s.id} onClick={() => setSelectedSetId(s.id)}
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
              {/* 객관식 */}
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
              {/* 게임형 */}
              <button
                onClick={() => { setShowModeModal(false); onStartGame(selectedSetId); }}
                className="w-full p-5 rounded-2xl border-2 border-sky-200 hover:border-sky-400 bg-sky-50 text-left transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                    <Gamepad2 size={18} className="text-sky-600 group-hover:text-white" />
                  </div>
                  <span className="text-[15px] font-black text-foreground">🎮 메모리 게임</span>
                  <span className="text-[10px] px-2 py-0.5 bg-sky-500 text-white rounded-full font-black">NEW</span>
                </div>
                <p className="text-[12px] text-accent leading-relaxed pl-12">표제어↔유/반의어 짝 맞추기<br/>30초 암기 후 카드를 뒤집어요!</p>
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
        <div className="w-20 h-20 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center shadow-xl mx-auto mb-4">
          <span className="text-3xl font-black">{pct}</span>
        </div>
        <h2 className="text-2xl text-foreground serif">테스트 완료</h2>
        <p className="text-[13px] text-accent mt-1 font-medium">
          {score}/{results.length}개 정답 · {pct >= 80 ? "아주 잘했어 👍" : pct >= 50 ? "오답을 다시 확인해봐" : "오답 위주로 집중 복습이 필요해"}
        </p>
      </div>

      {wrong.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-black text-error uppercase tracking-widest mb-3">오답 목록 ({wrong.length}개) — 오답 노트에 자동 저장됨</h3>
          <div className="space-y-2">
            {wrong.map((r, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${r.question.mode === 'synonym' ? 'border-sky-200 bg-sky-50' : 'border-rose-200 bg-rose-50'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <XCircle size={14} className="text-error shrink-0" />
                  <span className="text-[13px] font-bold text-foreground">{r.question.word.word}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${r.question.mode === 'synonym' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'}`}>
                    {r.question.mode === "synonym" ? "유의어" : "반의어"}
                  </span>
                </div>
                <div className="text-[12px] leading-relaxed pl-5">
                  <span className="text-error">내 답: {r.selected}</span>
                  <span className="mx-2 text-accent">→</span>
                  <span className="text-success font-bold">정답: {r.question.correct}</span>
                </div>
                {r.question.word.context && (
                  <div className="mt-2 pl-5 text-[11px] text-accent/70 italic border-l-2 border-foreground/10">
                    {r.question.word.context}
                    {r.question.word.contextKorean && <div className="text-accent mt-0.5">{r.question.word.contextKorean}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {results.filter(r => r.correct).length > 0 && (
        <div className="mb-8">
          <h3 className="text-[12px] font-black text-success uppercase tracking-widest mb-3">정답 ({results.filter(r => r.correct).length}개)</h3>
          <div className="space-y-2">
            {results.filter(r => r.correct).map((r, i) => (
              <div key={i} className="p-4 rounded-2xl border border-success/15 bg-success/5 flex items-center gap-2">
                <CheckCircle size={14} className="text-success shrink-0" />
                <span className="text-[13px] font-bold text-foreground">{r.question.word.word}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${r.question.mode === 'synonym' ? 'bg-sky-100 text-sky-600' : 'bg-rose-100 text-rose-600'}`}>
                  {r.question.mode === "synonym" ? "유의어" : "반의어"}
                </span>
                <span className="ml-auto text-[12px] text-success font-bold">{r.question.correct}</span>
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
  id: string;       // unique card id
  pairId: string;   // matched with the other card of the same pair  
  content: string;  // shown text
  isHeadword: boolean;
  revealed: boolean;
  matched: boolean;
};

type GameRound = 'synonym' | 'antonym';
type GamePhase = 'memorize' | 'playing' | 'round_result' | 'final_result';

function GameMode({ words, onExit }: { words: TestWord[]; onExit: () => void }) {
  const buildRound = useCallback((round: GameRound): GameCard[] => {
    const eligible = words.filter(w =>
      round === 'synonym' ? w.testSynonym && w.synonyms.length > 0
                          : w.testAntonym && w.antonyms.length > 0
    );
    const cards: GameCard[] = [];
    eligible.forEach((w, i) => {
      const pairId = `pair_${i}`;
      const partner = round === 'synonym' ? w.synonyms[0] : w.antonyms[0];
      cards.push({ id: `hw_${i}`, pairId, content: w.word, isHeadword: true, revealed: true, matched: false });
      cards.push({ id: `pt_${i}`, pairId, content: partner, isHeadword: false, revealed: true, matched: false });
    });
    return shuffle(cards);
  }, [words]);

  const hasSynRound = words.some(w => w.testSynonym && w.synonyms.length > 0);
  const hasAntRound = words.some(w => w.testAntonym && w.antonyms.length > 0);
  const firstRound: GameRound = hasSynRound ? 'synonym' : 'antonym';

  const [gamePhase, setGamePhase] = useState<GamePhase>('memorize');
  const [currentRound, setCurrentRound] = useState<GameRound>(firstRound);
  const [cards, setCards] = useState<GameCard[]>(() => buildRound(firstRound));
  const [selected, setSelected] = useState<string[]>([]);  // up to 2 card ids
  const [failCount, setFailCount] = useState(0);
  const [synResult, setSynResult] = useState<{failed: number; pairs: number} | null>(null);
  const [antResult, setAntResult] = useState<{failed: number; pairs: number} | null>(null);
  const [timer, setTimer] = useState(30);  // memorize timer
  const [playTimer, setPlayTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pairs = cards.length / 2;
  const failThreshold = Math.ceil(pairs / 2); // 절반 이상 실패 = Fail

  // memorize countdown
  useEffect(() => {
    if (gamePhase !== 'memorize') return;
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // flip all cards
          setCards(prev => prev.map(c => ({ ...c, revealed: false })));
          setGamePhase('playing');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [gamePhase]);

  // play countdown
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const total = pairs * 5;
    setPlayTimer(total);
    timerRef.current = setInterval(() => {
      setPlayTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endRound(failCount + (cards.filter(c => !c.matched).length / 2));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  const endRound = useCallback((totalFails: number) => {
    const result = { failed: totalFails, pairs };
    if (currentRound === 'synonym') {
      setSynResult(result);
      if (hasAntRound && !antResult) {
        setGamePhase('round_result');
      } else {
        setGamePhase('final_result');
      }
    } else {
      setAntResult(result);
      setGamePhase('final_result');
    }
  }, [currentRound, pairs, hasAntRound, antResult]);

  const handleCardClick = (cardId: string) => {
    if (gamePhase !== 'playing') return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.matched || card.revealed || selected.includes(cardId)) return;
    if (selected.length === 2) return; // wait for mismatch animation

    const newSelected = [...selected, cardId];
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, revealed: true } : c));
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected.map(id => cards.find(c => c.id === id)!);
      const isMatch = a.pairId === b.pairId;
      setTimeout(() => {
        if (isMatch) {
          setCards(prev => prev.map(c =>
            newSelected.includes(c.id) ? { ...c, matched: true, revealed: true } : c
          ));
          setSelected([]);
          // Check if all matched
          const remaining = cards.filter(c => !c.matched && !newSelected.includes(c.id)).length;
          if (remaining === 0) {
            clearInterval(timerRef.current!);
            endRound(failCount);
          }
        } else {
          const newFail = failCount + 1;
          setFailCount(newFail);
          setCards(prev => prev.map(c =>
            newSelected.includes(c.id) ? { ...c, revealed: false } : c
          ));
          setSelected([]);
          if (newFail >= failThreshold + (pairs - cards.filter(c => c.matched).length / 2)) {
            clearInterval(timerRef.current!);
            endRound(newFail);
          }
        }
      }, 800);
    }
  };

  const nextRound = () => {
    setCurrentRound('antonym');
    const newCards = buildRound('antonym');
    setCards(newCards);
    setSelected([]);
    setFailCount(0);
    setGamePhase('memorize');
  };

  // ── Memorize Phase ──────────────────────────────────────────────────────────
  if (gamePhase === 'memorize') {
    return (
      <div className="flex flex-col h-full px-5 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-black text-accent uppercase tracking-widest">
              {currentRound === 'synonym' ? '유의어 라운드' : '반의어 라운드'}
            </p>
            <h2 className="text-[18px] font-black text-foreground">위치를 기억하세요!</h2>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-black text-white ${
            timer > 15 ? 'bg-sky-500' : timer > 8 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
          }`}>{timer}</div>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-2 h-full">
            {cards.map(card => (
              <div key={card.id}
                className={`rounded-2xl flex items-center justify-center text-center p-2 text-[11px] font-black border-2 ${
                  card.isHeadword
                    ? 'bg-foreground text-background border-foreground'
                    : currentRound === 'synonym'
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-rose-500 text-white border-rose-400'
                }`}>
                {card.content}
              </div>
            ))}
          </div>
        </div>
        <button onClick={onExit} className="mt-4 text-[11px] text-accent/50 font-bold">← 나가기</button>
      </div>
    );
  }

  // ── Playing Phase ───────────────────────────────────────────────────────────
  if (gamePhase === 'playing') {
    const matched = cards.filter(c => c.matched).length / 2;
    const remaining = pairs - matched;
    return (
      <div className="flex flex-col h-full px-5 py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-black text-accent uppercase tracking-widest">
              {currentRound === 'synonym' ? '유의어' : '반의어'} 짝 맞추기
            </p>
            <p className="text-[13px] font-bold text-foreground">남은 짝 {remaining} · 실패 {failCount}/{failThreshold}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] font-black text-white ${
            playTimer > pairs * 3 ? 'bg-sky-500' : playTimer > pairs ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
          }`}>{playTimer}</div>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-2 h-full">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.matched}
                className={`rounded-2xl flex items-center justify-center text-center p-2 text-[11px] font-black border-2 transition-all active:scale-95 ${
                  card.matched
                    ? 'opacity-0 pointer-events-none'
                    : card.revealed
                      ? selected.includes(card.id)
                        ? 'border-amber-400 bg-amber-50 text-foreground scale-105 shadow-lg'
                        : card.isHeadword
                          ? 'bg-foreground text-background border-foreground'
                          : currentRound === 'synonym'
                            ? 'bg-sky-500 text-white border-sky-500'
                            : 'bg-rose-500 text-white border-rose-400'
                      : 'bg-accent-light border-foreground/10 text-foreground/0 cursor-pointer hover:bg-foreground/10'
                }`}>
                {card.revealed ? card.content : '?'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onExit} className="mt-4 text-[11px] text-accent/50 font-bold">← 포기하기</button>
      </div>
    );
  }

  // ── Round Result ────────────────────────────────────────────────────────────
  if (gamePhase === 'round_result' && synResult) {
    const passed = synResult.failed < failThreshold;
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-xl ${
          passed ? 'bg-sky-500 text-white' : 'bg-rose-100'
        }`}>
          {passed ? '🎉' : '😅'}
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground serif">유의어 라운드 {passed ? 'PASS' : 'FAIL'}</h2>
          <p className="text-[13px] text-accent mt-1">{synResult.pairs}쌍 중 {synResult.failed}쌍 실패</p>
        </div>
        {hasAntRound && (
          <button onClick={nextRound}
            className="h-14 px-10 bg-foreground text-background font-bold rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">
            반의어 라운드 시작 →
          </button>
        )}
        <button onClick={onExit} className="text-[12px] text-accent underline">종료</button>
      </div>
    );
  }

  // ── Final Result ────────────────────────────────────────────────────────────
  const synPassed = !synResult || synResult.failed < Math.ceil(synResult.pairs / 2);
  const antPassed = !antResult || antResult.failed < Math.ceil(antResult.pairs / 2);
  const overallPass = synPassed && antPassed;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
      <div className={`w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-5xl shadow-2xl ${
        overallPass ? 'bg-foreground text-background' : 'bg-rose-50'
      }`}>
        {overallPass ? '🏆' : '📖'}
      </div>
      <div>
        <h2 className="text-3xl font-black text-foreground serif">{overallPass ? 'PASS! 👏' : 'FAIL'}</h2>
        <p className="text-[13px] text-accent mt-2 font-medium">
          {overallPass ? '완벽해! 다음 단계로 go!' : '한 번 더 연습하면 분명 통과할 수 있어!'}
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {synResult && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${
            synPassed ? 'bg-sky-50 border-sky-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <span className="text-[13px] font-bold">유의어 라운드</span>
            <span className={`text-[12px] font-black ${synPassed ? 'text-sky-600' : 'text-rose-600'}`}>
              {synResult.failed}/{synResult.pairs} 실패 · {synPassed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        )}
        {antResult && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${
            antPassed ? 'bg-sky-50 border-sky-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <span className="text-[13px] font-bold">반의어 라운드</span>
            <span className={`text-[12px] font-black ${antPassed ? 'text-sky-600' : 'text-rose-600'}`}>
              {antResult.failed}/{antResult.pairs} 실패 · {antPassed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        )}
      </div>
      <button onClick={onExit}
        className="h-14 px-10 bg-foreground text-background font-bold rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">
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
      const assignments = await getAssignmentsByStudent(name);
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
          chapter: s.chapter || s.sub_category || '',
          passageNumber: s.passage_number || s.sub_sub_category || '',
          label: s.label,
          words: (s.words || []).map((w: {
            id: string; word: string; pos_abbr: string; korean: string;
            context?: string; context_korean?: string;
            synonyms: string | string[]; antonyms: string | string[];
            test_synonym?: boolean; test_antonym?: boolean;
          }) => ({
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
    setGameWords(words);
    setPhase("game");
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
          try { await completeTestSession(sessionId, newResults.filter(r => r.correct).length); } catch (err) { console.error(err); }
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

  if (phase === "intro") return <IntroScreen sets={allSets} onStartQuiz={handleStart} onStartGame={handleStartGame} />;
  if (phase === "game") return <GameMode words={gameWords} onExit={() => setPhase("intro")} />;
  if (phase === "result") return <ResultScreen results={results} onRestart={handleRestart} />;


  // ─── Test Phase ──────────────────────────────────────────────────────────────
  const q = questions[currentIdx];
  const isSynonym = q.mode === "synonym";

  // Card and header color based on mode
  const cardBg = isSynonym
    ? "bg-sky-50 border-sky-200"
    : "bg-rose-50 border-rose-200";
  const modeBadge = isSynonym
    ? "text-sky-600 bg-sky-100 border-sky-200"
    : "text-rose-600 bg-rose-100 border-rose-200";
  const modeLabel = isSynonym ? "유의어를 골라봐" : "반의어를 골라봐";

  // Find which set this word belongs to for chapter/passage display
  const wordSet = allSets.find(s => s.words.some(w => w.id === q.word.id));
  const setInfo = wordSet ? [wordSet.chapter, wordSet.passageNumber].filter(Boolean).join(' · ') : '';

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar px-6 py-8 pb-36">
      {/* Header: progress + quit */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-accent">{currentIdx + 1} / {questions.length}</span>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-success">{results.filter(r => r.correct).length}정답</span>
          <button
            onClick={handleQuit}
            className="flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-error hover:bg-error/5 px-3 py-1.5 rounded-xl border border-foreground/10 transition-all"
          >
            <LogOut size={12} /> 나가기
          </button>
        </div>
      </div>
      <div className={`h-[3px] rounded-full mb-6 overflow-hidden ${isSynonym ? 'bg-sky-100' : 'bg-rose-100'}`}>
        <div className={`h-full transition-all duration-500 ${isSynonym ? 'bg-sky-500' : 'bg-rose-500'}`} style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      {/* Question Card */}
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

      {/* Choices */}
      <div className="flex flex-col gap-3">
        {q.choices.map((choice, idx) => {
          const isSelected = selected === choice;
          const isRight = choice === q.correct;
          let style = "bg-background border-foreground/10 text-foreground hover:border-foreground/30 hover:bg-accent-light";
          if (selected) {
            if (isRight) style = "bg-success/10 border-success/30 text-success";
            else if (isSelected) style = "bg-error/10 border-error/30 text-error";
            else style = "bg-background border-foreground/5 text-foreground/30";
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(choice)}
              disabled={!!selected}
              className={`w-full min-h-[56px] px-6 py-3 rounded-2xl border text-[14px] font-medium text-left flex items-center gap-4 transition-all ${style}`}
            >
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-black shrink-0 opacity-50">
                {["A", "B", "C", "D"][idx]}
              </span>
              <span className="flex-1 break-words">{choice}</span>
              {selected && isRight && <CheckCircle size={16} className="ml-auto shrink-0 text-success" />}
              {selected && isSelected && !isRight && <XCircle size={16} className="ml-auto shrink-0 text-error" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
