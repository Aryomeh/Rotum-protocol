'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const panel: React.CSSProperties = {
  background: '#111520', border: '1px solid #1a2230',
  borderRadius: 6, overflow: 'hidden', marginBottom: 12,
}
const panelHead: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '2px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const panelBody: React.CSSProperties = { padding: 14 }
const th: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'left', color: '#4a5a70',
  fontSize: 9, letterSpacing: '1px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'",
}
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0',
}

interface Season {
  id:           number
  name:         string
  status:       string
  pool_current: number
  pool_size:    number
}

interface Ranking {
  rank:              number
  hash_power:        number
  est_reward:        number
  network_share:     number
  users:             { telegram_name: string | null; telegram_id?: number } | null
}

interface SeasonReward {
  id:         string
  final_rank: number
  tier:       string
  amount:     number
  paid_at:    string | null
  users:      { telegram_name: string | null } | null
}

export default function AdminRewards() {
  const [season, setSeason]       = useState<Season | null>(null)
  const [rankings, setRankings]   = useState<Ranking[]>([])
  const [rewards, setRewards]     = useState<SeasonReward[]>([])
  const [loading, setLoading]     = useState(true)
  const [distributing, setDist]   = useState(false)
  const [toast, setToast]         = useState('')

  // Tier percentages (editable)
  const [top10Pct, setTop10]      = useState(40)
  const [top100Pct, setTop100]    = useState(30)
  const [top1000Pct, setTop1000]  = useState(20)
  const [randomPct, setRandom]    = useState(10)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [seasonRes, rankRes, rewardRes] = await Promise.all([
      supabase.from('seasons').select('*').eq('status', 'active').single(),
      supabase
        .from('season_rankings')
        .select('rank, hash_power, est_reward, network_share, users(telegram_name)')
        .order('rank', { ascending: true })
        .limit(20),
      supabase
        .from('season_rewards')
        .select('*, users(telegram_name)')
        .order('final_rank', { ascending: true })
        .limit(50),
    ])
    if (seasonRes.data) setSeason(seasonRes.data)
    if (rankRes.data)   setRankings(rankRes.data as any)
    if (rewardRes.data) setRewards(rewardRes.data as any)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function distributeRewards() {
    if (!season) return
    const total = top10Pct + top100Pct + top1000Pct + randomPct
    if (total !== 100) { showToast('❌ Tier percentages must total 100%'); return }
    if (!confirm(`Distribute ${Math.floor(season.pool_current).toLocaleString()} $RTM to all ranked operators? This cannot be undone.`)) return

    setDist(true)
    const pool = season.pool_current

    // Get full rankings
    const { data: allRankings } = await supabase
      .from('season_rankings')
      .select('user_id, rank, est_reward')
      .eq('season_id', season.id)
      .order('rank', { ascending: true })

    if (!allRankings || allRankings.length === 0) {
      showToast('❌ No rankings found — refresh rankings first')
      setDist(false)
      return
    }

    const rewards: any[] = []

    allRankings.forEach((r: any) => {
      let tier   = 'none'
      let amount = 0

      if (r.rank <= 10) {
        tier   = 'top10'
        amount = (pool * (top10Pct / 100)) / 10
      } else if (r.rank <= 100) {
        tier   = 'top100'
        amount = (pool * (top100Pct / 100)) / 90
      } else if (r.rank <= 1000) {
        tier   = 'top1000'
        amount = (pool * (top1000Pct / 100)) / 900
      }

      if (amount > 0) {
        rewards.push({
          season_id:  season.id,
          user_id:    r.user_id,
          final_rank: r.rank,
          tier,
          amount,
          paid_at:    new Date().toISOString(),
        })
      }
    })

    // Insert rewards in batches of 50
    for (let i = 0; i < rewards.length; i += 50) {
      const batch = rewards.slice(i, i + 50)
      await supabase.from('season_rewards').upsert(batch, { onConflict: 'season_id,user_id' })
    }

    // Credit balances to users
    for (const r of rewards) {
      const { data: u } = await supabase
        .from('users')
        .select('rtm_balance, rtm_earned_total')
        .eq('id', r.user_id)
        .single()

      if (u) {
        await supabase.from('users').update({
          rtm_balance:      u.rtm_balance + r.amount,
          rtm_earned_total: u.rtm_earned_total + r.amount,
        }).eq('id', r.user_id)
      }
    }

    // Post to feed
    await supabase.from('network_feed').insert({
      type:    'season',
      message: `Season rewards distributed — <b>${Math.floor(pool).toLocaleString()} $RTM</b> paid out to operators`,
      color:   'green',
    })

    showToast(`✓ ${rewards.length} operators paid — ${Math.floor(pool).toLocaleString()} $RTM distributed`)
    setDist(false)
    load()
  }

  async function refreshRankings() {
    if (!season) return
    const { error } = await supabase.rpc('refresh_season_rankings', { p_season_id: season.id })
    if (error) showToast('❌ ' + error.message)
    else { showToast('✓ Rankings refreshed'); load() }
  }

  const pool      = season?.pool_current ?? 0
  const top10Amt  = pool * (top10Pct / 100)
  const top100Amt = pool * (top100Pct / 100)
  const top1000Amt = pool * (top1000Pct / 100)
  const totalPct  = top10Pct + top100Pct + top1000Pct + randomPct

  if (loading) return (
    <div style={{ fontFamily: "'Share Tech Mono'", color: '#4a5a70', fontSize: 11 }}>LOADING...</div>
  )

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        🎁 REWARD DISTRIBUTION
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Distribute panel */}
        <div style={panel}>
          <div style={panelHead}>DISTRIBUTE REWARDS</div>
          <div style={panelBody}>

            {/* Pool display */}
            <div style={{
              background: '#080a0f', border: '1px solid #2a1a50',
              borderRadius: 4, padding: '12px', marginBottom: 14, textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginBottom: 4 }}>
                POOL TO DISTRIBUTE
              </div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 28, color: '#9d7fd4', fontWeight: 700 }}>
                {Math.floor(pool).toLocaleString()}
                <span style={{ fontSize: 13, color: '#7b5ea7', marginLeft: 4 }}>$RTM</span>
              </div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginTop: 4 }}>
                {season?.name}
              </div>
            </div>

            {/* Tier inputs */}
            <div style={{
              fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70',
              letterSpacing: '2px', marginBottom: 10,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>TIER PERCENTAGES</span>
              <span style={{ color: totalPct === 100 ? '#00e5a0' : '#ff4455' }}>
                TOTAL: {totalPct}% {totalPct === 100 ? '✓' : '≠ 100'}
              </span>
            </div>

            {[
              { label: 'TOP 10 (%)',          val: top10Pct,   set: setTop10,   amt: top10Amt,   count: 10  },
              { label: 'TOP 100 (%)',         val: top100Pct,  set: setTop100,  amt: top100Amt,  count: 90  },
              { label: 'TOP 1,000 (%)',       val: top1000Pct, set: setTop1000, amt: top1000Amt, count: 900 },
              { label: 'RANDOM ACTIVE (%)',   val: randomPct,  set: setRandom,  amt: pool * (randomPct / 100), count: null },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>{row.label}</label>
                  <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#f0a500' }}>
                    {Math.floor(row.amt).toLocaleString()} $RTM
                    {row.count && ` ÷ ${row.count} = ${Math.floor(row.amt / row.count).toLocaleString()} each`}
                  </span>
                </div>
                <input
                  style={{
                    width: '100%', background: '#080a0f', border: '1px solid #1a2230',
                    color: '#c0cce0', fontFamily: "'Share Tech Mono'", fontSize: 12,
                    padding: '6px 10px', borderRadius: 3, outline: 'none',
                  }}
                  type="number" min="0" max="100"
                  value={row.val}
                  onChange={e => row.set(parseInt(e.target.value) || 0)}
                />
              </div>
            ))}

            <button
              onClick={refreshRankings}
              style={{
                width: '100%', marginTop: 8,
                background: '#0a1a10', border: '1px solid #00e5a0',
                color: '#00e5a0', fontFamily: "'Share Tech Mono'",
                fontSize: 11, padding: '8px 0', borderRadius: 3, cursor: 'pointer',
              }}
            >
              REFRESH RANKINGS FIRST
            </button>

            <button
              onClick={distributeRewards}
              disabled={distributing || totalPct !== 100}
              style={{
                width: '100%', marginTop: 8,
                background: distributing || totalPct !== 100 ? '#0a0d14' : '#1a1030',
                border: `1px solid ${distributing || totalPct !== 100 ? '#1a2230' : '#9d7fd4'}`,
                color: distributing || totalPct !== 100 ? '#4a5a70' : '#9d7fd4',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '9px 0', borderRadius: 3,
                cursor: distributing || totalPct !== 100 ? 'not-allowed' : 'pointer',
                letterSpacing: '1px',
              }}
            >
              {distributing ? 'DISTRIBUTING...' : 'DISTRIBUTE NOW'}
            </button>
          </div>
        </div>

        {/* Live rankings preview */}
        <div>
          <div style={panel}>
            <div style={panelHead}>
              CURRENT TOP 20
              <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70' }}>
                LIVE FROM DB
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['RANK', 'OPERATOR', 'HASH', 'EST. REWARD'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankings.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ ...td, textAlign: 'center', color: '#4a5a70', borderBottom: 'none' }}>
                        No rankings — click Refresh Rankings
                      </td>
                    </tr>
                  ) : rankings.map(r => {
                    const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
                    return (
                      <tr key={r.rank}>
                        <td style={{ ...td, color: r.rank <= 3 ? '#f0a500' : '#4a5a70' }}>
                          {medals[r.rank] ?? '#' + r.rank}
                        </td>
                        <td style={td}>
                          {(r.users as any)?.telegram_name ?? 'Operator #' + r.rank}
                        </td>
                        <td style={{ ...td, color: '#9d7fd4' }}>
                          {r.hash_power >= 1000
                            ? (r.hash_power / 1000).toFixed(1) + ' PH/s'
                            : r.hash_power.toFixed(1) + ' TH/s'}
                        </td>
                        <td style={{ ...td, color: '#00e5a0' }}>
                          {Math.floor(r.est_reward).toLocaleString()} $RTM
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past rewards */}
          {rewards.length > 0 && (
            <div style={panel}>
              <div style={panelHead}>PAST DISTRIBUTIONS</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['RANK', 'OPERATOR', 'TIER', 'AMOUNT', 'PAID'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.slice(0, 10).map(r => (
                      <tr key={r.id}>
                        <td style={{ ...td, color: '#4a5a70' }}>#{r.final_rank}</td>
                        <td style={td}>{(r.users as any)?.telegram_name ?? '—'}</td>
                        <td style={td}>
                          <span style={{
                            fontFamily: "'Share Tech Mono'", fontSize: 9,
                            padding: '2px 6px', borderRadius: 2,
                            background: '#1a1030', border: '1px solid #7b5ea7',
                            color: '#9d7fd4',
                          }}>
                            {r.tier.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...td, color: '#00e5a0' }}>
                          {Math.floor(r.amount).toLocaleString()} $RTM
                        </td>
                        <td style={{ ...td, color: '#4a5a70', fontSize: 10 }}>
                          {r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          background: '#0f0820', border: '1px solid #7b5ea7',
          color: '#9d7fd4', fontFamily: "'Share Tech Mono'",
          fontSize: 11, padding: '10px 16px', borderRadius: 4, zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}