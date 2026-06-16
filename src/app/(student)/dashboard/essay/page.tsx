"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllPassagesForEssay, getEssayPromptTemplates } from "@/lib/database-service";
import {
  ChevronDown, Send, Loader2, RotateCcw, BookOpen,
  Sparkles, Copy, Check, ChevronRight, ArrowLeft,
  FileText, X, CheckCircle, AlertCircle,
} from "lucide-react";

// ── 타입 ─────────────────────────────────────────────────────────────────────
type Passage = {
  id: string; label: string;
  workbook: string | null; chapter: string | null;
  sub_sub_category: string | null; passage_number: string | null;
  essay_sentences: { idx: number; text: string; korean: string }[];
  full_text: string | null;
};
type Template = {
  type_key: string; display_name: string;
  question_prompt: string; scoring_prompt: string; is_active: boolean;
};
type GeneratedQ = {
  question_type: "배열" | "빈칸" | "서술형";
  question_text: string;
  selected_sentence: { idx: number; text: string; korean: string } | null;
  // 배열형
  chunks?: string[]; correct_order?: string; correct_sentence?: string;
  conditions?: string[]; difficulty?: string; grammar_point?: string;
  // 배열형 신규 — 지문 전체 + 힌트 전용 한글
  passage_with_blank?: string;
  blank_position_sentence?: string;
  blank_position_sentence_korean?: string;  // 힌트보기 전용
  selected_fragment?: string;
  // 빈칸형
  correct_answer?: string; total_words?: number;
  given_words?: string[]; given_words_display?: string; given_words_count?: number;
  find_words?: { word_in_answer: string; source_in_passage: string; form_change_needed: boolean; explanation: string }[];
  find_words_count?: number; multi_word_notes?: string[];

};
type ScoreResult = {
  question_type: "배열" | "빈칸" | "서술형";
  score: number | null; score_max: number; feedback: string;
  // 배열형
  score_reason?: string;
  condition_results?: { condition: string; met: boolean; detail: string }[];
  position_analysis?: { position: number; correct: string; student: string; match: boolean }[];
  correct_positions?: string; correct_sentence?: string; student_sentence?: string;
  study_tip?: string; format_valid?: boolean;
  // 빈칸형
  condition_check?: {
    all_given_words_present: boolean; given_words_unchanged: boolean;
    each_used_once: boolean; word_count_correct: boolean;
    student_word_count: number; required_word_count: number;
    auto_zero: boolean; auto_zero_reason?: string;
  };
  given_words_analysis?: { word: string; found_in_answer: boolean; form_preserved: boolean }[];
  find_words_analysis?: { expected: string; student_wrote: string; correct: boolean; detail: string }[];
  grammar_check?: { grammatically_correct: boolean; contextually_appropriate: boolean; word_order_correct: boolean };
  correct_answer?: string;
};
type Stage = "select-passage" | "select-type" | "generating" | "answering" | "scoring" | "result";

// 최근 경로 타입 (파일 저장 여부 체크후 적용)
type SavedPath = { workbook: string; mid: string; sub: string };

