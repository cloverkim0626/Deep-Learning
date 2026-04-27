import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ANSWER_PROMPT = `당신은 한국 수능·내신 영어 서술형 채점 전문가입니다.
아래 원문 문장과 출제된 문제를 보고, 문제의 모든 조건을 완벽히 충족하는 모범답안을 영어로 작성하세요.

원문: {sentence}
문제: {question_text}

규칙:
- 문제에 명시된 어휘 수, 포함 단어, 문법 구조 등 모든 조건을 정확히 지킬 것
- 자연스럽고 정확한 영어 문장
- 정답은 반드시 원문의 의미를 충실히 반영할 것

출력 JSON: {"model_answer": "..."}`;

export async function POST(req: NextRequest) {
  try {
    const { sentence, question_text } = await req.json();

    if (!sentence || !question_text) {
      return NextResponse.json({ error: "sentence and question_text required" }, { status: 400 });
    }

    const prompt = ANSWER_PROMPT
      .replace(/\{sentence\}/g, sentence)
      .replace(/\{question_text\}/g, question_text);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json({ model_answer: parsed.model_answer || "" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
