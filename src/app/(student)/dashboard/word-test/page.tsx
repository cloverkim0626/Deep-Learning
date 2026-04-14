"use client";

import { useState } from "react";
import { ChevronRight, CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";

type TestWord = {
  word: string; posAbbr: string; korean: string;
  synonyms: string[]; antonyms: string[];
};

const TEST_WORDS: TestWord[] = [
  { word: "counterproductive", posAbbr: "adj.", korean: "역효과를 내는", synonyms: ["self-defeating", "unproductive", "harmful"], antonyms: ["productive", "beneficial", "effective"] },
  { word: "ingestion", posAbbr: "n.", korean: "섭취", synonyms: ["consumption", "intake"], antonyms: ["excretion", "expulsion"] },
  { word: "resilience", posAbbr: "n.", korean: "회복 탄력성", synonyms: ["flexibility", "toughness"], antonyms: ["vulnerability", "fragility"] },
  { word: "negligible", posAbbr: "adj.", korean: "무시할 수 있는", synonyms: ["insignificant", "trivial"], antonyms: ["significant", "considerable"] },
  { word: "illusion", posAbbr: "n.", korean: "착각, 환상", synonyms: ["delusion", "misconception"], antonyms: ["reality", "truth"] },
];

type QuestionMode = "synonym" | "antonym";
type Question = {
  word: TestWord;
  mode: QuestionMode;
  correct: string;
  choices: string[];
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestions(): Question[] {
  const questions: Question[] = [];
  TEST_WORDS.forEach(word => {
    (["synonym", "antonym"] as QuestionMode[]).forEach(mode => {
      const pool = mode === "synonym" ? word.synonyms : word.antonyms;
      const correct = pool[0];
      // Gather distractors from other words
      const distractors = TEST_WORDS.flatMap(w => mode === "synonym" ? w.synonyms : w.antonyms)
        .filter(w => !pool.includes(w));
      const choices = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
      questions.push({ word, mode, correct, choices });
    });
  });
  return shuffle(questions).slice(0, 8); // 8 questions per session
}

type ResultEntry = { question: Question; selected: string; correct: boolean };

export default function SynonymTestPage() {
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [questions] = useState<Question[]>(buildQuestions());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);

  const q = questions[currentIdx];
  const isCorrect = selected === q?.correct;

  const handleSelect = (choice: string) => {
    if (selected) return;
    setSelected(choice);
    setTimeout(() => {
      setResults(prev => [...prev, { question: q, selected: choice, correct: choice === q.correct }]);
      if (currentIdx + 1 >= questions.length) {
        setPhase("result");
      } else {
        setCurrentIdx(i => i + 1);
        setSelected(null);
      }
    }, 900);
  };

  const restart = () => {
    setPhase("intro");
    setCurrentIdx(0);
    setSelected(null);
    setResults([]);
  };

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-7 pb-20">
        <div className="w-16 h-16 rounded-[1.3rem] bg-foreground text-background flex items-center justify-center shadow-xl">
          <Trophy size={26} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl text-foreground serif mb-2">유반의어 테스트</h1>
          <p className="text-[13px] text-accent font-medium leading-relaxed">
            각 단어의 유의어 또는 반의어를 골라봐.<br />8문항 · 자동 채점 · 오답 기록
          </p>
        </div>
        <button onClick={() => setPhase("test")}
          className="h-14 px-10 bg-foreground text-background font-medium rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all">
          테스트 시작 <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  if (phase === "result") {
    const score = results.filter(r => r.correct).length;
    const pct = Math.round((score / results.length) * 100);
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-6 py-10 pb-24">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center shadow-xl mx-auto mb-4">
            <span className="text-3xl font-black">{pct}</span>
          </div>
          <h2 className="text-2xl text-foreground serif">테스트 완료</h2>
          <p className="text-[13px] text-accent mt-1 font-medium">{score}/{results.length}개 정답 · {pct >= 80 ? "아주 잘했어 👍" : pct >= 50 ? "오답을 다시 확인해봐" : "오답 위주로 집중 복습이 필요해"}</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {results.map((r, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${r.correct ? "border-success/15 bg-success/5" : "border-error/15 bg-error/5"}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {r.correct ? <CheckCircle size={15} className="text-success shrink-0" /> : <XCircle size={15} className="text-error shrink-0" />}
                  <span className="text-[13px] font-bold text-foreground">{r.question.word.word}</span>
                  <span className="text-[10px] text-accent">{r.question.mode === "synonym" ? "유의어" : "반의어"}</span>
                </div>
              </div>
              {!r.correct && (
                <div className="text-[12px] text-foreground font-medium leading-relaxed">
                  <span className="text-error">내 답: {r.selected}</span>
                  <span className="mx-2 text-accent">→</span>
                  <span className="text-success font-bold">정답: {r.question.correct}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={restart}
          className="w-full h-13 bg-foreground text-background font-bold rounded-2xl flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-all shadow" style={{ height: "52px" }}>
          <RotateCcw size={16} strokeWidth={2} /> 다시 풀기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-8 pb-24">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-accent">{currentIdx + 1} / {questions.length}</span>
        <span className="text-[12px] font-bold text-success">{results.filter(r => r.correct).length}정답</span>
      </div>
      <div className="h-[3px] bg-accent-light rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="glass framer-card rounded-[2rem] border border-foreground/5 p-8 mb-6 text-center">
        <p className="text-[11px] font-bold text-accent uppercase tracking-widest mb-3">
          {q.mode === "synonym" ? "유의어를 골라봐" : "반의어를 골라봐"}
        </p>
        <h2 className="text-4xl text-foreground serif mb-2">{q.word.word}</h2>
        <p className="text-[13px] text-accent font-medium">{q.word.posAbbr} {q.word.korean}</p>
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
            else style = "bg-background border-foreground/5 text-foreground/40";
          }
          return (
            <button key={idx} onClick={() => handleSelect(choice)} disabled={!!selected}
              className={`w-full h-14 px-6 rounded-2xl border text-[14px] font-medium text-left flex items-center gap-4 transition-all ${style}`}>
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-black shrink-0 opacity-50">
                {["A","B","C","D"][idx]}
              </span>
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
