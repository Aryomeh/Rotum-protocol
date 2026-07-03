import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SHOP_ITEMS, applyPurchaseEffect } from '@/lib/shopEffects'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { userId, itemSlug, telegramChargeId } = await req.json()
    const db = getSupabaseAdmin()
    const item = SHOP_ITEMS[itemSlug]
    if (!item) return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    if (telegramChargeId) {
      const { data: dup } = await db.from('purchases').select('id').eq('telegram_charge_id', telegramChargeId).single()
      if (dup) return NextResponse.json({ error: 'Charge already processed' }, { status: 409 })
    }
    const { data: purchase, error: purchaseErr } = await db.from('purchases').insert({
      user_id: userId, item_slug: itemSlug, item_name: item.name,
      price_stars: item.stars, telegram_charge_id: telegramChargeId ?? null,
      status: 'completed', applied: false,
    }).select().single()
    if (purchaseErr) throw purchaseErr
    await applyPurchaseEffect(userId, item.effect, purchase.id)
    return NextResponse.json({ success: true, purchase })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}