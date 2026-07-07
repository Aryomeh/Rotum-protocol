import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const [catalogueRes, claimedRes, nodesRes, upgradesRes, adsRes, purchasesRes, tonRes, rankRes] = await Promise.all([
      supabase.from('achievement_catalogue').select('*').order('sort_order'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      supabase.from('user_nodes').select('upgrade_slug, level').eq('user_id', userId),
      supabase.from('upgrade_catalogue').select('slug, max_level'),
      supabase.from('ad_progress').select('watched_count').eq('user_id', userId),
      supabase.from('purchases').select('price_stars').eq('user_id', userId).eq('status', 'completed'),
      supabase.from('purchases').select('amount_ton').eq('user_id', userId).eq('status', 'completed').eq('source', 'ton'),
      supabase.from('season_rankings').select('rank').eq('user_id', userId).order('rank', { ascending: true }).limit(1),
    ])

    const claimedIds = new Set((claimedRes.data ?? []).map((c) => c.achievement_id))

    const nodeCount   = (nodesRes.data ?? []).length
    const maxLevelMap = new Map((upgradesRes.data ?? []).map((u) => [u.slug, u.max_level]))
    const totalUpgrades = (upgradesRes.data ?? []).length
    const maxedCount = (nodesRes.data ?? []).filter(
      (n) => n.level >= (maxLevelMap.get(n.upgrade_slug) ?? Infinity)
    ).length

    const adsWatched  = (adsRes.data ?? []).reduce((sum, a) => sum + (a.watched_count ?? 0), 0)
    const starsSpent  = (purchasesRes.data ?? []).reduce((sum, p) => sum + (p.price_stars ?? 0), 0)
    const tonSpent    = (tonRes.data ?? []).reduce((sum, t) => sum + (t.amount_ton ?? 0), 0)
    const bestRank    = rankRes.data?.[0]?.rank ?? null

    const achievements = (catalogueRes.data ?? []).map((a) => {
      const claimed = claimedIds.has(a.id)
      let progress = 0

      switch (a.category) {
        case 'nodes':
          progress = a.slug === 'full_stack'
            ? (totalUpgrades > 0 && maxedCount >= totalUpgrades ? 1 : 0)
            : Math.min(a.target, nodeCount)
          break
        case 'ads':
          progress = Math.min(a.target, adsWatched)
          break
        case 'stars':
          progress = Math.min(a.target, starsSpent)
          break
        case 'ton':
          progress = Math.min(a.target, tonSpent)
          break
        case 'season':
          progress = bestRank !== null && bestRank <= a.target ? a.target : 0
          break
      }

      return {
        id:          a.slug,
        title:       a.title,
        description: a.description,
        icon:        a.icon,
        reward_rtm:  a.reward_rtm,
        target:      a.target,
        category:    a.category,
        unlocked:    claimed,
        canClaim:    !claimed && progress >= a.target,
        progress,
      }
    })

    return NextResponse.json({ success: true, achievements })
  } catch (err: any) {
    console.error('[achievements]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}