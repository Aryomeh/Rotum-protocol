import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const supabase = getSupabaseAdmin()

  const { data: last } = await supabase
    .from('seasons')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  const nextId = (last?.[0]?.id ?? 0) + 1

  const start = new Date()
  const end = new Date(start.getTime() + 30 * 86400000)

  const { data, error } = await supabase
    .from('seasons')
    .insert({
      name: 'Season ' + nextId,
      status: 'upcoming',
      pool_size: 100000,
      pool_current: 0,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select()
    .single()

  if (error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )

  return NextResponse.json({
    success: true,
    season: data,
  })
}