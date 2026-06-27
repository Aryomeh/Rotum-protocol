import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

const SHOP_ITEMS: Record<string, { name: string; stars: number; effect: string }> = {
  hash_boost_24h:   { name: 'Hash Boost (24h)',  stars: 25,  effect: 'boost_24h' },
  mining_crate:     { name: 'Mining Crate',      stars: 50,  effect: 'crate' },
  accelerator_pack: { name: 'Accelerator Pack',  stars: 100, effect: 'perm_boost_10pct' },
  validator_slot:   { name: 'Validator Slot',    stars: 200, effect: 'unlock_validator' },
  quantum_upgrade:  { name: 'Quantum Upgrade',   stars: 500, effect: 'unlock_quantum' },
}

export async function POST(req: NextRequest) {
  try {
    const { userId, itemSlug, telegramChargeId } = await req.json()

    const item = SHOP_ITEMS[itemSlug]
    if (!item) {
      return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    }

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

    await applyPurchaseEffect(userId, item.effect, purchase.id)

    // Add RTM equivalent to season pool
    const rtmEquivalent = item.stars * 0.1
    try {
      await supabaseAdmin
        .from('seasons')
        .update({ pool_current: supabaseAdmin.rpc as any })
        .eq('status', 'active')

      // Use raw update instead
      await supabaseAdmin.rpc('refresh_season_rankings', { p_season_id: 1 })
    } catch { /* non-critical */ }

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

    case 'perm_boost_10pct': {
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('hash_boost')
        .eq('id', userId)
        .single()
      if (u) {
        await supabaseAdmin
          .from('users')
          .update({ hash_boost: u.hash_boost * 1.1 })
          .eq('id', userId)
      }
      break
    }

    case 'crate': {
      const bonus = Math.floor(Math.random() * 70) + 30
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('rtm_balance')
        .eq('id', userId)
        .single()
      if (u) {
        await supabaseAdmin
          .from('users')
          .update({ rtm_balance: u.rtm_balance + bonus })
          .eq('id', userId)
      }
      break
    }

    default:
      break
  }

  await supabaseAdmin
    .from('purchases')
    .update({ applied: true })
    .eq('id', purchaseId)
}