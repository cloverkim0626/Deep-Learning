import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 정밀 고등영어 오답 프롬프트 v5 ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert English vocabulary test designer for Korean high school students (수능/내신).

TASK: For each English word + its ONE correct Korean meaning, generate exactly 5 WRONG Korean distractor choices that are clearly incorrect yet tempting.

══════════════════════════════════════
🚫 HARD PROHIBITIONS — any violation invalidates the entire response
══════════════════════════════════════
1. THE BANNED LIST IS ABSOLUTE — zero exceptions.
   Every word/phrase listed after "banned:" is PERMANENTLY FORBIDDEN as a distractor, even if modified.

   MANY ENGLISH WORDS HAVE MULTIPLE VALID KOREAN TRANSLATIONS.
   The "banned:" field lists ALL valid translations. Every single one is forbidden.

   Example: presentation | correct:표현 | banned:표현, 발표, 설명, 제시
   → FORBIDDEN distractors: 표현, 발표, 설명, 제시, 발표하다, 발표 행위, 표현하다, 발표물 (any form)
   → ALLOWED distractors: 논쟁, 검토, 비교, 입장, 개요 (clearly different meanings)

   STEP-BY-STEP CHECK before using any distractor D:
   ① List all items in banned: [B1, B2, B3, ...]
   ② For each Bi: Does D contain Bi? Does Bi contain D? Are D and Bi synonymous in Korean?
   ③ If ANY answer is YES → discard D immediately and pick a different word
   ④ Only proceed with D if ALL answers are NO

   ⚠️ NEAR-SYNONYM TRAP (most common failure):
   Words that overlap in meaning even partially are BANNED:
   • instruction → correct:교육  BANNED:지도, 가르침, 훈련, 안내, 교습
   • variety → correct:다양성  BANNED:종류, 유형, 각종
   • presentation → correct:표현  BANNED:발표, 설명, 제시, 제출 (all valid translations)
   • combine → correct:결합하다  BANNED:혼합하다, 합치다
   • exploration → correct:탐구  BANNED:탐험, 탐색

2. NEVER show English words, romanized Korean, or transliterations as distractors.

3. NEVER repeat the same distractor within one word's set.

4. NEVER use vague/abstract fillers: 그것, 어떤 것, 방식 (unless specifically and clearly wrong).

5. NORMALIZE inflected forms: treat "narrowing" as "narrow", "absorbed" as "absorb".
   Ban ALL valid translations of the base form AND their verb/noun forms.

6. Each distractor must be max 10 Korean characters. No long explanations.

══════════════════════════════════════
✅ HOW TO BUILD EXCELLENT DISTRACTORS
══════════════════════════════════════
For each word, pick 5 from these strategies (vary the mix):

A. OPPOSITE: a word meaning the direct opposite
   (expand=확장하다 → 축소하다)

B. ADJACENT DOMAIN: related field but clearly wrong meaning
   (absorb=흡수하다 → 전달하다)

C. PHONETIC/SPELLING TRAP: exploit similar English word confusion
   (adapt vs adopt; effect vs affect)

D. SAME PART OF SPEECH, DIFFERENT MEANING: plausibly grammatical but wrong
   (noun→different noun; verb→different verb)

E. CONTEXT LURE: looks related to the sentence context but is factually wrong
   (use context sentence hint if provided)

F. COMMON STUDENT MISTAKE: a translation Korean students often confuse with the correct one

══════════════════════════════════════
FORMAT
══════════════════════════════════════
- All distractors in Korean (한국어 only), max 10 characters each
- Output ONLY valid JSON, no markdown, no extra text:
{"results":[{"id":"<id>","distractors":["오답1","오답2","오답3","오답4","오답5"]}]}`;




type InputWord = { id: string; word: string; pos_abbr: string; korean: string; context?: string; all_korean?: string; synonyms?: string; antonyms?: string };

export async function POST(req: NextRequest) {
  try {
    const { words } = await req.json() as { words: InputWord[] };
    if (!words || words.length === 0) return NextResponse.json({ distractors: [] });

    // ── Step 1: DB에서 기존 캐시 조회 ─────────────────────────────────────────
    const wordIds = words.map(w => w.id);
    const { data: cached } = await supabase
      .from('word_distractors')
      .select('word_id, distractors')
      .in('word_id', wordIds);

    const cachedMap = new Map<string, string[]>(
      (cached || []).map((r: { word_id: string; distractors: string[] }) => [r.word_id, r.distractors])
    );

    // ── 캐시 유효성 검증: banned 항목이 포함된 캐시는 제거 ────────────────────
    const invalidCacheWordIds: string[] = [];
    for (const w of words) {
      const cachedDistr = cachedMap.get(w.id);
      if (!cachedDistr) continue;
      const allValid = (w.all_korean || w.korean)
        .split(/[,，、\/]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const hasBannedInCache = cachedDistr.some(d =>
        allValid.some(banned =>
          d.trim().toLowerCase().includes(banned) || banned.includes(d.trim().toLowerCase())
        )
      );
      if (hasBannedInCache) {
        invalidCacheWordIds.push(w.id);
        cachedMap.delete(w.id);
      }
    }
    // 무효 캐시 DB에서 삭제 (백그라운드)
    if (invalidCacheWordIds.length > 0) {
      supabase.from('word_distractors').delete().in('word_id', invalidCacheWordIds)
        .then(({ error }) => { if (error) console.error('[cache invalidate]', error); });
    }

    // 캐시 없는 단어만 AI 생성
    const uncached = words.filter(w => !cachedMap.has(w.id));

    let newDistractors: { id: string; distractors: string[] }[] = [];

    if (uncached.length > 0) {
      // ── Step 2: AI 생성 (캐시 미스 단어만) ───────────────────────────────────
      const wordList = uncached
        .map(w => {
          const correctDisplay = w.korean; // already first-only from client
          const allValid = w.all_korean || w.korean; // comma-separated all meanings
          // banned 항목을 개별 나열하여 AI가 각각 인식하도록
          const bannedItems = allValid.split(/[,，、\/]/).map((s: string) => s.trim()).filter(Boolean);
          const bannedStr = bannedItems.join(' | ');
          let line = `ID:${w.id} | word:${w.word}(${w.pos_abbr}) | correct:${correctDisplay} | banned:[${bannedStr}]`;
          if (w.context) line += ` | ctx:${w.context.slice(0, 80)}`;
          return line;
        })
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: wordList },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      newDistractors = parsed.results || [];

      // ── Step 3: DB에 캐시 저장 (백그라운드) ──────────────────────────────────
      if (newDistractors.length > 0) {
        const rows = newDistractors
          .filter(d => d.distractors?.length === 5)
          .map(d => ({ word_id: d.id, distractors: d.distractors }));
        if (rows.length > 0) {
          supabase.from('word_distractors').upsert(rows, { onConflict: 'word_id' })
            .then(({ error }) => { if (error) console.error('[word_distractors upsert]', error); });
        }
      }
    }

    // ── Step 4: 캐시 + 신규 합산 반환 ────────────────────────────────────────
    const allResults = words.map(w => {
      if (cachedMap.has(w.id)) return { id: w.id, distractors: cachedMap.get(w.id)! };
      return newDistractors.find(d => d.id === w.id) || { id: w.id, distractors: [] };
    });

    return NextResponse.json({ distractors: allResults });
  } catch (err) {
    console.error('[vocab-distractors]', err);
    return NextResponse.json({ distractors: [] }, { status: 500 });
  }
}
