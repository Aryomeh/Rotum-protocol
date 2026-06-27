import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json()

    // 1. Validate Telegram signature
    const { valid, user: tgUser, data } = validateTelegramInitData(initData || '')

    // In development allow bypassing with a test user
    const isDev = process.env.NODE_ENV === 'development'
    if (!valid && !isDev) {
      return NextResponse.json({ error: 'Invalid Telegram initData' }, { status: 401 })
    }

    const telegramId   = tgUser?.id ?? 99999999
    const telegramName = tgUser ? `${tgUser.first_name} ${tgUser.last_name ?? ''}`.trim() : 'Dev User'
    const telegramUsername = tgUser?.username ?? null

    // 2. Check for referral code in start_param
    let referredById: string | null = null
    if (data?.start_param) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', data.start_param)
        .single()
      if (referrer) referredById = referrer.id
    }

    // 3. Upsert user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    let dbUser = existingUser
    let isNew  = false

    if (!existingUser) {
      isNew = true
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          telegram_id:       telegramId,
          telegram_username: telegramUsername,
          telegram_name:     telegramName,
          referred_by:       referredById,
          rtm_balance:       120,  // starter balance
        })
        .select()
        .single()

      if (error) throw error
      dbUser = newUser

      // Apply referral bonus
      if (referredById) {
        await supabaseAdmin.from('referrals').insert({
          referrer_id:    referredById,
          referred_id:    newUser.id,
          bonus_applied:  false,
        })
        // Give referrer a 5% hash boost (stored as multiplier bump)
        // This is handled by the ranking refresh function
      }
    } else {
      // Update last_active + name in case it changed
      await supabaseAdmin
        .from('users')
        .update({
          telegram_name:     telegramName,
          telegram_username: telegramUsername,
          last_active_at:    new Date().toISOString(),
        })
        .eq('id', existingUser.id)
    }

    // 4. Generate a simple session token (for protecting other API routes)
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
