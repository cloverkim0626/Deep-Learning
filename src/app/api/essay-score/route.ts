import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      question_type,
      // 배열형
      correct_order, correct_sentence, conditions, chunks,
      // 빈칸형
      correct_answer, total_words, given_words, find_words,
      // 서술형
      question_text, model_answer,
      // 공통
      student_answer, scoring_prompt,
    } = await req.json();

    if (!student_answer || !scoring_prompt) {
      return NextResponse.json({ error: "student_answer, scoring_prompt required" }, { status: 400 });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 배열형 채점
    // ════════════════════════════════════════════════════════════════════════
    if (question_type === "배열") {
      const conditionsStr = Array.isArray(conditions)
        ? conditions.map((c: string, i: number) => `조건${i + 1}: ${c}`).join("\n")
        : String(conditions ?? "");

      let filled = scoring_prompt
        .replace(/\{correct_order\}/g, correct_order ?? "")
        .replace(/\{correct_sentence\}/g, correct_sentence ?? "")
        .replace(/\{conditions\}/g, conditionsStr)
        .replace(/\{chunks\}/g, Array.isArray(chunks) ? chunks.join(", ") : (chunks ?? ""))
        .replace(/\{student_answer\}/g, student_answer);

      const hasPlaceholder = /\{(correct_order|correct_sentence|conditions|student_answer)\}/.test(scoring_prompt);
      if (!hasPlaceholder) {
        filled =
          `## 채점 컨텍스트\n` +
          `- correct_order: ${correct_order}\n` +
          `- correct_sentence: ${correct_sentence}\n` +
          `- conditions:\n${conditionsStr}\n` +
          `- student_answer: ${student_answer}\n\n---\n\n` +
          scoring_prompt;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: filled }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(response.choices[0].message.content || "{}");

      return NextResponse.json({
        question_type:     "배열",
        score:             typeof parsed.score === "number" ? Math.min(5, Math.max(0, parsed.score)) : null,
        score_max:         5,
        score_reason:      parsed.score_reason ?? "",
        condition_results: parsed.condition_results ?? [],
        position_analysis: parsed.position_analysis ?? [],
        correct_positions: parsed.correct_positions ?? "",
        correct_sentence:  parsed.correct_sentence ?? correct_sentence,
        student_sentence:  parsed.student_sentence ?? "",
        feedback:          parsed.feedback ?? "",
        study_tip:         parsed.study_tip ?? "",
        format_valid:      parsed.format_valid !== false,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 빈칸형 채점
    // ════════════════════════════════════════════════════════════════════════
    if (question_type === "빈칸") {
      const conditionsStr = Array.isArray(conditions)
        ? conditions.map((c: string, i: number) => `조건${i + 1}: ${c}`).join("\n")
        : String(conditions ?? "");

      const givenWordsStr = Array.isArray(given_words) ? given_words.join(" / ") : "";
      const findWordsStr  = Array.isArray(find_words)
        ? find_words.map((fw: { word_in_answer: string; source_in_passage: string }) =>
            `${fw.word_in_answer} (출처: ${fw.source_in_passage})`).join(", ")
        : "";

      let filled = scoring_prompt
        .replace(/\{correct_answer\}/g, correct_answer ?? "")
        .replace(/\{total_words\}/g, String(total_words ?? ""))
        .replace(/\{given_words\}/g, givenWordsStr)
        .replace(/\{find_words\}/g, findWordsStr)
        .replace(/\{conditions\}/g, conditionsStr)
        .replace(/\{student_answer\}/g, student_answer);

      const hasPlaceholder = /\{(correct_answer|total_words|given_words|student_answer)\}/.test(scoring_prompt);
      if (!hasPlaceholder) {
        filled =
          `## 채점 컨텍스트\n` +
          `- correct_answer: ${correct_answer}\n` +
          `- total_words: ${total_words}\n` +
          `- given_words: ${givenWordsStr}\n` +
          `- find_words: ${findWordsStr}\n` +
          `- conditions:\n${conditionsStr}\n` +
          `- student_answer: ${student_answer}\n\n---\n\n` +
          scoring_prompt;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: filled }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(response.choices[0].message.content || "{}");

      return NextResponse.json({
        question_type:        "빈칸",
        score:                typeof parsed.score === "number" ? Math.min(5, Math.max(0, parsed.score)) : null,
        score_max:            5,
        condition_check:      parsed.condition_check ?? {},
        given_words_analysis: parsed.given_words_analysis ?? [],
        find_words_analysis:  parsed.find_words_analysis ?? [],
        grammar_check:        parsed.grammar_check ?? {},
        score_reason:         parsed.score_reason ?? "",
        correct_answer:       parsed.correct_answer ?? correct_answer,
        feedback:             parsed.feedback ?? "",
        study_tip:            parsed.study_tip ?? "",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 일반 서술형 채점
    // ════════════════════════════════════════════════════════════════════════
    const filled = scoring_prompt
      .replace(/\{question_text\}/g, question_text ?? "")
      .replace(/\{model_answer\}/g, model_answer || "(모범답안 미제공)")
      .replace(/\{student_answer\}/g, student_answer);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: filled }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      question_type: "서술형",
      score:    typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : null,
      score_max: 100,
      feedback: parsed.feedback ?? "",
    });

  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
