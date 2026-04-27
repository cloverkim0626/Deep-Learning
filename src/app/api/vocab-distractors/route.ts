import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 정밀 고등영어 오답 프롬프트 v3 ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an English vocabulary test designer for Korean high school students (수능/내신).

TASK: For each English word + its ONE correct Korean meaning, generate exactly 5 WRONG Korean distractor choices.

══════════════════════════════════════
🚫 HARD PROHIBITIONS — any violation invalidates the entire response
══════════════════════════════════════
1. NEVER include ANY valid Korean meaning of the target word as a distractor.
   Many English words have multiple valid Korean translations — ALL of them are forbidden.
   THINK: "Could a native Korean speaker ever translate this English word as this distractor?"
   If YES → BANNED unconditionally.

   Each input line may include a "banned:" field listing ALL valid Korean meanings (comma-separated).
   Every meaning in the banned: field is equally FORBIDDEN as a distractor — not just the correct: one.
   Example: "suggest | correct:제안하다 | banned:제안하다, 암시하다, 내비치다"
   → "제안하다", "암시하다", "내비치다" are ALL banned as distractors.

   Concrete examples of banned patterns:
   • variety → correct: 다양성  ❌BANNED: 종류, 가지, 유형, 각종  (all mean variety)
   • location → correct: 위치  ❌BANNED: 장소, 곳, 지점  (all mean location)
   • cause → correct: 원인  ❌BANNED: 이유, 까닭, 사유  (all mean cause)
   • combine → correct: 결합하다  ❌BANNED: 혼합하다, 합치다, 합하다  (all mean combine)
   • exploration → correct: 탐구  ❌BANNED: 탐험, 탐색  (all mean exploration)
   • gatekeeper → correct: 문지기  ❌BANNED: 경비원, 문을 지키는 사람  (all mean gatekeeper)
   • narrowing → correct: 좁아지는  ❌BANNED: 축소되는, 줄어드는  (all mean narrowing)
   • absorbed → correct: 몰두한  ❌BANNED: 흡수된  (also valid for absorbed)

2. NEVER show English words or romanized forms in distractors — Korean only.

3. NEVER repeat the same distractor within one word's set.

4. NEVER use vague/abstract fillers like "그것", "어떤 것", "방식" unless it is a specific, clearly wrong meaning.

5. NORMALIZE the headword mentally: if the English word is an inflected form (narrowing, absorbed, etc.), treat it as its base form (narrow, absorb) and ban all valid translations of that base form.

══════════════════════════════════════
✅ HOW TO BUILD GOOD DISTRACTORS
══════════════════════════════════════
Each set of 5 distractors should use these 5 distinct approaches:

1. ADJACENT DOMAIN: a Korean word from a related but clearly different field
   (e.g., for "absorb=흡수하다" → use "전달하다" which is adjacent but wrong)

2. OPPOSITE ACTION: a Korean word meaning roughly the opposite
   (e.g., for "expand=확장하다" → use "축소하다")

3. VISUAL CONFUSION: exploit similar English spelling or pronunciation
   (e.g., adapt→adopt confusion → use translation of "adopt")

4. SAME POS, DIFFERENT DOMAIN: a word of the same part of speech but totally different field
   (e.g., for noun: different noun meaning; for verb: different verb meaning)

5. PLAUSIBLE TRAP: a distractor that seems related to the context but is clearly wrong
   (use the context sentence if provided as a clue for what might seem tempting)

══════════════════════════════════════
FORMAT
══════════════════════════════════════
- All distractors in Korean (한국어), max 10 characters each
- Output ONLY this JSON (no extra text, no markdown):
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

    // 캐시 없는 단어만 AI 생성
    const uncached = words.filter(w => !cachedMap.has(w.id));

    let newDistractors: { id: string; distractors: string[] }[] = [];

    if (uncached.length > 0) {
      // ── Step 2: AI 생성 (캐시 미스 단어만) ───────────────────────────────────
      const wordList = uncached
        .map(w => {
          // korean = 첫 번째 뜻 (정답지에 표시됨)
          // all_korean = 모든 유효 뜻 (banned 목록)
          const correctDisplay = w.korean; // already first-only from client
          const allValid = w.all_korean || w.korean; // comma-separated all meanings
          let line = `ID:${w.id} | ${w.word}(${w.pos_abbr}) | correct:${correctDisplay} | banned:${allValid}`;
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
