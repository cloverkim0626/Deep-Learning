import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || 'week';

  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + KST_OFFSET);

  let since: Date;
  if (period === 'today') {
    const kstMidnight = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate()));
    since = new Date(kstMidnight.getTime() - KST_OFFSET);
  } else if (period === 'week') {
    const dayOfWeek = nowKST.getUTCDay();
    const kstSunday = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate() - dayOfWeek));
    since = new Date(kstSunday.getTime() - KST_OFFSET);
  } else {
    const kstMonthStart = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), 1));
    since = new Date(kstMonthStart.getTime() - KST_OFFSET);
  }

  try {
    // 0. 학생 정보 (닉네임 + 반 이름) — GUEST 배제용
    const { data: studentRows } = await supabase
      .from('students')
      .select('name, nickname, class_name');

    const nicknameMap = new Map<string, string>();
    const guestNames = new Set<string>(); // GUEST반 학생 이름 목록
    (studentRows || []).forEach((s: { name: string; nickname: string | null; class_name: string | null }) => {
      nicknameMap.set(s.name, s.nickname || '');
      if (s.class_name === 'GUEST') guestNames.add(s.name);
    });

    // ── 공통: test_sessions → bestMap 집계 함수 ──
    // set_id=null 멀티세트 세션 제외, GUEST 학생 제외
    const buildBestMap = (sessions: {
      student_name: string; set_id: string | null;
      test_type: string | null; correct_count: number | null; total_questions: number | null
    }[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const s of sessions) {
        if (!s.student_name || !s.correct_count || !s.total_questions) continue;
        if (!s.set_id) continue;                       // 멀티세트 세션 제외
        if (guestNames.has(s.student_name)) continue; // GUEST 제외
        if (s.correct_count / s.total_questions < 0.9) continue;
        const tg = (!s.test_type || s.test_type === 'vocab' || s.test_type === 'vocab_drill') ? 'vocab' : 'syn';
        const key = `${s.student_name}::${s.set_id}::${tg}`;
        map[key] = Math.max(map[key] || 0, s.correct_count);
      }
      return map;
    };

    const buildScoreMap = (bestMap: Record<string, number>): Record<string, number> => {
      const score: Record<string, number> = {};
      for (const [key, count] of Object.entries(bestMap)) {
        const name = key.split('::')[0];
        score[name] = (score[name] || 0) + count;
      }
      return score;
    };

    // 1. 현재 기간 점수
    const { data: sessions, error: sessErr } = await supabase
      .from('test_sessions')
      .select('student_name, set_id, test_type, correct_count, total_questions')
      .gte('completed_at', since.toISOString())
      .not('completed_at', 'is', null);
    if (sessErr) throw sessErr;

    const scoreMap = buildScoreMap(buildBestMap(sessions || []));

    // 2. Q&A 보너스 (+5점) — GUEST 제외
    const { data: qnaPosts } = await supabase
      .from('qna_posts')
      .select('author_name')
      .eq('status', 'answered')
      .gte('answered_at', since.toISOString())
      .not('author_name', 'is', null);

    (qnaPosts || []).forEach((p: { author_name: string }) => {
      if (!p.author_name || guestNames.has(p.author_name)) return;
      scoreMap[p.author_name] = (scoreMap[p.author_name] || 0) + 5;
    });

    // 3. 클리닉 보너스 (+10점) — GUEST 제외
    const { data: clinics } = await supabase
      .from('clinic_queue')
      .select('student_name')
      .eq('status', 'completed')
      .gte('completed_at', since.toISOString())
      .not('student_name', 'is', null);

    (clinics || []).forEach((c: { student_name: string }) => {
      if (!c.student_name || guestNames.has(c.student_name)) return;
      scoreMap[c.student_name] = (scoreMap[c.student_name] || 0) + 10;
    });

    const ranking = Object.entries(scoreMap)
      .map(([name, score]) => ({ name, displayName: nicknameMap.get(name) || name, score }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    // 4. 명예의 전당 — 이전 달 MVP 자동 계산 (GUEST 배제)
    const prevMonthKST = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth() - 1, 1));
    const prevYear = prevMonthKST.getUTCFullYear();
    const prevMonth = prevMonthKST.getUTCMonth() + 1; // 1-indexed

    // 이전 달 기간
    const prevMonthStart = new Date(prevMonthKST.getTime() - KST_OFFSET);
    const prevMonthEnd = new Date(Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), 1) - KST_OFFSET);

    const { data: prevSessions } = await supabase
      .from('test_sessions')
      .select('student_name, set_id, test_type, correct_count, total_questions')
      .gte('completed_at', prevMonthStart.toISOString())
      .lt('completed_at', prevMonthEnd.toISOString())
      .not('completed_at', 'is', null);

    const prevScoreMap = buildScoreMap(buildBestMap(prevSessions || []));

    // 이전 달 Q&A 보너스
    const { data: prevQna } = await supabase
      .from('qna_posts')
      .select('author_name')
      .eq('status', 'answered')
      .gte('answered_at', prevMonthStart.toISOString())
      .lt('answered_at', prevMonthEnd.toISOString())
      .not('author_name', 'is', null);
    (prevQna || []).forEach((p: { author_name: string }) => {
      if (!p.author_name || guestNames.has(p.author_name)) return;
      prevScoreMap[p.author_name] = (prevScoreMap[p.author_name] || 0) + 5;
    });

    const hallOfFame = Object.entries(prevScoreMap)
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, score], i) => ({
        rank: i + 1,
        name,
        displayName: nicknameMap.get(name) || name,
        score,
        month: prevMonth,
        year: prevYear,
      }));

    return NextResponse.json({ ranking, hallOfFame });
  } catch (err) {
    console.error('[leaderboard]', err);
    return NextResponse.json({ ranking: [], hallOfFame: [] }, { status: 500 });
  }
}
