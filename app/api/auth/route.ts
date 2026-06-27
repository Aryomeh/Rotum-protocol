import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json()
    const db = getSupabaseAdmin()

    const { valid, user: tgUser, data } = validateTelegramInitData(initData || '')

    const isDev = process.env.NODE_ENV === 'development'
    if (!valid && !isDev) {
      return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 })
    }

    const telegramId       = tgUser?.id ?? 99999999
    const telegramName     = tgUser ? `${tgUser.first_name} ${tgUser.last_name ?? ''}`.trim() : 'Dev User'
    const telegramUsername = tgUser?.username ?? null

    let referredById: string | null = null
    if (data?.start_param) {
      const { data: referrer } = await db
        .from('users')
        .select('id')
        .eq('referral_code', data.start_param)
        .single()
      if (referrer) referredById = referrer.id
    }

    const { data: existingUser } = await db
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    let dbUser = existingUser
    let isNew  = false

    if (!existingUser) {
      isNew = true
      const { data: newUser, error } = await db
        .from('users')
        .insert({
          telegram_id:       telegramId,
          telegram_username: telegramUsername,
          telegram_name:     telegramName,
          referred_by:       referredById,
          rtm_balance:       120,
        })
        .select()
        .single()

      if (error) throw error
      dbUser = newUser

      if (referredById) {
        await db.from('referrals').insert({
          referrer_id:   referredById,
          referred_id:   newUser.id,
          bonus_applied: false,
        })
      }
    } else {
      await db
        .from('users')
        .update({
          telegram_name:     telegramName,
          telegram_username: telegramUsername,
          last_active_at:    new Date().toISOString(),
        })
        .eq('id', existingUser.id)
    }

    const sessionToken = crypto
      .createHmac('sha256', process.env.TELEGRAM_BOT_SECRET!)
      .update(`${telegramId}:${dbUser.id}:${Date.now()}`)
      .digest('hex')

    return NextResponse.json({ user: dbUser, isNew, sessionToken })
  } catch (err: any) {
    console.error('[auth]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}