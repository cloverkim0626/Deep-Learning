import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildReportHtml } from './reportHtml';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { student_name, session_date, class_id } = await req.json();
    if (!student_name || !session_date || !class_id) return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });

    // 1. 반 정보
    const { data: cls } = await sb.from('classes').select('name,schedule,clinic_schedule').eq('id', class_id).single();

    // 2. 세션 – 없으면 생성 차단
    const { data: session } = await sb.from('class_sessions').select('*').eq('class_id', class_id).eq('session_date', session_date).maybeSingle();
    if (!session) {
      return NextResponse.json({ error: `${session_date} 날짜의 수업 내역이 없습니다. 수업을 먼저 시작해주세요.` }, { status: 422 });
    }

    // 3. 출결 + 태도
    const { data: att } = session ? await sb.from('attendance').select('*').eq('session_id', session.id).eq('student_name', student_name).maybeSingle() : { data: null };

    // 4. 수업 노트
    const { data: note } = session ? await sb.from('lesson_notes').select('note').eq('session_id', session.id).maybeSingle() : { data: null };

    // 5. 과제/테스트 슬롯 (이 수업에서 배당된 것)
    const { data: slots } = session
      ? await sb.from('homework_slots').select('*').eq('session_id', session.id).order('sort_order')
      : { data: [] };

    // 6. 과제 검사 (이 날 due_date인 슬롯들)
    const { data: dueSlots } = await sb.from('homework_slots').select('*').eq('class_id', class_id).lte('due_date', session_date).gte('due_date', session_date);

    // 7. 과제 체크 결과
    const allSlotIds = [...(slots || []), ...(dueSlots || [])].map((s: any) => s.id);
    const { data: checks } = allSlotIds.length > 0
      ? await sb.from('homework_checks').select('*').in('slot_id', allSlotIds)
      : { data: [] };

    // 8. 반 평균/순위 계산용: 같은 슬롯의 모든 학생 점수
    const scoreMap: Record<string, { scores: number[]; max: number }> = {};
    for (const s of slots || []) {
      if (!s.max_score) continue;
      const { data: allChecks } = await sb.from('homework_checks').select('student_name,score').eq('slot_id', s.id).not('score', 'is', null);
      scoreMap[s.id] = { scores: (allChecks || []).map((c: any) => c.score), max: s.max_score };
    }

    // 9. 클리닉 피드백 (이 날짜 기준 ±7일, 이 학생, completed)
    const since = new Date(session_date); since.setDate(since.getDate() - 7);
    const { data: clinics } = await sb.from('clinic_queue')
      .select('tutor_name,session_feedback,completed_at')
      .eq('student_name', student_name)
      .eq('status', 'completed')
      .gte('completed_at', since.toISOString())
      .lte('completed_at', new Date(session_date + 'T23:59:59').toISOString())
      .not('session_feedback', 'is', null);

    // 10. 단어 앱 현황: 지난 정규수업 ~ 오늘 (test_sessions)
    const { data: prevSession } = await sb.from('class_sessions')
      .select('session_date').eq('class_id', class_id).eq('session_type', 'class')
      .lt('session_date', session_date).order('session_date', { ascending: false }).limit(1).maybeSingle();
    const vocabFrom = prevSession?.session_date || session_date;
    const { data: vocabSessions } = await sb.from('test_sessions')
      .select('student_name,correct_count,total_questions,test_type,completed_at')
      .eq('student_name', student_name)
      .gte('completed_at', vocabFrom + 'T00:00:00')
      .lte('completed_at', session_date + 'T23:59:59')
      .not('completed_at', 'is', null);

    const reportData = { cls, session, att, note, slots, dueSlots, checks, scoreMap, clinics, vocabSessions, student_name, session_date };
    const html = buildReportHtml(reportData);

    // 저장
    await sb.from('daily_reports').upsert([{
      class_id, student_name, session_date,
      report_data: reportData, html_content: html, published: false, updated_at: new Date().toISOString(),
    }], { onConflict: 'class_id,student_name,session_date' });

    return NextResponse.json({ ok: true, html });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
