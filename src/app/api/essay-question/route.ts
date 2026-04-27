import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      essay_sentences,
      full_text,
      question_prompt,
      extra_condition,
      used_fragments,
    } = await req.json();

    if (!question_prompt) {
      return NextResponse.json({ error: "question_prompt required" }, { status: 400 });
    }

    let passageStr = "";
    let cleanPassage = "";

    if (essay_sentences && essay_sentences.length > 0) {
      const sents = essay_sentences as { idx: number; text: string; korean: string }[];
      cleanPassage = sents.map((s: { idx: number; text: string; korean: string }) => s.text).join(" ");
      passageStr = sents.map((s: { idx: number; text: string; korean: string }) => `[${s.idx}] ${s.text}  (한국어: ${s.korean})`).join("\n");
    } else if (full_text) {
      cleanPassage = full_text;
      passageStr = full_text;
    } else {
      return NextResponse.json({ error: "No passage content provided" }, { status: 400 });
    }

    let filled = question_prompt
      .replace(/\{passage\}/g, passageStr)
      .replace(/\{sentence\}/g, passageStr)
      .replace(/\{extra_condition\}/g, extra_condition || "없음");

    const hasPlaceholder =
      question_prompt.includes("{passage}") ||
      question_prompt.includes("{sentence}");

    if (!hasPlaceholder) {
      filled = "## 지문\n" + passageStr + "\n\n---\n\n" + question_prompt;
    }

    const sentenceCount = cleanPassage.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0).length;

    const passageIntegrityBlock =
      "\n\n## CRITICAL HARD RULES — MUST OBEY ALL\n\n" +

      "### RULE 1 — BLANK ENFORCEMENT (passage_with_blank)\n" +
      "The passage has ~" + sentenceCount + " sentences. You MUST copy the ENTIRE passage verbatim.\n" +
      "The ONLY modification: replace the exact text of `selected_fragment` with exactly '______' (six underscores).\n" +
      "VERIFY BEFORE OUTPUTTING: does your passage_with_blank contain '______'? If NO, redo it.\n" +
      "NEVER output the full sentence in passage_with_blank where the blank should be.\n" +
      "Source passage (copy this exactly, only swapping the fragment for ______): \n" +
      cleanPassage + "\n\n" +

      "### RULE 2 — CHIP COUNT (chunks array) MUST STAY ≤ 26\n" +
      "You have the English alphabet A–Z = 26 letters. chunks.length MUST be ≤ 26.\n" +
      "If selected_sentence is longer than 26 words, apply these strategies IN ORDER:\n" +
      "  a) If the sentence is complex/compound, extract only the SINGLE most important clause as selected_fragment.\n" +
      "     (e.g. from 'While X, Y because Z' → take only 'Y because Z' if it's the key claim)\n" +
      "  b) Merge obvious collocations/function-word groups into ONE chip:\n" +
      "     e.g. 'a number of', 'in order to', 'as a result', 'their own', 'at the same time',\n" +
      "          'due to', 'each other', 'in terms of', 'on the other hand', 'as well as'\n" +
      "     → treat each such group as a SINGLE chip\n" +
      "  c) Merge auxiliary+main verb: 'had been', 'will have', 'could be', 'is being' → 1 chip\n" +
      "  d) Merge determiner+noun when trivially predictable: 'the results', 'their shoes', 'his mind' → 1 chip\n" +
      "AFTER merging, count again. If still > 26, go back to step (a) and pick a shorter clause.\n" +
      "OUTPUT FORMAT for chunks: each element is the chip text (string), max 26 elements.\n" +
      "correct_order must list A, B, C… labels mapping to chunks index.\n\n" +

      "### RULE 3 — SHUFFLE LABELS\n" +
      "After determining the correct order of chunks, assign labels A, B, C… in a RANDOM (shuffled) order.\n" +
      "NEVER assign A=first word, B=second word, etc. The label sequence must not reveal the answer.\n";

    filled = filled + passageIntegrityBlock;

    if (Array.isArray(used_fragments) && used_fragments.length > 0) {
      const sentenceList = used_fragments
        .filter(Boolean)
        .map((f: string, i: number) => `  ${i + 1}. "${f}"`)
        .join("\n");

      const exclusionBlock =
        "## ALREADY-USED SENTENCES - ABSOLUTE PROHIBITION\n" +
        "The following sentences have ALREADY been used to create questions in this set.\n" +
        "You MUST NOT select any of these sentences, or any sentence that shares 3 or more consecutive words with them.\n" +
        "You MUST choose a COMPLETELY DIFFERENT sentence from a different part of the passage.\n\n" +
        "FORBIDDEN SENTENCES:\n" + sentenceList + "\n\n" +
        "REQUIRED: Pick a sentence that shares NO substantial phrasing with the above.\n";

      filled = exclusionBlock + "\n---\n\n" + filled;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: filled }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");

    const questionType: string =
      parsed.question_type
        ? String(parsed.question_type)
        : Array.isArray(parsed.chunks) && parsed.chunks.length > 0
          ? "배열"
          : "서술형";

    let selectedSentence: { idx: number; text: string; korean: string } | null = null;
    const rawText =
      (typeof parsed.selected_sentence === "string" ? parsed.selected_sentence : null)
      ?? parsed.blank_position_sentence
      ?? parsed.correct_sentence
      ?? parsed.selected_text
      ?? null;

    if (rawText) {
      const found = Array.isArray(essay_sentences) && essay_sentences.length > 0
        ? (essay_sentences as { idx: number; text: string; korean: string }[])
            .find((s: { idx: number; text: string; korean: string }) => s.text.trim() === rawText.trim())
        : undefined;
      selectedSentence = found ?? { idx: 0, text: rawText, korean: "" };
    }

    if (questionType === "배열") {
      return NextResponse.json({
        question_type:                  "배열",
        question_text:                  parsed.question_text || "다음 지문의 빈칸에 들어갈 말을 주어진 단어(어구)를 모두 사용하여 올바른 순서로 배열하시오.",
        passage_with_blank:             parsed.passage_with_blank ?? null,
        blank_position_sentence:        parsed.blank_position_sentence ?? rawText ?? "",
        blank_position_sentence_korean: parsed.blank_position_sentence_korean ?? "",
        selected_fragment:              parsed.selected_fragment ?? rawText ?? "",
        chunks:                         parsed.chunks,
        correct_order:                  parsed.correct_order,
        correct_sentence:               rawText ?? parsed.correct_sentence ?? "",
        conditions:                     parsed.conditions ?? [],
        difficulty:                     parsed.difficulty ?? "",
        grammar_point:                  parsed.grammar_point ?? "",
        distractor_analysis:            parsed.distractor_analysis ?? "",
        selected_sentence:              selectedSentence,
      });
    }

    if (questionType === "빈칸" || parsed.passage_with_blank) {
      return NextResponse.json({
        question_type:        "빈칸",
        question_text:        parsed.question_instruction || "문맥상 다음 글의 빈칸에 들어갈 적절한 말을 주어진 조건에 맞게 쓰시오.",
        passage_with_blank:   parsed.passage_with_blank ?? "",
        correct_answer:       parsed.correct_answer ?? "",
        total_words:          parsed.total_words ?? 0,
        given_words:          parsed.given_words ?? [],
        given_words_display:  parsed.given_words_display ?? (parsed.given_words ?? []).join(" / "),
        given_words_count:    parsed.given_words_count ?? (parsed.given_words ?? []).length,
        find_words:           parsed.find_words ?? [],
        find_words_count:     parsed.find_words_count ?? (parsed.find_words ?? []).length,
        multi_word_notes:     parsed.multi_word_notes ?? [],
        conditions:           parsed.conditions ?? [],
        difficulty:           parsed.difficulty ?? "",
        selection_reason:     parsed.selection_reason ?? "",
        distractor_analysis:  parsed.distractor_analysis ?? "",
        selected_sentence:    selectedSentence,
      });
    }

    return NextResponse.json({
      question_type:  "서술형",
      question_text:  parsed.question_text || "",
      selected_sentence: selectedSentence,
    });

  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}