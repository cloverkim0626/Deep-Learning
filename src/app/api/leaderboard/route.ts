import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || 'week';

  // KST = UTC+9: 한국 자정 = UTC 전날 15:00
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + KST_OFFSET); // KST 기준 현재

  let since: Date;
  if (period === 'today') {
    // KST 오늘 자정
    const kstMidnight = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate()));
    since = new Date(kstMidnight.getTime() - KST_OFFSET); // UTC로 변환
  } else if (period === 'week') {
    // KST 이번 주 일요일 자정
    const dayOfWeek = nowKST.getUTCDay();
    const kstSunday = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate() - dayOfWeek));
    since = new Date(kstSunday.getTime() - KST_OFFSET);
  } else {
    // KST 이번 달 1일 자정
    const kstMonthStart = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), 1));
    since = new Date(kstMonthStart.getTime() - KST_OFFSET);
  }

  try {
    // 0. 닉네임 조회 (name → displayName)
    const { data: studentRows } = await supabase
      .from('students')
      .select('name, nickname');
    const nicknameMap = new Map<string, string>(
      (studentRows || []).map((s: { name: string; nickname: string | null }) => [s.name, s.nickname || ''])
    );

    // 1. 단어 정답 점수 — 통과(90%+)한 세션만
    const { data: sessions, error: sessErr } = await supabase
      .from('test_sessions')
      .select('student_name, correct_count, total_questions')
      .gte('completed_at', since.toISOString())
      .not('completed_at', 'is', null);

    if (sessErr) throw sessErr;

    const scoreMap: Record<string, number> = {};
    (sessions || []).forEach((s: { student_name: string; correct_count: number | null; total_questions: number | null }) => {
      if (!s.student_name || !s.correct_count || !s.total_questions) return;
      const passRate = s.correct_count / s.total_questions;
      if (passRate < 0.9) return;
      scoreMap[s.student_name] = (scoreMap[s.student_name] || 0) + s.correct_count;
    });

    // 2. Q&A 보너스 (+5점 per answered QnA)
    const { data: qnaPosts } = await supabase
      .from('qna_posts')
      .select('author_name, status, answered_at')
      .eq('status', 'answered')
      .gte('answered_at', since.toISOString())
      .not('author_name', 'is', null);

    (qnaPosts || []).forEach((p: { author_name: string }) => {
      if (!p.author_name) return;
      scoreMap[p.author_name] = (scoreMap[p.author_name] || 0) + 5;
    });

    // 3. 클리닉 상담 완료 보너스 (+10점 per completed clinic)
    const { data: clinics } = await supabase
      .from('clinic_queue')
      .select('student_name, status, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', since.toISOString())
      .not('student_name', 'is', null);

    (clinics || []).forEach((c: { student_name: string }) => {
      if (!c.student_name) return;
      scoreMap[c.student_name] = (scoreMap[c.student_name] || 0) + 10;
    });

    const ranking = Object.entries(scoreMap)
      .map(([name, score]) => {
        const nickname = nicknameMap.get(name) || '';
        return { name, displayName: nickname || name, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json({ ranking });
  } catch (err) {
    console.error('[leaderboard]', err);
    return NextResponse.json({ ranking: [] }, { status: 500 });
  }
}
