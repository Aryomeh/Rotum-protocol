'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Season {
  id:            number
  name:          string
  status:        string
  pool_size:     number
  pool_current:  number
  starts_at:     string
  ends_at:       string
  top10_reward:  number
  top100_reward: number
  random_reward: number
  random_pct:    number
}

interface SupplyPool {
  key: string
  label: string
  allocated: number
  remaining: number
  distributed: number
  percentUsed: number
}

interface SupplyStats {
  totalSupply: number
  totalDistributed: number
  totalRemaining: number
  percentCirculating: number
  pools: SupplyPool[]
  updatedAt: string
}

const inp: React.CSSProperties = {
  width: '100%', background: '#080a0f', border: '1px solid #1a2230',
  color: '#c0cce0', fontFamily: "'Share Tech Mono'", fontSize: 12,
  padding: '7px 10px', borderRadius: 3, outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '1px', marginBottom: 5,
}
const panel: React.CSSProperties = {
  background: '#111520', border: '1px solid #1a2230',
  borderRadius: 6, overflow: 'hidden', marginBottom: 12,
}
const panelHead: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '2px',
}
const panelBody: React.CSSProperties = { padding: 14 }
const btn = (color: string, bg: string, border: string): React.CSSProperties => ({
  width: '100%', background: bg, border: `1px solid ${border}`,
  color, fontFamily: "'Share Tech Mono'", fontSize: 11,
  padding: '8px 0', borderRadius: 3, cursor: 'pointer',
  letterSpacing: '1px', marginTop: 8,
})

// ── Tab toggle styling ──────────────────────────────────────
const tabBar: React.CSSProperties = {
  display: 'flex', gap: 6, marginBottom: 16,
}
const tabBtn = (active: boolean): React.CSSProperties => ({
  fontFamily: "'Share Tech Mono'", fontSize: 10, letterSpacing: '2px',
  padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
  background: active ? '#0f0820' : '#0a0d14',
  border: `1px solid ${active ? '#7b5ea7' : '#1a2230'}`,
  color: active ? '#9d7fd4' : '#4a5a70',
})

const SEASON_OPTIONS = ['Season 1', 'Season 2'] as const

