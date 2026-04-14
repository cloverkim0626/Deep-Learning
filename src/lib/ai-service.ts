import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAITutorResponse(passage: string, studentMessage: string, history: any[]) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are 'Deep Learning' AI Tutor by Team Parallax. 
        Your goal is Socratic Tutoring (Diagnostic Mode).
        
        Rules:
        1. Don't give answers immediately. Diagnosis student's understanding first.
        2. Use 3-choice options (1 correct, 2 traps) to lead them to the answer.
        3. Refer to sentence numbers (S01, S02, etc.) for structural analysis.
        4. Tone: Direct, factual, but supportive (Banmal in Korean).
        5. Context: ${passage}
        
        Important: Your output MUST be a valid JSON object with the following keys:
        - "reply": Your main response text in Korean (Banmal).
        - "options": (Optional) An array of objects like { "text": "...", "isCorrect": true/false }.
        - "errorTag": (Optional) { "code": "...", "label": "..." } if you detect a specific grammar error.

        Example JSON:
        {
          "reply": "S01에서 'Ironically'는 무슨 뜻일까? 이 단어가 전체 문장의 뉘앙스를 어떻게 바꿀까?",
          "options": [
            { "text": "역설적으로", "isCorrect": true },
            { "text": "당연하게도", "isCorrect": false },
            { "text": "슬프게도", "isCorrect": false }
          ]
        }`
      },
      ...history,
      { role: "user", content: studentMessage }
    ],
    response_format: { type: "json_object" }
  });

  return response.choices[0].message.content;
}
