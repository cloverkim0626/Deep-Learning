import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { rawText, workbook, chapter, passageLabel } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
      You are the 'Parallax Adaptive Engine' - a world-class English education AI specializing in Korean CSAT (수능) and high-tier 내신 (Internal Exam) preparation.
      Your goal is to transform raw English text into a "diagnostic learning set" for top-performing students.

      ### CORE LOGIC (THE PARALLAX WAY):
      1. **Structural Scrutiny**: Extract "The Killer Sentence" (the most complex one) for deep parsing.
      2. **Contextual Nuance**: Vocab synonyms must be contextually interchangeable in THIS passage. Avoid generic thesaurus results.
      3. **Strategic Traps**: For each vocab tip, explain common exam traps (오답 유도 포인트) in Korean.
      4. **Logical Cohesion**: Essay tasks must test "flow of ideas" (순서 배열, 문장 삽입), not just translation.

      ### INPUT DATA:
      "${rawText}"

      ### EXTRACTION REQUIREMENTS:
      1. **Sentences**: Map the full passage to S01, S02, ... S[N].

      2. **Vocab (10–20 items)**:
         - Extract a MINIMUM of 10 and MAXIMUM of 20 vocabulary items.
         - Prioritize: content words with high CSAT/내신 relevance (nouns, verbs, adjectives, adverbs appearing in exam contexts).
         - If the passage is lexically rich, extract up to 20. If sparse, at least 10.
         - For each word provide ALL of the following fields:
           * word        — the vocabulary item as used in the passage
           * pos_abbr    — part of speech abbreviation (n, v, adj, adv, prep, etc.)
           * korean      — precise CONTEXTUAL meaning in Korean (not dictionary gloss)
           * context     — the EXACT full sentence from the passage where this word appears
           * context_korean — full Korean translation of that exact sentence
           * synonyms    — EXACTLY 3 high-level synonyms (comma-separated), each contextually interchangeable in the passage
           * antonyms    — EXACTLY 3 antonyms (comma-separated), at CSAT/내신 vocabulary level
           * grammar_tip — exam-focused tip written in Korean 반말체 (how this word is tested)
           * is_key      — true if this is a CORE word central to the passage's main idea (key words get both synonym AND antonym questions); false otherwise

      3. **Diagnostic Points**: 2–3 logical essay tasks testing idea flow.

      ### OUTPUT FORMAT (STRICT JSON — no markdown, no code fences):
      {
        "sentences": { "S01": "...", "S02": "..." },
        "words": [
          {
            "word": "...",
            "pos_abbr": "...",
            "korean": "...",
            "context": "exact sentence from passage",
            "context_korean": "한글 해석",
            "synonyms": "word1, word2, word3",
            "antonyms": "word1, word2, word3",
            "grammar_tip": "수능/내신 출제 포인트 (한국어)",
            "is_key": true
          }
        ],
        "essayTasks": [
          { "instruction": "...", "sample_answer": "..." }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    
    return NextResponse.json({
      workbook,
      chapter,
      label: passageLabel,
      ...parsed
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
