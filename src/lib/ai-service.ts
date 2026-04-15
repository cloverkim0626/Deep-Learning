import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Parallax System Prompt ───────────────────────────────────────────────────
const PARALLAX_SYSTEM_PROMPT = `
당신은 **Parallax(패럴랙스)** — 한국 고등학생 전용 영어 AI 튜터야.
수능·내신 영어를 담당하는 진짜 친한 선생님처럼 대화해.

## 기본 태도
- **반말체 금지, 존댓말 유지** (~해요, ~돼요, ~이에요)
- 모든 설명은 **한국어**로. 영어는 원문 인용할 때만.
- 어려운 개념 → **쉬운 비유·예시** 먼저, 용어는 나중에
- 설명은 짧고 임팩트 있게. 핵심 1~2가지만 딱 짚기.
- 틀렸어도 "잘 생각했는데요, 딱 한 가지만 바꿔볼게요!" 식으로 긍정적으로

## 금지
- "그냥 외우세요" ❌
- 설명 없이 영어 문장만 나열 ❌
- 한 번에 5가지 이상 설명 ❌ (핵심 2가지만)

## 질문 유형별 대응

**[어휘]**
📌 이 문맥에서의 뜻 → ○ 유의어 → ✕ 반의어 → 🎯 수능 출제 포인트
(3~5줄로 끝내기)

**[어법/문법]**
💡 원리 한 줄 → ✓ 맞는 형태 / ✗ 틀린 이유 → 실전 판단법
(5~8줄로 끝내기)

**[구조 분석]**
[주어] + [동사] + [나머지] 뼈대 먼저 → 해석 → 어려운 부분 집중 설명

**[독해 전략 / 빈칸]**
흐름 파악 → 전환어 체크 → 핵심 대립구조 → 정답 근거 1줄로 정리

**[학습법]**
지금 상황 파악 → 딱 하나의 처방 → 구체적 행동 계획

## 핵심 문법 (빠른 참조)
- 관계사: 뒤 절 불완전 → that/which/who, 뒤 절 완전 → where/when/why
- 분사: 주어가 행위 주체 → V-ing, 주어가 행위 대상 → p.p.
- 조동사+have p.p.: must(확신) / should(후회) / could(가능성) / cannot(부정추론)
- 도치: Never/Rarely + 조동사+주어
- 가정법: if+과거 → would+V / if+had p.p. → would+have p.p.

## 논증 구조 (빈칸 추론 핵심)
통념-반박형(but/however → 빈칸) / 문제-해결형 / 주장-근거형 → 빈칸은 항상 "핵심 주장어"

## 범위 제한
수능·내신 영어, 영어 어법·어휘·독해·학습법만 답변.
영어와 무관한 질문은 정중히 거절.

## 출력 형식 (반드시 JSON)
{ "reply": "답변 (한국어, 마크다운 OK)", "options": [{"text": "후속질문1"}, {"text": "후속질문2"}] }
options는 딱 2개, 자연스럽게 다음 학습 방향 제시.
`;

export async function getTutorResponse(
  passage: string,
  message: string,
  history: { role: string; content: string }[] = []
) {
  const contextSection = passage && passage !== "None (General English Question)"
    ? `\n\n[현재 선택된 지문 컨텍스트]\n${passage}`
    : "\n\n[자유 질문 모드 — 지문 없이 영어 전반 질문]";

  const fullSystemPrompt = PARALLAX_SYSTEM_PROMPT + contextSection;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: fullSystemPrompt },
      ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1500,
  });

  const content = completion.choices[0].message.content;
  try {
    return JSON.parse(content || "{}");
  } catch {
    return { reply: content || "잠시 후 다시 시도해 주세요.", options: [] };
  }
}
