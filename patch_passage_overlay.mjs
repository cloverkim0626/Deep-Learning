import { readFileSync, writeFileSync } from 'fs';

const file = 'src/app/admin/dashboard/content/page.tsx';
let c = readFileSync(file, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1: PassageWordOverlay 컴포넌트를 LibraryWordPanel 앞에 삽입
// ─────────────────────────────────────────────────────────────────────────────
const MARKER = `// ─── Library Word Panel (오른쪽 슬라이드 패널 — 전체저장 + 재분석) ─────────────────`;

const OVERLAY_COMP = `// ─── Passage Word Overlay ────────────────────────────────────────────────────
// 편집 탭 → 지문 상단 55% 오버레이: 단어 클릭=앵커, Shift+클릭=고정
function PassageWordOverlay({ fullText, words, initLocked, onClose, onConfirm }: {
  fullText: string;
  words: { id: string; word: string; test_synonym?: boolean; test_antonym?: boolean }[];
  initLocked: Set<string>;
  onClose: () => void;
  onConfirm: (locked: Set<string>) => void;
}) {
  const [localLocked, setLocalLocked] = useState<Set<string>>(() => new Set(initLocked));
  const [anchored, setAnchored] = useState<string | null>(null);

  // 지문을 토큰 배열로 분리 (영문 단어 / 공백+구두점)
  const tokens: string[] = [];
  let buf = '';
  for (const ch of fullText) {
    if (/[a-zA-Z'\\-]/.test(ch)) {
      buf += ch;
    } else {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(ch);
    }
  }
  if (buf) tokens.push(buf);

  const isWord = (tok: string) => /^[a-zA-Z]/.test(tok);
  const cleanKey = (tok: string) => tok.replace(/[^a-zA-Z'\\-]/g, '').toLowerCase();

  const wordMap = new Map(words.map(w => [w.word.toLowerCase(), w]));

  const handleClick = (tok: string, shiftKey: boolean) => {
    if (!isWord(tok)) return;
    const key = cleanKey(tok);
    if (!key) return;
    if (shiftKey) {
      setLocalLocked(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    } else {
      setAnchored(prev => prev === key ? null : key);
    }
  };

  const lockedArr = Array.from(localLocked);

  return (
    <div className="fixed inset-0 z-[600] flex flex-col" style={{background:'rgba(10,15,30,0.93)',backdropFilter:'blur(14px)'}}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-white/10">
        <div>
          <h3 className="text-[15px] font-black text-white">📖 지문 단어 클릭 선택</h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            클릭 → 앵커(하이라이트) &nbsp;|&nbsp;
            <kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px] font-mono">Shift</kbd>+클릭 → 고정/해제 &nbsp;|&nbsp;
            고정: <span className="text-yellow-300 font-black">{localLocked.size}개</span>
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
          <X size={17} />
        </button>
      </div>

      {/* 지문 영역 (상단 55%) */}
      <div className="overflow-y-auto px-6 py-6" style={{height:'55vh', flexShrink:0}}>
        <div className="max-w-3xl mx-auto leading-[2.6] text-[15.5px] font-serif select-none">
          {tokens.map((tok, i) => {
            if (!isWord(tok)) return <span key={i} className="text-slate-400">{tok}</span>;
            const key = cleanKey(tok);
            const isLocked = localLocked.has(key);
            const isAnchored = anchored === key;
            const meta = wordMap.get(key);
            const isKnown = !!meta;
            return (
              <span
                key={i}
                onClick={e => handleClick(tok, e.shiftKey)}
                className="cursor-pointer rounded px-0.5 transition-all duration-100"
                style={{
                  background: isLocked
                    ? 'rgba(251,191,36,0.30)'
                    : isAnchored
                    ? 'rgba(99,102,241,0.40)'
                    : isKnown
                    ? 'rgba(255,255,255,0.05)'
                    : 'transparent',
                  color: isLocked
                    ? '#fde68a'
                    : isAnchored
                    ? '#c7d2fe'
                    : isKnown
                    ? '#cbd5e1'
                    : '#64748b',
                  fontWeight: isLocked || isAnchored ? 700 : isKnown ? 500 : 400,
                  textDecoration: isAnchored ? 'underline' : 'none',
                  textDecorationColor: '#818cf8',
                  outline: isAnchored ? '1.5px solid rgba(99,102,241,0.5)' : 'none',
                  borderRadius: 4,
                }}
                title={meta ? [meta.test_synonym && '유의어', meta.test_antonym && '반의어'].filter(Boolean).join('/') || undefined : undefined}
              >
                {tok}
              </span>
            );
          })}
        </div>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-white/10 mx-6 shrink-0" />

      {/* 고정 단어 목록 (나머지 공간) */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[11px] font-black text-white/40 uppercase tracking-widest">고정된 단어 ({lockedArr.length}개)</p>
          <div className="flex gap-3">
            <button onClick={() => setLocalLocked(new Set())} className="text-[10px] font-black text-white/30 hover:text-rose-400 transition-colors">전체 해제</button>
            <button onClick={() => setLocalLocked(new Set(words.map(w => w.word.toLowerCase())))} className="text-[10px] font-black text-white/30 hover:text-yellow-300 transition-colors">단어 전체 고정</button>
          </div>
        </div>
        {lockedArr.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/20 text-[13px] font-bold">
            Shift+클릭으로 단어를 고정하세요
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lockedArr.map(key => {
              const meta = wordMap.get(key);
              return (
                <div key={key} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border"
                  style={{background:'rgba(251,191,36,0.12)',borderColor:'rgba(251,191,36,0.25)'}}>
                  <span className="text-[13px] font-black" style={{color:'#fde68a'}}>{key}</span>
                  {meta && (
                    <div className="flex gap-0.5">
                      {meta.test_synonym && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">유</span>}
                      {meta.test_antonym && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">반</span>}
                    </div>
                  )}
                  <button onClick={() => setLocalLocked(prev => { const n=new Set(prev); n.delete(key); return n; })} className="text-white/25 hover:text-rose-400 transition-colors ml-0.5">
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 확정 버튼 */}
      <div className="px-6 py-4 border-t border-white/10 shrink-0 flex gap-3">
        <button onClick={onClose} className="flex-1 h-12 rounded-2xl border border-white/15 text-[13px] font-black text-white/40 hover:text-white hover:border-white/30 transition-all">취소</button>
        <button onClick={() => onConfirm(localLocked)} className="flex-[2] h-12 rounded-2xl text-[13px] font-black text-white hover:-translate-y-0.5 transition-all shadow-xl"
          style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)'}}>
          ✓ 고정 확정 ({localLocked.size}개)
        </button>
      </div>
    </div>
  );
}

`;

if (c.includes(MARKER)) {
  c = c.replace(MARKER, OVERLAY_COMP + MARKER);
  console.log('✅ PATCH 1: PassageWordOverlay inserted');
} else {
  console.log('❌ PATCH 1: marker not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2: LibraryWordPanel에 overlay state 추가 (savingPassage 뒤)
// ─────────────────────────────────────────────────────────────────────────────
const ST_OLD = `  const [savingPassage, setSavingPassage] = useState(false);\r\n\r\n  // 재분석 모드 상태`;
const ST_NEW = `  const [savingPassage, setSavingPassage] = useState(false);\r\n\r\n  // 인터랙티브 지문 오버레이 상태\r\n  const [passageOverlay, setPassageOverlay] = useState(false);\r\n  const [lockedWords, setLockedWords] = useState<Set<string>>(() =>\r\n    new Set(set.words.filter(w => w.test_synonym || w.test_antonym).map(w => w.word.toLowerCase()))\r\n  );\r\n\r\n  // 재분석 모드 상태`;

if (c.includes(ST_OLD)) {
  c = c.replace(ST_OLD, ST_NEW);
  console.log('✅ PATCH 2: overlay state added');
} else {
  console.log('❌ PATCH 2: state marker not found');
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 3: passage 탭에 오버레이 버튼 + PassageWordOverlay 렌더링 추가
// ─────────────────────────────────────────────────────────────────────────────
const PASS_OLD = `          <div>\r\n            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">지문 원문 (full text)</label>\r\n            <textarea value={editFullText} onChange={e => setEditFullText(e.target.value)}\r\n              rows={12}\r\n              className="w-full p-3 rounded-2xl border border-foreground/10 bg-white text-[11.5px] leading-relaxed font-serif outline-none resize-none focus:border-foreground/30 transition-colors" />\r\n          </div>\r\n          <button onClick={handleSavePassage} disabled={savingPassage}\r\n            className="w-full h-11 bg-foreground text-background rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40">\r\n            <Save size={14} /> {savingPassage ? '저장 중...' : '지문 정보 저장'}\r\n          </button>\r\n          <p className="text-[9px] text-accent/50 text-center">저장된 정보는 탐색기 카드 및 학생 배당 목록에 즉시 반영됩니다</p>\r\n        </div>\r\n      )}`;

const PASS_NEW = `          <div>\r\n            <label className="text-[9px] font-black text-accent uppercase tracking-widest block mb-1">지문 원문 (full text)</label>\r\n            <textarea value={editFullText} onChange={e => setEditFullText(e.target.value)}\r\n              rows={8}\r\n              className="w-full p-3 rounded-2xl border border-foreground/10 bg-white text-[11.5px] leading-relaxed font-serif outline-none resize-none focus:border-foreground/30 transition-colors" />\r\n          </div>\r\n          {editFullText.trim() && (\r\n            <button onClick={() => setPassageOverlay(true)}\r\n              className="w-full h-11 rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg text-white"\r\n              style={{background:'linear-gradient(135deg,#6366f1,#4338ca)'}}>\r\n              🖱️ 지문에서 단어 클릭 선택 ({lockedWords.size}개 고정)\r\n            </button>\r\n          )}\r\n          <button onClick={handleSavePassage} disabled={savingPassage}\r\n            className="w-full h-11 bg-foreground text-background rounded-2xl font-black text-[13px] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40">\r\n            <Save size={14} /> {savingPassage ? '저장 중...' : '지문 정보 저장'}\r\n          </button>\r\n          <p className="text-[9px] text-accent/50 text-center">저장된 정보는 탐색기 카드 및 학생 배당 목록에 즉시 반영됩니다</p>\r\n        </div>\r\n      )}\r\n\r\n      {/* PassageWordOverlay */}\r\n      {passageOverlay && (\r\n        <PassageWordOverlay\r\n          fullText={editFullText}\r\n          words={words}\r\n          initLocked={lockedWords}\r\n          onClose={() => setPassageOverlay(false)}\r\n          onConfirm={(locked) => {\r\n            setLockedWords(locked);\r\n            // 단어 필드 유/반 상태를 locked 기준으로 동기화 (locked에 없으면 두 값 모두 false)\r\n            setWords(prev => prev.map(w => {\r\n              const key = w.word.toLowerCase();\r\n              return locked.has(key) ? w : { ...w, test_synonym: false, test_antonym: false };\r\n            }));\r\n            setDirty(true);\r\n            setPassageOverlay(false);\r\n          }}\r\n        />\r\n      )}`;

if (c.includes(PASS_OLD)) {
  c = c.replace(PASS_OLD, PASS_NEW);
  console.log('✅ PATCH 3: passage tab + overlay render added');
} else {
  console.log('❌ PATCH 3: passage tab block not found');
}

writeFileSync(file, c, 'utf8');
console.log('Final size:', c.length);
