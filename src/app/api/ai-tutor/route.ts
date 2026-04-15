import { NextResponse } from 'next/server';
import { getTutorResponse } from '@/lib/ai-service';

export async function POST(req: Request) {
  try {
    const { passage, message, history } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const aiResponse = await getTutorResponse(passage, message, history);
    
    // getTutorResponse already returns a parsed JSON object (or fallback object).
    return NextResponse.json(aiResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
