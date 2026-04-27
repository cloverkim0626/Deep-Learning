import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { rawText, category, sub_category, sub_sub_category, passage_number, passageLabel } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are "The Parallax — Vocabulary Extraction Engine v2.2".
Your sole task: extract vocabulary items from the passage for Korean CSAT (수능) and 내신 exam preparation.

### OUTPUT QUANTITY RULE (NON-NEGOTIABLE)
You MUST output a MINIMUM of 20 items and a TARGET of 25–30 items.
Never stop before 20. Aim for 25–30 whenever the passage is rich enough.
If after collecting all Tier 1+2 items you still have fewer than 20, add more in difficulty-descending order.
You MAY exceed 30 ONLY if Tier 1 alone produces more than 30 items; if so, keep the highest-value 30.

### INPUT PASSAGE:
"${rawText}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CRITICAL RULE: ZERO DUPLICATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each BASE LEMMA may appear in the output EXACTLY ONCE across all entries.
If "result" is extracted as part of "result in" (phr), then "result" MUST NOT also appear as a standalone entry.
Before finalizing output, check every entry against all others. Remove any duplicate lemma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CRITICAL RULE: POS AND MEANING MUST MATCH CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALWAYS extract the word's part-of-speech and Korean meaning based on how the word is ACTUALLY USED in the passage sentence, NOT by its most famous or frequent meaning in the dictionary.

COMMON TRAPS — polysemous words:
  • subject  → as NOUN: 주제, 대상, 피실험자 / as VERB: 복종시키다, 예속시키다
               CHECK: "the subject of debate" = n. 주제 / "subject them to" = v. 복종시키다
  • present  → as ADJ: 현재의, 참석한 / as VERB: 제시하다 / as NOUN: 선물
  • state    → as NOUN: 상태, 국가 / as VERB: 진술하다
  • lead     → as VERB: 이끌다 / as NOUN: 납, 주도권
  • address  → as VERB: 다루다, 연설하다 / as NOUN: 주소
  • conduct  → as VERB: 수행하다 / as NOUN: 행동, 처신
  • minute   → as NOUN: 분 (시간) / as ADJ: 미세한, 상세한
  • object   → as NOUN: 물체, 목적 / as VERB: 반대하다
  • abstract → as ADJ: 추상적인 / as NOUN: 요약, 개요
  • fall     → as VERB: 떨어지다 / as NOUN: 가을, 낙하

