import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

// Marks a manual task as verified once the user has viewed the link.
// This is the endpoint Tasks.tsx's verifyManualTask() calls — it did not
// exist before (only claim, verify-channel, and view routes existed),
// so every manual task verification was 404ing.
export async function POST(req: NextRequest) {
  try {
    const { userId, taskId } = await req.json()
    const db = getSupabaseAdmin()

    if (!userId || !taskId) {
      return NextResponse.json({ error: 'Missing userId or taskId' }, { status: 400 })
    }

    const { data: progress } = await db
      .from('task_progress')
      .select('viewed_at, verified_at')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single()

    if (!progress?.viewed_at) {
      return NextResponse.json({ error: 'View the task before verifying' }, { status: 400 })
    }

    if (progress.verified_at) {
      return NextResponse.json({ success: true, verified_at: progress.verified_at })
    }

    const now = new Date().toISOString()

    const { error } = await db
      .from('task_progress')
      .update({ verified_at: now })
      .eq('user_id', userId)
      .eq('task_id', taskId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, verified_at: now })
  } catch (err: any) {
    console.error('[tasks/verify]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}