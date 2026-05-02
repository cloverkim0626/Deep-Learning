import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') || '0');
  const month = parseInt(req.nextUrl.searchParams.get('month') || '0');
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ entries: [] }, { status: 400 });
  }

  const KST_OFFSET = 9 * 60 * 60 * 1000;
  // month is 1-indexed
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET); // KST 1일 00:00
  const monthEnd   = new Date(Date.UTC(year, month,     1) - KST_OFFSET); // KST 다음달 1일 00:00

  try {
    // GUEST 학생 목록
    const { data: guestRows } = await supabase.from('students').select('name').eq('class_name', 'GUEST');
    const guestNames = new Set((guestRows || []).map((r: { name: string }) => r.name));

    // 닉네임 맵
    const { data: studentRows } = await supabase.from('students').select('name, nickname');
    const nicknameMap = new Map<string, string>(
      (studentRows || []).map((s: { name: string; nickname: string | null }) => [s.name, s.nickname || ''])
    );

    // 해당 월 세션 조회
    const { data: sessions } = await supabase
      .from('test_sessions')
      .select('student_name, set_id, test_type, correct_count, total_questions')
      .gte('completed_at', monthStart.toISOString())
      .lt('completed_at', monthEnd.toISOString())
      .not('completed_at', 'is', null);

    // (student, set_id, typeGroup) 별 MAX — GUEST 및 null set_id 제외
    const bestMap: Record<string, number> = {};
    (sessions || []).forEach((s: {
      student_name: string; set_id: string | null;
      test_type: string | null; correct_count: number | null; total_questions: number | null
    }) => {
      if (!s.student_name || !s.correct_count || !s.total_questions) return;
      if (!s.set_id) return;
      if (guestNames.has(s.student_name)) return;
      if (s.correct_count / s.total_questions < 0.9) return;
      const tg = (!s.test_type || s.test_type === 'vocab' || s.test_type === 'vocab_drill') ? 'vocab' : 'syn';
      const key = `${s.student_name}::${s.set_id}::${tg}`;
      bestMap[key] = Math.max(bestMap[key] || 0, s.correct_count);
    });

    const scoreMap: Record<string, number> = {};
    for (const [key, count] of Object.entries(bestMap)) {
      const name = key.split('::')[0];
      scoreMap[name] = (scoreMap[name] || 0) + count;
    }

    const entries = Object.entries(scoreMap)
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, score], i) => ({
        rank: i + 1,
        name,
        displayName: nicknameMap.get(name) || name,
        score,
      }));

    return NextResponse.json({ entries, year, month });
  } catch (err) {
    console.error('[mvp]', err);
    return NextResponse.json({ entries: [] }, { status: 500 });
  }
}
