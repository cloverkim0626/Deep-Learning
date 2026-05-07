import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버에서만 실행 — service_role key로 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function DELETE(req: NextRequest) {
  try {
    const { id, table } = await req.json();
    if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });
    // 허용된 테이블만
    const allowed = ['contact_inquiries', 'trial_applications', 'clinic_queue'];
    if (!allowed.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
