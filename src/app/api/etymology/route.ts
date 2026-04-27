import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SYSTEM_PROMPT = `You are an expert in English etymology for Korean high school students.
Given an English word, decompose it into meaningful morphemes (prefix, root, suffix) with their Latin/Greek origins and meanings.

Rules:
- Only include parts that genuinely exist and are pedagogically useful
- Keep each meaning short (2-6 Korean characters)
- If a word has no meaningful decomposition (e.g. "the", "and"), return empty parts array
- Limit to 1-3 meaningful parts
- Types: "prefix" | "root" | "suffix"

Output ONLY this JSON (no markdown):
{"word":"<word>","parts":[{"part":"<morpheme>","meaning":"<short Korean meaning>","type":"prefix|root|suffix"}]}

Examples:
- transport → [{"part":"trans-","meaning":"가로질러","type":"prefix"},{"part":"-port","meaning":"나르다","type":"root"}]
- invisible → [{"part":"in-","meaning":"부정","type":"prefix"},{"part":"-vis-","meaning":"보다","type":"root"},{"part":"-ible","meaning":"가능한","type":"suffix"}]
- run → [] (no decomposition)`;

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word');
  const wordId = req.nextUrl.searchParams.get('id');
  if (!word || !wordId) return NextResponse.json({ parts: [] });

  // Check cache
  const { data: cached } = await supabase
    .from('word_etymology')
    .select('parts')
    .eq('word_id', wordId)
    .single();

  if (cached) return NextResponse.json({ parts: cached.parts });

  // Generate
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: word },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(resp.choices[0].message.content || '{}');
    const parts = parsed.parts || [];

    // Cache result
    supabase.from('word_etymology')
      .upsert({ word_id: wordId, parts }, { onConflict: 'word_id' })
      .then(({ error }) => { if (error) console.error('[etymology upsert]', error); });

    return NextResponse.json({ parts });
  } catch (err) {
    console.error('[etymology]', err);
    return NextResponse.json({ parts: [] });
  }
}
