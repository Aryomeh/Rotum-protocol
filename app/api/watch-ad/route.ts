import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SHOP_ITEMS, applyPurchaseEffect } from '@/lib/shopEffects'
import { AD_UNLOCK_REQUIREMENTS } from '@/lib/adConfig'

export const runtime = 'edge'

// GET /api/watch-ad?userId=xxx
// Returns how many ads the user has already watched toward each ad-eligible item.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    console.log('[watch-ad POST] raw body:', rawBody)
    const { userId, itemSlug } = JSON.parse(rawBody)

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('ad_progress')
    .select('item_slug, watched_count')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const progress: Record<string, number> = {}
  for (const row of data ?? []) progress[row.item_slug] = row.watched_count

  return NextResponse.json({ success: true, progress })
}

// POST /api/watch-ad  { userId, itemSlug }
// Called after the client confirms a rewarded ad finished playing.
// Increments the user's ad count for that item; once it hits the required
// count, grants the item's effect (same effect logic used for Star purchases)
// and resets the counter.
export async function POST(req: NextRequest) {
  try {
    const { userId, itemSlug } = await req.json()

    const required = AD_UNLOCK_REQUIREMENTS[itemSlug]
    const item     = SHOP_ITEMS[itemSlug]
    if (!required || !item) {
      return NextResponse.json({ error: 'Item is not unlockable via ads' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    const { data: existing } = await db
      .from('ad_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('item_slug', itemSlug)
      .single()

    const watched = (existing?.watched_count ?? 0) + 1

    // Not enough ad views yet — just record progress.
    if (watched < required) {
      if (existing) {
        await db.from('ad_progress').update({ watched_count: watched, updated_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        await db.from('ad_progress').insert({ user_id: userId, item_slug: itemSlug, watched_count: watched })
      }
      return NextResponse.json({ success: true, completed: false, watched, required })
    }

    // Required ad count reached — grant the reward, same as a Stars purchase but at price 0.
    const { data: purchase, error: purchaseErr } = await db.from('purchases').insert({
      user_id: userId, item_slug: itemSlug, item_name: item.name,
      price_stars: 0, status: 'completed', applied: false,
    }).select().single()
    if (purchaseErr) throw purchaseErr

    await applyPurchaseEffect(userId, item.effect, purchase.id)

    if (existing) {
      await db.from('ad_progress').update({ watched_count: 0, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await db.from('ad_progress').insert({ user_id: userId, item_slug: itemSlug, watched_count: 0 })
    }

    return NextResponse.json({ success: true, completed: true, watched: 0, required })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}