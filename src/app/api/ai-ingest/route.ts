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
You are the 'Parallax Adaptive Engine' — a world-class English education AI for Korean CSAT (수능) and 내신 preparation.
Extract a structured learning set from the given passage.

### INPUT PASSAGE:
"${rawText}"

### EXTRACTION RULES:

**PASSAGE LABEL (자동 제목 생성)**
- Summarize the passage's main topic as a concise Korean label (10자 이내)
- Use a keyword or short phrase, e.g. "인지 편향", "기억의 재구성", "공감의 역설"
- This becomes the passage's display title in the system.

**VOCABULARY — Extract EXACTLY 20 words. No more, no less.**

Priority order for selection (must include all of these types):
1. 🔴 HIGH-DIFFICULTY words: rare, academic, or C1/C2 CEFR-level vocab
2. 🎯 CORE THEME words: words that capture the passage's central argument or topic
3. 🔄 CONFUSABLE words: words commonly confused with similar ones in Korean CSAT
4. ⚡ TESTABLE words: words ideal for synonym/antonym substitution questions
5. 📌 Direction words: words that signal logical flow (contrast, concession, causation)

For each word, provide ALL fields:
- word: DICTIONARY BASE FORM (lemma/infinitive). If inflected in passage (e.g. "argues"→"argue", "arguments"→"argument"), always use base form.
- pos_abbr: part of speech (n, v, adj, adv, prep, conj)
- korean: precise CONTEXTUAL meaning in Korean (not generic dictionary gloss)
- context: the EXACT full sentence from the passage where this word appears
- context_korean: full Korean translation of that exact sentence
- synonyms: EXACTLY 3 high-level synonyms (comma-separated), each contextually interchangeable IN THIS PASSAGE. Must be at CSAT/내신 exam level.
- antonyms: EXACTLY 3 antonyms (comma-separated), at CSAT/내신 vocabulary level
- grammar_tip: exam-focused tip in Korean 반말체 — how this word is tested, common traps, distinction from similar words
- is_key: true if this is a CORE word that defines the passage's main idea AND is ideal for both synonym AND antonym questions. Mark the 5-8 most important words as true. Others false.

**SENTENCES**: Map the full passage to S01, S02, ... S[N].
**ESSAY TASKS**: 2-3 logical tasks testing idea flow (순서/빈칸/요약).

### OUTPUT FORMAT (strict JSON, no markdown, no code fences):
{
  "label": "자동 추출된 지문 제목 (한국어, 10자 이내)",
  "sentences": { "S01": "...", "S02": "..." },
  "words": [
    {
      "word": "...",
      "pos_abbr": "...",
      "korean": "...",
      "context": "exact sentence from passage",
      "context_korean": "한글 번역",
      "synonyms": "word1, word2, word3",
      "antonyms": "word1, word2, word3",
      "grammar_tip": "수능/내신 출제 팁 (반말)",
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
