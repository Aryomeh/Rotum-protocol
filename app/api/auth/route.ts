import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramInitData } from '@/lib/telegram'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export const runtime = 'nodejs'

// 📊 SET YOUR TOKENOMICS CONFIGURATIONS HERE
const JOIN_AIRDROP_AMOUNT = 120.0000;   // Draws from the 120k airdrop_tasks pool
const REFERRAL_REWARD_AMOUNT = 3.0000;  // Draws from the 180k referral_engine pool

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

    // Look up referrer by their referral_code, and grab their telegram_id
    // (needed because user_balances is keyed by telegram_id, not the uuid id)
    let referredById: string | null = null
    let referrerTelegramId: number | null = null
    if (data?.start_param) {
      const { data: referrer } = await db
        .from('users')
        .select('id, telegram_id')
        .eq('referral_code', data.start_param)
        .single()
      if (referrer) {
        referredById = referrer.id
        referrerTelegramId = referrer.telegram_id
      }
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

      // 1. Create the new user WITHOUT setting rtm_balance directly.
      //    rtm_balance starts at 0 and is credited exclusively by
      //    process_onboarding_airdrop below, so there's a single
      //    source of truth for balance changes.
      const { data: newUser, error } = await db
        .from('users')
        .insert({
          telegram_id:       telegramId,
          telegram_username: telegramUsername,
          telegram_name:     telegramName,
          referred_by:       referredById,
          rtm_balance:       0,
          onboarded:         false,
        })
        .select()
        .single()

      if (error) throw error

      // 2. Credit the onboarding airdrop: deducts from the global
      //    airdrop_tasks pool, credits user_balances.task_rewards,
      //    and syncs users.rtm_balance — all inside the RPC.
      await db.rpc('process_onboarding_airdrop', {
        p_telegram_id: telegramId,
        p_amount: JOIN_AIRDROP_AMOUNT,
      })

      // 3. Handle referral relationships and execution
      if (referredById && referrerTelegramId) {
        // Log the link inside your historical tracking table
        await db.from('referrals').insert({
          referrer_id:   referredById,
          referred_id:   newUser.id,
          bonus_applied: true, // Marked true because we are paying them right now
        })

        // Credit the referrer: deducts from referral_engine pool,
        // credits user_balances.referral_rewards, syncs their
        // users.rtm_balance total.
        await db.rpc('process_referral_reward', {
          p_referrer_telegram_id: referrerTelegramId,
          p_bonus_amount: REFERRAL_REWARD_AMOUNT,
        })
      }

      // 4. Re-fetch the user row so the response reflects the
      //    balance AFTER the RPC credited it (the `newUser` object
      //    above is stale — it still shows rtm_balance: 0).
      const { data: refreshedUser } = await db
        .from('users')
        .select('*')
        .eq('id', newUser.id)
        .single()

      dbUser = refreshedUser ?? newUser
    } else {
      // Existing user: update their active status profile fields
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