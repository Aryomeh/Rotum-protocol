import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { id, name, status, ends_at } = await req.json()
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('seasons')
    .update({ name, status, ends_at })
    .eq('id', id)
    .select()

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  if (!data || data.length === 0)
    return NextResponse.json({ success: false, error: 'No season matched that id — nothing updated' }, { status: 404 })

  return NextResponse.json({ success: true, season: data[0] })
}