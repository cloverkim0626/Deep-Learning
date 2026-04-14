import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { rawText, workbook, chapter, passageLabel } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const prompt = `
      You are the 'Parallax Adaptive Engine' - a world-class English education AI specializing in Korean CSAT (수능) and high-tier 내신 (Internal Exam) preparation.
      Your goal is to transform raw English text into a "diagnostic learning set" for top-performing students.

      ### CORE LOGIC (THE PARALLAX WAY):
      1. **Structural Scrutiny**: Extract "The Killer Sentence" (the most complex one) for deep parsing.
      2. **Contextual Nuance**: Vocab synonyms must be contextually interchangeable. Avoid generic thesaurus lists.
      3. **Strategic Traps**: For each vocab tip, explain common traps (오답 유도 포인트) in Korean 내신.
      4. **Logical Cohesion**: Essay tasks must test the "flow of ideas" (e.g., 순서 배열, 문장 삽입), not just translation.

      ### INPUT DATA:
      "${rawText}"

      ### EXTRACTION REQUIREMENTS:
      1. **Sentences**: Map the full passage to S01, S02, ... S[N].
      2. **Vocab (5-7 items)**:
         - Word, POS (e.g., n, v, adj), Korean (precise contextual meaning).
         - Synonyms & Antonyms (High-level CSAT vocabulary).
         - Grammar Tip: Focus on how this word appears in exams (Banmal).
      3. **Diagnostic Points**: 2-3 logical essay tasks (e.g., "Summarize the cause-effect relationship in sentence S03-S05").

      ### OUTPUT FORMAT (STRICT JSON):
      {
        "sentences": { "S01": "...", "S02": "..." },
        "words": [
          { "word": "...", "pos_abbr": "...", "korean": "...", "context": "...", "synonyms": "...", "antonyms": "...", "grammar_tip": "..." }
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