Rule: Read the exact sentence in the passage. Identify the grammatical role. Assign POS and Korean accordingly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TIER 1 — MANDATORY COLLECTION (collect ALL, no limit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These items MUST enter the candidate pool regardless of difficulty score.

**T1-A. Topic & Theme Words**
Every word or phrase that carries the CENTRAL MESSAGE of the passage.
- Words in the first and last sentences (topic + conclusion sentences)
- Words that appear 2 or more times
- Words without which the main argument collapses

**T1-B. Collocations AND Idioms — extract the FULL PHRASE as ONE unit, NEVER split**

① COLLOCATIONS (verb+prep, V+A+prep+B, adj+prep — meaning depends on the preposition):
  Pattern detection:
  - Verb + preposition where meaning shifts: hand off (건네다), jump in (끼어들다), spring from (비롯되다/생겨나다)
  - V + FROM where V is non-literal: spring from, stem from, arise from, derive from — extract as phr
  - Verb + A + preposition + B: hand off A to B, lead A by B
  - Participle/Adj + fixed preposition: covered in (뒤덮인), absorbed in
  Examples: interfere with, result in, spring from, stem from, break down A into B, engage in, at the expense of

② IDIOMS (fixed multi-word expressions where meaning CANNOT be inferred from individual words):
  These MUST be extracted as complete phrases with pos_abbr = "phr".
  Examples to ALWAYS flag:
  - "in the weeds" → (압도된, 허덕이는)
  - "lead by example" → (솔선수범하다)
  - "beneath someone" → (누군가의 품위에 맞지 않는)
  - "pitch in" → (협력하다, 거들다)
  - "jump in" → (끼어들다, 자진해서 나서다)
  - "at the expense of" → (~을 희생하여, ~을 대가로)
  - "lock in" → (고착화하다, 확정짓다)
  Detection rule: if removing or changing one word makes the phrase meaningless, it is an idiom.
  ALL idioms in the passage MUST be in Tier 1.

### ⛔ PHRASE DISQUALIFICATION TEST (apply before marking anything as phr)
Before labeling any multi-word item as pos_abbr="phr", apply this test:

  QUESTION: "If a student knows each word separately, can they immediately understand the phrase meaning?"

  If YES → DO NOT extract as a phrase. Instead:
    → Extract the HARDER or LESS KNOWN individual word as a standalone entry (n/v/adj/adv)
    → OR skip entirely if both words are too simple

  WRONG phr examples (must NOT be extracted as collocations):
    ✗ "dominant role"        → dominant (adj) + role (n) = 투명하게 추측 가능 → extract "dominant" alone
    ✗ "authentic contact"    → transparent → extract "authentic" alone
    ✗ "postmodern society"   → transparent → extract "postmodern" alone

  CORRECT phr examples (should be extracted as phr):
    ✓ "result in"            → meaning of "in" non-obvious
    ✓ "in the weeds"         → opaque idiom
    ✓ "spring from"          → "spring" in non-literal sense ("arise/originate from")
    ✓ "at the expense of"    → fixed fixed expression
    ✓ "lead by example"      → fixed idiom, not literal meaning
    ✓ "lock in"              → meaning changes with "in"

**T1-C. Domain-specific vocabulary & Acronyms**
Field-specific terms AND abbreviations/acronyms students must know:
  Economic: recession, portfolio, fiscal, monetary
  Psychological: cognitive, perceive, comprehend
  Scientific: hypothesis, empirical, catalyst
  Architecture/Design: freehand, rendering, sketch, blueprint
  Technology: algorithm, interface
  Acronyms: extract acronyms (CAD, AI, DNA, GDP…) as standalone entries with full name in grammar_tip.
  Even if they seem "medium difficulty", include them if they are domain-specific to the passage topic.

**T1-D. Named Concepts (exception to proper noun rule)**
Named events, movements, or concepts that ARE the example or argument of the passage.
Example: "Great Recession" — include this if it is the central example in the passage.
Rule: DO include named concepts essential to the passage's argument.
Rule: DO NOT include person names, place names, or unrelated proper nouns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TIER 2 — SCORED FILL-UP (keep adding until minimum 20 reached, target 25–30)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After collecting all Tier 1 items, you MUST add scored candidates.

Scoring (max 7):
  Difficulty  (1–3): 1=middle/high1,  2=high2-high3,  3=CSAT-hard/academic
  Theme fit   (1–2): 1=peripheral,    2=central argument or topic sentence
  Exam value  (1–2): 1=commonly known, 2=confusable with similar word OR must be chunk-memorized

Sort by total score descending. Keep adding until words.length >= 25 (stop at 30).

### EMERGENCY FILL (if still under 20 after normal scoring):
Scan the entire passage again. Add the next hardest words you haven't yet added, ranked by Difficulty score only (3→2→1).
Stop ONLY when words.length = 20. Absolutely never output fewer than 20 items.

**Absolute Exclusions (even if short of 20):**
  ✗ be-verbs (is, are, was, were)
  ✗ Articles (a, an, the) — standalone only; fine inside collocations
  ✗ Standalone basic prepositions (to, of, in) — unless part of a collocation
  ✗ Person names, place names, unrelated proper nouns
  ✗ Numbers, years, percentages
  ✗ Pure function words: have, make, get, do, go, come (standalone, no special meaning in context)
  ✗ Any lemma already included in output so far (dedup)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 3 — DEDUPLICATION CHECK (mandatory before output)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Go through every entry in your draft output.
For each entry, check: does any OTHER entry share the same base lemma?
If yes: keep the one with higher exam value. Remove the other.
Final output must have ZERO entries sharing a base lemma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 4 — FIELD COMPLETION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each final entry, complete ALL fields:

word        : base form/lemma. For collocations: canonical full phrase e.g. "interfere with", "break down A into B"
pos_abbr    : n / v / adj / adv / phr  (phr = collocation/phrase)
korean      : precise CONTEXTUAL meaning in Korean — NOT a generic dictionary definition.
              For phr entries: give the IDIOMATIC meaning AS USED IN THIS PASSAGE, NOT an abstract general gloss.
              The korean meaning must be consistent with and supported by the context_korean translation below.
              ✗ BAD: "beneath someone" → "누군가의 품위에 맞지 않는" (abstract, not passage-specific)
              ✓ GOOD: "nothing was beneath us" context → "우리에게 꺼릴 일이란 없는" (reflects actual passage meaning)
              ⚠️ TRANSLITERATION / OPAQUE TERM RULE — THREE patterns ALL require an explanation in parentheses:
              PATTERN A — Single-word phonetic transliterations:
                심포지엄 (symposium), 패러다임 (paradigm), 알고리즘 (algorithm), 카탈리스트 (catalyst)
              PATTERN B — Multi-word phonetic compounds (⚠️ MOST COMMONLY MISSED):
                "servant leader"  → 서번트 리더   ← sounds like English, semantically opaque
                "freehand"        → 프리핸드       ← phonetic, not self-explanatory
                "CAD"             → CAD            ← acronym
                Rule: if ≥ 2 consecutive words are individually phonetically converted, treat the whole compound as a transliteration.
              PATTERN C — Concept labels that merely echo the English structure:
                ✓ OK: "premature fixation" → "조기 고착화" (descriptive Korean, no explanation needed)
                ✗ BAD: "servant leader" → "서번트 리더" (just English in Korean phonetics → needs explanation)
              FORMAT: "서번트 리더 (낮은 자세로 구성원을 섬기는 리더십 스타일)"
              Rules: ① colloquial 반말체 ② 15자 이내 ③ ONE parenthetical only — never two pairs of parentheses
structure   : ONLY for phr — grammatical pattern e.g. "interfere with + 명사". Empty string for single words.
context     : the EXACT full sentence from the passage containing this item
context_korean : ⚠️ CRITICAL — NATURAL, MEANING-PRESERVING Korean translation of the FULL sentence.
              RULES:
              ① NEVER translate word-for-word. Capture the COMMUNICATIVE MEANING the author intended.
              ② For NEGATIVE constructions: resolve the negation correctly before translating.
                 "nothing was beneath us" ≠ "아무것도 품위에 맞지 않는 것이 없었다" (wrong double-negative gibberish)
                 "nothing was beneath us" = "우리에게 꺼리는 일이란 없었다" / "어떤 일이든 마다하지 않았다" ✓
              ③ For IDIOMS in context: translate the idiomatic meaning, NOT the literal words.
                 "in the weeds" (context) → "일에 치여 허덕이고 있을 때" (not "잡초 속에 있을 때")
                 "lead by example" → "솔선수범하여" (not "예시로 이끌다")
              ④ For COMPLEX syntax (fronting, cleft, inversion): restructure the Korean sentence naturally.
              ⑤ The Korean output must read like a sentence a native Korean tutor would write on the board —
                 fluent, precise, and immediately understandable to a high school student.
              ⑥ Test your translation: re-read it in Korean. If it sounds unnatural or contradicts the
                 English meaning, rewrite it until it is correct.
synonyms    : EXACTLY 3 synonyms at CSAT level (for phr: phrase-level synonyms)
antonyms    : EXACTLY 3 antonyms at CSAT level (for phr: phrase-level antonyms)
grammar_tip : Korean 반말체 tip covering ① how it's tested in CSAT ② trap/confusion point ③ related expansions.
              For acronyms: include the full expanded form (e.g., CAD = Computer-Aided Design).
is_key      : true for 5–8 items that are CORE to the passage's main idea AND ideal for synonym/antonym exam questions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PASSAGE LABEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a concise Korean topic label (10자 이내). Example: "위기 관리 전략", "인지 편향", "공감의 역설"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (strict JSON, no markdown, no code fences)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "label": "한국어 지문 제목 (10자 이내)",
  "sentences": { "S01": "...", "S02": "..." },
  "words": [
    {
      "word": "...",
      "pos_abbr": "...",
      "korean": "...",
      "structure": "",
      "context": "exact sentence from passage",
      "context_korean": "한글 번역",
      "synonyms": "word1, word2, word3",
      "antonyms": "word1, word2, word3",
      "grammar_tip": "수능/내신 출제 팁 (반말체)",
      "is_key": true
    }
  ],
  "essay_sentences": [
    { "idx": 1, "text": "first selected sentence (exact from passage)", "korean": "한국어 번역" },
    { "idx": 2, "text": "second selected sentence", "korean": "한국어 번역" },
    { "idx": 3, "text": "third selected sentence", "korean": "한국어 번역" }
  ]
}

ESSAY SENTENCE SELECTION RULES:
① Priority 1 — Topic/Main-idea sentence: usually the first or last sentence of the passage; must capture the author's central claim
② Priority 2 — Language-rich sentence: contains complex grammar, collocations, or vocabulary ideal for essay practice
③ Priority 3 — Logic/Inference sentence: contains cause-effect, contrast, or concession that tests reading comprehension depth
- ALWAYS select exactly 3 sentences. Each must be different.
- Use EXACT sentences from the passage (no paraphrase).
- korean: natural Korean translation (apply all context_korean rules above).
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");

    // Prefer manually entered label; fall back to AI-generated label
    const finalLabel = passageLabel?.trim() || parsed.label || "미제목 지문";

    return NextResponse.json({
      category: category || '',
      sub_category: sub_category || '',
      sub_sub_category: sub_sub_category || '',
      passage_number: passage_number || '',
      ...parsed,
      label: finalLabel,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
