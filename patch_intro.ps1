$file = 'src\app\(student)\dashboard\word-test\page.tsx'
$all = Get-Content $file -Encoding UTF8

# New IntroScreen content (replaces lines 87-322, i.e. indices 86-321)
$newSection = @'
// ─── Intro Screen (뜻쓰기 + 유반의어 이중 토글) ──────────────────────────────
function IntroScreen({
  sets,
  synonymPassedSetIds,
  vocabPassedSetIds,
  onStartVocab,
  onStartQuiz,
  onStartGame,
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

  const toggleV = (id: string) =>
    setVocabIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleS = (id: string) =>
    setSynonymIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

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

  // 체크박스 왼쪽 인라인 PASS 문양
  const MiniPass = ({ passed, color }: { passed: boolean; color: 'emerald' | 'sky' }) => {
    if (!passed) return <span className="w-7 shrink-0" />;
    const cls = color === 'emerald'
      ? 'border-emerald-400 text-emerald-600 bg-emerald-50/80'
      : 'border-sky-400 text-sky-600 bg-sky-50/80';
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-[18px] border rounded shrink-0 select-none ${cls}`}
        style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '1.2px', transform: 'rotate(-7deg)', lineHeight: 1 }}
      >
        PASS
      </span>
    );
  };

  // 뜻쓰기 토글
  const VocabToggle = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 ${
        checked
          ? 'bg-emerald-500 shadow-md shadow-emerald-300/40 scale-[1.05]'
          : 'bg-foreground/[0.04] border border-foreground/10 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
    >
      {checked
        ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <span className="text-[9px] font-black text-foreground/25">뜻</span>
      }
    </button>
  );

  // 유반의어 토글
  const SynonymToggle = ({ checked, onToggle }: { checked: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 ${
        checked
          ? 'bg-sky-500 shadow-md shadow-sky-300/40 scale-[1.05]'
          : 'bg-foreground/[0.04] border border-foreground/10 hover:border-sky-300 hover:bg-sky-50'
      }`}
    >
      {checked
        ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <span className="text-[9px] font-black text-foreground/25">유·반</span>
      }
    </button>
  );

  // 뜻쓰기열/유반의어열 고정 너비 (PASS 28px + gap 6px + toggle 36px)
  const COL = 'w-[72px]';

  return (
    <div className="flex flex-col h-full px-5 py-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <div className="w-10 h-10 rounded-[0.9rem] bg-foreground text-background flex items-center justify-center shadow-md shrink-0">
          <Trophy size={18} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[17px] font-black text-foreground">어휘 테스트</h1>
          <p className="text-[11px] text-accent/70 font-medium">
            <span className="text-emerald-500 font-black">뜻쓰기</span>
            <span className="text-accent/30 mx-1">·</span>
            <span className="text-sky-500 font-black">유의어</span>
            <span className="text-accent/30 mx-1">·</span>
            <span className="text-rose-500 font-black">반의어</span>
          </p>
        </div>
      </div>

      {/* 컬럼 헤더: [spacer] [전체선택] [뜻쓰기 col] [유반의어 col] */}
      <div className="flex items-center mb-2 shrink-0">
        <div className="flex-1" />
        <button
          onClick={selectAll}
          className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl mr-1.5 transition-all ${
            allSelected
              ? 'bg-foreground text-background'
              : 'bg-foreground/[0.05] text-accent/70 hover:bg-foreground/10'
          }`}
        >
          {allSelected ? '전체해제' : '전체선택'}
        </button>
        <div className={`${COL} text-center`}>
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide">뜻쓰기</span>
        </div>
        <div className={`${COL} text-center`}>
          <span className="text-[9px] font-black text-sky-600 uppercase tracking-wide">유반의어</span>
        </div>
      </div>

      {/* 세트 목록 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-[7px] pb-2">
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <AlertCircle size={32} className="text-accent/25 mb-3" />
            <p className="text-[13px] font-bold text-accent">배당된 세트가 없어요.</p>
          </div>
        ) : sets.map(s => {
          const vC = vocabIds.has(s.id);
          const sC = synonymIds.has(s.id);
          const vocabPassed = vocabPassedSetIds.has(s.id);
          const synPassed = synonymPassedSetIds.has(s.id);
          // 출처 (교재·섹션·지문번호) — 크게 표시
          const source = [s.workbook, s.chapter, s.passageNumber].filter(Boolean).join(' · ');
          const synCount = s.words.filter(w => w.testSynonym).length;
          const antCount = s.words.filter(w => w.testAntonym).length;

          return (
            <div
              key={s.id}
              className={`flex items-center rounded-2xl border px-3 py-3 transition-all ${
                (vC || sC)
                  ? 'border-foreground/15 shadow-sm bg-white'
                  : 'border-foreground/[0.07] bg-white/50'
              }`}
            >
              {/* 지문 정보: 출처 크게, 제목 작게 */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[12.5px] font-black text-foreground truncate leading-snug">{source}</div>
                <div className="text-[10.5px] text-accent/50 truncate mt-0.5">{s.label}</div>
                <div className="text-[9px] text-accent/28 mt-0.5">
                  {s.words.length}단어&nbsp;·&nbsp;유{synCount}&nbsp;반{antCount}
                </div>
              </div>

              {/* 뜻쓰기 열: [PASS or 공백] + [toggle] */}
              <div className={`${COL} flex items-center justify-center gap-1.5 shrink-0`}>
                <MiniPass passed={vocabPassed} color="emerald" />
                <VocabToggle checked={vC} onToggle={() => toggleV(s.id)} />
              </div>

              {/* 유반의어 열: [PASS or 공백] + [toggle] */}
              <div className={`${COL} flex items-center justify-center gap-1.5 shrink-0`}>
                <MiniPass passed={synPassed} color="sky" />
                <SynonymToggle checked={sC} onToggle={() => toggleS(s.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 요약 + 시작 버튼 */}
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
            <button
              onClick={() => setShowModeModal(true)}
              className="h-12 px-6 bg-foreground text-background font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all shrink-0"
            >
              시작 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 모드 선택 모달 */}
      {showModeModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-background rounded-[2rem] border border-foreground/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-black text-foreground">테스트 방식 선택</h3>
              <button onClick={() => setShowModeModal(false)} className="p-1.5 rounded-xl hover:bg-foreground/5 text-accent">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { if (vocabIds.size > 0) handleMode('vocab'); }}
                disabled={vocabIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  vocabIds.size > 0 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center text-lg transition-all">🖊</div>
                  <span className="text-[14px] font-black text-foreground">뜻쓰기 테스트</span>
                  {vocabIds.size > 0 && <span className="text-[9px] ml-auto text-emerald-600 font-black">{vocabWordCount}단어</span>}
                </div>
                <p className="text-[11px] text-accent pl-12">영어 단어를 보고 한국어 뜻을 직접 입력 · 90% PASS</p>
              </button>

              <button
                onClick={() => { if (synonymIds.size > 0) handleMode('quiz'); }}
                disabled={synonymIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  synonymIds.size > 0 ? 'border-foreground/10 bg-white hover:border-foreground/30' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-all">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 객관식</span>
                  {synonymIds.size > 0 && <span className="text-[9px] ml-auto text-sky-600 font-black">유{totalSyn}+반{totalAnt}문제</span>}
                </div>
                <p className="text-[11px] text-accent pl-12">4지선다 유의어/반의어 선택 · 90% PASS</p>
              </button>

              <button
                onClick={() => { if (synonymIds.size > 0) handleMode('game'); }}
                disabled={synonymIds.size === 0}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 group ${
                  synonymIds.size > 0 ? 'border-sky-200 bg-sky-50 hover:border-sky-400' : 'border-foreground/5 opacity-30 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 group-hover:bg-sky-500 flex items-center justify-center transition-all">
                    <Gamepad2 size={16} className="text-sky-600 group-hover:text-white" />
                  </div>
                  <span className="text-[14px] font-black text-foreground">유반의어 — 짝 찾기 게임</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-sky-500 text-white rounded-full font-black">NEW</span>
                </div>
                <p className="text-[11px] text-accent pl-12">표제어&lt;-&gt;유/반의어 짝 맞추기 · 제한시간 PASS</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'@

# Find line 86 = where newSection starts (0-indexed), and line 321 = where it ends (0-indexed)
# Lines 87-322 in 1-indexed = indices 86-321
$before = $all[0..85]         # indices 0-85 (lines 1-86)
$after  = $all[322..($all.Length-1)]  # indices 322+ (line 323+)

$newLines = $before + $newSection.Split("`n") + $after

Write-Host "Before: $($all.Length) lines, After: $($newLines.Length) lines"
$newLines | Out-File $file -Encoding UTF8
Write-Host "Done!"
