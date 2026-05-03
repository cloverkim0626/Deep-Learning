import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') || '';
  if (!name) return NextResponse.json({ medals: { gold: 0, silver: 0, bronze: 0 } });

  try {
    // 전체 세션 (completed) 조회
    const { data: sessions } = await supabase
      .from('test_sessions')
      .select('student_name, set_id, test_type, correct_count, total_questions, completed_at')
      .not('completed_at', 'is', null)
      .not('set_id', 'is', null);

    // GUEST 제외
    const { data: guestRows } = await supabase.from('students').select('name').eq('class_name', 'GUEST');
    const guestNames = new Set((guestRows || []).map((r: { name: string }) => r.name));

    // 월별로 그룹화
    type Session = { student_name: string; set_id: string | null; test_type: string | null; correct_count: number | null; total_questions: number | null; completed_at: string };
    const byMonth: Record<string, Session[]> = {};
    (sessions || []).forEach((s: Session) => {
      if (!s.completed_at) return;
      const d = new Date(s.completed_at);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(s);
    });

    let gold = 0, silver = 0, bronze = 0;

    // 현재 달은 아직 진행 중 → 제외. 지난 달까지 완료된 달만 집계
    const now = new Date();
    const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    for (const [monthKey, monthSessions] of Object.entries(byMonth)) {
      if (monthKey >= currentMonthKey) continue; // 이번 달 이후는 제외
      // 해당 월의 학생별 점수 집계 (mvp/route.ts 동일 로직)
      const bestMap: Record<string, number> = {};
      monthSessions.forEach(s => {
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
        const n = key.split('::')[0];
        scoreMap[n] = (scoreMap[n] || 0) + count;
      }

      const ranked = Object.entries(scoreMap)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([n], i) => ({ name: n, rank: i + 1 }));

      ranked.forEach(({ name: n, rank }) => {
        if (n !== name) return;
        if (rank === 1) gold++;
        else if (rank === 2) silver++;
        else if (rank === 3) bronze++;
      });
    }

    return NextResponse.json({ medals: { gold, silver, bronze } });
  } catch (err) {
    console.error('[mvp-history]', err);
    return NextResponse.json({ medals: { gold: 0, silver: 0, bronze: 0 } });
  }
}
