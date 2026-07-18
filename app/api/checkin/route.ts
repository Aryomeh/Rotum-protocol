import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

// GET /api/checkin?telegramId=xxx
export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get('telegramId')
  if (!telegramId) return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('checkin_progress')
    .select('watched_count, last_completed_at')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lastCompleted = data?.last_completed_at ? new Date(data.last_completed_at) : null
  const locked = lastCompleted ? lastCompleted.getTime() + 86_400_000 > Date.now() : false

  return NextResponse.json({
    success: true,
    watched: data?.watched_count ?? 0,
    required: 3,
    locked,
    unlockAt: locked ? new Date(lastCompleted!.getTime() + 86_400_000).toISOString() : null,
  })
}

// POST /api/checkin  { telegramId }
// Call only after AdController.show() resolves (ad watched till the end)
export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json()
    if (!telegramId) return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 })

    const db = getSupabaseAdmin()
    const { data, error } = await db.rpc('process_checkin_ad_watch', { p_telegram_id: telegramId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data.success) return NextResponse.json({ error: data.error, unlockAt: data.unlockAt }, { status: 429 })

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}