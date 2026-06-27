import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    const { data, error } = await supabaseAdmin
      .from('network_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ success: true, feed: data ?? [] })
  } catch (err: any) {
    console.error('[feed]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — seed a scripted event (called by cron or admin)
export async function POST(req: NextRequest) {
  try {
    const { message, color, type } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('network_feed')
      .insert({ message, color: color ?? 'accent', type: type ?? 'event' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, item: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
