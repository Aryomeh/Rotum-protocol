import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SHOP_ITEMS, applyPurchaseEffect } from '@/lib/shopEffects'
import { AD_UNLOCK_REQUIREMENTS } from '@/lib/adConfig'

export const runtime = 'edge'

function nextUtcMidnight(from: Date): string {
  return new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate() + 1,
    0, 0, 0
  )).toISOString()
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

// GET /api/watch-ad?userId=xxx
// Returns how many ads the user has watched toward each ad-eligible item,
// plus a lockedUntil timestamp for any item completed earlier today (UTC).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('ad_progress')
    .select('item_slug, watched_count, last_completed_at')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const progress: Record<string, number> = {}
  const lockedUntil: Record<string, string> = {}
  const now = new Date()

  for (const row of data ?? []) {
    progress[row.item_slug] = row.watched_count
    if (row.last_completed_at && isSameUtcDay(new Date(row.last_completed_at), now)) {
      lockedUntil[row.item_slug] = nextUtcMidnight(now)
    }
  }

  return NextResponse.json({ success: true, progress, lockedUntil })
}

// POST /api/watch-ad  { userId, itemSlug }
// Called after the client confirms a rewarded ad finished playing.
// Blocks further progress if the item was already completed earlier
// today (UTC) — it can't be re-farmed until the next UTC day.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const { userId, itemSlug } = JSON.parse(rawBody)

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

    // Already completed today (UTC) — locked until midnight.
    if (existing?.last_completed_at) {
      const now = new Date()
      if (isSameUtcDay(new Date(existing.last_completed_at), now)) {
        return NextResponse.json({
          error: 'Already completed today — resets at 00:00 UTC',
          lockedUntil: nextUtcMidnight(now),
        }, { status: 429 })
      }
    }

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

    const completedAt = new Date().toISOString()
    if (existing) {
      await db.from('ad_progress').update({
        watched_count: 0,
        last_completed_at: completedAt,
        updated_at: completedAt,
      }).eq('id', existing.id)
    } else {
      await db.from('ad_progress').insert({
        user_id: userId, item_slug: itemSlug, watched_count: 0, last_completed_at: completedAt,
      })
    }

    return NextResponse.json({
      success: true,
      completed: true,
      watched: 0,
      required,
      lockedUntil: nextUtcMidnight(new Date()),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
