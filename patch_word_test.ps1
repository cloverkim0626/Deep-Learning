$file = 'c:\Users\USER\.gemini\antigravity\scratch\student-app\src\app\(student)\dashboard\word-test\page.tsx'
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# Section 1: lines 1-86 unchanged (indices 0-85)
$before = $lines[0..85]

# Section 2: lines 301-390 unchanged (indices 300-389) = ResultScreen
$resultScreen = $lines[300..389]

# Section 3: lines 392-678 unchanged (indices 391-677) = GameMode (skip blank line 391)
$gameMode = $lines[391..677]

# Section 4: lines 679+ = main function (indices 678+)
$mainFunc = $lines[678..($lines.Length-1)]

# === NEW STAMP COMPONENTS + INTROESCREEN ===
$newStamp = @'

// PASS stamps - stamp style
function VocabStamp({ passed }: { passed: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 select-none ${passed ? 'opacity-100' : 'opacity-[0.12]'}`}
         style={{ transform: 'rotate(-8deg)' }}>
      <div className={`border-[2.5px] rounded-[5px] px-2 py-0.5 ${passed ? 'border-emerald-500 bg-emerald-50' : 'border-foreground/40'}`}>
        <span className={`text-[9px] font-black tracking-[2px] ${passed ? 'text-emerald-600' : 'text-foreground/40'}`}>PASS</span>
      </div>
      <span className={`text-[7px] font-bold ${passed ? 'text-emerald-500' : 'text-foreground/20'}`}>뜻쓰기</span>
    </div>
  );
}

function SynonymStamp({ passed }: { passed: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 select-none ${passed ? 'opacity-100' : 'opacity-[0.12]'}`}
         style={{ transform: 'rotate(8deg)' }}>
      <div className={`border-[2.5px] rounded-[5px] px-2 py-0.5 ${passed ? 'border-sky-500 bg-sky-50' : 'border-foreground/40'}`}>
        <span className={`text-[9px] font-black tracking-[2px] ${passed ? 'text-sky-600' : 'text-foreground/40'}`}>PASS</span>
      </div>
      <span className={`text-[7px] font-bold ${passed ? 'text-sky-500' : 'text-foreground/20'}`}>유반의어</span>
    </div>
  );
}

