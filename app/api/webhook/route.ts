import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

// Telegram sends a POST to this webhook when:
// 1. pre_checkout_query — must be answered within 10 seconds
// 2. successful_payment — payment confirmed, credit the user

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const botToken = process.env.TELEGRAM_BOT_TOKEN!

    // ── Handle pre_checkout_query ─────────────────────────
    // Telegram asks: "is this purchase still valid?"
    // We must answer OK within 10 seconds
    if (body.pre_checkout_query) {
      const query = body.pre_checkout_query

      console.log('[webhook] pre_checkout_query received:', {
        id: query.id,
        from: query.from?.id,
        payload: query.invoice_payload,
        botTokenPresent: !!botToken,
      })

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pre_checkout_query_id: query.id,
          ok:                    true,
        }),
      })

      const tgData = await tgRes.json()

      if (!tgData.ok) {
        console.error('[webhook] answerPreCheckoutQuery FAILED:', {
          status: tgRes.status,
          response: tgData,
        })
      } else {
        console.log('[webhook] answerPreCheckoutQuery OK:', tgData)
      }

      return NextResponse.json({ ok: true })
    }

    // ── Handle successful_payment ─────────────────────────
    if (body.message?.successful_payment) {
      const payment    = body.message.successful_payment
      const telegramId = body.message.from.id
      const chargeId   = payment.telegram_payment_charge_id

      console.log('[webhook] successful_payment received:', {
        telegramId,
        chargeId,
        totalAmount: payment.total_amount,
        payload: payment.invoice_payload,
      })

      // Parse payload we embedded in the invoice
      let payload: { userId: string; itemSlug: string; telegramId: number }
      try {
        payload = JSON.parse(payment.invoice_payload)
      } catch {
        console.error('[webhook] Invalid payload:', payment.invoice_payload)
        return NextResponse.json({ ok: true })
      }

      const db = getSupabaseAdmin()

      // Daily check-in via Stars — handled separately from regular store purchases
      if (payload.itemSlug === 'daily_checkin_star') {
        const { data: checkinData, error: checkinErr } = await db.rpc('process_daily_checkin', {
          p_telegram_id: telegramId,
          p_method: 'star',
        })

        if (checkinErr) {
          console.error('[webhook] process_daily_checkin RPC error:', checkinErr)
        } else {
          console.log('[webhook] process_daily_checkin OK:', checkinData)
        }

        return NextResponse.json({ ok: true })
      }

      // Idempotency — check charge not already processed
      const { data: existing } = await db
        .from('purchases')
        .select('id')
        .eq('telegram_charge_id', chargeId)
        .single()

      if (existing) {
        console.log('[webhook] Charge already processed, skipping:', chargeId)
        return NextResponse.json({ ok: true }) // already handled
      }

      // Record the purchase
      const { data: purchase, error: purchaseErr } = await db
        .from('purchases')
        .insert({
          user_id:            payload.userId,
          item_slug:          payload.itemSlug,
          item_name:          payload.itemSlug.replace(/_/g, ' '),
          price_stars:        payment.total_amount,
          telegram_charge_id: chargeId,
          status:             'completed',
          applied:            false,
        })
        .select()
        .single()

      if (purchaseErr) {
        console.error('[webhook] Purchase insert error:', purchaseErr)
        return NextResponse.json({ ok: true })
      }

      console.log('[webhook] Purchase recorded:', purchase.id)

      // Apply the item effect
      await applyEffect(payload.userId, payload.itemSlug, purchase.id, db)

      // Add pool contribution (10% of stars value in RTM)
      const rtmContribution = payment.total_amount * 0.1
      const { data: season } = await db
        .from('seasons')
        .select('id, pool_current')
        .eq('status', 'active')
        .single()

      if (season) {
        await db
          .from('seasons')
          .update({ pool_current: season.pool_current + rtmContribution })
          .eq('id', season.id)
      }

      // Post to network feed
      await db.from('network_feed').insert({
        type:    'purchase',
        message: `An operator purchased <b>${payload.itemSlug.replace(/_/g, ' ')}</b>`,
        color:   'green',
      })

      // Send confirmation message to user
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id: telegramId,
          text:    `✅ Payment confirmed!\n\n⭐ ${payment.total_amount} Stars received\n🔋 ${payload.itemSlug.replace(/_/g, ' ')} has been applied to your account.\n\nOpen the app to see your updated stats.`,
        }),
      })

      console.log('[webhook] Purchase flow complete for charge:', chargeId)

      return NextResponse.json({ ok: true })
    }

    // Unknown update type — just acknowledge
    console.log('[webhook] Unknown update type:', Object.keys(body))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[webhook] Uncaught error:', err)
    // Always return 200 to Telegram even on error
    // Otherwise Telegram will retry repeatedly
    return NextResponse.json({ ok: true })
  }
}

async function applyEffect(userId: string, itemSlug: string, purchaseId: string, db: any) {
  switch (itemSlug) {
    case 'hash_boost_24h':
      await db
        .from('users')
        .update({
          hash_boost:       2.0,
          boost_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .eq('id', userId)
      break

    case 'accelerator_pack': {
      const { data: u } = await db
        .from('users')
        .select('hash_boost')
        .eq('id', userId)
        .single()
      if (u) {
        await db
          .from('users')
          .update({ hash_boost: u.hash_boost * 1.1 })
          .eq('id', userId)
      }
      break
    }

    case 'mining_crate': {
      const bonus = Math.floor(Math.random() * 70) + 30
      const { data: u } = await db
        .from('users')
        .select('rtm_balance')
        .eq('id', userId)
        .single()
      if (u) {
        await db
          .from('users')
          .update({ rtm_balance: u.rtm_balance + bonus })
          .eq('id', userId)
      }
      break
    }

    case 'validator_slot':
    case 'quantum_upgrade':
      // Unlock advanced tiers — handled by upgrade_catalogue visibility
      // For now credit bonus RTM
      const { data: u } = await db
        .from('users')
        .select('rtm_balance')
        .eq('id', userId)
        .single()
      if (u) {
        await db
          .from('users')
          .update({ rtm_balance: u.rtm_balance + 200 })
          .eq('id', userId)
      }
      break
  }

  // Mark purchase as applied
  await db
    .from('purchases')
    .update({ applied: true })
    .eq('id', purchaseId)
}
