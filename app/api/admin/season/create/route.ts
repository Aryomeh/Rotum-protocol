import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  const supabase = getSupabaseAdmin()

  const start = new Date()
  const end = new Date(start.getTime() + 30 * 86400000)

  const { data, error } = await supabase
    .from('seasons')
    .insert({
      name: 'New Season',
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