import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { id, name, status, ends_at, pool_size, pool_current } = await req.json()

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const updatePayload: Record<string, any> = { name, status, ends_at }
  if (pool_size !== undefined) updatePayload.pool_size = pool_size
  if (pool_current !== undefined) updatePayload.pool_current = pool_current

  const { data, error } = await supabase
    .from('seasons')
    .update(updatePayload)
    .eq('id', id)
    .select()

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data || data.length === 0)
    return NextResponse.json({ success: false, error: 'No season matched that id — nothing updated' }, { status: 404 })

  return NextResponse.json({ success: true, season: data[0] })
}