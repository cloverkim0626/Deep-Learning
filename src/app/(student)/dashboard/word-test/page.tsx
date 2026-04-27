"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw,
  BookOpen, Sparkles, AlertCircle, LogOut, Gamepad2, ClipboardList, X, Stamp, Timer
} from "lucide-react";
import { getAssignmentsByStudent, logWrongAnswer, getWrongAnswers, deleteWrongAnswersByWordIds, autoCompleteAssignmentIfAllPassed } from "@/lib/assignment-service";
import {
  createTestSession, completeTestSession, saveTestResult, getTestSessionsByStudent
} from "@/lib/database-service";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
type TestWord = {
  id: string; word: string; posAbbr: string; korean: string;
  context?: string; contextKorean?: string;
  synonyms: string[]; antonyms: string[];
  testSynonym: boolean; testAntonym: boolean;
};
type QuestionMode = "synonym" | "antonym";
type Question = { word: TestWord; mode: QuestionMode; correct: string; choices: string[] };
type ResultEntry = { question: Question; selected: string; correct: boolean };
type VocabResult = { word: TestWord; studentAnswer: string; correct: boolean };

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  // 모든 유의어/반의어 풀
  const allSyn = words.filter(w => w.testSynonym).flatMap(w => w.synonyms);
  const allAnt = words.filter(w => w.testAntonym).flatMap(w => w.antonyms);

  // ── 유의어 교차 오염 방지 맵 ──
  // 어떤 단어 W의 유의어 목록에 있는 단어가 다른 단어 X의 유의어에도 있다면
  // X의 유의어 전체를 W의 excluded pool에 추가 (set an example 문제 방지)
  function buildExcludeSet(wordSynonyms: string[], allWords: TestWord[]): Set<string> {
    const base = new Set(wordSynonyms);
    const excluded = new Set(wordSynonyms);
    allWords.forEach(w => {
      // 현재 단어의 유의어와 겹치는 유의어를 가진 단어의 유의어 전체 제거
      if (w.synonyms.some(s => base.has(s))) {
        w.synonyms.forEach(s => excluded.add(s));
      }
    });
    return excluded;
  }
  function buildAntExcludeSet(wordAntonyms: string[], allWords: TestWord[]): Set<string> {
    const base = new Set(wordAntonyms);
    const excluded = new Set(wordAntonyms);
    allWords.forEach(w => {
      if (w.antonyms.some(s => base.has(s))) {
        w.antonyms.forEach(s => excluded.add(s));
      }
    });
    return excluded;
  }

  const synQ: Question[] = [], antQ: Question[] = [];
  words.forEach(word => {
    if (word.testSynonym && word.synonyms.length > 0) {
      const correct = word.synonyms[0];
      const excludeSet = buildExcludeSet(word.synonyms, words);
      const d = allSyn.filter(w => !excludeSet.has(w) && w !== correct);
      if (d.length >= 3) synQ.push({ word, mode: "synonym", correct, choices: fisherYates([correct, ...fisherYates(d).slice(0, 3)]) });
    }
    if (word.testAntonym && word.antonyms.length > 0) {
      const correct = word.antonyms[0];
      const excludeSet = buildAntExcludeSet(word.antonyms, words);
      const d = allAnt.filter(w => !excludeSet.has(w) && w !== correct);
      if (d.length >= 3) antQ.push({ word, mode: "antonym", correct, choices: fisherYates([correct, ...fisherYates(d).slice(0, 3)]) });
    }
  });

  // ── 유의어 먼저, 반의어 나중 — 단, 같은 단어 ID 연속 방지 ──
  function dedup(questions: Question[]): Question[] {
    const result: Question[] = [];
    const remaining = [...questions];
    while (remaining.length > 0) {
      const lastId = result.length > 0 ? result[result.length - 1].word.id : null;
      const idx = remaining.findIndex(q => q.word.id !== lastId);
      if (idx === -1) { result.push(...remaining); break; }
      result.push(remaining.splice(idx, 1)[0]);
    }
    return result;
  }

  return [...dedup(fisherYates([...synQ])), ...dedup(fisherYates([...antQ]))];
}


// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({
  sets, synonymPassedSetIds, vocabPassedSetIds, wrongDrillWords,
  onStartVocab, onStartQuiz, onStartGame,
}: {
  sets: { id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[];
  synonymPassedSetIds: Set<string>; vocabPassedSetIds: Set<string>;
  wrongDrillWords: TestWord[];
  onStartVocab: (setIds: string[] | null) => void;
  onStartQuiz: (setIds: string[] | null) => void;
  onStartGame: (setIds: string[] | null) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModeModal, setShowModeModal] = useState(false);

  const allSelected = sets.length > 0 && sets.every(s => selectedIds.has(s.id));
  const toggle = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sets.map(s => s.id)));
  };

  const selectedSets = sets.filter(s => selectedIds.has(s.id));
  const totalSyn = selectedSets.reduce((a, s) => a + s.words.filter(w => w.testSynonym).length, 0);
  const totalAnt = selectedSets.reduce((a, s) => a + s.words.filter(w => w.testAntonym).length, 0);
  const totalVocabWords = selectedSets.reduce((a, s) => a + s.words.length, 0);
  const totalQ = totalSyn + totalAnt;

  const handleMode = (mode: 'vocab' | 'quiz' | 'game') => {
    setShowModeModal(false);
    const ids = selectedIds.size > 0 ? [...selectedIds] : null;
    if (mode === 'vocab') onStartVocab(ids);
    else if (mode === 'quiz') onStartQuiz(ids);
    else onStartGame(ids);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
        <div className="w-10 h-10 rounded-[0.9rem] bg-foreground text-background flex items-center justify-center shadow-md shrink-0">
          <Trophy size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h1 className="text-[17px] font-black text-foreground">어휘 테스트</h1>
          <p className="text-[11px] text-accent/70 font-medium">
            <span className="text-teal-600 font-black">뜻고르기</span>
            <span className="mx-1 opacity-30">·</span>
            <span className="text-blue-600 font-black">유의어</span>
            <span className="mx-1 opacity-30">·</span>
            <span className="text-rose-500 font-black">반의어</span>
          </p>
        </div>
        <button
          onClick={selectAll}
          className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all ${
            allSelected ? 'bg-foreground text-background' : 'bg-foreground/[0.06] text-accent hover:bg-foreground/10'
          }`}
        >
          {allSelected ? '전체해제' : '전체선택'}
        </button>
      </div>
      {/* 세트 목록 + One More! 드릴 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2.5 pb-2">

        {/* One More! 오답 드릴 카드 */}
        {wrongDrillWords.length > 0 && (() => {
          const drillHasSynAnt = wrongDrillWords.some(w =>
            (w.testSynonym && w.synonyms.length > 0) || (w.testAntonym && w.antonyms.length > 0)
          );
          return (
            <div className="rounded-[1.7rem] overflow-hidden border border-amber-300/60 shadow-sm">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 flex items-center gap-2.5">
                <span className="text-lg">&#9889;</span>
                <div className="flex-1">
                  <p className="text-white font-black text-[13px] tracking-wide">One More!</p>
                  <p className="text-white/80 text-[10px] font-medium">오답노트 단어 모아서 다시 도전</p>
                </div>
                <div className="text-right">
                  <span className="text-[22px] font-black text-white">{wrongDrillWords.length}</span>
                  <p className="text-white/70 text-[9px] font-bold -mt-0.5">단어</p>
                </div>
              </div>
              <div className="bg-amber-50/80 px-3 py-2.5 flex gap-2">
                <button onClick={() => onStartVocab(['__wrong_drill__'])} className="flex-1 py-2 rounded-xl bg-teal-500 text-white text-[10.5px] font-black shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all">뜻고르기</button>
                <button onClick={() => onStartQuiz(['__wrong_drill__'])} className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-[10.5px] font-black shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all">유반의어 객관식</button>
                {drillHasSynAnt && (
                  <button onClick={() => onStartGame(['__wrong_drill__'])} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-[10.5px] font-black shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all">카드게임</button>
                )}
              </div>
            </div>
          );
        })()}

        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle size={32} className="text-accent/25 mb-3" />
            <p className="text-[13px] font-bold text-accent">배당된 세트가 없어요.</p>
          </div>
        ) : sets.map(s => {
          const isSelected = selectedIds.has(s.id);
          const vocabPassed = vocabPassedSetIds.has(s.id);
          const synPassed = synonymPassedSetIds.has(s.id);
          const synCount = s.words.filter(w => w.testSynonym).length;
          const antCount = s.words.filter(w => w.testAntonym).length;
          const source = [s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ');
          const hasPassed = vocabPassed || synPassed;

          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`relative w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-foreground/25 bg-foreground/[0.03] shadow-sm'
                  : 'border-foreground/[0.09] bg-white/70 hover:border-foreground/20'
              }`}
            >
              {/* 체크박스 */}
              <div className={`w-5 h-5 rounded-md border-2 mt-1 shrink-0 flex items-center justify-center transition-all ${
                isSelected ? 'bg-foreground border-foreground' : 'border-foreground/20'
              }`}>
                {isSelected && (
                  <CheckCircle size={12} className="text-background" strokeWidth={3} />
                )}
              </div>

              {/* 텍스트 3줄 */}
              <div className="flex-1 min-w-0" style={{ paddingRight: hasPassed ? '0' : '0' }}>
                {/* 줄1: 출처 */}
                <div className="text-[12px] font-semibold text-accent/60 truncate leading-snug">{source}</div>
                {/* 줄2: 제목 */}
                <div className="text-[13px] font-black text-foreground mt-0.5 leading-snug">{s.label}</div>
                {/* 줄3: 유·반 + 전체단어수 */}
                <div className="flex items-center gap-1 mt-0.5">
                  {synCount > 0 && <span className="text-blue-600 font-bold text-[10.5px]">유{synCount}</span>}
                  {synCount > 0 && antCount > 0 && <span className="text-accent/30 text-[10px]">·</span>}
                  {antCount > 0 && <span className="text-rose-500 font-bold text-[10.5px]">반{antCount}</span>}
                  {s.words.length > 0 && (
                    <span className="text-accent/35 text-[10px] font-medium ml-0.5">· 전체 {s.words.length}단어</span>
                  )}
                </div>
              </div>

              {/* PASS 도장 — 우측 하단 absolute */}
              {hasPassed && (
                <div className="absolute bottom-2.5 right-3 flex flex-col items-end gap-1 pointer-events-none select-none">
                  {vocabPassed && synPassed ? (
                    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[8.5px] font-black tracking-wide"
                      style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c', boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.25)', fontFamily: 'Georgia, serif', transform: 'rotate(-1.5deg)', letterSpacing: '0.05em' }}>
                      ✱ ALL PASS
                    </span>
                  ) : (
                    <>
                      {vocabPassed && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-[2px] rounded-full bg-teal-600 text-white text-[8.5px] font-black tracking-wide" style={{ transform: 'rotate(-1.5deg)' }}>
                          ✱ PASS <span className="opacity-75 text-[7.5px]">뜻고르기</span>
                        </span>
                      )}
                      {synPassed && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-[2px] rounded-full bg-blue-600 text-white text-[8.5px] font-black tracking-wide" style={{ transform: 'rotate(1.5deg)' }}>
                          ✱ PASS <span className="opacity-75 text-[7.5px]">유반의어</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 하단 바 — sticky 고정, 시작 버튼 항상 노출 */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-foreground/5 px-4 py-3">
        <div className="flex items-center gap-3">
          {selectedIds.size === 0 ? (
            <div className="flex-1 flex items-center gap-2 text-accent/50 text-[12px] font-bold">
              <BookOpen size={14} /> 지문을 선택해 시작하세요
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-foreground">
                {allSelected ? '전체 선택됨' : `${selectedIds.size}개 선택`}
              </p>
              <p className="text-[10px] text-accent/60 font-medium mt-0.5">
                예상&nbsp;
                <span className="font-black text-foreground">{totalQ}</span>문제&nbsp;
                <span className="text-blue-600 font-black">유{totalSyn}</span>
                <span className="text-accent/30 mx-0.5">·</span>
                <span className="text-rose-500 font-black">반{totalAnt}</span>
                {totalVocabWords > 0 && (
                  <span className="ml-1 text-teal-600 font-black">· 뜻고르기 {totalVocabWords}단어</span>
                )}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowModeModal(true)}
            disabled={selectedIds.size === 0}
            className="h-12 px-6 bg-foreground text-background font-black rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all shrink-0 text-[14px] disabled:opacity-25 disabled:pointer-events-none"
          >
            시작 <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showModeModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-background rounded-[2rem] border border-foreground/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[17px] font-black text-foreground">테스트 방식 선택</h3>
                <p className="text-[11px] text-accent/60 font-medium mt-0.5">{selectedIds.size}개 지문 선택됨</p>
              </div>
              <button onClick={() => setShowModeModal(false)} className="p-1.5 rounded-xl hover:bg-foreground/5 text-accent transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {/* 뜻쓰기 */}
              <button
                onClick={() => handleMode('vocab')}
                className="w-full p-4 rounded-2xl border-2 border-teal-200 bg-teal-50 hover:border-teal-400 text-left transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 group-hover:bg-teal-600 flex items-center justify-center text-lg transition-all">🖊</div>
                  <span className="text-[14px] font-black text-foreground">뜻 고르기 테스트</span>
                  <span className="text-[9px] ml-auto text-teal-600 font-black">{totalVocabWords}단어</span>
                </div>
                <p className="text-[11px] text-accent pl-12">영어 단어를 보고 한국어 의미 선택 (6지선다) · 90% PASS</p>
              </button>

              {/* 유반의어 객관식 */}
              <button
                onClick={() => handleMode('quiz')}
                disabled={totalQ === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  totalQ > 0 ? 'border-foreground/10 bg-white hover:border-foreground/30' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-all">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 객관식</span>
                  {totalQ > 0 && <span className="text-[9px] ml-auto text-blue-600 font-black">유{totalSyn}+반{totalAnt}문제</span>}
                </div>
                <p className="text-[11px] text-accent pl-12">4지선다 유의어/반의어 선택 · 90% PASS</p>
              </button>

              {/* 유반의어 게임 */}
              <button
                onClick={() => handleMode('game')}
                disabled={totalQ === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  totalQ > 0 ? 'border-blue-200 bg-blue-50 hover:border-blue-400' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-600 flex items-center justify-center transition-all">
                    <Gamepad2 size={16} className="text-blue-600 group-hover:text-white" />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 짝 찾기 게임</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-black">NEW</span>
                </div>
                <p className="text-[11px] text-accent pl-12">표제어↔유/반의어 짝 맞추기 · 제한시간 PASS</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────
function ResultScreen({ results, onRestart, onExit }: { results: ResultEntry[]; onRestart: () => void; onExit: () => void }) {
  const score = results.filter(r => r.correct).length;
  const pct = Math.round((score / results.length) * 100);
  const wrong = results.filter(r => !r.correct);
  const passMsg = pct === 100 ? '완벽한 점수! 역시 최고야 🔥🏆' : pct >= 95 ? '거의 완벽! 정말 대단해, 실력이 확실히 보여 🎯' : '훌륭해! 이 정도면 진짜 실력자야 👏✨';
  const failMsg = pct >= 70 ? '아깝다! 거의 다 왔어 — 틀린 것만 빠르게 다시 훑어봐 💪' : pct >= 50 ? '조금 더 집중하면 바로 통과할 수 있어. 한 번 더 도전! 🔄' : '오늘 처음 보는 단어들이야? 괜찮아, 반복이 답이야 — 다시 해보자 📖';

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-6 py-10 pb-24">
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-xl mx-auto mb-4 ${pct >= 90 ? 'bg-emerald-500 text-white' : pct >= 70 ? 'bg-amber-400 text-white' : 'bg-foreground text-background'}`}>
          <span className="text-3xl font-black">{pct}</span>
        </div>
        <h2 className="text-2xl text-foreground serif">테스트 완료</h2>
        <p className="text-[13px] text-accent mt-1 font-medium">
          {score}/{results.length}개 정답
        </p>
        <p className={`text-[13px] font-black mt-1.5 ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-rose-500'}`}>
          {pct >= 90 ? passMsg : failMsg}
        </p>
        {pct >= 90 && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 text-[11px] font-black">
            <Stamp size={12} /> PASS 인장이 찍혔어요! (90% 이상)
          </div>
        )}
      </div>
      {wrong.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[12px] font-black text-rose-500 uppercase tracking-widest mb-3">오답 ({wrong.length}개) — 오답노트 자동 저장</h3>
          <div className="space-y-2.5">
            {wrong.map((r, i) => (
              <div key={i} className={`rounded-2xl border overflow-hidden ${r.question.mode === 'synonym' ? 'border-blue-200' : 'border-rose-200'}`}>
                <div className={`flex items-center gap-2 px-4 py-2.5 ${r.question.mode === 'synonym' ? 'bg-blue-50' : 'bg-rose-50'}`}>
                  <XCircle size={14} className="text-rose-500 shrink-0" />
                  <span className="text-[14px] font-black text-foreground">{r.question.word.word}</span>
                  <span className="text-[11px] text-accent/70 font-medium italic">{r.question.word.korean}</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-lg font-black shrink-0 ${r.question.mode === 'synonym' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-600'}`}>
                    {r.question.mode === "synonym" ? "유의어" : "반의어"}
                  </span>
                </div>
                <div className="px-4 py-2.5 bg-white flex items-center gap-3 text-[12px]">
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <XCircle size={12} strokeWidth={2.5} />
                    <span className="font-bold">내 답:</span><span>{r.selected}</span>
                  </div>
                  <span className="text-foreground/20 font-black">→</span>
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle size={12} strokeWidth={2.5} />
                    <span className="font-bold">정답:</span><span className="font-black">{r.question.correct}</span>
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
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ml-auto ${r.question.mode === 'synonym' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-600'}`}>
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
        <button onClick={onExit} className="h-[52px] px-5 bg-accent-light text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-foreground/10 transition-all">
          <LogOut size={16} strokeWidth={2} /> TEST 목록
        </button>
      </div>
    </div>
  );
}

// ─── Vocab MCQ ─ 의미 고르기 6지선다 ─────────────────────────────────────────
function buildVocabMCQChoices(word: TestWord, allPool: TestWord[]): string[] {
  const correct = word.korean.trim();
  const pos = word.posAbbr;

  const samePOSMeanings = allPool
    .filter(w => w.id !== word.id && w.posAbbr === pos)
    .map(w => w.korean.trim())
    .filter(k => k && k !== correct);

  const otherMeanings = allPool
    .filter(w => w.id !== word.id && w.posAbbr !== pos)
    .map(w => w.korean.trim())
    .filter(k => k && k !== correct);

  const uniqueSame = fisherYates([...new Set(samePOSMeanings)]);
  const uniqueOther = fisherYates([...new Set(otherMeanings)]);

  const distractors: string[] = [];
  let si = 0, oi = 0;
  while (distractors.length < 5 && (si < uniqueSame.length || oi < uniqueOther.length)) {
    if (si < uniqueSame.length && distractors.length < 5) distractors.push(uniqueSame[si++]);
    if (si < uniqueSame.length && distractors.length < 5) distractors.push(uniqueSame[si++]);
    if (oi < uniqueOther.length && distractors.length < 5) distractors.push(uniqueOther[oi++]);
  }

  return fisherYates([correct, ...distractors.slice(0, 5)]);
}

function VocabMCQTest({ words, allWords, preloadedChoices, onDone, onExit }: {
  words: TestWord[]; allWords: TestWord[];
  preloadedChoices?: string[][];
  onDone: (results: VocabResult[]) => void; onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(words.length * 10);
  const totalTime = words.length * 10;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<VocabResult[]>([]);
  const idxRef = useRef(0);
  const selectedRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const allChoices = useRef<string[][]>(
    preloadedChoices && preloadedChoices.length === words.length
      ? preloadedChoices
      : words.map(w => buildVocabMCQChoices(w, allWords))
  );

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!endedRef.current) {
            endedRef.current = true;
            const ci = idxRef.current, csel = selectedRef.current;
            const remaining = words.slice(ci + (csel !== null ? 1 : 0));
            const extra: VocabResult[] = remaining.map(w => ({ word: w, studentAnswer: '(시간초과)', correct: false }));
            if (csel === null && ci < words.length) extra.unshift({ word: words[ci], studentAnswer: '(시간초과)', correct: false });
            onDone([...resultsRef.current, ...extra]);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWord = words[idx];
  const choices = allChoices.current[idx] || [currentWord.korean];
  const firstMeaning = (s: string) => s.split(/[,，、\/]/)[0].trim();
  const correct = firstMeaning(currentWord.korean);
  const timerPct = (timeLeft / totalTime) * 100;
  const correctCount = resultsRef.current.filter(r => r.correct).length;

  const handleSelect = (choice: string) => {
    if (selected !== null) return;
    setSelected(choice);
    const ok = choice.trim() === correct;
    const newResults = [...resultsRef.current, { word: currentWord, studentAnswer: choice, correct: ok }];
    resultsRef.current = newResults;
    setTimeout(() => {
      const ni = idx + 1;
      if (ni >= words.length) {
        clearInterval(timerRef.current!);
        endedRef.current = true;
        onDone(newResults);
      } else {
        setIdx(ni);
        setSelected(null);
      }
    }, ok ? 400 : 1950);
  };

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[12px] font-bold text-accent">{idx + 1} / {words.length}</span>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[12px] ${timeLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : timeLeft <= 30 ? 'bg-amber-400 text-white' : 'bg-foreground/5 text-accent'}`}>
          <Timer size={12} />{timeLeft}s
        </div>
        <span className="text-[12px] font-bold text-teal-600">{correctCount}정답</span>
      </div>
      <div className="h-[3px] bg-teal-100 rounded-full mb-1">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(idx / words.length) * 100}%` }} />
      </div>
      <div className="h-[3px] bg-foreground/5 rounded-full mb-3">
        <div className={`h-full rounded-full transition-all duration-1000 ${timerPct > 50 ? 'bg-teal-400' : timerPct > 20 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${timerPct}%` }} />
      </div>
      <div className="glass rounded-[1.5rem] border border-foreground/5 p-4 text-center shadow-xl mb-3 shrink-0">
        <p className="text-[9px] font-black text-teal-600 uppercase tracking-[3px] mb-1.5">의미 고르기</p>
        <h2 className={`serif font-bold text-foreground mb-0.5 ${currentWord.word.length >= 13 ? 'text-[26px]' : 'text-[32px]'}`}>{currentWord.word}</h2>
        <p className="text-[11px] text-accent font-black tracking-widest">{currentWord.posAbbr}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {choices.map((choice, ci) => {
            const isSelected = selected === choice;
            const isCorrect = choice.trim() === correct;
            let cls = 'border-foreground/10 bg-white text-foreground hover:border-foreground/25 hover:shadow-md';
            if (selected !== null) {
              if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-md font-black';
              else if (isSelected) cls = 'border-rose-400 bg-rose-50 text-rose-700';
              else cls = 'border-foreground/5 text-accent/35 bg-white/40';
            }
            return (
              <button key={ci} onClick={() => handleSelect(choice)} disabled={selected !== null}
                className={`py-2.5 px-3 rounded-2xl border-2 font-bold text-[12px] text-center leading-snug transition-all ${selected === null ? 'hover:-translate-y-0.5 active:scale-95' : ''} ${cls}`}>
                {choice}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className={`mt-2.5 rounded-2xl px-4 py-3 border-2 text-[12px] animate-in fade-in duration-200 ${
            selected.trim() === correct ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {selected.trim() === correct ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} strokeWidth={2.5} />
                <span className="font-black">정답! 완벽해요 👍</span>
                <span className="ml-auto text-[9px] opacity-40 font-medium animate-pulse">자동 진행...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <XCircle size={14} strokeWidth={2.5} className="shrink-0" />
                  <span className="font-bold"><span className="font-black">'{selected}'</span>은(는) 오답이에요.</span>
                  <span className="ml-auto text-[9px] opacity-40 font-medium animate-pulse">자동 진행...</span>
                </div>
                <p className="text-[11px] font-bold pl-5">
                  <span className="font-black text-foreground">{currentWord.word}</span>의 뜻은
                  <span className="font-black text-emerald-700"> '{correct}'</span>입니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <button onClick={onExit} className="shrink-0 text-[11px] text-accent/40 font-bold py-2.5 text-center mt-1.5 hover:text-rose-500 transition-colors">
        ← 시험 포기하고 처음으로
      </button>
    </div>
  );
}

// ─── Vocab Result Screen ──────────────────────────────────────────────────────
function VocabResultScreen({ results, onRestart, onExit }: { results: VocabResult[]; onRestart: () => void; onExit: () => void }) {
  const router = useRouter();
  const score = results.filter(r => r.correct).length;
  const pct = results.length > 0 ? Math.round((score / results.length) * 100) : 0;
  const wrong = results.filter(r => !r.correct);

  const passMsg2 = pct === 100 ? '단어 뜻 완벽 마스터! 진짜 대단해 🔥🏆' : pct >= 95 ? '거의 만점! 단어 실력이 무섭다 🎯✨' : '훌륭해! 이 정도 단어 실력이면 자신감 가져도 돼 👏';
  const failMsg2 = pct >= 70 ? '아깝다! 몇 개만 더 다듬으면 통과야 — 오답 다시 봐봐 💪' : pct >= 50 ? '아직 모르는 단어가 있어 — 조금만 더 하면 금방 올라와! 🔄' : '괜찮아, 이 단어들이랑 친해지는 중이야. 다시 도전해보자 📖';

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-6 py-10 pb-24">
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-xl mx-auto mb-4 ${pct >= 90 ? 'bg-teal-500 text-white' : pct >= 70 ? 'bg-amber-400 text-white' : 'bg-foreground text-background'}`}>
          <span className="text-3xl font-black">{pct}</span>
        </div>
        <h2 className="text-2xl text-foreground serif">의미 고르기 완료</h2>
        <p className="text-[13px] text-accent mt-1 font-medium">{score}/{results.length}개 정답</p>
        <p className={`text-[13px] font-black mt-1.5 ${pct >= 90 ? 'text-teal-600' : pct >= 70 ? 'text-amber-600' : 'text-rose-500'}`}>
          {pct >= 90 ? passMsg2 : failMsg2}
        </p>
        {pct >= 90 && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-[11px] font-black">
            <Stamp size={12} /> 의미고르기 PASS 인장이 찍혔어요! 🎉
          </div>
        )}
      </div>
      {wrong.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-3">오답 ({wrong.length}개) — 오답노트 자동 저장</h3>
          <div className="space-y-2">
            {wrong.map((r, i) => (
              <div key={i} className="rounded-2xl border border-rose-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50">
                  <XCircle size={13} className="text-rose-500 shrink-0" />
                  <span className="text-[14px] font-black text-foreground">{r.word.word}</span>
                  <span className="text-[10px] text-accent/60 italic">{r.word.posAbbr}</span>
                  <span className="ml-auto text-[9px] px-2 py-0.5 rounded-lg font-black bg-teal-100 text-teal-700">뜻쓰기</span>
                </div>
                <div className="px-4 py-2.5 bg-white text-[12px] space-y-1">
                  <div className="text-rose-500"><span className="font-bold">내가 쓴 답: </span>{r.studentAnswer || '(공백)'}</div>
                  <div className="text-emerald-700"><span className="font-bold">실제 뜻: </span><span className="font-black">{r.word.korean}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {score > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] font-black text-teal-600 uppercase tracking-widest mb-3">정답 ({score}개)</h3>
          <div className="space-y-1.5">
            {results.filter(r => r.correct).map((r, i) => (
              <div key={i} className="px-4 py-2.5 rounded-2xl border border-teal-100 bg-teal-50/50 flex items-center gap-2">
                <CheckCircle size={12} className="text-teal-500 shrink-0" />
                <span className="text-[13px] font-bold text-foreground">{r.word.word}</span>
                <span className="ml-auto text-[12px] text-teal-600 font-black">{r.word.korean}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onRestart} className="flex-1 h-[52px] bg-foreground text-background font-bold rounded-2xl flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-all shadow">
          <RotateCcw size={16} strokeWidth={2} /> 다시 풀기
        </button>
        <button onClick={onExit} className="h-[52px] px-5 bg-accent-light text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-foreground/10 transition-all">
          <LogOut size={16} strokeWidth={2} /> TEST 목록
        </button>
      </div>
    </div>
  );
}

// ─── Game Mode ────────────────────────────────────────────────────────────────
type GameCard = { id: string; pairId: string; content: string; isHeadword: boolean; matched: boolean };
type GameRound = 'synonym' | 'antonym';
type GamePhase = 'playing' | 'round_result' | 'final_result';

function GameMode({ words, onExit, onGamePass }: { words: TestWord[]; onExit: () => void; onGamePass: () => void }) {
  const buildRound = useCallback((round: GameRound): GameCard[] => {
    const eligible = words.filter(w => round === 'synonym' ? w.testSynonym && w.synonyms.length > 0 : w.testAntonym && w.antonyms.length > 0);
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

  // 둘 다 없으면 게임 불가
  if (!hasSynRound && !hasAntRound) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center text-3xl">&#9889;</div>
        <p className="text-[15px] font-black text-foreground">카드게임 불가</p>
        <p className="text-[13px] text-accent">이 단어들은 유의어/반의어 데이터가 없어요.<br/>다른 테스트로 도전해보세요.</p>
        <button onClick={onExit} className="mt-2 px-8 h-12 rounded-2xl bg-foreground text-background font-bold text-[14px] hover:-translate-y-0.5 transition-all">\ub3cc\uc544\uac00\uae30</button>
      </div>
    );
  }

  const firstRound: GameRound = hasSynRound ? 'synonym' : 'antonym';

  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [currentRound, setCurrentRound] = useState<GameRound>(firstRound);
  const [cards, setCards] = useState<GameCard[]>(() => buildRound(firstRound));
  const [selected, setSelected] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [playTimer, setPlayTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [synResult, setSynResult] = useState<{ passed: boolean; pairs: number } | null>(null);
  const [antResult, setAntResult] = useState<{ passed: boolean; pairs: number } | null>(null);
  const pairs = cards.length / 2;

  const endRound = useCallback((passed: boolean) => {
    clearInterval(timerRef.current!);
    const result = { passed, pairs };
    if (currentRound === 'synonym') {
      setSynResult(result);
      if (hasAntRound) setGamePhase('round_result');
      else { setGamePhase('final_result'); if (passed) onGamePass(); }
    } else { setAntResult(result); setGamePhase('final_result'); if (passed) onGamePass(); }
  }, [currentRound, pairs, hasAntRound, onGamePass]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const total = Math.max(pairs * 4, 8);
    setPlayTimer(total);
    timerRef.current = setInterval(() => {
      setPlayTimer(t => { if (t <= 1) { clearInterval(timerRef.current!); endRound(false); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, pairs]);

  const handleCardClick = (cardId: string) => {
    if (gamePhase !== 'playing') return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.matched || selected.includes(cardId) || wrong.includes(cardId) || selected.length >= 2) return;
    const newSel = [...selected, cardId];
    setSelected(newSel);
    if (newSel.length === 2) {
      const [a, b] = newSel.map(id => cards.find(c => c.id === id)!);
      if (a.pairId === b.pairId) {
        setTimeout(() => {
          setCards(prev => prev.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c));
          setSelected([]);
          setCards(prev => { if (prev.filter(c => !c.matched && !newSel.includes(c.id)).length === 0) endRound(true); return prev; });
        }, 250);
      } else { setWrong(newSel); setTimeout(() => { setSelected([]); setWrong([]); }, 600); }
    }
  };

  const timerPct = pairs > 0 ? (playTimer / Math.max(pairs * 4, 8)) * 100 : 100;
  const roundLabel = currentRound === 'synonym' ? '유의어' : '반의어';
  const roundBg = currentRound === 'synonym' ? 'from-blue-600 to-indigo-700' : 'from-rose-600 to-pink-700';

  if (gamePhase === 'playing') {
    const matchedCount = cards.filter(c => c.matched).length / 2;
    return (
      <div className={`flex flex-col h-full bg-gradient-to-br ${roundBg} select-none`}>
        <div className="flex items-center justify-between px-5 py-4 text-white shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{roundLabel} 짝 찾기</p>
            <p className="text-[16px] font-black">남은 짝 <span className="text-white/80">{pairs - matchedCount}</span></p>
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="white" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - timerPct / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-[15px] font-black text-white ${playTimer <= 5 ? 'animate-pulse' : ''}`}>
              {playTimer}
            </span>
          </div>
        </div>
        <div className="h-1 mx-5 rounded-full bg-white/20 shrink-0 mb-3">
          <div className={`h-full rounded-full transition-all duration-1000 ${timerPct > 50 ? 'bg-white/70' : timerPct > 25 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${timerPct}%` }} />
        </div>
        <div className="flex-1 px-3 pb-3 overflow-hidden">
          <div className="grid grid-cols-4 gap-2 h-full auto-rows-fr">
            {cards.map(card => {
              const isSelected = selected.includes(card.id);
              const isWrong = wrong.includes(card.id);
              if (card.matched) return <div key={card.id} className="rounded-2xl bg-white/10 border border-white/10" />;
              return (
                <button key={card.id} onClick={() => handleCardClick(card.id)}
                  className={`relative rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center font-black transition-all duration-200 active:scale-95 min-h-[60px] overflow-hidden ${
                    isWrong ? 'border-rose-300 bg-rose-100 text-rose-700 scale-95'
                    : isSelected ? 'border-amber-300 bg-amber-50 text-foreground scale-105 shadow-2xl'
                    : card.isHeadword ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:scale-105 backdrop-blur-sm'
                    : currentRound === 'synonym' ? 'border-blue-200/40 bg-blue-400/20 text-white hover:bg-blue-400/35 hover:scale-105'
                    : 'border-pink-200/40 bg-pink-400/20 text-white hover:bg-pink-400/35 hover:scale-105'
                  }`}
                >
                  <span className="absolute top-1 right-1 text-[6px] font-black uppercase opacity-50 text-white">
                    {card.isHeadword ? 'word' : roundLabel === '유의어' ? 'syn' : 'ant'}
                  </span>
                  <span className="text-[11px] leading-tight break-words w-full">{card.content}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={onExit} className="shrink-0 text-[11px] text-white/40 font-bold py-3 text-center">← 포기하기</button>
      </div>
    );
  }

  if (gamePhase === 'round_result' && synResult) {
    const passed = synResult.passed;
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-br ${passed ? 'from-blue-500 to-indigo-600' : 'from-slate-700 to-slate-900'} text-white px-8 text-center gap-6`}>
        <div className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center text-5xl shadow-2xl bg-white/20">{passed ? '🎉' : '⏰'}</div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">유의어 라운드</p>
          <h2 className="text-3xl font-black">{passed ? 'PASS!' : 'FAIL'}</h2>
          <p className="text-[13px] opacity-70 mt-2">{passed ? '완벽해! 반의어도 도전해봐' : '아쉽다… 반의어도 도전해봐!'}</p>
        </div>
        {hasAntRound && (
          <button onClick={() => { setCards(buildRound('antonym')); setCurrentRound('antonym'); setSelected([]); setWrong([]); setGamePhase('playing'); }}
            className="h-14 px-10 bg-white text-foreground font-black rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">
            반의어 라운드 시작 →
          </button>
        )}
        <button onClick={onExit} className="text-[12px] opacity-50 underline">종료</button>
      </div>
    );
  }

  const synPassed = !synResult || synResult.passed;
  const antPassed = !antResult || antResult.passed;
  const overallPass = synPassed && antPassed;
  return (
    <div className={`flex flex-col items-center justify-center h-full bg-gradient-to-br ${overallPass ? 'from-teal-500 to-emerald-700' : 'from-slate-700 to-slate-900'} text-white px-8 text-center gap-6`}>
      <div className="w-28 h-28 rounded-[2rem] bg-white/20 flex items-center justify-center text-6xl shadow-2xl backdrop-blur">
        {overallPass ? '🏆' : '📖'}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">최종 결과</p>
        <h2 className="text-4xl font-black">{overallPass ? 'PASS! 🎉' : 'FAIL'}</h2>
        <p className="text-[13px] opacity-70 mt-2">{overallPass ? 'PASS 인장이 찍혔어요! 👏' : '한 번 더 연습하면 분명 통과할 수 있어!'}</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {synResult && <div className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 border ${synPassed ? 'border-white/30' : 'border-rose-300/30'}`}>
          <span className="text-[13px] font-bold">유의어 라운드</span>
          <span className={`text-[12px] font-black ${synPassed ? 'text-white' : 'text-rose-300'}`}>{synPassed ? 'PASS ✓' : 'FAIL ✗'}</span>
        </div>}
        {antResult && <div className={`flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 border ${antPassed ? 'border-white/30' : 'border-rose-300/30'}`}>
          <span className="text-[13px] font-bold">반의어 라운드</span>
          <span className={`text-[12px] font-black ${antPassed ? 'text-white' : 'text-rose-300'}`}>{antPassed ? 'PASS ✓' : 'FAIL ✗'}</span>
        </div>}
      </div>
      <button onClick={onExit} className="h-14 px-10 bg-white text-foreground font-black rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all">다시 선택</button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WordTestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "intro" | "vocab_loading" | "vocab_test" | "vocab_result" | "test" | "result" | "game">("loading");
  const [allSets, setAllSets] = useState<{ id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]); // 멀티세트 추적
  const [gameWords, setGameWords] = useState<TestWord[]>([]);
  const [synonymPassedSetIds, setSynonymPassedSetIds] = useState<Set<string>>(new Set());
  const [vocabPassedSetIds, setVocabPassedSetIds] = useState<Set<string>>(new Set());
  const [vocabWords, setVocabWords] = useState<TestWord[]>([]);
  const [vocabAllWords, setVocabAllWords] = useState<TestWord[]>([]);
  const [vocabChoices, setVocabChoices] = useState<string[][]>([]);
  const [vocabResults, setVocabResults] = useState<VocabResult[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [quizTotalTime, setQuizTotalTime] = useState(0);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleTimeUpRef = useRef<(() => void) | null>(null);
  const [showOverflowModal, setShowOverflowModal] = useState(false);
  const [overflowWordCount, setOverflowWordCount] = useState(0);

  // ─── One More! 오답 드릴 ──────────────────────────────────────────────────
  const WRONG_DRILL_ID = '__wrong_drill__';
  const [wrongDrillWords, setWrongDrillWords] = useState<TestWord[]>([]);
  // word_id → wrong_answer record ids (삭제용)
  const [wrongDrillIdMap, setWrongDrillIdMap] = useState<Record<string, string[]>>({});

  const loadWrongDrill = useCallback(async () => {
    const name = getStudentName();
    try {
      const raw = await getWrongAnswers(name, 'all');
      if (!raw || raw.length === 0) { setWrongDrillWords([]); return; }
      const wordMap = new Map<string, { word: TestWord; ids: string[] }>();
      (raw as {
        id: string; word_id: string; question_type: string;
        words: { id: string; word: string; pos_abbr: string; korean: string;
          context?: string; context_korean?: string;
          synonyms: string | string[]; antonyms: string | string[] } | null;
      }[]).forEach(wa => {
        if (!wa.words) return;
        const w = wa.words;
        if (!wordMap.has(w.id)) {
          wordMap.set(w.id, {
            word: {
              id: w.id, word: w.word, posAbbr: w.pos_abbr || '',
              korean: w.korean || '', context: w.context || '',
              contextKorean: w.context_korean || '',
              synonyms: parseList(w.synonyms), antonyms: parseList(w.antonyms),
              testSynonym: false, testAntonym: false,
            },
            ids: [wa.id],
          });
        } else {
          wordMap.get(w.id)!.ids.push(wa.id);
        }
        const entry = wordMap.get(w.id)!;
        if (wa.question_type === 'synonym') entry.word.testSynonym = true;
        else if (wa.question_type === 'antonym') entry.word.testAntonym = true;
        // vocab type: mark both if word has them
        else {
          if (parseList(w.synonyms).length > 0) entry.word.testSynonym = true;
          if (parseList(w.antonyms).length > 0) entry.word.testAntonym = true;
        }
      });
      const words: TestWord[] = [];
      const idMap: Record<string, string[]> = {};
      wordMap.forEach((v, wordId) => { words.push(v.word); idMap[wordId] = v.ids; });
      setWrongDrillWords(words);
      setWrongDrillIdMap(idMap);
    } catch { setWrongDrillWords([]); }
  }, []);

  useEffect(() => { loadWrongDrill(); }, [loadWrongDrill]);

  // 드릴 pass 후 정답 단어 삭제
  const handleWrongDrillPass = useCallback(async (correctWordIds: string[]) => {
    const name = getStudentName();
    try {
      await deleteWrongAnswersByWordIds(name, correctWordIds);
      await loadWrongDrill();
    } catch { /* noop */ }
  }, [loadWrongDrill]);

  useEffect(() => {
    handleTimeUpRef.current = () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      const remaining = questions.slice(currentIdx + (selected !== null ? 1 : 0));
      const wrongEntries: ResultEntry[] = remaining.map(q => ({ question: q, selected: '', correct: false }));
      const all = [...results, ...wrongEntries];
      if (sessionId) {
        const c = all.filter(r => r.correct).length;
        completeTestSession(sessionId, c).catch(() => {});
      }
      // pass 배지 — sessionId 유무와 무관하게 처리
      const c = all.filter(r => r.correct).length;
      if (c / (all.length || 1) >= 0.9) {
        const idsToMark = selectedSetId && selectedSetId !== WRONG_DRILL_ID
          ? [selectedSetId]
          : selectedSetIds.filter(id => id !== WRONG_DRILL_ID);
        if (idsToMark.length > 0) setSynonymPassedSetIds(prev => new Set([...prev, ...idsToMark]));
      }
      setResults(all); setPhase('result');
    };
  });

  useEffect(() => {
    if (phase !== 'test') { if (quizTimerRef.current) clearInterval(quizTimerRef.current); return; }
    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft(t => { if (t <= 1) { clearInterval(quizTimerRef.current!); handleTimeUpRef.current?.(); return 0; } return t - 1; });
    }, 1000);
    return () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); };
  }, [phase]);

  const getStudentName = () => {
    try { const s = localStorage.getItem('stu_session'); if (s) return JSON.parse(s).name || '학생'; } catch { /* noop */ }
    return '학생';
  };

  const loadSets = useCallback(async () => {
    const name = getStudentName();
    try {
      const [assignments, sessions] = await Promise.all([
        getAssignmentsByStudent(name),
        getTestSessionsByStudent(name).catch(() => []),
      ]);
      const st = sessions as { set_id?: string; completed_at?: string | null; correct_count?: number; total_questions?: number; test_type?: string }[];
      // vocab 계열이 아닌 유의어/반의어 평정 흉수 (vocab_drill 제외)
      const isSynType = (t?: string) => t === 'synonym' || t === 'antonym' || t === 'card_game';
      setSynonymPassedSetIds(new Set(
        st.filter(s => s.completed_at && s.set_id && isSynType(s.test_type))
          .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
          .map(s => s.set_id as string)
      ));
      setVocabPassedSetIds(new Set(
        st.filter(s => s.completed_at && s.set_id && s.test_type === 'vocab')
          .filter(s => s.total_questions && s.total_questions > 0 ? (s.correct_count ?? 0) / s.total_questions >= 0.9 : false)
          .map(s => s.set_id as string)
      ));
      setAllSets((assignments || []).filter(Boolean).map((s: {
        id: string; workbook?: string; chapter?: string; label: string;
        passage_number?: string; sub_category?: string; sub_sub_category?: string;
        words?: { id: string; word: string; pos_abbr: string; korean: string; context?: string; context_korean?: string; synonyms: string | string[]; antonyms: string | string[]; test_synonym?: boolean; test_antonym?: boolean }[]
      }) => ({
        id: s.id,
        workbook: s.workbook || '배당 교재',
        chapter: [s.chapter || s.sub_category || '', s.sub_sub_category || ''].filter(Boolean).join(' · '),
        passageNumber: s.passage_number ? `${s.passage_number}번` : '',
        label: s.label,
        words: (s.words || []).map(w => ({
          id: w.id, word: w.word, posAbbr: w.pos_abbr, korean: w.korean,
          context: w.context, contextKorean: w.context_korean,
          synonyms: parseList(w.synonyms), antonyms: parseList(w.antonyms),
          testSynonym: w.test_synonym ?? false, testAntonym: w.test_antonym ?? false,
        }))
      })).sort((a, b) => {
        const sa = [a.workbook, a.chapter, a.passageNumber].join(' ');
        const sb = [b.workbook, b.chapter, b.passageNumber].join(' ');
        return sa.localeCompare(sb, 'ko');
      }));
    } catch (err) { console.error('세트 로딩 실패:', err); setAllSets([]); }
    setPhase("intro");
  }, []);

  useEffect(() => { loadSets(); }, [loadSets]);

  const handleStart = async (setIds: string[] | null) => {
    const isDrill = setIds?.includes(WRONG_DRILL_ID);
    const targetSets = isDrill ? [] : (setIds ? allSets.filter(s => setIds.includes(s.id)) : allSets);
    const singleId = isDrill ? null : (setIds?.length === 1 ? setIds[0] : null);
    setSelectedSetId(singleId);
    setSelectedSetIds(isDrill ? [] : (setIds || [])); // ← 멀티세트 ID 보존 (핵심 누락이었음)
    const words = isDrill ? wrongDrillWords : targetSets.flatMap(s => s.words);

    const qs = buildQuestions(words);
    if (qs.length === 0) { alert('출제 가능한 문항이 없습니다.'); return; }
    setQuestions(qs); setCurrentIdx(0); setSelected(null); setResults([]);
    const tt = qs.length * 10;
    setQuizTotalTime(tt); setQuizTimeLeft(tt);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    const name = getStudentName();
    try {
      const setIdsJson = setIds && setIds.length > 1 ? JSON.stringify(setIds) : undefined;
      const session = await createTestSession({ student_name: name, set_id: singleId || undefined, total_questions: qs.length, test_type: isDrill ? 'synonym_drill' : 'synonym', set_ids_json: setIdsJson });
      setSessionId(session?.id || null);
    } catch { setSessionId(null); }
    setPhase("test");
  };

  const handleStartGame = (setIds: string[] | null) => {
    const isDrill = setIds?.includes(WRONG_DRILL_ID);
    const targetSets = isDrill ? [] : (setIds ? allSets.filter(s => setIds.includes(s.id)) : allSets);
    const words = isDrill ? wrongDrillWords : targetSets.flatMap(s => s.words);

    if (!isDrill) {
      // 일반 모드: 유/반의어 단어 유무 체크
      if (!words.some(w => (w.testSynonym && w.synonyms.length > 0) || (w.testAntonym && w.antonyms.length > 0))) {
        alert('게임에 출제할 단어가 없습니다.'); return;
      }
      // 16단어 초과 체크
      const synWordCount = words.filter(w => w.testSynonym && w.synonyms.length > 0).length;
      const antWordCount = words.filter(w => w.testAntonym && w.antonyms.length > 0).length;
      if (synWordCount > 16 || antWordCount > 16) {
        setOverflowWordCount(Math.max(synWordCount, antWordCount));
        setShowOverflowModal(true);
        return;
      }
    }
    // 드릴 모드: 단어가 있으면 바로 진입 (GameMode가 라운드별 필터링)
    if (words.length === 0) { alert('\uc624\ub2f5 \ub2e8\uc5b4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.'); return; }
    const singleId = isDrill ? null : (setIds?.length === 1 ? setIds[0] : null);
    setSelectedSetId(singleId);
    setSelectedSetIds(isDrill ? [] : (setIds || [])); // 멀티세트 id 보존
    setGameWords(words); setPhase("game");
  };

  const handleGamePass = async () => {
    const name = getStudentName();
    const idsToMark = selectedSetId ? [selectedSetId] : selectedSetIds.filter(id => id !== WRONG_DRILL_ID);
    try {
      const synCount = gameWords.filter(w => w.testSynonym && w.synonyms.length > 0).length;
      const antCount = gameWords.filter(w => w.testAntonym && w.antonyms.length > 0).length;
      const totalWords = synCount + antCount;
      if (selectedSetId) {
        const session = await createTestSession({ student_name: name, set_id: selectedSetId, total_questions: totalWords, test_type: 'card_game' });
        if (session?.id) await completeTestSession(session.id, totalWords);
      } else {
        // 멀티세트: 세트별로 세션 저장 (다음 로드 시 badge 유지)
        for (const id of idsToMark) {
          createTestSession({ student_name: name, set_id: id, total_questions: totalWords, test_type: 'card_game' })
            .then(s => s?.id && completeTestSession(s.id, totalWords)).catch(() => {});
        }
      }
    } catch { /* noop */ }
    if (idsToMark.length > 0) setSynonymPassedSetIds(prev => new Set([...prev, ...idsToMark]));
  };

  const handleStartVocab = async (setIds: string[] | null) => {
    const isDrill = setIds?.includes(WRONG_DRILL_ID);
    const targetSets = isDrill ? [] : (setIds ? allSets.filter(s => setIds.includes(s.id)) : allSets);
    const singleId = isDrill ? null : (setIds?.length === 1 ? setIds[0] : null);
    setSelectedSetId(isDrill ? WRONG_DRILL_ID : singleId);
    setSelectedSetIds(isDrill ? [] : (setIds || [])); // 멀티세트 id 보존
    const words = isDrill ? fisherYates(wrongDrillWords) : fisherYates(targetSets.flatMap(s => s.words));
    if (words.length === 0) { alert('테스트할 단어가 없습니다.'); return; }
    // vocab pool: drill 중의는 drill words 자체, 일반은 전체 sets
    setVocabAllWords(isDrill ? wrongDrillWords : allSets.flatMap(s => s.words));
    setVocabWords(words);
    setVocabResults([]);
    setVocabChoices([]); // 이전 선지 초기화
    setPhase('vocab_loading');
    try {
      const res = await fetch('/api/vocab-distractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: words.map(w => ({
            id: w.id, word: w.word, pos_abbr: w.posAbbr,
            // 첫 번째 뜻만 정답으로, 전체 뜻은 banned로 전달
            korean: w.korean.split(/[,，、\/]/)[0].trim(),
            all_korean: w.korean,
            context: w.context || '',
            synonyms: w.synonyms.join(', '),
            antonyms: w.antonyms.join(', '),
          })),
        }),
      });
      const data = await res.json();
      if (data.distractors && data.distractors.length > 0) {
        const allPool = allSets.flatMap(s => s.words);
        const choices = words.map(w => {
          const item = (data.distractors as { id: string; distractors: string[] }[])
            .find(d => d.id === w.id);
          if (item && item.distractors.length >= 3) {
            // 유효한 모든 뜻(콤마 구분)에 해당하는 distractor 제거
            const allMeanings = w.korean.split(/[,，、\/]/).map(s => s.trim().toLowerCase());
            const clean = item.distractors.filter(d => !allMeanings.includes(d.trim().toLowerCase()));
            const firstMeaning = w.korean.split(/[,，、\/]/)[0].trim();
            if (clean.length >= 3) {
              return fisherYates([firstMeaning, ...clean.slice(0, 5)]);
            }
          }
          return buildVocabMCQChoices(w, allPool); // 폴백
        });
        setVocabChoices(choices);
      }
    } catch {
      // 실패 시 기존 클라이언트 생성 폴백 사용
    }
    setPhase('vocab_test');
  };

  const handleVocabDone = async (res: VocabResult[]) => {
    const name = getStudentName();
    const isDrill = selectedSetId === WRONG_DRILL_ID;
    const idsToMark = selectedSetId && !isDrill ? [selectedSetId] : selectedSetIds.filter(id => id !== WRONG_DRILL_ID);
    if (!isDrill) {
      // 시간초과(시간초과) 답안은 오답노트에 저장하지 않음
      for (const r of res.filter(r => !r.correct && r.studentAnswer !== '(시간초과)')) {
        try { await logWrongAnswer(name, r.word.id, 'vocab_writing', r.studentAnswer, r.word.korean); } catch { /* noop */ }
      }
    }
    const correctCount = res.filter(r => r.correct).length;
    const total = res.length;
    try {
      const vocabSetIdsJson = (!isDrill && !selectedSetId) ? JSON.stringify(allSets.map(s => s.id)) : undefined;
      const session = await createTestSession({ student_name: name, set_id: isDrill ? undefined : (selectedSetId || undefined), total_questions: total, test_type: isDrill ? 'vocab_drill' : 'vocab', set_ids_json: vocabSetIdsJson });
      if (session?.id) await completeTestSession(session.id, correctCount);
    } catch (err) { console.error('[handleVocabDone] DB 저장 실패:', err); }
    if (total > 0 && correctCount / total >= 0.9) {
      if (!isDrill && idsToMark.length > 0) {
        setVocabPassedSetIds(prev => new Set([...prev, ...idsToMark]));
        // 자동 완료: 단어뜻 테스트 통과 후 배당 완료 체크 (유반의어도 통과했으면 자동 완료)
        for (const id of idsToMark) {
          autoCompleteAssignmentIfAllPassed(name, id).catch(() => {});
        }
      }
      if (isDrill) {
        const correctWordIds = res.filter(r => r.correct).map(r => r.word.id);
        await handleWrongDrillPass(correctWordIds);
      }
    }
    setVocabResults(res); setPhase('vocab_result');
  };

  const handleSelect = async (choice: string) => {
    if (selected) return;
    const q = questions[currentIdx];
    const isCorrect = choice === q.correct;
    setSelected(choice);
    if (sessionId) { try { await saveTestResult({ session_id: sessionId, word_id: q.word.id, question_type: q.mode, student_answer: choice, correct_answer: q.correct, is_correct: isCorrect }); } catch { /* noop */ } }
    // 드릴 모드에서는 오답 재저장 안함
    const isDrillNow = selectedSetId === WRONG_DRILL_ID;
    if (!isCorrect && !isDrillNow) { const name = getStudentName(); try { await logWrongAnswer(name, q.word.id, q.mode, choice, q.correct); } catch { /* noop */ } }
    setTimeout(async () => {
      const newResults = [...results, { question: q, selected: choice, correct: isCorrect }];
      if (currentIdx + 1 >= questions.length) {
        const c = newResults.filter(r => r.correct).length;
        // DB 완료 기록 (sessionId 있을 때만)
        if (sessionId) {
          try { await completeTestSession(sessionId, c); } catch { /* noop */ }
        }
        // pass 배지 — sessionId 유무와 무관하게 처리 (DB 실패해도 배지는 떠야 함)
        if (c / newResults.length >= 0.9) {
          const idsToMark = selectedSetId && selectedSetId !== WRONG_DRILL_ID
            ? [selectedSetId]
            : selectedSetIds.filter(id => id !== WRONG_DRILL_ID);
          if (idsToMark.length > 0) {
            setSynonymPassedSetIds(prev => new Set([...prev, ...idsToMark]));
            // 자동 완료: 유반의어 테스트 통과 후 배당 완료 체크
            const name3 = getStudentName();
            for (const id of idsToMark) {
              autoCompleteAssignmentIfAllPassed(name3, id).catch(() => {});
            }
          }
          // One More! 드릴: 정답 단어 삭제
          if (!selectedSetId || selectedSetId === WRONG_DRILL_ID) {
            const correctWordIds = newResults.filter(r => r.correct).map(r => r.question.word.id);
            handleWrongDrillPass(correctWordIds).catch(() => {});
          }
        }
        setResults(newResults); setPhase("result");
      } else { setResults(newResults); setCurrentIdx(i => i + 1); setSelected(null); }
    }, isCorrect ? 900 : 1900);
  };

  const handleQuit = () => {
    if (!confirm('정말 종료하시겠습니까?')) return;
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setSelectedSetId(null); setSessionId(null);
    setResults([]); setVocabResults([]); setCurrentIdx(0); setSelected(null);
    loadSets(); loadWrongDrill();
  };

  const handleRestart = () => {
    setSelectedSetId(null); setSessionId(null);
    setResults([]); setVocabResults([]); setCurrentIdx(0); setSelected(null);
    loadSets(); // DB 재조회 → PASS 상태 최신화
    loadWrongDrill(); // 오답 드릴 새로고침
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

  if (phase === "intro") return (
    <>
      <IntroScreen sets={allSets} synonymPassedSetIds={synonymPassedSetIds} vocabPassedSetIds={vocabPassedSetIds}
        wrongDrillWords={wrongDrillWords}
        onStartVocab={handleStartVocab} onStartQuiz={handleStart} onStartGame={handleStartGame} />

      {/* 카드게임 단어 초과 모달 */}
      {showOverflowModal && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center pb-12 px-5 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowOverflowModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
            {/* 헤더 gradient */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-8 pt-8 pb-6 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-[20px] font-black mb-1">카드게임 제한 실시</h3>
              <p className="text-[13px] text-white/80 font-medium">선택한 지문의 단어가 너무 많아요</p>
            </div>
            <div className="px-8 py-6">
              <div className="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200/60">
                <span className="text-3xl font-black text-amber-500">{overflowWordCount}</span>
                <div>
                  <p className="text-[13px] font-black text-foreground">단어</p>
                  <p className="text-[11px] text-accent/70">(최대 <span className="font-black text-foreground">16단어</span>까지 가능)</p>
                </div>
              </div>
              <p className="text-[13px] text-accent/80 leading-relaxed mb-6">
                지문을 <span className="font-black text-foreground">하나씩 선택</span>하거나, 
                유반의어 카드게임 대신
                <span className="font-black text-foreground"> 객관식 테스트</span>를
                이용해주세요.
              </p>
              <button
                onClick={() => setShowOverflowModal(false)}
                className="w-full h-14 rounded-2xl bg-foreground text-background font-black text-[15px] hover:-translate-y-0.5 active:scale-95 transition-all shadow-lg"
              >
                다시 선택하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  if (phase === "vocab_loading") return (
    <div className="flex flex-col h-full items-center justify-center gap-4 px-6">
      <div className="w-16 h-16 rounded-[1.5rem] bg-teal-50 flex items-center justify-center">
        <Sparkles size={26} className="text-teal-600 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-black text-foreground">선지 생성 중...</p>
        <p className="text-[12px] text-accent mt-1">AI가 3계층 오답 구조를 설계하고 있어요</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
  if (phase === "vocab_test") return <VocabMCQTest words={vocabWords} allWords={vocabAllWords} preloadedChoices={vocabChoices.length > 0 ? vocabChoices : undefined} onDone={handleVocabDone} onExit={() => setPhase("intro")} />;
  if (phase === "vocab_result") return <VocabResultScreen results={vocabResults}
    onRestart={() => handleStartVocab(selectedSetId === WRONG_DRILL_ID ? [WRONG_DRILL_ID] : selectedSetId ? [selectedSetId] : null)}
    onExit={() => { setSelectedSetId(null); loadSets(); loadWrongDrill(); }} />;
  if (phase === "game") return <GameMode words={gameWords} onExit={() => setPhase("intro")} onGamePass={handleGamePass} />;
  if (phase === "result") return <ResultScreen results={results}
    onRestart={() => handleStart(selectedSetId === WRONG_DRILL_ID ? [WRONG_DRILL_ID] : selectedSetId ? [selectedSetId] : null)}
    onExit={() => { setSelectedSetId(null); loadSets(); loadWrongDrill(); }} />;

  // ─── 객관식 퀴즈 화면 ─────────────────────────────────────────────────────
  const q = questions[currentIdx];
  const isSynonym = q.mode === "synonym";
  const modeLabel = isSynonym ? "유의어를 골라봐" : "반의어를 골라봐";
  const wordSet = allSets.find(s => s.words.some(w => w.id === q.word.id));
  const setInfo = wordSet ? [wordSet.chapter, wordSet.passageNumber].filter(Boolean).join(' · ') : '';

  return (
    <div className="flex flex-col overflow-y-auto custom-scrollbar px-5 py-5 pb-28">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-accent">{currentIdx + 1} / {questions.length}</span>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[12px] ${quizTimeLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : quizTimeLeft <= 30 ? 'bg-amber-400 text-white' : 'bg-foreground/5 text-accent'}`}>
            <Timer size={12} />{quizTimeLeft}s
          </div>
          <span className="text-[12px] font-bold text-emerald-500">{results.filter(r => r.correct).length}정답</span>
          <button onClick={handleQuit} className="flex items-center gap-1.5 text-[11px] font-black text-accent hover:text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-foreground/10 transition-all">
            <LogOut size={12} /> 나가기
          </button>
        </div>
      </div>
      <div className={`h-[3px] rounded-full mb-1.5 overflow-hidden ${isSynonym ? 'bg-blue-100' : 'bg-rose-100'}`}>
        <div className={`h-full rounded-full transition-all ${isSynonym ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="h-[3px] bg-foreground/5 rounded-full mb-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${quizTimeLeft <= 10 ? 'bg-rose-500' : quizTimeLeft <= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${(quizTimeLeft / quizTotalTime) * 100}%` }} />
      </div>
      {/* 단어 카드 — 축소 버전 */}
      <div className={`rounded-[2rem] border p-5 mb-4 text-center shadow-xl shrink-0 ${isSynonym ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'}`}>
        {setInfo && <p className="text-[8px] font-black text-accent/40 uppercase tracking-[3px] mb-1.5">{setInfo}</p>}
        <p className={`text-[10px] font-black uppercase tracking-[3px] mb-2.5 ${isSynonym ? 'text-blue-600' : 'text-rose-500'}`}>{modeLabel}</p>
        <h2 className={`serif font-bold text-foreground mb-1.5 ${q.word.word.length >= 13 ? 'text-[28px]' : 'text-[34px]'}`}>{q.word.word}</h2>
        <p className="text-[11px] text-accent font-black tracking-widest">{q.word.posAbbr}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {q.choices.map((choice, ci) => {
          const isChosen = selected === choice;
          const isCorrectChoice = choice === q.correct;
          let style = "border-foreground/10 bg-white text-foreground hover:border-foreground/30 hover:shadow-md";
          if (selected) {
            if (isCorrectChoice) style = "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-lg font-black";
            else if (isChosen) style = "border-rose-400 bg-rose-50 text-rose-600";
            else style = "border-foreground/5 text-accent/40";
          }
          return (
            <button key={ci} onClick={() => handleSelect(choice)} disabled={!!selected}
              className={`py-3 px-3 rounded-2xl border-2 font-bold text-[13px] text-center transition-all hover:-translate-y-0.5 active:scale-95 ${style}`}>
              {choice}
            </button>
          );
        })}
      </div>
      {/* 정답/오답 피드백 — 반의어 오답 시 상세 설명 */}
      {selected && (
        <div className={`mt-3 rounded-2xl px-4 py-3 border-2 text-[12px] animate-in fade-in duration-200 ${
          selected === q.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {selected === q.correct ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} strokeWidth={2.5} />
              <span className="font-black">정답! 역시 알고 있었어 👍</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <XCircle size={14} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                <p className="font-bold leading-snug">
                  <span className="font-black">'{selected}'</span>은(는) 오답이에요.
                </p>
              </div>
              <p className="text-[11px] font-bold pl-5 leading-relaxed">
                <span className="font-black text-foreground">{q.word.word}</span>의 {isSynonym ? '유의어' : '반의어'}는
                <span className="font-black text-emerald-700"> '{q.correct}'</span>입니다.
              </p>
              {!isSynonym && q.word.context && (
                <p className="text-[10px] text-accent/70 pl-5 italic leading-relaxed">"{q.word.context}"</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
