'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface Stats {
  totalUsers: number
  activeToday: number
  seasonPool: number
  totalPurchases: number
  seasonName: string
  seasonDaysLeft: number
  networkHash: string
}

interface FeedItem {
  id: number
  message: string
  color: string
  created_at: string
}

interface PurchaseItem {
  price_stars: number | null
}

// ==========================================
// STYLES & CONFIG
// ==========================================

const COLOR_MAP: Record<string, string> = {
  accent: '#9d7fd4',
  green: '#00e5a0',
  amber: '#f0a500',
}

const S = {
  pageTitle: { 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 11, 
    color: '#4a5a70', 
    letterSpacing: '3px', 
    marginBottom: 16, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8 
  } as React.CSSProperties,
  statRow: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4,1fr)', 
    gap: 10, 
    marginBottom: 16 
  } as React.CSSProperties,
  card: { 
    background: '#111520', 
    border: '1px solid #1a2230', 
    borderRadius: 6, 
    padding: '12px 14px' 
  } as React.CSSProperties,
  label: { 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 9, 
    color: '#4a5a70', 
    letterSpacing: '1px', 
    marginBottom: 6 
  } as React.CSSProperties,
  val: { 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 22, 
    fontWeight: 700, 
    lineHeight: 1 
  } as React.CSSProperties,
  sub: { 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 9, 
    color: '#4a5a70', 
    marginTop: 4 
  } as React.CSSProperties,
  panelContainer: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: 12 
  } as React.CSSProperties,
  panel: { 
    background: '#111520', 
    border: '1px solid #1a2230', 
    borderRadius: 6, 
    overflow: 'hidden', 
    marginBottom: 12 
  } as React.CSSProperties,
  panelHead: { 
    padding: '10px 14px', 
    borderBottom: '1px solid #1a2230', 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 10, 
    color: '#4a5a70', 
    letterSpacing: '2px' 
  } as React.CSSProperties,
  panelBody: { 
    padding: 14 
  } as React.CSSProperties,
  panelSubtext: { 
    color: '#4a5a70', 
    fontSize: 9, 
    marginTop: 2 
  } as React.CSSProperties,
  feedItem: { 
    padding: '7px 0', 
    borderBottom: '1px solid #1a2230', 
    fontFamily: "'Share Tech Mono'", 
    fontSize: 11, 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: 8 
  } as React.CSSProperties,
  feedMessage: { 
    flex: 1, 
    color: '#c0cce0' 
  } as React.CSSProperties,
  emptyFeed: { 
    color: '#4a5a70', 
    fontSize: 10, 
    fontFamily: "'Share Tech Mono'" 
  } as React.CSSProperties,
  loading: { 
    fontFamily: "'Share Tech Mono'", 
    color: '#4a5a70', 
    fontSize: 11, 
    padding: 20 
  } as React.CSSProperties,
  dot: (color: string) => ({ 
    width: 5, 
    height: 5, 
    borderRadius: '50%', 
    background: color, 
    flexShrink: 0, 
    marginTop: 3 
  }) as React.CSSProperties,
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoad] = useState(true)

  useEffect(() => {
    loadStats()
    loadFeed()

    // Realtime pool updates
    const sub = supabase
      .channel('admin-seasons')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seasons' }, () => loadStats())
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  async function loadStats() {
    try {
      const [seasonRes, usersRes, activeRes, purchasesRes] = await Promise.all([
        supabase.from('seasons').select('*').eq('status', 'active').single(),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true })
          .gte('last_active_at', new Date(Date.now() - 86_400_000).toISOString()),
        supabase.from('purchases').select('price_stars', { count: 'exact' }).eq('status', 'completed'),
      ])

      const season = seasonRes.data
      const endsAt = season ? new Date(season.ends_at) : null
      const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000)) : 0
      const totalStars = purchasesRes.data?.reduce((s: number, p: PurchaseItem) => s + (p.price_stars ?? 0), 0) ?? 0

      setStats({
        totalUsers: usersRes.count ?? 0,
        activeToday: activeRes.count ?? 0,
        seasonPool: season?.pool_current ?? 0,
        totalPurchases: totalStars,
        seasonName: season?.name ?? '—',
        seasonDaysLeft: daysLeft,
        networkHash: '142.8 PH/s',
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoad(false)
    }
  }

  async function loadFeed() {
    const { data } = await supabase
      .from('network_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setFeed(data)
  }

  if (loading) {
    return (
      <div style={S.loading}>
        LOADING STATS...
      </div>
    )
  }

  return (
    <div>
      <div style={S.pageTitle}>📊 OVERVIEW</div>

      {/* Stat cards */}
      <div style={S.statRow}>
        <div style={{ ...S.card, borderTop: '2px solid #9d7fd4' }}>
          <div style={S.label}>TOTAL OPERATORS</div>
          <div style={{ ...S.val, color: '#9d7fd4' }}>
            {(stats?.totalUsers ?? 0).toLocaleString()}
          </div>
          <div style={S.sub}>all time</div>
        </div>

        <div style={{ ...S.card, borderTop: '2px solid #00e5a0' }}>
          <div style={S.label}>SEASON POOL</div>
          <div style={{ ...S.val, color: '#00e5a0' }}>
            {Math.floor(stats?.seasonPool ?? 0).toLocaleString()} $RTM
          </div>
          <div style={S.sub}>{stats?.seasonName}</div>
        </div>

        <div style={{ ...S.card, borderTop: '2px solid #f0a500' }}>
          <div style={S.label}>ACTIVE TODAY</div>
          <div style={{ ...S.val, color: '#f0a500' }}>
            {(stats?.activeToday ?? 0).toLocaleString()}
          </div>
          <div style={S.sub}>last 24 hours</div>
        </div>

        <div style={{ ...S.card, borderTop: '2px solid #00ccdd' }}>
          <div style={S.label}>STARS COLLECTED</div>
          <div style={{ ...S.val, color: '#00ccdd' }}>
            ⭐ {(stats?.totalPurchases ?? 0).toLocaleString()}
          </div>
          <div style={S.sub}>total purchases</div>
        </div>
      </div>

      {/* Two panels */}
      <div style={S.panelContainer}>
        {/* Season status */}
        <div style={S.panel}>
          <div style={S.panelHead}>SEASON STATUS</div>
          <div style={S.panelBody}>
            <div style={S.feedItem}>
              <span style={S.dot('#00e5a0')} />
              <div>
                <div>{stats?.seasonName ?? '—'}</div>
                <div style={S.panelSubtext}>
                  Active · {stats?.seasonDaysLeft} days remaining
                </div>
              </div>
            </div>

            <div style={S.feedItem}>
              <span style={S.dot('#f0a500')} />
              <div>
                <div>Pool: {Math.floor(stats?.seasonPool ?? 0).toLocaleString()} $RTM</div>
                <div style={S.panelSubtext}>
                  Growing from purchases
                </div>
              </div>
            </div>

            <div style={S.feedItem}>
              <span style={S.dot('#9d7fd4')} />
              <div>
                <div>Network hash: {stats?.networkHash}</div>
                <div style={S.panelSubtext}>
                  Difficulty: 8.4T
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live feed */}
        <div style={S.panel}>
          <div style={S.panelHead}>RECENT NETWORK FEED</div>
          <div style={S.panelBody}>
            {feed.length === 0 ? (
              <div style={S.emptyFeed}>
                No feed items yet
              </div>
            ) : (
              feed.map((item) => (
                <div key={item.id} style={{ ...S.feedItem, fontSize: 10 }}>
                  <span style={S.dot(COLOR_MAP[item.color] ?? '#9d7fd4')} />
                  <span
                    style={S.feedMessage}
                    dangerouslySetInnerHTML={{ __html: item.message }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}