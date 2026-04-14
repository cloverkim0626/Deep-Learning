import { NextResponse } from 'next/server';
import { getTutorResponse } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const { passage, message, history } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const aiResponse = await getTutorResponse(passage, message, history);
    
    // Parse the JSON output from AI if applicable
    let parsed;
    try {
      parsed = JSON.parse(aiResponse || "{}");
    } catch (e) {
      parsed = { text: aiResponse };
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
