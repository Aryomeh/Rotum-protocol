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

    // Check not already claimed
    const { data: existing } = await db
      .from('user_tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Task already claimed' }, { status: 409 })
    }

    // Get task details
    const { data: task, error: taskErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('is_active', true)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get user
    const { data: user, error: userErr } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify task completion based on type
    let verified = false

    switch (task.type) {
      case 'referral': {
        const { count } = await db
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId)
        verified = (count ?? 0) >= task.target
        break
      }
      case 'nodes': {
        const { count } = await db
          .from('user_nodes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
        verified = (count ?? 0) >= task.target
        break
      }
      case 'purchase': {
        const { count } = await db
          .from('purchases')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
        verified = (count ?? 0) >= task.target
        break
      }
      case 'ranking': {
        const { data: ranking } = await db
          .from('season_rankings')
          .select('rank')
          .eq('user_id', userId)
          .single()
        verified = ranking ? ranking.rank <= task.target : false
        break
      }
      case 'daily': {
        const lastActive = user.last_active_at ? new Date(user.last_active_at) : null
        const today      = new Date()
        verified = lastActive
          ? lastActive.toDateString() === today.toDateString()
          : false
        break
      }
      case 'channel':
        // Channel verified separately via verify-channel route
        verified = true
        break
      case 'manual': {
        const { data: progress } = await db
          .from('task_progress')
          .select('verified_at')
          .eq('user_id', userId)
          .eq('task_id', taskId)
          .single()
        verified = !!progress?.verified_at
        break
      }
      default:
        verified = false
    }

    if (!verified) {
      return NextResponse.json({ error: 'Task requirements not met' }, { status: 400 })
    }

    // Record completion
    const { error: insertErr } = await db.from('user_tasks').insert({
      user_id:     userId,
      task_id:     taskId,
      reward_paid: task.reward_rtm,
    })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Credit RTM to user
    const { error: updateErr } = await db
      .from('users')
      .update({
        rtm_balance:      user.rtm_balance + task.reward_rtm,
        rtm_earned_total: user.rtm_earned_total + task.reward_rtm,
      })
      .eq('id', userId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Post to network feed
    // Fixed: Removed invalid .catch() call from Supabase builder syntax
    try {
      await db.from('network_feed').insert({
        type:    'task',
        message: `An operator completed <b>${task.title}</b> and earned ${Math.floor(task.reward_rtm)} $RTM`,
        color:   'green',
      })
    } catch (feedErr) {
      console.warn('Failed to update network feed, but continuing:', feedErr)
    }

    return NextResponse.json({ success: true, reward: task.reward_rtm })
  } catch (err: any) {
    console.error('[tasks/claim]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}