"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw,
  BookOpen, Sparkles, AlertCircle, LogOut
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
  isKey?: boolean;
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
 * Build questions:
 * - 목표 문제수 = 단어 수 * 1.5 (반올림)
 * - is_key 단어: 유의어 + 반의어 모두 출제
 * - 일반 단어: 유의어/반의어 중 pool이 더 풍부한 것 하나만 출제
 * - 랜덤 샘플링으로 목표 수에 맞춤
 */
function buildQuestions(words: TestWord[]): Question[] {
  const allSynonyms = words.flatMap(w => w.synonyms);
  const allAntonyms = words.flatMap(w => w.antonyms);
  const target = Math.round(words.length * 1.5);

  const pool: Question[] = [];

  words.forEach(word => {
    const modes: QuestionMode[] = word.isKey ? ["synonym", "antonym"] : (
      word.synonyms.length >= word.antonyms.length ? ["synonym"] : ["antonym"]
    );

    modes.forEach(mode => {
      const wordPool = mode === "synonym" ? word.synonyms : word.antonyms;
      if (wordPool.length === 0) return;

      const correct = wordPool[0]; // use first as correct answer
      const allPool = mode === "synonym" ? allSynonyms : allAntonyms;
      const distractors = allPool.filter(w => !wordPool.includes(w) && w !== correct);
      if (distractors.length < 3) return;
      const choices = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
      pool.push({ word, mode, correct, choices });
    });
  });

  if (pool.length === 0) return [];

  // If we have enough questions, sample to target; otherwise use all
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(target, shuffled.length));
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({ sets, onStart }: {
  sets: { id: string; label: string; workbook: string; chapter: string; words: TestWord[] }[];
  onStart: (selectedSetId: string | null) => void
}) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const selected = sets.find(s => s.id === selectedSetId);
  const wordCount = selected ? selected.words.length : sets.reduce((a, s) => a + s.words.length, 0);
  const estQCount = Math.round(wordCount * 1.5);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6 pb-20">
      <div className="w-16 h-16 rounded-[1.3rem] bg-foreground text-background flex items-center justify-center shadow-xl">
        <Trophy size={26} strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-2xl text-foreground serif mb-2">유반의어 테스트</h1>
        <p className="text-[13px] text-accent font-medium leading-relaxed">
          각 단어의 유의어 또는 반의어를 골라봐.<br />단어 수의 1.5배 문제 · 핵심 단어는 유+반 모두 출제
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
            전체 배당 세트 ({sets.reduce((a, s) => a + s.words.length, 0)}단어 · 약 {Math.round(sets.reduce((a, s) => a + s.words.length, 0) * 1.5)}문제)
          </div>
        </button>
        {sets.map(s => (
          <button key={s.id} onClick={() => setSelectedSetId(s.id)}
            className={`w-full px-5 py-3.5 rounded-2xl border text-[13px] font-bold text-left transition-all ${selectedSetId === s.id ? 'bg-foreground text-background border-foreground shadow-lg' : 'bg-background border-foreground/10 hover:border-foreground/30'}`}>
            <div className="flex items-center gap-2">
              <BookOpen size={14} className={selectedSetId === s.id ? 'text-background' : 'text-accent'} />
              <span className="truncate">{s.label}</span>
            </div>
            <div className={`text-[10px] mt-0.5 ${selectedSetId === s.id ? 'opacity-60' : 'text-accent'}`}>
              {s.workbook} · {s.chapter} · {s.words.length}단어 · 약 {Math.round(s.words.length * 1.5)}문제
            </div>
          </button>
        ))}
      </div>

      {wordCount === 0 ? (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-[13px] font-bold">
          <AlertCircle size={15} /> 배당된 세트에 유반의어 정보가 없습니다.
        </div>
      ) : (
        <div className="text-center">
          <p className="text-[12px] text-accent font-bold mb-3">예상 문제 수: <span className="text-foreground font-black">{estQCount}문제</span></p>
          <button
            onClick={() => onStart(selectedSetId)}
            className="h-14 px-10 bg-foreground text-background font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            테스트 시작 <ChevronRight size={18} strokeWidth={1.5} />
          </button>
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
              <div key={i} className="p-4 rounded-2xl border border-error/15 bg-error/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <XCircle size={14} className="text-error shrink-0" />
                  <span className="text-[13px] font-bold text-foreground">{r.question.word.word}</span>
                  <span className="text-[10px] text-accent bg-accent-light px-2 py-0.5 rounded-lg">{r.question.mode === "synonym" ? "유의어" : "반의어"}</span>
                </div>
                <div className="text-[12px] leading-relaxed pl-5">
                  <span className="text-error">내 답: {r.selected}</span>
                  <span className="mx-2 text-accent">→</span>
                  <span className="text-success font-bold">정답: {r.question.correct}</span>
                </div>
                {r.question.word.context && (
                  <div className="mt-2 pl-5 text-[11px] text-accent/70 italic border-l-2 border-foreground/10 pl-3">
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
                <span className="text-[10px] text-accent">{r.question.mode === "synonym" ? "유의어" : "반의어"}</span>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WordTestPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "intro" | "test" | "result">("loading");
  const [allSets, setAllSets] = useState<{ id: string; label: string; workbook: string; chapter: string; words: TestWord[] }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

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
          words?: {
            id: string; word: string; pos_abbr: string; korean: string;
            context?: string; context_korean?: string;
            synonyms: string | string[]; antonyms: string | string[];
            is_key?: boolean;
          }[]
        }) => ({
          id: s.id,
          workbook: s.workbook || '배당 교재',
          chapter: s.chapter || '',
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
            isKey: !!w.is_key,
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
      alert('출제 가능한 문항이 없습니다. 유의어/반의어 정보를 먼저 입력해주세요.');
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

  if (phase === "intro") return <IntroScreen sets={allSets} onStart={handleStart} />;
  if (phase === "result") return <ResultScreen results={results} onRestart={handleRestart} />;

  // ─── Test Phase ──────────────────────────────────────────────────────────────
  const q = questions[currentIdx];
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
      <div className="h-[3px] bg-accent-light rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      {/* Question Card */}
      <div className="glass rounded-[2rem] border border-foreground/5 p-7 mb-5 text-center">
        <p className="text-[11px] font-bold text-accent uppercase tracking-widest mb-3">
          {q.mode === "synonym" ? "유의어를 골라봐" : "반의어를 골라봐"}
          {q.word.isKey && <span className="ml-2 text-amber-500">⭐ 핵심 단어</span>}
        </p>
        <h2 className="text-4xl text-foreground serif mb-1">{q.word.word}</h2>
        <p className="text-[13px] text-accent font-medium">{q.word.posAbbr}  {q.word.korean}</p>
        {q.word.context && (
          <div className="mt-4 px-4 py-3 bg-accent-light/60 rounded-2xl text-left">
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
