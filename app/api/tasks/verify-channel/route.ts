import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId, taskId, telegramId } = await req.json()
    const db       = getSupabaseAdmin()
    const botToken = process.env.TELEGRAM_BOT_TOKEN!

    // Your channel username — update this to your actual channel
    const channelUsername = '@rotumprotocol'

    // Check if user is member of channel via Telegram API
    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id:  channelUsername,
          user_id:  telegramId,
        }),
      }
    )

    const tgData = await tgRes.json()
    const status = tgData?.result?.status

    const isMember = ['member', 'administrator', 'creator'].includes(status)

    if (!isMember) {
      return NextResponse.json({ error: 'Not a channel member yet — join first then verify' }, { status: 400 })
    }

    // Check not already claimed
    const { data: existing } = await db
      .from('user_tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
    }

    // Get task reward
    const { data: task } = await db
      .from('tasks')
      .select('reward_rtm, title')
      .eq('id', taskId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get user balance
    const { data: user } = await db
      .from('users')
      .select('rtm_balance, rtm_earned_total')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Record completion and credit reward
    await db.from('user_tasks').insert({
      user_id:     userId,
      task_id:     taskId,
      reward_paid: task.reward_rtm,
    })

    await db.from('users').update({
      rtm_balance:      user.rtm_balance + task.reward_rtm,
      rtm_earned_total: user.rtm_earned_total + task.reward_rtm,
    }).eq('id', userId)

    return NextResponse.json({ success: true, reward: task.reward_rtm })
  } catch (err: any) {
    console.error('[tasks/verify-channel]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
