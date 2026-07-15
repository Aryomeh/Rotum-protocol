import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const [usersRes, nodesRes, purchasesRes, feedRes, activeRes, seasonRes, starsRes] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('user_nodes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('purchases').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('network_feed').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 86_400_000).toISOString()),
      supabaseAdmin.from('seasons').select('*').eq('status', 'active').single(),
      supabaseAdmin.from('purchases').select('price_stars').eq('status', 'completed'),
    ])

    const season    = seasonRes.data
    const endsAt    = season ? new Date(season.ends_at) : null
    const daysLeft  = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000)) : 0
    const totalStars = starsRes.data?.reduce((s: number, p: any) => s + (p.price_stars ?? 0), 0) ?? 0

    return NextResponse.json({
      // existing fields — kept as-is so anything else using this route still works
      users:     usersRes.count ?? 0,
      nodes:     nodesRes.count ?? 0,
      purchases: purchasesRes.count ?? 0,
      feed:      feedRes.count ?? 0,

      // new fields — used by the admin dashboard page
      totalUsers:     usersRes.count ?? 0,
      activeToday:    activeRes.count ?? 0,
      seasonPool:     season?.pool_current ?? 0,
      totalPurchases: totalStars,
      seasonName:     season?.name ?? '—',
      seasonDaysLeft: daysLeft,
      networkHash:    '142.8 PH/s',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}