// Intro Screen - dual checkbox (vocab writing + synonym/antonym)
function IntroScreen({
  sets, synonymPassedSetIds, vocabPassedSetIds, onStartVocab, onStartQuiz, onStartGame
}: {
  sets: { id: string; label: string; workbook: string; chapter: string; passageNumber?: string; words: TestWord[] }[];
  synonymPassedSetIds: Set<string>;
  vocabPassedSetIds: Set<string>;
  onStartVocab: (setIds: string[] | null) => void;
  onStartQuiz: (setIds: string[] | null) => void;
  onStartGame: (setIds: string[] | null) => void;
}) {
  const [vocabIds, setVocabIds] = useState<Set<string>>(new Set());
  const [synonymIds, setSynonymIds] = useState<Set<string>>(new Set());
  const [showModeModal, setShowModeModal] = useState(false);

  const hasAny = vocabIds.size > 0 || synonymIds.size > 0;
  const allSelected = sets.length > 0 && sets.every(s => vocabIds.has(s.id) && synonymIds.has(s.id));
  const toggleV = (id: string) => setVocabIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleS = (id: string) => setSynonymIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => {
    if (allSelected) { setVocabIds(new Set()); setSynonymIds(new Set()); }
    else { setVocabIds(new Set(sets.map(s => s.id))); setSynonymIds(new Set(sets.map(s => s.id))); }
  };
  const vocabWordCount = sets.filter(s => vocabIds.has(s.id)).reduce((a, s) => a + s.words.length, 0);
  const synSets = sets.filter(s => synonymIds.has(s.id));
  const totalSyn = synSets.reduce((a, s) => a + s.words.filter(w => w.testSynonym).length, 0);
  const totalAnt = synSets.reduce((a, s) => a + s.words.filter(w => w.testAntonym).length, 0);
  const handleMode = (mode: 'vocab' | 'quiz' | 'game') => {
    setShowModeModal(false);
    if (mode === 'vocab') onStartVocab(vocabIds.size > 0 ? [...vocabIds] : null);
    else if (mode === 'quiz') onStartQuiz(synonymIds.size > 0 ? [...synonymIds] : null);
    else onStartGame(synonymIds.size > 0 ? [...synonymIds] : null);
  };

  return (
    <div className="flex flex-col h-full px-5 py-5">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-[0.9rem] bg-foreground text-background flex items-center justify-center shadow-md shrink-0">
          <Trophy size={18} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[17px] font-black text-foreground">어휘 테스트</h1>
          <p className="text-[11px] text-accent font-medium">
            <span className="text-emerald-500 font-black">뜻쓰기</span>&nbsp;·&nbsp;
            <span className="text-sky-500 font-black">유의어</span>&nbsp;·&nbsp;
            <span className="text-rose-500 font-black">반의어</span>
          </p>
        </div>
      </div>

      <div className="flex items-center px-1 mb-2 shrink-0">
        <div className="flex-1" />
        <div className="flex gap-1.5 mr-2">
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide w-8 text-center">뜻쓰기</span>
          <span className="text-[9px] font-black text-sky-600 uppercase tracking-wide w-8 text-center">유반의어</span>
        </div>
        <button onClick={selectAll} className={`text-[9px] font-black px-2 py-1 rounded-lg transition-all ml-2 ${
          allSelected ? 'bg-foreground text-background' : 'bg-foreground/8 text-accent hover:bg-foreground/15'
        }`}>{allSelected ? '전체해제' : '전체선택'}</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-2">
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <AlertCircle size={32} className="text-accent/25 mb-3" />
            <p className="text-[13px] font-bold text-accent">배당된 세트가 없어요.</p>
          </div>
        ) : sets.map(s => {
          const vC = vocabIds.has(s.id);
          const sC = synonymIds.has(s.id);
          const sub = [s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ');
          return (
            <div key={s.id} className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-all ${
              (vC || sC) ? 'border-foreground/20 shadow-sm bg-background' : 'border-foreground/8 bg-background'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground leading-tight truncate">{s.label}</div>
                <div className="text-[9px] text-accent/50 truncate mt-0.5">{sub}</div>
                <div className="text-[9px] text-accent/35">{s.words.length}단어 · 유{s.words.filter(w=>w.testSynonym).length} 반{s.words.filter(w=>w.testAntonym).length}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggleV(s.id)} className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                  vC ? 'bg-emerald-500 border-emerald-500' : 'border-foreground/15 hover:border-emerald-400'
                }`}>
                  {vC && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <button onClick={() => toggleS(s.id)} className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                  sC ? 'bg-sky-500 border-sky-500' : 'border-foreground/15 hover:border-sky-400'
                }`}>
                  {sC && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              </div>
              <div className="flex gap-2 shrink-0">
                <VocabStamp passed={vocabPassedSetIds.has(s.id)} />
                <SynonymStamp passed={synonymPassedSetIds.has(s.id)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 pt-3 border-t border-foreground/5">
        {!hasAny ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-[12px] font-bold">
            <AlertCircle size={14} /> 지문과 테스트 유형을 선택하세요
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              {vocabIds.size > 0 && <p className="text-[10px] text-emerald-600 font-black">🖊 뜻쓰기 {vocabIds.size}세트 · {vocabWordCount}단어</p>}
              {synonymIds.size > 0 && <p className="text-[10px] text-sky-600 font-black">📋 유반의어 {synonymIds.size}세트 · 유{totalSyn} 반{totalAnt}</p>}
            </div>
            <button onClick={() => setShowModeModal(true)}
              className="h-12 px-6 bg-foreground text-background font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all shrink-0">
              시작 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {showModeModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-background rounded-[2rem] border border-foreground/10 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-black text-foreground">테스트 방식 선택</h3>
              <button onClick={() => setShowModeModal(false)} className="p-1.5 rounded-xl hover:bg-foreground/5 text-accent"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => vocabIds.size > 0 && handleMode('vocab')} disabled={vocabIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  vocabIds.size > 0 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center text-lg transition-all">🖊</div>
                  <span className="text-[14px] font-black text-foreground">뜻쓰기 테스트</span>
                  {vocabIds.size > 0 && <span className="text-[9px] ml-auto text-emerald-600 font-black">{vocabWordCount}단어</span>}
                </div>
                <p className="text-[11px] text-accent pl-12">영어 단어를 보고 한국어 뜻을 직접 입력 · 90% PASS</p>
              </button>

              <button onClick={() => synonymIds.size > 0 && handleMode('quiz')} disabled={synonymIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  synonymIds.size > 0 ? 'border-foreground/10 bg-white hover:border-foreground/30' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-all">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 객관식</span>
                  {synonymIds.size > 0 && <span className="text-[9px] ml-auto text-sky-600 font-black">유{totalSyn}+반{totalAnt}문제</span>}
                </div>
                <p className="text-[11px] text-accent pl-12">4지선다 유의어/반의어 선택 · 90% PASS</p>
              </button>

              <button onClick={() => synonymIds.size > 0 && handleMode('game')} disabled={synonymIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  synonymIds.size > 0 ? 'border-sky-200 bg-sky-50 hover:border-sky-400' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 group-hover:bg-sky-500 flex items-center justify-center transition-all">
                    <Gamepad2 size={16} className="text-sky-600 group-hover:text-white" />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 짝 찾기 게임</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-sky-500 text-white rounded-full font-black">NEW</span>
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

'@

# === NEW: VocabWritingTest + VocabResultScreen (before GameMode) ===
$newVocabSection = @'

// Vocab Writing Test
type VocabResult = { word: TestWord; studentAnswer: string; correct: boolean };

function VocabWritingTest({ words, onDone, onExit }: {
  words: TestWord[];
  onDone: (results: VocabResult[]) => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(words.length * 10);
  const totalTime = words.length * 10;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<VocabResult[]>([]);
  const idxRef = useRef(0);
  const submittedRef = useRef(false);
  const inputValRef = useRef('');
  const endedRef = useRef(false);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { inputValRef.current = inputVal; }, [inputVal]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!endedRef.current) {
            endedRef.current = true;
            const ci = idxRef.current;
            const csub = submittedRef.current;
            const cinp = inputValRef.current;
            const cur = resultsRef.current;
            const remaining = words.slice(ci + (csub ? 1 : 0));
            const extra: VocabResult[] = remaining.map(w => ({ word: w, studentAnswer: '', correct: false }));
            if (!csub && ci < words.length) extra.unshift({ word: words[ci], studentAnswer: cinp, correct: false });
            onDone([...cur, ...extra]);
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
  const isCorrect = (a: string) => a.trim() === currentWord.korean.trim();

  const handleSubmit = () => {
    if (submitted) return;
    const ok = isCorrect(inputVal);
    const entry: VocabResult = { word: currentWord, studentAnswer: inputVal, correct: ok };
    resultsRef.current = [...resultsRef.current, entry];
    setSubmitted(true);
  };

  const handleNext = () => {
    const ni = idx + 1;
    if (ni >= words.length) {
      clearInterval(timerRef.current!);
      endedRef.current = true;
      onDone(resultsRef.current);
    } else {
      setIdx(ni); setInputVal(''); setSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const timerPct = (timeLeft / totalTime) * 100;
  const submittedCorrect = submitted && isCorrect(inputVal);

  return (
    <div className="flex flex-col h-full px-5 py-6">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[12px] font-bold text-accent">{idx + 1} / {words.length}</span>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[12px] ${
          timeLeft <= 10 ? 'bg-rose-500 text-white animate-pulse' : timeLeft <= 30 ? 'bg-amber-400 text-white' : 'bg-foreground/5 text-accent'
        }`}><Timer size={12} />{timeLeft}s</div>
        <span className="text-[12px] font-bold text-emerald-500">{resultsRef.current.filter(r => r.correct).length}정답</span>
      </div>
      <div className="h-[3px] bg-emerald-100 rounded-full mb-1">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(idx / words.length) * 100}%` }} />
      </div>
      <div className="h-[3px] bg-foreground/5 rounded-full mb-6">
        <div className={`h-full rounded-full transition-all duration-1000 ${timerPct > 50 ? 'bg-emerald-400' : timerPct > 20 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${timerPct}%` }} />
      </div>
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="glass rounded-[2.5rem] border border-foreground/5 p-8 text-center shadow-xl">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[3px] mb-3">뜻쓰기</p>
          <h2 className="text-[40px] serif font-bold text-foreground mb-2">{currentWord.word}</h2>
          <p className="text-[13px] text-accent font-black tracking-widest">{currentWord.posAbbr}</p>
        </div>
        {!submitted ? (
          <div className="space-y-3">
            <input ref={inputRef} type="text" value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inputVal.trim() && handleSubmit()}
              placeholder="한국어 뜻을 입력하세요..."
              className="w-full h-14 px-5 bg-white border-2 border-foreground/10 focus:border-foreground/30 rounded-2xl text-[15px] font-bold outline-none transition-all"
              autoFocus />
            <button onClick={handleSubmit} disabled={!inputVal.trim()}
              className="w-full h-12 bg-foreground text-background rounded-2xl font-black text-[14px] hover:-translate-y-0.5 disabled:opacity-30 active:scale-95 transition-all shadow">
              제출
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-2xl p-4 border-2 ${submittedCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {submittedCorrect ? <CheckCircle size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-rose-500" />}
                <span className={`text-[13px] font-black ${submittedCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {submittedCorrect ? '정답!' : '오답'}
                </span>
              </div>
              {!submittedCorrect && (
                <div className="text-[12px] space-y-1 ml-1">
                  <div className="text-rose-500"><span className="font-bold">내가 쓴 답: </span>{inputVal || '(공백)'}</div>
                  <div className="text-emerald-700 font-black"><span className="font-bold">실제 뜻: </span>{currentWord.korean}</div>
                </div>
              )}
            </div>
            <button onClick={handleNext}
              className="w-full h-12 bg-foreground text-background rounded-2xl font-black text-[14px] hover:-translate-y-0.5 active:scale-95 transition-all shadow flex items-center justify-center gap-2">
              {idx + 1 >= words.length ? '결과 보기' : '다음'} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <button onClick={onExit} className="shrink-0 text-[11px] text-accent/40 font-bold py-3 text-center mt-2 hover:text-rose-500 transition-colors">
        ← 시험 포기하고 처음으로
      </button>
    </div>
  );
}

// Vocab Result Screen
function VocabResultScreen({ results, onRestart }: { results: VocabResult[]; onRestart: () => void }) {
  const router = useRouter();
  const score = results.filter(r => r.correct).length;
  const pct = results.length > 0 ? Math.round((score / results.length) * 100) : 0;
  const wrong = results.filter(r => !r.correct);
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-6 py-10 pb-24">
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-xl mx-auto mb-4 ${pct >= 90 ? 'bg-emerald-500 text-white' : pct >= 70 ? 'bg-amber-400 text-white' : 'bg-foreground text-background'}`}>
          <span className="text-3xl font-black">{pct}</span>
        </div>
        <h2 className="text-2xl text-foreground serif">뜻쓰기 완료</h2>
        <p className="text-[13px] text-accent mt-1 font-medium">{score}/{results.length}개 정답</p>
        {pct >= 90 && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[11px] font-black">
            <Stamp size={12} /> 뜻쓰기 PASS 인장이 찍혔어요! 🎉
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
                  <span className="ml-auto text-[9px] px-2 py-0.5 rounded-lg font-black bg-purple-100 text-purple-600">뜻쓰기</span>
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
          <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3">정답 ({score}개)</h3>
          <div className="space-y-1.5">
            {results.filter(r => r.correct).map((r, i) => (
              <div key={i} className="px-4 py-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                <span className="text-[13px] font-bold text-foreground">{r.word.word}</span>
                <span className="ml-auto text-[12px] text-emerald-600 font-black">{r.word.korean}</span>
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

'@

# Blank separator line
$blankLine = ''

# Assemble new file
$newLines = @()
$newLines += $before          # lines 1-86 unchanged
$newLines += $newStamp        # New stamps + IntroScreen
$newLines += $resultScreen    # lines 301-390 ResultScreen unchanged
$newLines += $newVocabSection # VocabWritingTest + VocabResultScreen (NEW)
$newLines += $gameMode        # lines 392-678 GameMode unchanged
$newLines += $mainFunc        # lines 679+ main function (to be patched separately)

# Write (use Out-File for reliable UTF-8)
$output = $newLines -join "`n"
$output | Out-File -FilePath $file -Encoding utf8 -NoNewline

Write-Host "Patch 1 applied: stamps + IntroScreen + VocabWritingTest + VocabResultScreen"
Write-Host "Total new lines: $($newLines.Count)"
