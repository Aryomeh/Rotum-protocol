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

    // Get user — now also selecting telegram_id, needed for the pool RPC below
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

    // Deduct from the airdrop_tasks pool, credit user_balances.task_rewards,
    // and sync users.rtm_balance — all atomically inside the RPC.
    // This replaces the old direct `users.update({ rtm_balance: ... })` call,
    // which paid users without ever touching tokenomics_supply.
    const { error: rpcErr } = await db.rpc('process_task_reward', {
      p_telegram_id: user.telegram_id,
      p_amount: task.reward_rtm,
    })

    if (rpcErr) {
      // Roll back the user_tasks row so the task isn't marked claimed
      // if the pool payout failed (e.g. pool exhausted).
      await db.from('user_tasks').delete().eq('user_id', userId).eq('task_id', taskId)
      return NextResponse.json({ error: rpcErr.message }, { status: 400 })
    }

    // rtm_earned_total is a lifetime-earnings counter, separate from the
    // pool-backed rtm_balance — still updated directly here.
    await db
      .from('users')
      .update({ rtm_earned_total: user.rtm_earned_total + task.reward_rtm })
      .eq('id', userId)

    // Post to network feed
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