// ── BaeyolAnswering 컴포넌트 ──────────────────────────────────────────────────
// 지문 전체 표시 + 배열 대상 문장은 밑줄로 강조
function BaeyolAnswering({
  q, arr, shuf, cMap, allPlaced,
  activeQIdx, questions, allAnswered, selectedTemplate, fullText,
  onPlace, onRemove, onNext, onSubmit, studentOrder, getLabel,
}: {
  q: GeneratedQ;
  arr: string[]; shuf: string[];
  cMap: Record<string, string>;
  allPlaced: boolean;
  activeQIdx: number; questions: GeneratedQ[];
  allAnswered: boolean;
  selectedTemplate: Template | null;
  fullText: string;
  onPlace: (label: string) => void;
  onRemove: (pos: number) => void;
  onNext: () => void; onSubmit: () => void;
  studentOrder: string;
  getLabel: (chunk: string) => string;
}) {
  const [hintVisible, setHintVisible] = useState(false);
  const targetSentence = q.blank_position_sentence ?? q.selected_sentence?.text ?? "";

  // 지문에서 대상 문장을 찾아 공란으로 대체 — 시험지 형식
  const BlankSpan = () => (
    <span
      style={{
        display: 'inline-block',
        width: '50%',
        borderBottom: '2px solid #38bdf8',  // sky-400
        verticalAlign: 'bottom',
        marginBottom: '2px',
        marginLeft: '2px',
        marginRight: '2px',
      }}
      title="이 문장을 아래 단어 목록으로 완성하세요"
    />
  );

  const renderPassageWithBlank = () => {
    const baseStyle = "text-[13px] text-gray-900 leading-[1.9] whitespace-pre-wrap font-serif";
    if (!fullText || !targetSentence) {
      return <p className={baseStyle}>{fullText || targetSentence}</p>;
    }
    const idx = fullText.indexOf(targetSentence);
    if (idx === -1) {
      // fallback: 전체 지문 표시 + 아래에 공란 별도 표시
      return (
        <>
          <p className={baseStyle}>{fullText}</p>
          <p className="mt-3 text-[13px] leading-[1.9] font-serif">
            <BlankSpan />
          </p>
        </>
      );
    }
    const before = fullText.slice(0, idx);
    const after  = fullText.slice(idx + targetSentence.length);
    return (
      <p className={baseStyle}>
        {before}
        <BlankSpan />
        {after}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── 문제 지시문 */}
      <div className="px-4 py-3 rounded-2xl border border-foreground/10 bg-white/60">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedTemplate?.display_name}</p>
          {q.difficulty && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{q.difficulty}</span>}
        </div>
        <p className="text-[13px] font-bold text-foreground leading-relaxed">{q.question_text}</p>
      </div>

      {/* ── 지문 전체 (시험지 스타일: 흰 배경, 검정 글씨, 대상 문장 공란) */}
      <div className="rounded-2xl border border-gray-300 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">지문</p>
          {q.blank_position_sentence_korean && (
            <button
              onClick={() => setHintVisible(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                hintVisible
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600"
              }`}
            >
              💡 힌트보기
            </button>
          )}
        </div>

        {hintVisible && q.blank_position_sentence_korean && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-amber-50/80 border border-amber-100">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">밑줄 문장 한글 해석</p>
            <p className="text-[12px] text-amber-800 leading-relaxed font-medium">{q.blank_position_sentence_korean}</p>
          </div>
        )}

        <div className="px-5 pt-4 pb-5">
          {renderPassageWithBlank()}
        </div>
      </div>

      {/* ── 배열 영역 */}
      <div>
        <p className="text-[10px] font-black text-accent/35 uppercase tracking-widest mb-2">내 배열</p>

        <div className="min-h-[52px] px-4 py-3 rounded-2xl border-2 border-dashed border-indigo-200/60 bg-indigo-50/20 flex flex-wrap gap-x-1 gap-y-1.5 items-center mb-1">
          {arr.length === 0
            ? <p className="text-[12px] text-accent/25 font-medium w-full text-center py-1">아래 단어를 순서대로 클릭하여 문장을 완성하세요</p>
            : arr.map((label, pi) => {
                const rawChunk = cMap[label] ?? label;
                const wordText = rawChunk.replace(/^\([A-Z]\)\s*/, "");
                return (
                  <button key={`${label}-${pi}`} onClick={() => onRemove(pi)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-[13px] font-semibold text-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
                    <span>{wordText}</span>
                    <X size={9} className="text-foreground/20 group-hover:text-red-400 transition-colors" />
                  </button>
                );
              })
          }
        </div>

        <p className="text-[10px] font-mono text-accent/35 text-center mb-4 tracking-wider">
          {arr.length > 0 ? studentOrder : "\u00A0"}
        </p>

        <p className="text-[10px] font-black text-accent/35 uppercase tracking-widest mb-2">단어 목록</p>
        <div className="flex flex-wrap gap-2">
          {shuf.map(chunk => {
            const label = getLabel(chunk);
            const text = chunk.replace(/^\([A-Z]\)\s*/, "");
            const isPlaced = arr.includes(label);
            return (
              <button key={label}
                onClick={() => !isPlaced && onPlace(label)}
                disabled={isPlaced}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  isPlaced
                    ? "bg-foreground/5 text-foreground/20 cursor-not-allowed border border-transparent line-through"
                    : "bg-white border border-foreground/12 text-foreground hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-95"
                }`}>
                <span className={`text-[9px] font-black w-3 ${isPlaced ? "text-foreground/15" : "text-indigo-300"}`}>
                  {label.replace(/[()]/g, "")}
                </span>
                <span>{text}</span>
              </button>
            );
          })}
          {shuf.length > 0 && arr.length === shuf.length && (
            <p className="text-[11px] text-indigo-400 font-medium w-full text-center mt-1">✓ 모든 단어 배열 완료 — 위에서 클릭하면 제거</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {activeQIdx < questions.length - 1 && allPlaced && (
            <button onClick={onNext}
              className="flex-1 h-11 rounded-2xl border border-indigo-200 text-indigo-600 font-black text-[13px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5">
              다음 문제 <ChevronRight size={13} />
            </button>
          )}
          {allAnswered && (
            <button onClick={onSubmit}
              className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-black text-[13px] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all">
              <Send size={14} /> 전체 채점 ({questions.length}문제)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function EssayPage() {
  const [passages,    setPassages]    = useState<Passage[]>([]);
  const [templates,   setTemplates]   = useState<Template[]>([]);
  const [loading,     setLoading]     = useState(true);

  // 필터
  const [filterWorkbook, setFilterWorkbook] = useState("전체");
  const [filterMid,      setFilterMid]      = useState("전체");
  const [filterSub,      setFilterSub]      = useState("전체");

  // 선택
  const [selectedPassage,  setSelectedPassage]  = useState<Passage | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // 다중 문제 상태
  const [questionCount, setQuestionCount] = useState<1 | 2 | 3>(1);
  const [questions,     setQuestions]     = useState<GeneratedQ[]>([]);
  const [answers,       setAnswers]       = useState<string[]>([]);        // 빈칸/서술형 답안
  const [arrangedAll,   setArrangedAll]   = useState<string[][]>([]);      // 배열형: 질문별 배열 순서
  const [shuffledAll,   setShuffledAll]   = useState<string[][]>([]);      // 배열형: 질문별 남은 청크
  const [activeQIdx,    setActiveQIdx]    = useState(0);
  const [genProgress,   setGenProgress]   = useState(0);                   // 현재 생성 중인 문제 번호 (0-based)
  const [results,       setResults]       = useState<ScoreResult[]>([]);
  const [stage,         setStage]         = useState<Stage>("select-passage");
  const [copied,        setCopied]        = useState<number | null>(null);
  const [filterOpen,    setFilterOpen]    = useState(false); // 처음엔 접힌 상태
  // 최근/고정 경로
  const [savedPath, setSavedPath] = useState<SavedPath | null>(null);

  // ── 초기화 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, t] = await Promise.all([getAllPassagesForEssay(), getEssayPromptTemplates()]);
        setPassages(p as Passage[]);
        setTemplates((t as Template[]).filter(x => x.is_active && x.question_prompt));
      } finally { setLoading(false); }
    })();
    // 최근 경로 복원
    try {
      const saved = localStorage.getItem('essay_last_path');
      if (saved) {
        const pt = JSON.parse(saved) as SavedPath;
        setSavedPath(pt);
        if (pt.workbook) setFilterWorkbook(pt.workbook);
        if (pt.mid) setFilterMid(pt.mid);
        if (pt.sub) setFilterSub(pt.sub);
      }
    } catch { /* noop */ }
  }, []);

  // ── 필터 ───────────────────────────────────────────────────────────────────
  const workbooks = useMemo(() =>
    ["전체", ...Array.from(new Set(passages.map(p => p.workbook || "미분류")))], [passages]);
  const mids = useMemo(() => {
    const base = passages.filter(p => filterWorkbook === "전체" || p.workbook === filterWorkbook);
    return ["전체", ...Array.from(new Set(base.map(p => p.chapter || "미분류")))];
  }, [passages, filterWorkbook]);
  const subs = useMemo(() => {
    const base = passages.filter(p =>
      (filterWorkbook === "전체" || p.workbook === filterWorkbook) &&
      (filterMid === "전체" || p.chapter === filterMid));
    return ["전체", ...Array.from(new Set(base.map(p => p.sub_sub_category || "미분류")))];
  }, [passages, filterWorkbook, filterMid]);
  const filtered = useMemo(() => {
    const base = passages.filter(p =>
      (filterWorkbook === "전체" || p.workbook === filterWorkbook) &&
      (filterMid === "전체" || p.chapter === filterMid) &&
      (filterSub === "전체" || p.sub_sub_category === filterSub)
    );
    return [...base].sort((a, b) => {
      const na = parseInt(a.passage_number || '0', 10) || 0;
      const nb = parseInt(b.passage_number || '0', 10) || 0;
      return na - nb;
    });
  }, [passages, filterWorkbook, filterMid, filterSub]);


  // ── 배열형 헬퍼 ────────────────────────────────────────────────────────────
  const getLabel = (chunk: string) => chunk.match(/^\([A-Z]\)/)?.[0] ?? chunk;

  const chunkMapFor = (qIdx: number) => {
    const m: Record<string, string> = {};
    (questions[qIdx]?.chunks ?? []).forEach(c => { m[getLabel(c)] = c; });
    return m;
  };

  const studentOrderFor = (qIdx: number) => (arrangedAll[qIdx] ?? []).join("-");

  // ── 답안 완성 여부 ─────────────────────────────────────────────────────────
  const isAnswered = (qIdx: number): boolean => {
    const q = questions[qIdx];
    if (!q) return false;
    if (q.question_type === "배열")
      return (arrangedAll[qIdx] ?? []).length === (q.chunks?.length ?? 0);
    return (answers[qIdx] ?? "").trim().length > 0;
  };
  const allAnswered = questions.length > 0 && questions.every((_, i) => isAnswered(i));

  // ── fragment 추출 (비중복용) ────────────────────────────────────────────────
  // 반드시 '전체 문장' 기준으로 exclusion 해야 함.
  // correct_answer(빈칸형)은 정답 어구(짧은 조각)이므로 우선순위 낮춤.
  // selected_sentence.text → correct_sentence → correct_answer 순서.
  const extractFragment = (q: GeneratedQ): string =>
    q.selected_sentence?.text   // 전체 원문 문장 (최우선)
    ?? q.correct_sentence        // 배열형 전체 문장
    ?? q.correct_answer          // 빈칸형 정답 어구 (fallback only)
    ?? "";

  // ── Fisher-Yates shuffle ────────────────────────────────────────────────────
  const shuffleArr = <T,>(arr: T[]): T[] => {
    const sh = [...arr];
    for (let i = sh.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sh[i], sh[j]] = [sh[j], sh[i]];
    }
    return sh;
  };

  // ── Collocation 그룹핑 (20단어 초과 시 적용) ────────────────────────────────
  // 4가지 명확한 패턴만 엄격하게 적용 (이상한 묶음 방지)
  type TokenList = { id: number; text: string }[];

  const groupCollocations = (tokens: TokenList): string[] => {
    const n = tokens.length;
    const lo = (i: number) => tokens[i]?.text?.toLowerCase().replace(/[,.:;!?'"()]/g, '') ?? '';


    // ── 패턴 매처 ─────────────────────────────────────────────────────────────
    const matchAt = (i: number): number => {

      // ── 패턴 1: 고정 3단어 전치사구/접속사구 ─────────────────────────────
      if (i + 2 < n) {
        const tri = `${lo(i)} ${lo(i+1)} ${lo(i+2)}`;
        const FIXED3 = [
          'in spite of','in terms of','in order to','in addition to',
          'as a result','as a whole','as well as','as long as','as far as',
          'in the case','on the other','with respect to','in relation to',
          'in the form','in the face','on the basis','at the same',
          'in other words','on the contrary','on the one','for the sake',
          'in front of','at the end','at the beginning','as a consequence',
        ];
        if (FIXED3.some(p => tri.startsWith(p))) return 3;
      }

      // ── 패턴 2: 고정 2단어 접속사/부사구 (엄격히 명시된 것만) ─────────────
      if (i + 1 < n) {
        const bi = `${lo(i)} ${lo(i+1)}`;
        const FIXED2 = [
          // 접속사구
          'even though','even if','as if','as though','so that',
          'in order','rather than','such as','not only','not just',
          'for example','for instance','that is','in fact','in addition',
          'in contrast','by contrast','in conclusion','to conclude',
          'however ,','therefore ,','moreover ,','furthermore ,',
          // 관계절
          'in which','of which','to which','by which','from which','through which',
          'which is','which are','which was','which were',
          'who is','who are','who was','who were',
        ];
        if (FIXED2.includes(bi)) return 2;

        // ── 패턴 3: be동사 + 과거분사 (is/are/was/were/been + -ed/-en/-wn 등) ─
        const BE = ['is','are','was','were','been','be'];
        const isPP = (w: string) => /(?:ed|en|wn|nt|lt|pt|ft|ld|nd|rd|st|ct|xt|rn|ven|ten|sen|zen|own|awn|oken|aken|arisen|fallen|driven|given|risen|written|beaten|hidden|chosen|frozen|spoken|stolen|taken|broken|woven|gotten)$/i.test(w);
        if (BE.includes(lo(i)) && i+1 < n && isPP(lo(i+1))) return 2;

        // ── 패턴 4: 관사 + 형용사(목록) + 명사어미 — 3단어 ─────────────────
        const ARTICLES = ['the','a','an','this','that','these','those'];
        const ADJ_LIST = new Set([
          'important','significant','critical','major','minor','key','main','primary',
          'central','essential','fundamental','basic','common','general','specific',
          'particular','different','various','social','political','economic','cultural',
          'historical','natural','physical','mental','moral','ethical','human',
          'individual','global','local','national','international','modern','traditional',
          'democratic','scientific','technological','environmental','educational',
          'intellectual','psychological','emotional','spiritual','practical','theoretical',
          'new','old','great','large','small','high','low','long','short','strong',
          'real','true','false','first','last','only','same','most','many','other',
          'such','certain','complex','simple','direct','indirect','formal','informal',
          'positive','negative','active','passive','public','private','free','open',
          'whole','full','total','complete','necessary','possible','clear','deep',
        ]);
        const NOUN_SUFFIX = /(?:tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ist|age|ure|ture|ure|ing|ings|ers|ors|ants|ents|ees|ies)$/i;

        if (ARTICLES.includes(lo(i)) && i+2 < n) {
          // 관사 + 형용사 + 명사어미
          if (ADJ_LIST.has(lo(i+1)) && NOUN_SUFFIX.test(lo(i+2))) return 3;
        }

        // ── 패턴 4b: 관사 + 명사어미 단어 — 2단어 ───────────────────────────
        if (ARTICLES.includes(lo(i)) && i+1 < n && NOUN_SUFFIX.test(lo(i+1))) return 2;
      }

      return 0;
    };

    // ── PASS 1: greedy 스캔 ───────────────────────────────────────────────────
    const chunks: string[] = [];
    let i = 0;
    while (i < n) {
      const len = matchAt(i);
      if (len >= 2) {
        chunks.push(tokens.slice(i, i + len).map(t => t.text).join(' '));
        i += len;

      } else {
        chunks.push(tokens[i].text);
        i++;
      }
    }

    // ── PASS 2: 21 초과 시 인접 단일 토큰 강제 병합 ───────────────────────────
    while (chunks.length > 21) {
      let merged = false;
      for (let j = 0; j < chunks.length - 1 && chunks.length > 21; j++) {
        if (!chunks[j].includes(' ') && !chunks[j+1].includes(' ')) {
          chunks.splice(j, 2, `${chunks[j]} ${chunks[j+1]}`);
          merged = true;
        }
      }
      if (!merged) chunks.splice(0, 2, `${chunks[0]} ${chunks[1]}`);
    }

    return chunks;
  };




  // ── 리셋 ──────────────────────────────────────────────────────────────────
  const resetQuestionState = () => {
    setSelectedTemplate(null); setQuestions([]); setAnswers([]);
    setArrangedAll([]); setShuffledAll([]); setResults([]);
    setActiveQIdx(0); setGenProgress(0);
  };

  // ── 경로 저장 헬퍼
  const savePath = (wb: string, mid: string, sub: string) => {
    const next: SavedPath = { workbook: wb, mid, sub };
    setSavedPath(next);
    try { localStorage.setItem('essay_last_path', JSON.stringify(next)); } catch { /* noop */ }
  };

  // ── 핸들러: 지문 선택
  const pickPassage = (p: Passage) => {
    setSelectedPassage(p);
    resetQuestionState();
    setStage("select-type");
  };

  // ── 핸들러: 유형 선택 → 개수 단계 없이 바로 essay_sentences 전체 문장 수로 생성
  const pickTemplate = async (t: Template) => {
    if (!selectedPassage) return;
    setSelectedTemplate(t);
    setQuestions([]); setAnswers([]); setArrangedAll([]); setShuffledAll([]); setResults([]);
    // essay_sentences 개수 = 지문에 설정된 서술형 문장 전체
    const count = Math.max(1, selectedPassage.essay_sentences?.length ?? 1);
    await startGeneration(t, count);
  };

  // ── 핵심: essay_sentences 직접 활용 → API 호출 없이 로컬 생성 ──────────────
  const startGeneration = async (template: Template, count: number) => {
    if (!selectedPassage) return;
    setSelectedTemplate(template);
    setQuestionCount(count as 1 | 2 | 3);
    setStage("generating");
    setGenProgress(0);

    const sentences = selectedPassage.essay_sentences ?? [];
    if (sentences.length === 0) {
      setStage("select-type");
      alert("이 지문에 서술형 문장이 저장되어 있지 않습니다.");
      return;
    }

    const generatedQs: GeneratedQ[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      setGenProgress(i);
      // 아직 안 쓴 문장 중 랜덤 선택
      const available = sentences.filter((_, idx) => !usedIndices.has(idx));
      const pick = available[Math.floor(Math.random() * available.length)];
      usedIndices.add(sentences.indexOf(pick));

      // 단어 토큰화
      const wordTokens = pick.text.trim().split(/\s+/).filter(w => w.length > 0).map((w, wi) => ({ id: wi, text: w }));

      // ── 20단어 초과 시 API로 Collocation 그룹핑 ─────────────────────────────
      let chunkTexts: string[];

      if (wordTokens.length > 20) {
        try {
          const res = await fetch('/api/essay-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentence: pick.text.trim() }),
          });
          const data = await res.json();
          chunkTexts = Array.isArray(data.chunks) && data.chunks.length > 0
            ? data.chunks
            : wordTokens.map(t => t.text);
        } catch {
          // API 실패 시 단순 단어 분리 fallback
          chunkTexts = wordTokens.map(t => t.text);
        }
      } else {
        chunkTexts = wordTokens.map(t => t.text);
      }


      // 라벨 A~Z 할당 (청크 수 기준)
      const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const makeLabel = (i: number) => i < 26 ? ALPHA[i] : `A${ALPHA[i - 26]}`;
      const labels = chunkTexts.map((_, i) => makeLabel(i));

      const shuffledIdx = shuffleArr([...Array(chunkTexts.length).keys()]);
      // labelByChunkIdx[chunkIdx] = 해당 청크에 배정된 라벨
      const labelByChunkIdx: string[] = new Array(chunkTexts.length);
      shuffledIdx.forEach((chunkIdx, labelIdx) => { labelByChunkIdx[chunkIdx] = labels[labelIdx]; });

      const chunks = chunkTexts.map((text, ci) => `(${labelByChunkIdx[ci]}) ${text}`);
      // correct_order = 원래 순서의 라벨들 (정답)
      const correctOrder = chunkTexts.map((_, ci) => labelByChunkIdx[ci]).join('-');
      // A-Z 알파벳 순 정렬
      const shuffledChunks = [...chunks].sort((a, b) => {
        const la = a.match(/^\(([A-Z]{1,2})\)/)?.[1] ?? '';
        const lb = b.match(/^\(([A-Z]{1,2})\)/)?.[1] ?? '';
        return la.localeCompare(lb);
      });

      const q: GeneratedQ = {
        question_type: "배열",
        question_text: "다음 밑줄 친 문장의 단어를 올바른 순서로 배열하시오.",
        selected_sentence: pick,
        passage_with_blank: undefined, // 사용 안 함 — 지문은 full_text 직접 사용
        blank_position_sentence: pick.text,
        blank_position_sentence_korean: pick.korean,
        chunks: shuffledChunks,
        correct_order: correctOrder,
        correct_sentence: pick.text,
        conditions: [],
        difficulty: "",
        grammar_point: "",
      };
      generatedQs.push(q);
    }

    setQuestions(generatedQs);
    setAnswers(new Array(generatedQs.length).fill(""));
    setArrangedAll(new Array(generatedQs.length).fill([]));
    setShuffledAll(generatedQs.map(q =>
      q.question_type === "배열" && q.chunks ? [...q.chunks] : []
    ));
    setActiveQIdx(0);
    setStage("answering");
  };

  // ── 배열형 청크 조작 ──────────────────────────────────────────────────────
  const placeChunk = (qIdx: number, label: string) => {
    setArrangedAll(prev => prev.map((arr, i) => i === qIdx ? [...arr, label] : arr));
    setShuffledAll(prev => prev.map((arr, i) =>
      i === qIdx ? arr.filter(c => getLabel(c) !== label) : arr));
  };
  const removeChunk = (qIdx: number, pos: number) => {
    const label = arrangedAll[qIdx][pos];
    const chunk = questions[qIdx]?.chunks?.find(c => getLabel(c) === label) ?? label;
    setArrangedAll(prev => prev.map((arr, i) => i === qIdx ? arr.filter((_, p) => p !== pos) : arr));
    setShuffledAll(prev => prev.map((arr, i) => i === qIdx ? [...arr, chunk] : arr));
  };
  const updateAnswer = (qIdx: number, text: string) =>
    setAnswers(prev => prev.map((a, i) => i === qIdx ? text : a));

  // ── 일괄 채점 ─────────────────────────────────────────────────────────────
  const handleSubmitAll = async () => {
    if (!allAnswered || !selectedTemplate) return;
    setStage("scoring");

    try {
      const allResults: ScoreResult[] = await Promise.all(questions.map(async (q, i) => {
        const ans = q.question_type === "배열" ? studentOrderFor(i) : (answers[i] ?? "").trim();

        // 배열형: AI API 없이 로컬 채점
        if (q.question_type === "배열") {
          const correct = (q.correct_order ?? "").split("-");
          // arrangedAll에는 "(A)" 형식으로 저장되므로 괄호 제거하여 "A" 형식으로 정규화
          const student = ans.split("-").map(l => l.replace(/[()]/g, ""));
          const totalWords = correct.length;
          let correctCount = 0;
          const positionAnalysis = correct.map((label, pos) => {
            const match = student[pos] === label;
            if (match) correctCount++;
            return { position: pos + 1, correct: label, student: student[pos] ?? "—", match };
          });
          const score = Math.round((correctCount / totalWords) * 5);
          // 학생이 배열한 단어 문장 재구성
          const cMap: Record<string, string> = {};
          (q.chunks ?? []).forEach(c => { const l = c.match(/^\(([A-Z])\)/)?.[1] ?? ""; cMap[l] = c.replace(/^\([A-Z]\)\s*/, ""); });
          const studentSentence = student.map(l => cMap[l] ?? l).join(" ");
          return {
            question_type: "배열" as const,
            score,
            score_max: 5,
            feedback: score === 5 ? "🎉 완벽합니다!" : score >= 3 ? "잘 했어요! 몇 가지 위치를 다시 확인해보세요." : "더 연습이 필요합니다. 정답을 확인해보세요.",
            correct_sentence: q.correct_sentence,
            student_sentence: studentSentence,
            correct_positions: correct.join("-"),
            position_analysis: positionAnalysis,
          } as ScoreResult;
        }

        // 빈칸/서술형은 기존 API 사용
        let body: Record<string, unknown>;
        if (q.question_type === "빈칸") {
          body = { question_type: "빈칸", correct_answer: q.correct_answer,
            total_words: q.total_words, given_words: q.given_words,
            find_words: q.find_words, conditions: q.conditions,
            student_answer: ans, scoring_prompt: selectedTemplate.scoring_prompt };
        } else {
          body = { question_type: "서술형", question_text: q.question_text,
            model_answer: "", student_answer: ans, scoring_prompt: selectedTemplate.scoring_prompt };
        }
        return fetch("/api/essay-score", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then(r => r.json());
      }));

      setResults(allResults);
      setActiveQIdx(0);
      setStage("result");
    } catch (e) {
      setResults(questions.map(q => ({
        question_type: q.question_type, score: null,
        score_max: q.question_type === "서술형" ? 100 : 5,
        feedback: `채점 오류: ${(e as Error).message}`,
      })));
      setStage("result");
    }
  };

  // ── 복사 ──────────────────────────────────────────────────────────────────
  const handleCopy = (qIdx: number) => {
    const r = results[qIdx];
    if (!r) return;
    const text = [
      `[Q${qIdx + 1} ${selectedTemplate?.display_name ?? ""} 채점]`,
      r.score !== null ? `점수: ${r.score}/${r.score_max}` : "",
      "", r.feedback,
      r.study_tip ? `\n학습 팁: ${r.study_tip}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(qIdx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const resetToPassage = () => { resetQuestionState(); setStage("select-passage"); setSelectedPassage(null); };
  const resetToType    = () => { resetQuestionState(); setStage("select-type"); };

  const scoreColor = (s: number | null, max: number) => {
    if (s === null) return "text-accent";
    const pct = (s / max) * 100;
    return pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-400";
  };

  const totalScore = results.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const totalMax   = results.reduce((sum, r) => sum + r.score_max, 0);

  // ── 스텝 표시 ─────────────────────────────────────────────────────────────
  const stageStep: Record<Stage, number> = {
    "select-passage": 0, "select-type": 1,
    "generating": 2, "answering": 3, "scoring": 3, "result": 4,
  };
  const steps = ["지문", "유형", "풀기", "결과"];
  const stepNow = stageStep[stage];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-accent" size={28} />
    </div>
  );

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* 헤더 */}
      <div className="px-5 pt-6 pb-3 shrink-0 border-b border-foreground/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-indigo-500" />
          <h1 className="text-[16px] font-black text-slate-800">서술형 연습</h1>
          <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={!!savedPath}
              onChange={e => {
                if (e.target.checked) {
                  savePath(filterWorkbook, filterMid, filterSub);
                } else {
                  setSavedPath(null);
                  try { localStorage.removeItem('essay_last_path'); } catch { /* noop */ }
                }
              }}
              className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">최근 경로 저장</span>
          </label>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full transition-all ${
                i === stepNow ? "bg-indigo-500 text-white" :
                i <  stepNow ? "bg-indigo-100 text-indigo-600" :
                               "bg-slate-200/60 text-slate-500"
              }`}>{s}</span>
              {i < steps.length - 1 && <ChevronRight size={8} className="text-accent/20" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 custom-scrollbar">

        {/* ══ STEP 1: 지문 선택 ═══════════════════════════════════════════════ */}
        {stage === "select-passage" && (
          <div className="space-y-3 pt-4">
            {/* 필터 접기/펼치기 버튼 */}
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 text-[10px] font-black rounded-xl px-3 py-2 transition-all w-full border border-slate-200/60 bg-white/70 hover:bg-white text-slate-600 hover:text-slate-800 shadow-sm"
            >
              <BookOpen size={11} />
              {filterWorkbook !== '전체' || filterMid !== '전체' || filterSub !== '전체'
                ? `${[filterWorkbook, filterMid, filterSub].filter(v => v !== '전체').join(' · ')}`
                : '교재 / 단원 필터'}
              <ChevronDown size={10} className={`ml-auto transition-transform duration-200 ${filterOpen ? '' : '-rotate-90'}`} />
            </button>
            {filterOpen && [
              { label: '교재', value: filterWorkbook, opts: workbooks,
                set: (v: string) => {
                  setFilterWorkbook(v); setFilterMid('전체'); setFilterSub('전체');
                  savePath(v, '전체', '전체');
                }},
              { label: '중분류', value: filterMid, opts: mids,
                set: (v: string) => {
                  setFilterMid(v); setFilterSub('전체');
                  savePath(filterWorkbook, v, '전체');
                }},
              { label: '소분류', value: filterSub, opts: subs,
                set: (v: string) => {
                  setFilterSub(v);
                  savePath(filterWorkbook, filterMid, v);
                }},
            ].map(({ label, value, opts, set }) => (
              <div key={label} className="relative">
                <select value={value} onChange={e => set(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-foreground/10 bg-white text-[13px] font-bold text-foreground appearance-none outline-none focus:border-indigo-300 cursor-pointer">
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/35 pointer-events-none" />
              </div>
            ))}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">
              지문 선택 ({filtered.length}개)
            </p>
            {filtered.length === 0
              ? <div className="py-10 text-center text-[12px] text-accent/30 font-bold">해당하는 지문이 없습니다.</div>
              : <div className="space-y-2">
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => pickPassage(p)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl transition-all group bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md hover:scale-[1.01] shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold mb-0.5 text-indigo-500/90">
                            {[p.workbook, p.chapter, p.sub_sub_category].filter(Boolean).join(" \u00b7 ")}
                          </p>
                          <p className="text-[13px] font-bold truncate text-slate-800">
                            {p.passage_number ? `${p.passage_number}번 · ` : ""}{p.label || "지문"}
                          </p>
                          <p className="text-[10px] mt-0.5 text-slate-500">
                            {p.essay_sentences?.length
                              ? `구조화 문장 ${p.essay_sentences.length}개`
                              : p.full_text
                              ? "본문 텍스트 있음"
                              : <span className="text-amber-500 font-bold">⚠ 본문 없음 — AI 출제 불가</span>
                            }
                          </p>
                        </div>
                        <BookOpen size={14} className={`shrink-0 transition-colors ${
                          (!p.essay_sentences?.length && !p.full_text)
                            ? "text-amber-500"
                            : "text-slate-400 group-hover:text-indigo-500"
                        }`} />

                      </div>
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ══ STEP 2: 유형 선택 ═══════════════════════════════════════════════ */}
        {stage === "select-type" && selectedPassage && (
          <div className="space-y-3 pt-4">
            <button onClick={resetToPassage}
              className="flex items-center gap-1.5 text-[11px] font-black text-accent/40 hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> 지문 다시 선택
            </button>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-50/80 border border-indigo-100/80">
              <FileText size={14} className="text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">선택된 지문</p>
                <p className="text-[13px] font-bold truncate text-slate-800">{selectedPassage.label}</p>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">서술형 유형</p>
            {templates.length === 0
              ? <div className="py-8 text-center text-[12px] text-slate-400 font-bold">활성된 유형 없음</div>
              : <div className="space-y-2">
                  {templates.map(t => (
                    <button key={t.type_key} onClick={() => pickTemplate(t)}
                      className="w-full text-left px-5 py-4 rounded-2xl transition-all group bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md hover:scale-[1.01] shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{t.display_name}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{t.type_key}</p>
                        </div>
                        <Sparkles size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ══ STEP 3: 개수 선택 (NEW) ═══════════════════════════════════════ */}
        {stage === "select-count" && selectedPassage && selectedTemplate && (
          <div className="space-y-4 pt-4">
            <button onClick={resetToType}
              className="flex items-center gap-1.5 text-[11px] font-black text-accent/40 hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> 유형 다시 선택
            </button>

            {/* 지문 + 유형 요약 */}
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-indigo-50/50 border border-indigo-100/80 rounded-xl">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">지문</p>
                <p className="text-[12px] font-bold text-foreground truncate">{selectedPassage.label}</p>
              </div>
              <div className="flex-1 px-3 py-2.5 bg-indigo-50/50 border border-indigo-100/80 rounded-xl">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">유형</p>
                <p className="text-[12px] font-bold text-foreground">{selectedTemplate.display_name}</p>
              </div>
            </div>

            {/* 비중복 안내 */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl">
              <Sparkles size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                2개 이상 출제 시 AI가 같은 문장을 중복 선택하지 않도록 자동으로 방지합니다.
              </p>
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">문제 개수 선택</p>

            <div className="grid grid-cols-3 gap-3">
              {([1, 2, 3] as const).map(n => (
                <button key={n} onClick={() => startGeneration(n)}
                  className="py-5 rounded-2xl border border-foreground/10 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-95 transition-all group flex flex-col items-center gap-1.5">
                  <span className="text-[28px] font-black text-foreground group-hover:text-indigo-600 transition-colors">{n}</span>
                  <span className="text-[10px] font-bold text-accent/40 group-hover:text-indigo-400 transition-colors">문제</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ GENERATING: 순차 생성 중 ════════════════════════════════════════ */}
        {stage === "generating" && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center relative">
              <Sparkles size={24} className="text-indigo-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-black text-foreground">
                {genProgress + 1}/{questionCount}번 문제 생성 중...
              </p>
              <p className="text-[11px] text-accent/40 mt-1">지문에서 최적 문장을 선택 중</p>
            </div>
            {/* 진행 바 */}
            <div className="flex gap-2">
              {Array.from({ length: questionCount }).map((_, i) => (
                <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${
                  i < genProgress ? "bg-indigo-400" :
                  i === genProgress ? "bg-indigo-300 animate-pulse" :
                  "bg-foreground/10"
                }`} />
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP 4: 답안 입력 (탭) ══════════════════════════════════════════ */}
        {stage === "answering" && questions.length > 0 && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={resetToType}
                className="flex items-center gap-1.5 text-[11px] font-black text-accent/40 hover:text-foreground transition-colors">
                <ArrowLeft size={13} /> 유형 다시 선택
              </button>
              <span className="text-[10px] font-black text-accent/30">
                {questions.filter((_, i) => isAnswered(i)).length}/{questions.length} 완료
              </span>
            </div>

            {/* 문제 탭 */}
            {questions.length > 1 && (
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setActiveQIdx(i)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
                      i === activeQIdx
                        ? "bg-indigo-500 text-white"
                        : "bg-foreground/5 text-accent/50 hover:bg-foreground/10"
                    }`}>
                    {isAnswered(i) && <Check size={9} />}
                    Q{i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* 현재 활성 문제 UI */}
            {(() => {
              const q = questions[activeQIdx];
              if (!q) return null;

              if (q.question_type === "배열") {
                const arr = arrangedAll[activeQIdx] ?? [];
                const shuf = shuffledAll[activeQIdx] ?? [];
                const cMap = chunkMapFor(activeQIdx);
                const allPlaced = arr.length === (q.chunks?.length ?? 0);
                return (
                  <BaeyolAnswering
                    q={q}
                    arr={arr}
                    shuf={shuf}
                    cMap={cMap}
                    allPlaced={allPlaced}
                    activeQIdx={activeQIdx}
                    questions={questions}
                    allAnswered={allAnswered}
                    selectedTemplate={selectedTemplate}
                    fullText={selectedPassage?.full_text ?? ""}
                    onPlace={(label) => placeChunk(activeQIdx, label)}
                    onRemove={(pos) => removeChunk(activeQIdx, pos)}
                    onNext={() => setActiveQIdx(activeQIdx + 1)}
                    onSubmit={handleSubmitAll}
                    studentOrder={studentOrderFor(activeQIdx)}
                    getLabel={getLabel}
                  />
                );
              }

              if (q.question_type === "빈칸") {
                return (
                  <div className="space-y-4">
                    <div className="px-4 py-3 rounded-2xl border border-foreground/10 bg-white/60">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedTemplate?.display_name}</p>
                        {q.difficulty && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{q.difficulty}</span>}
                      </div>
                      <p className="text-[13px] font-bold text-foreground leading-relaxed">{q.question_text}</p>
                    </div>
                    {q.passage_with_blank && (
                      <div className="px-4 py-4 rounded-2xl bg-foreground/3 border border-foreground/8">
                        <p className="text-[9px] font-black text-accent/40 uppercase tracking-widest mb-2">지문</p>
                        <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                          {q.passage_with_blank.split("______").map((part, i, arr) => (
                            <span key={i}>{part}
                              {i < arr.length - 1 && (
                                <span className="inline-block bg-indigo-100 text-indigo-500 font-black px-2 rounded mx-0.5 text-[12px]">______</span>
                              )}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                    {q.conditions && q.conditions.length > 0 && (
                      <div className="px-4 py-3 rounded-2xl border border-foreground/10 bg-amber-50/30 space-y-1.5">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">&lt;조건&gt;</p>
                        {q.conditions.map((c, i) => (
                          <p key={i} className="text-[12px] text-foreground/75 font-medium leading-relaxed">
                            <span className="font-black text-amber-600">{i + 1}. </span>{c}
                          </p>
                        ))}
                      </div>
                    )}
                    {q.given_words && q.given_words.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-accent/35 uppercase tracking-widest mb-2">
                          주어진 단어 ({q.given_words_count ?? q.given_words.length}개)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {q.given_words.map((w, i) => (
                            <span key={i} className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[12px] font-black text-indigo-600">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-accent/35 uppercase tracking-widest mb-2">나의 답안 (총 {q.total_words ?? "?"}개 단어)</p>
                      <input type="text" value={answers[activeQIdx] ?? ""} onChange={e => updateAnswer(activeQIdx, e.target.value)}
                        placeholder={`${q.total_words ?? ""}개 단어로 빈칸을 채워봐...`}
                        className="w-full px-4 py-3 rounded-2xl border border-foreground/10 bg-white text-[14px] text-foreground outline-none focus:border-indigo-300 placeholder:text-accent/20 transition-colors" />
                      {(answers[activeQIdx] ?? "").trim() && (
                        <p className="text-[10px] text-accent/40 mt-1.5 text-right font-bold">
                          {(answers[activeQIdx] ?? "").trim().split(/\s+/).filter(Boolean).length}개 단어
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {activeQIdx < questions.length - 1 && isAnswered(activeQIdx) && (
                        <button onClick={() => setActiveQIdx(activeQIdx + 1)}
                          className="flex-1 h-11 rounded-2xl border border-indigo-200 text-indigo-600 font-black text-[13px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5">
                          다음 문제 <ChevronRight size={13} />
                        </button>
                      )}
                      {allAnswered && (
                        <button onClick={handleSubmitAll}
                          className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-black text-[13px] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all">
                          <Send size={14} /> 전체 채점 ({questions.length}문제)
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // 서술형
              return (
                <div className="space-y-4">
                  {q.selected_sentence && (
                    <div className="px-4 py-3 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">출제 기반 문장</p>
                      <p className="text-[13px] font-medium text-foreground leading-relaxed italic serif">{q.selected_sentence.text}</p>
                      {q.selected_sentence.korean && <p className="text-[10px] text-accent/40 mt-1.5">{q.selected_sentence.korean}</p>}
                    </div>
                  )}
                  <div className="px-4 py-4 rounded-2xl border border-foreground/10 bg-white/60">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">{selectedTemplate?.display_name}</p>
                    <p className="text-[14px] font-bold text-foreground leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                  </div>
                  <textarea value={answers[activeQIdx] ?? ""} onChange={e => updateAnswer(activeQIdx, e.target.value)}
                    rows={5} placeholder="영어로 답안을 작성해봐..."
                    className="w-full px-4 py-3 rounded-2xl border border-foreground/10 bg-white text-[14px] text-foreground outline-none focus:border-indigo-300 resize-none leading-relaxed placeholder:text-accent/20 transition-colors" />
                  <div className="flex gap-2">
                    {activeQIdx < questions.length - 1 && isAnswered(activeQIdx) && (
                      <button onClick={() => setActiveQIdx(activeQIdx + 1)}
                        className="flex-1 h-11 rounded-2xl border border-indigo-200 text-indigo-600 font-black text-[13px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5">
                        다음 문제 <ChevronRight size={13} />
                      </button>
                    )}
                    {allAnswered && (
                      <button onClick={handleSubmitAll}
                        className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-black text-[13px] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all">
                        <Send size={14} /> 전체 채점 ({questions.length}문제)
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 전체 미완료 시 제출 안내 */}
            {!allAnswered && questions.length > 1 && (
              <p className="text-[11px] text-accent/40 text-center font-bold pt-1">
                모든 문제를 풀면 한번에 채점할 수 있어요
              </p>
            )}
          </div>
        )}

        {/* ══ SCORING: 채점 중 ════════════════════════════════════════════════ */}
        {stage === "scoring" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-black text-foreground">{questions.length}문제 동시 채점 중...</p>
              <p className="text-[11px] text-accent/40 mt-1">AI가 각 문제를 꼼꼼히 채점하고 있어</p>
            </div>
          </div>
        )}

        {/* ══ STEP 5: 결과 ════════════════════════════════════════════════════ */}
        {stage === "result" && results.length > 0 && (
          <div className="pt-4 space-y-4">
            {/* 종합 점수 */}
            {results.length > 1 && (
              <div className="px-6 py-5 rounded-[2rem] border border-foreground/8 bg-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-accent/40 uppercase tracking-widest">총점</p>
                  <div className="flex items-end gap-1.5 mt-0.5">
                    <span className={`text-[40px] font-black leading-none ${scoreColor(totalScore, totalMax)}`}>{totalScore}</span>
                    <span className="text-[16px] font-black text-foreground pb-1">/ {totalMax}점</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {results.map((r, i) => (
                    <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black ${
                      r.score !== null
                        ? (r.score / r.score_max) >= 0.8 ? "bg-emerald-100 text-emerald-700"
                        : (r.score / r.score_max) >= 0.5 ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-600"
                        : "bg-foreground/5 text-accent/40"
                    }`}>
                      {r.score ?? "?"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 결과 탭 */}
            {results.length > 1 && (
              <div className="flex gap-1.5">
                {results.map((_, i) => (
                  <button key={i} onClick={() => setActiveQIdx(i)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                      i === activeQIdx ? "bg-indigo-500 text-white" : "bg-foreground/5 text-accent/50 hover:bg-foreground/10"
                    }`}>
                    Q{i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* 현재 문제 결과 상세 */}
            {(() => {
              const r = results[activeQIdx];
              const q = questions[activeQIdx];
              if (!r || !q) return null;
              const ans = q.question_type === "배열" ? studentOrderFor(activeQIdx) : (answers[activeQIdx] ?? "");

              return (
                <div className="space-y-3">
                  {/* 단일 문제 점수 카드 */}
                  <div className="px-6 py-4 rounded-[2rem] border border-foreground/8 bg-white flex items-center gap-5">
                    <div className={`text-[48px] font-black leading-none ${scoreColor(r.score, r.score_max)}`}>
                      {r.score ?? "?"}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-accent/40 uppercase tracking-widest">
                        {results.length > 1 ? `Q${activeQIdx + 1} 점수` : "AI 채점 점수"}
                      </p>
                      <p className="text-[14px] font-black text-foreground">/ {r.score_max}점</p>
                      <p className="text-[10px] text-accent/40 mt-0.5">{selectedTemplate?.display_name}</p>
                    </div>
                  </div>

                  {/* 배열형 전용: condition_results + position_analysis */}
                  {r.question_type === "배열" && (
                    <>
                      {r.condition_results && r.condition_results.length > 0 && (
                        <div className="space-y-2">
                          {r.condition_results.map((c, i) => (
                            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                              c.met ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                            }`}>
                              {c.met ? <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />}
                              <div>
                                <p className="text-[10px] font-black text-foreground/60">조건{i + 1}</p>
                                <p className="text-[12px] font-bold text-foreground">{c.condition}</p>
                                {c.detail && <p className="text-[11px] text-accent/60 mt-0.5">{c.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.position_analysis && r.position_analysis.length > 0 && (
                        <div className="px-4 py-3 rounded-xl bg-foreground/3">
                          <p className="text-[9px] font-black text-accent/35 uppercase tracking-widest mb-2">위치 분석 {r.correct_positions}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {r.position_analysis.map(p => (
                              <span key={p.position} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                p.match ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                              }`}>{p.student}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">정답</p>
                          <p className="text-[12px] font-mono text-accent/50 mb-1">{q.correct_order}</p>
                          {/* 정답: 빈칸 해당 부분만 표시 (전체 문장 X) */}
                          <p className="text-[13px] text-foreground font-bold leading-relaxed">
                            {q.selected_fragment || q.correct_sentence}
                          </p>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-foreground/3">
                          <p className="text-[9px] font-black text-accent/35 uppercase tracking-widest mb-1">내 답</p>
                          <p className="text-[12px] font-mono text-accent/50 mb-1">{ans}</p>
                          {r.student_sentence && <p className="text-[12px] text-accent/60 leading-relaxed font-medium">{r.student_sentence}</p>}
                        </div>
                      </div>

                    </>
                  )}

                  {/* 빈칸형 전용: condition_check + given/find words */}
                  {r.question_type === "빈칸" && (
                    <>
                      {r.condition_check?.auto_zero && (
                        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-black text-red-600">조건 위반 — 0점</p>
                            <p className="text-[12px] text-red-500 mt-0.5">{r.condition_check.auto_zero_reason}</p>
                          </div>
                        </div>
                      )}
                      {r.given_words_analysis && r.given_words_analysis.length > 0 && (
                        <div className="px-4 py-3 rounded-xl bg-foreground/3">
                          <p className="text-[9px] font-black text-accent/35 uppercase tracking-widest mb-2">주어진 단어 확인</p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.given_words_analysis.map((w, i) => (
                              <span key={i} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                                w.found_in_answer && w.form_preserved
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-red-50 border-red-200 text-red-600"
                              }`}>
                                {w.found_in_answer && w.form_preserved ? <Check size={9} /> : <X size={9} />}
                                {w.word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.find_words_analysis && r.find_words_analysis.length > 0 && (
                        <div className="space-y-1.5">
                          {r.find_words_analysis.map((fw, i) => (
                            <div key={i} className={`px-3 py-2.5 rounded-xl border text-[12px] ${
                              fw.correct ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                            }`}>
                              <div className="flex items-center gap-2">
                                {fw.correct ? <CheckCircle size={12} className="text-emerald-500 shrink-0" /> : <AlertCircle size={12} className="text-red-400 shrink-0" />}
                                <span className="font-black text-foreground">{fw.expected}</span>
                                {!fw.correct && fw.student_wrote && <span className="text-accent/50">→ {fw.student_wrote}</span>}
                              </div>
                              {fw.detail && <p className="text-[11px] text-accent/60 mt-1 ml-5">{fw.detail}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">정답</p>
                          <p className="text-[13px] font-bold text-foreground">{r.correct_answer ?? q.correct_answer}</p>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-foreground/3">
                          <p className="text-[9px] font-black text-accent/35 uppercase tracking-widest mb-1">내 답안</p>
                          <p className="text-[13px] text-foreground">{ans}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 서술형: 내 답안 */}
                  {r.question_type === "서술형" && (
                    <div className="px-4 py-3 rounded-xl bg-foreground/3">
                      <p className="text-[9px] font-black text-accent/35 uppercase tracking-widest mb-1.5">내 답안</p>
                      <p className="text-[13px] text-foreground leading-relaxed">{ans}</p>
                    </div>
                  )}

                  {/* AI 피드백 (모든 유형 공통) */}
                  {r.feedback && (
                    <div className="px-4 py-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                          {results.length > 1 ? `Q${activeQIdx + 1} AI 피드백` : "AI 피드백"}
                        </p>
                        <button onClick={() => handleCopy(activeQIdx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600 text-[10px] font-black transition-all">
                          {copied === activeQIdx ? <><Check size={10} /> 복사됨</> : <><Copy size={10} /> 복사</>}
                        </button>
                      </div>
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{r.feedback}</p>
                    </div>
                  )}

                  {/* 학습 팁 */}
                  {r.study_tip && (
                    <div className="px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">학습 팁</p>
                      <p className="text-[12px] text-foreground/70 leading-relaxed">{r.study_tip}</p>
                    </div>
                  )}

                  {/* 문제 간 이동 */}
                  {results.length > 1 && (
                    <div className="flex gap-2">
                      {activeQIdx > 0 && (
                        <button onClick={() => setActiveQIdx(activeQIdx - 1)}
                          className="h-10 px-4 rounded-2xl border border-foreground/10 text-[12px] font-bold text-accent hover:bg-foreground/5 transition-all flex items-center gap-1">
                          <ArrowLeft size={12} /> Q{activeQIdx}
                        </button>
                      )}
                      {activeQIdx < results.length - 1 && (
                        <button onClick={() => setActiveQIdx(activeQIdx + 1)}
                          className="flex-1 h-10 rounded-2xl border border-indigo-200 text-indigo-600 text-[12px] font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-1">
                          Q{activeQIdx + 2} 결과 <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 하단 액션 */}
            <div className="flex gap-2 pt-2">
              <button onClick={resetToType}
                className="flex-1 h-11 rounded-2xl border border-foreground/10 text-[13px] font-bold text-accent hover:bg-foreground/5 transition-all flex items-center justify-center gap-1.5">
                <RotateCcw size={13} /> 다시 풀기
              </button>
              <button onClick={resetToPassage}
                className="flex-1 h-11 rounded-2xl bg-foreground text-background text-[13px] font-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5">
                <BookOpen size={13} /> 새 지문
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
