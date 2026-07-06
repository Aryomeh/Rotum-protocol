import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

// Your Tasks.tsx opens https://t.me/rotumprotocol — using the same
// channel username here. If this is a private channel, replace with
// its numeric chat_id (e.g. -1001234567890) instead.
const CHANNEL_ID = '@rotumprotocol'

// Assumed env var name — adjust if your bot token is stored under a
// different key. (Not the same as TELEGRAM_BOT_SECRET used in auth
// route.ts, which is just an HMAC signing secret, not the bot token.)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

const MEMBER_STATUSES = ['member', 'administrator', 'creator']

export async function POST(req: NextRequest) {
  try {
    const { userId, taskId, telegramId } = await req.json()
    const db = getSupabaseAdmin()

    if (!userId || !taskId || !telegramId) {
      return NextResponse.json({ error: 'Missing userId, taskId, or telegramId' }, { status: 400 })
    }

    // Already claimed?
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

    if (task.type !== 'channel') {
      return NextResponse.json({ error: 'This task is not a channel task' }, { status: 400 })
    }

    // Real Telegram Bot API membership check
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(CHANNEL_ID)}&user_id=${telegramId}`
    )
    const tgJson = await tgRes.json()

    if (!tgJson.ok) {
      console.error('[verify-channel] Telegram API error', tgJson)
      return NextResponse.json({ error: 'Could not verify membership right now' }, { status: 502 })
    }

    const status = tgJson.result?.status
    const isMember = MEMBER_STATUSES.includes(status)

    if (!isMember) {
      return NextResponse.json({ error: 'Join the channel first, then verify' }, { status: 400 })
    }

    // Get user (need telegram_id for the pool RPC and rtm_earned_total for the lifetime counter)
    const { data: user, error: userErr } = await db
      .from('users')
      .select('telegram_id, rtm_earned_total')
      .eq('id', userId)
      .single()

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    // Deduct from airdrop_tasks pool, credit user_balances.task_rewards,
    // sync users.rtm_balance — same atomic RPC used by claim/route.ts
    const { error: rpcErr } = await db.rpc('process_task_reward', {
      p_telegram_id: user.telegram_id,
      p_amount: task.reward_rtm,
    })

    if (rpcErr) {
      await db.from('user_tasks').delete().eq('user_id', userId).eq('task_id', taskId)
      return NextResponse.json({ error: rpcErr.message }, { status: 400 })
    }

    await db
      .from('users')
      .update({ rtm_earned_total: user.rtm_earned_total + task.reward_rtm })
      .eq('id', userId)

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
    console.error('[tasks/verify-channel]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}