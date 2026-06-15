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
    const allowed = ['contact_inquiries', 'trial_applications', 'clinic_queue'];
    if (!allowed.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST: 학부모 코멘트 → contact_inquiries insert (RLS 우회)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, school, inquiry_type, detail_message, status } = body;
    if (!name || !detail_message) {
      return NextResponse.json({ error: 'name and detail_message required' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('contact_inquiries')
      .insert([{
        name,
        phone: '',
        school: school || '',
        inquiry_type: inquiry_type || 'report_comment',
        detail_message,
        status: status || 'pending',
      }])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
