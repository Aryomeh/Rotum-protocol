import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId, taskId } = await req.json()
    const db = getSupabaseAdmin()

    if (!userId || !taskId) {
      return NextResponse.json({ error: 'Missing userId or taskId' }, { status: 400 })
    }

    const { data: existing } = await db
      .from('task_progress')
      .select('viewed_at')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single()

    if (existing?.viewed_at) {
      // Already marked viewed — idempotent, just confirm
      return NextResponse.json({ success: true, viewed_at: existing.viewed_at })
    }

    const now = new Date().toISOString()

    const { error } = await db
      .from('task_progress')
      .upsert(
        { user_id: userId, task_id: taskId, viewed_at: now },
        { onConflict: 'user_id,task_id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, viewed_at: now })
  } catch (err: any) {
    console.error('[tasks/view]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