export default function AdminPool() {
  const [tab, setTab] = useState<'season' | 'supply'>('season')

  const [season, setSeason]         = useState<Season | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState('')
  const [poolReserve, setPoolReserve]         = useState(0)
  const [poolDistributed, setPoolDistributed] = useState(0)
  const [poolRemaining, setPoolRemaining]     = useState(0)
  const [totalUsers, setTotalUsers]           = useState(0)

  // Form state
  const [name, setName]         = useState<typeof SEASON_OPTIONS[number]>('Season 1')
  const [status, setStatus]     = useState('active')
  const [endsAt, setEndsAt]     = useState('')
  const [poolSize, setPoolSize] = useState('10000')

  // Fixed reward tier state
  const [top10Reward, setTop10Reward]   = useState('50')
  const [top100Reward, setTop100Reward] = useState('20')
  const [randomReward, setRandomReward] = useState('5')
  const [randomPct, setRandomPct]       = useState('10')

  useEffect(() => { loadSeason('Season 1') }, [])

  async function loadSeason(targetName: typeof SEASON_OPTIONS[number]) {
    setLoading(true)
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .eq('name', targetName)
      .maybeSingle()

    setSeason(data ?? null)
    setName(targetName)

    if (data) {
      setStatus(data.status)
      setEndsAt(data.ends_at?.split('T')[0] ?? '')
      setPoolSize(data.pool_size.toString())
      setTop10Reward((data.top10_reward ?? 50).toString())
      setTop100Reward((data.top100_reward ?? 20).toString())
      setRandomReward((data.random_reward ?? 5).toString())
      setRandomPct((data.random_pct ?? 10).toString())
    } else {
      setStatus('active')
      setEndsAt('')
      setPoolSize('10000')
      setTop10Reward('50')
      setTop100Reward('20')
      setRandomReward('5')
      setRandomPct('10')
    }

    if (data) {
      try {
        const res = await fetch('/api/stats/live-pools', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          const key = targetName === 'Season 2' ? 'season_2_pool' : 'season_1_pool'
          const poolRow = json.pools?.find((p: any) => p.key === key)
          if (poolRow) {
            setPoolReserve(poolRow.allocated)
            setPoolDistributed(poolRow.distributed)
            setPoolRemaining(poolRow.remaining)
          } else {
            setPoolReserve(0); setPoolDistributed(0); setPoolRemaining(0)
          }
        }
      } catch (err) {
        console.error('Failed to load live pool stats for season', err)
      }
    } else {
      setPoolReserve(0); setPoolDistributed(0); setPoolRemaining(0)
    }

    // Rough headcount for the cost-estimate preview below
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_banned', false)
    setTotalUsers(count ?? 0)

    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function saveSeason() {
    if (!season) return
    setSaving(true)
    const res = await fetch('/api/admin/season/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: season.id,
        name,
        status,
        ends_at: new Date(endsAt).toISOString(),
        pool_size: Number(poolSize),
      }),
    })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else { showToast('✓ Pool saved'); loadSeason(name) }
    setSaving(false)
  }

  async function saveTiers() {
    if (!season) return
    setSaving(true)
    const res = await fetch('/api/admin/season/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: season.id,
        name,
        status,
        ends_at: new Date(endsAt).toISOString(),
        top10_reward: Number(top10Reward),
        top100_reward: Number(top100Reward),
        random_reward: Number(randomReward),
        random_pct: Number(randomPct),
      }),
    })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else { showToast('✓ Reward tiers saved'); loadSeason(name) }
    setSaving(false)
  }

  async function endSeason() {
    if (!season) return
    if (!confirm('End season early and queue reward distribution?')) return
    setSaving(true)
    const res = await fetch('/api/admin/season/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: season.id }),
    })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else showToast('✓ Season ended — go to Rewards to distribute')
    setSaving(false)
    loadSeason(name)
  }

  async function resetPool() {
    if (!season) return
    if (!confirm('Reset pool_current and pool_size to 0 for this season?')) return
    setSaving(true)
    const res = await fetch('/api/admin/season/reset-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: season.id }),
    })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else { showToast('✓ Pool reset to 0'); loadSeason(name) }
    setSaving(false)
  }

  // Cost estimate — rough, based on current total headcount
  const estRandomWinners = Math.max(0, totalUsers - 100) * (parseFloat(randomPct || '0') / 100)
  const estTotalCost =
    10  * parseFloat(top10Reward  || '0') +
    90  * parseFloat(top100Reward || '0') +
    estRandomWinners * parseFloat(randomReward || '0')
  const overBudget = poolReserve > 0 && estTotalCost > poolReserve

  if (loading) return (
    <div style={{ fontFamily: "'Share Tech Mono'", color: '#4a5a70', fontSize: 11 }}>
      LOADING...
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        💰 POOL MANAGEMENT
      </div>

      {/* Tab toggle */}
      <div style={tabBar}>
        <div style={tabBtn(tab === 'season')} onClick={() => setTab('season')}>SEASON POOL</div>
        <div style={tabBtn(tab === 'supply')} onClick={() => setTab('supply')}>TOKEN SUPPLY</div>
      </div>

      {tab === 'season' ? (
        <>
          {/* Airdrop Reserve Banner */}
          <div style={{
            background: '#0a0d14', border: '1px solid #1a2230',
            borderRadius: 6, padding: '12px 14px', marginBottom: 12,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          }}>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>TOTAL AIRDROP RESERVE</div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#f0a500', fontWeight: 700 }}>
                {poolReserve.toLocaleString()} $RTM
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>ALLOCATED TO SEASONS</div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#ff4455', fontWeight: 700 }}>
                {poolDistributed.toLocaleString()} $RTM
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>REMAINING BALANCE</div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#00e5a0', fontWeight: 700 }}>
                {poolRemaining.toLocaleString()} $RTM
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Current season */}
            <div style={panel}>
              <div style={panelHead}>
                CURRENT SEASON
                {season && (
                  <span style={{
                    marginLeft: 8, background: season.status === 'active' ? '#0a2a14' : '#1a0810',
                    border: `1px solid ${season.status === 'active' ? '#1a4a25' : '#3a1020'}`,
                    color: season.status === 'active' ? '#00e5a0' : '#ff4455',
                    fontSize: 9, padding: '1px 7px', borderRadius: 2,
                  }}>
                    {season.status.toUpperCase()}
                  </span>
                )}
              </div>
              <div style={panelBody}>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>SEASON</label>
                  <select
                    style={inp}
                    value={name}
                    onChange={e => loadSeason(e.target.value as typeof SEASON_OPTIONS[number])}
                  >
                    {SEASON_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>STATUS</label>
                  <select style={{ ...inp }} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>END DATE</label>
                  <input style={inp} type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                </div>

                <div style={{
                  background: '#080a0f', border: '1px solid #1a2230',
                  borderRadius: 4, padding: '10px 12px', marginBottom: 12,
                }}>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginBottom: 6 }}>POOL INFO</div>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>

                    <div style={{ marginBottom: 8 }}>
                      <label style={{ ...lbl, marginBottom: 3 }}>TARGET POOL SIZE ($RTM)</label>
                      <input
                        style={inp}
                        type="number"
                        value={poolSize}
                        onChange={e => setPoolSize(e.target.value)}
                      />
                    </div>

                    <div>Live pool: <span style={{ color: '#00e5a0' }}>{Math.floor(season?.pool_current ?? 0).toLocaleString()} $RTM</span></div>
                  </div>
                </div>

                <button style={{ ...btn('#ff4455', '#1a0810', '#ff4455'), marginTop: 8 }} disabled={saving} onClick={resetPool}>
                  RESET POOL TO 0
                </button>

                <button style={btn('#9d7fd4', '#0f0820', '#7b5ea7')} disabled={saving} onClick={saveSeason}>
                  {saving ? 'SAVING...' : 'SAVE POOL'}
                </button>
                <button style={{ ...btn('#ff4455', '#1a0810', '#ff4455'), marginTop: 6 }} disabled={saving} onClick={endSeason}>
                  END SEASON EARLY
                </button>
              </div>
            </div>

            {/* Reward tiers — now fixed $RTM amounts, not percentages */}
            <div style={panel}>
              <div style={panelHead}>
                REWARD TIERS
                <span style={{
                  marginLeft: 8,
                  color: overBudget ? '#ff4455' : '#00e5a0',
                  fontSize: 9,
                }}>
                  {overBudget ? '⚠ EXCEEDS BUDGET' : '✓ WITHIN BUDGET'}
                </span>
              </div>
              <div style={panelBody}>
                <div style={{
                  fontFamily: "'Share Tech Mono'", fontSize: 9,
                  color: '#4a5a70', letterSpacing: '2px',
                  paddingBottom: 8, borderBottom: '1px solid #1a2230', marginBottom: 12,
                }}>
                  FIXED REWARD PER USER
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>TOP 10 REWARD ($RTM each)</label>
                  <input style={inp} type="number" min="0" value={top10Reward} onChange={e => setTop10Reward(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>TOP 11–100 REWARD ($RTM each)</label>
                  <input style={inp} type="number" min="0" value={top100Reward} onChange={e => setTop100Reward(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>RANDOM ACTIVE REWARD ($RTM each)</label>
                  <input style={inp} type="number" min="0" value={randomReward} onChange={e => setRandomReward(e.target.value)} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>RANDOM WINNER POOL (% of remaining active users)</label>
                  <input style={inp} type="number" min="0" max="100" value={randomPct} onChange={e => setRandomPct(e.target.value)} />
                </div>

                <div style={{
                  background: '#080a0f', border: '1px solid #1a2230',
                  borderRadius: 4, padding: '10px 12px', marginBottom: 12,
                }}>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginBottom: 6 }}>
                    ESTIMATED COST (based on ~{totalUsers.toLocaleString()} active users)
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0', marginBottom: 4 }}>
                    Top 10: <span style={{ color: '#f0a500' }}>{(10 * parseFloat(top10Reward || '0')).toLocaleString()} $RTM</span>
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0', marginBottom: 4 }}>
                    Top 11–100: <span style={{ color: '#f0a500' }}>{(90 * parseFloat(top100Reward || '0')).toLocaleString()} $RTM</span>
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0', marginBottom: 8 }}>
                    Random (~{Math.round(estRandomWinners)} users): <span style={{ color: '#f0a500' }}>{Math.round(estRandomWinners * parseFloat(randomReward || '0')).toLocaleString()} $RTM</span>
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 12, color: overBudget ? '#ff4455' : '#00e5a0', fontWeight: 700, borderTop: '1px solid #1a2230', paddingTop: 8 }}>
                    Total: {Math.round(estTotalCost).toLocaleString()} $RTM {overBudget && `(budget: ${poolReserve.toLocaleString()} — will auto-scale down)`}
                  </div>
                </div>

                <button
                  style={btn('#9d7fd4', '#0f0820', '#7b5ea7')}
                  disabled={saving}
                  onClick={saveTiers}
                >
                  {saving ? 'SAVING...' : 'SAVE TIERS'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <TokenSupplyPanel />
      )}

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

