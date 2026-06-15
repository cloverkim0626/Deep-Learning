import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert English language teacher designing sentence-arrangement exercises for Korean high school students (수능/내신).

TASK: Given an English sentence, split it into meaningful chunks for a word-arrangement test.
Return the chunks as a JSON array of strings.

══════════════════════════════════════
CHUNKING RULES (apply in priority order)
══════════════════════════════════════

1. FIXED MULTI-WORD PHRASES — always keep together:
   • 3-word prepositional/conjunctive phrases:
     in spite of / in terms of / in order to / in addition to / as a result (of) /
     as a whole / as well as / as long as / as far as / on the other hand /
     with respect to / in other words / on the contrary / for the sake of /
     in front of / at the same time / in the case of / on the basis of
   • 2-word conjunctions/discourse markers:
     even though / even if / as if / as though / so that / rather than /
     such as / not only / in fact / in addition / in contrast / by contrast /
     for example / for instance / that is / in which / of which

2. VERB PHRASE — keep auxiliary + main verb together:
   • be-verb + past participle: is regarded / are considered / was seen / were known /
     is used / are called / have been / has been / had been / will be / would be /
     could be / should be / must be / can be / may be
   • modal + verb: would suggest / can provide / must consider

3. ARTICLE + (ADJECTIVE) + NOUN — keep article with its noun phrase:
   • the + noun: the government / the environment / the development / the process
   • the + adjective + noun: the democratic values / the social structure / the key factor
   • a/an + noun: a solution / an approach / an important role
   NOTE: Only group if the noun or adjective+noun clearly forms a semantic unit.
   DO NOT group "a" or "the" with adjectives that are predicate adjectives (after be-verbs).

4. PREPOSITIONAL PHRASE — preposition + article + noun (keep as unit when short):
   • in the world / of the society / to the problem / for the development / by the government

══════════════════════════════════════
HARD CONSTRAINTS
══════════════════════════════════════
• Total chunk count MUST be between 5 and 21 (inclusive). If the sentence is very long, group more aggressively.
• Each chunk should contain 1–5 words. No chunk should exceed 6 words.
• NEVER split an infinitive phrase (to + verb) across chunks.
• NEVER split a subject-verb unless necessary to meet the count limit.
• Punctuation (commas, periods) stays attached to the preceding word in its chunk.
• Output ONLY valid JSON array of strings. No explanation, no markdown, no extra text.

══════════════════════════════════════
EXAMPLES
══════════════════════════════════════

Input: "In spite of the challenges, democratic values have been considered the foundation of modern civilization."
Output: ["In spite of", "the challenges,", "democratic values", "have been considered", "the foundation", "of modern civilization."]

Input: "The ability to adapt to new environments is regarded as one of the most important skills in the modern world."
Output: ["The ability", "to adapt", "to new environments", "is regarded as", "one of", "the most important skills", "in the modern world."]

Input: "Even though social media platforms provide useful information, they can also spread misinformation rapidly."
Output: ["Even though", "social media platforms", "provide useful information,", "they can also", "spread misinformation", "rapidly."]

Input: "As a result of technological advancement, the way people communicate with each other has changed dramatically."
Output: ["As a result of", "technological advancement,", "the way", "people communicate", "with each other", "has changed", "dramatically."]`;

export async function POST(req: NextRequest) {
  try {
    const { sentence } = await req.json() as { sentence: string };
    if (!sentence?.trim()) {
      return NextResponse.json({ chunks: sentence.trim().split(/\s+/) });
    }

    const words = sentence.trim().split(/\s+/);
    // 20단어 이하면 API 불필요 (호출 측에서 이미 필터링하지만 방어)
    if (words.length <= 20) {
      return NextResponse.json({ chunks: words });
    }

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Split into chunks (5–21 total):\n"${sentence}"` },
      ],
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? '[]';
    // JSON 배열만 추출 (마크다운 코드블록 등 제거)
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response: ' + raw.slice(0, 100));

    const chunks: string[] = JSON.parse(match[0]);

    // 검증: 비어있거나 너무 많으면 단순 단어 분리로 fallback
    if (!Array.isArray(chunks) || chunks.length === 0) throw new Error('Empty chunks');

    // 21 초과 강제 병합 (안전망)
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

    return NextResponse.json({ chunks });
  } catch (e) {
    console.error('[essay-chunks] error:', e);
    // fallback: 단순 단어 분리
    try {
      const { sentence } = await req.json();
      return NextResponse.json({ chunks: (sentence as string).trim().split(/\s+/) });
    } catch {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }
}
