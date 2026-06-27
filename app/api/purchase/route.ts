import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

// Shop items catalogue
const SHOP_ITEMS: Record<string, { name: string; stars: number; effect: string }> = {
  hash_boost_24h:   { name: 'Hash Boost (24h)',  stars: 25,  effect: 'boost_24h' },
  mining_crate:     { name: 'Mining Crate',      stars: 50,  effect: 'crate' },
  accelerator_pack: { name: 'Accelerator Pack',  stars: 100, effect: 'perm_boost_10pct' },
  validator_slot:   { name: 'Validator Slot',    stars: 200, effect: 'unlock_validator' },
  quantum_upgrade:  { name: 'Quantum Upgrade',   stars: 500, effect: 'unlock_quantum' },
}

// Called when Telegram confirms a Stars payment
export async function POST(req: NextRequest) {
  try {
    const { userId, itemSlug, telegramChargeId } = await req.json()

    const item = SHOP_ITEMS[itemSlug]
    if (!item) {
      return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    }

    // Check this charge hasn't been used before (idempotency)
    if (telegramChargeId) {
      const { data: dup } = await supabaseAdmin
        .from('purchases')
        .select('id')
        .eq('telegram_charge_id', telegramChargeId)
        .single()

      if (dup) {
        return NextResponse.json({ error: 'Charge already processed' }, { status: 409 })
      }
    }

    // Record the purchase
    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id:            userId,
        item_slug:          itemSlug,
        item_name:          item.name,
        price_stars:        item.stars,
        telegram_charge_id: telegramChargeId ?? null,
        status:             'completed',
        applied:            false,
      })
      .select()
      .single()

    if (purchaseErr) throw purchaseErr

    // Apply the effect
    await applyPurchaseEffect(userId, item.effect, purchase.id)

    // Pool grows with purchases (5% of price in $RTM equivalent goes to pool)
    const rtmEquivalent = item.stars * 0.1
    await supabaseAdmin.rpc('sql', {
      query: `UPDATE seasons SET pool_current = pool_current + ${rtmEquivalent} WHERE status = 'active'`
    }).catch(() => {}) // non-critical

    return NextResponse.json({ success: true, purchase })
  } catch (err: any) {
    console.error('[purchase]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function applyPurchaseEffect(userId: string, effect: string, purchaseId: string) {
  switch (effect) {
    case 'boost_24h':
      await supabaseAdmin
        .from('users')
        .update({
          hash_boost:       2.0,
          boost_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .eq('id', userId)
      break

    case 'perm_boost_10pct':
      await supabaseAdmin.rpc('sql', {
        query: `UPDATE users SET hash_boost = hash_boost * 1.1 WHERE id = '${userId}'`
      }).catch(() => {})
      break

    case 'crate': {
      // Random reward: 50% chance node upgrade credit, 50% chance RTM
      const rand = Math.random()
      if (rand < 0.5) {
        await supabaseAdmin
          .from('users')
          .update({ rtm_balance: supabaseAdmin.rpc as any })
          .eq('id', userId)
        // Give 30-100 RTM
        const bonus = Math.floor(Math.random() * 70) + 30
        await supabaseAdmin.rpc('sql', {
          query: `UPDATE users SET rtm_balance = rtm_balance + ${bonus} WHERE id = '${userId}'`
        }).catch(() => {})
      }
      break
    }

    default:
      break
  }

  // Mark as applied
  await supabaseAdmin
    .from('purchases')
    .update({ applied: true })
    .eq('id', purchaseId)
}