// ── Token Supply tab ────────────────────────────────────────
function TokenSupplyPanel() {
  const [stats, setStats]     = useState<SupplyStats | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/live-pools', { cache: 'no-store' })
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const data: SupplyStats = await res.json()
      setStats(data)
      setError('')
    } catch (err) {
      console.error('Failed to load live supply stats', err)
      setError('COULD NOT LOAD SUPPLY DATA')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30000)
    return () => clearInterval(id)
  }, [fetchStats])

  if (loading) {
    return <div style={{ fontFamily: "'Share Tech Mono'", color: '#4a5a70', fontSize: 11 }}>LOADING...</div>
  }

  if (error || !stats) {
    return (
      <div style={panel}>
        <div style={panelBody}>
          <div style={{ fontFamily: "'Share Tech Mono'", color: '#ff4455', fontSize: 11, marginBottom: 8 }}>
            {error || 'NO DATA'}
          </div>
          <button style={btn('#9d7fd4', '#0f0820', '#7b5ea7')} onClick={fetchStats}>RETRY</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Summary banner — same layout as season pool banner above */}
      <div style={{
        background: '#0a0d14', border: '1px solid #1a2230',
        borderRadius: 6, padding: '12px 14px', marginBottom: 12,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>TOTAL SUPPLY</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#f0a500', fontWeight: 700 }}>
            {stats.totalSupply.toLocaleString()} $RTM
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>DISTRIBUTED</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#ff4455', fontWeight: 700 }}>
            {stats.totalDistributed.toLocaleString()} $RTM <span style={{ color: '#4a5a70', fontSize: 10 }}>({stats.percentCirculating}%)</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>REMAINING</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#00e5a0', fontWeight: 700 }}>
            {stats.totalRemaining.toLocaleString()} $RTM
          </div>
        </div>
      </div>

      {/* Per-pool breakdown */}
      <div style={panel}>
        <div style={panelHead}>
          ALLOCATION BREAKDOWN
          <span style={{ marginLeft: 8, color: '#4a5a70', fontSize: 9 }}>
            UPDATED {new Date(stats.updatedAt).toLocaleTimeString()}
          </span>
        </div>
        <div style={panelBody}>
          {stats.pools.map((pool, i) => (
            <div key={pool.key} style={{ marginBottom: i === stats.pools.length - 1 ? 0 : 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0' }}>{pool.label}</span>
                <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70' }}>
                  {pool.remaining.toLocaleString()} / {pool.allocated.toLocaleString()} $RTM left
                </span>
              </div>
              <div style={{ background: '#080a0f', border: '1px solid #1a2230', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${pool.percentUsed}%`, height: '100%',
                  background: pool.percentUsed > 80 ? '#ff4455' : pool.percentUsed > 40 ? '#f0a500' : '#00e5a0',
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginTop: 3 }}>
                {pool.percentUsed}% DISTRIBUTED
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
