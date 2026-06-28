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

      await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pre_checkout_query_id: query.id,
          ok:                    true,
        }),
      })

      return NextResponse.json({ ok: true })
    }

    // ── Handle successful_payment ─────────────────────────
    if (body.message?.successful_payment) {
      const payment    = body.message.successful_payment
      const telegramId = body.message.from.id
      const chargeId   = payment.telegram_payment_charge_id

      // Parse payload we embedded in the invoice
      let payload: { userId: string; itemSlug: string; telegramId: number }
      try {
        payload = JSON.parse(payment.invoice_payload)
      } catch {
        console.error('[webhook] Invalid payload:', payment.invoice_payload)
        return NextResponse.json({ ok: true })
      }

      const db = getSupabaseAdmin()

      // Idempotency — check charge not already processed
      const { data: existing } = await db
        .from('purchases')
        .select('id')
        .eq('telegram_charge_id', chargeId)
        .single()

      if (existing) {
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

      return NextResponse.json({ ok: true })
    }

    // Unknown update type — just acknowledge
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[webhook]', err)
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