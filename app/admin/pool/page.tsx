'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Season {
  id:          number
  name:        string
  status:      string
  pool_size:   number
  pool_current: number
  starts_at:   string
  ends_at:     string
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

const AIRDROP_RESERVE = 2_000_000 // 60% of 10M supply

export default function AdminPool() {
  const [season, setSeason]         = useState<Season | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState('')
  const [totalSpent, setTotalSpent] = useState(0)

  // Form state
  const [name, setName]         = useState('')
  const [status, setStatus]     = useState('active')
  const [endsAt, setEndsAt]     = useState('')
  const [poolSize, setPoolSize] = useState('10000')
  const [poolCurrent, setPoolCurrent] = useState('0') // ✅ Admin-set current pool amount
  const [top10, setTop10]       = useState('40')
  const [top100, setTop100]     = useState('30')
  const [top1000, setTop1000]   = useState('20')
  const [random, setRandom]     = useState('10')

  useEffect(() => { loadSeason() }, [])

  async function loadSeason() {
    setLoading(true)
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)

    const latest = data?.[0] ?? null
    setSeason(latest)
    if (latest) {
      setName(latest.name)
      setStatus(latest.status)
      setEndsAt(latest.ends_at?.split('T')[0] ?? '')
      setPoolSize(latest.pool_size.toString())
      setPoolCurrent(latest.pool_current.toString()) // ✅ load current pool value
    } else {
      setName('')
      setStatus('active')
      setEndsAt('')
      setPoolSize('10000')
      setPoolCurrent('0')
    }

    const { data: allSeasons } = await supabase
      .from('seasons')
      .select('pool_size')
    if (allSeasons) {
      const spent = allSeasons.reduce((sum, s) => sum + (s.pool_size ?? 0), 0)
      setTotalSpent(spent)
    }

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
        pool_current: Number(poolCurrent), // ✅ send the admin-set pool value
      }),
    })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else { showToast('✓ Pool saved'); loadSeason() }
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
    loadSeason()
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
    else { showToast('✓ Pool reset to 0'); loadSeason() }
    setSaving(false)
  }

  async function createNewSeason() {
    if (!confirm('Create a new season? Current season must be ended first.')) return
    setSaving(true)
    const res = await fetch('/api/admin/season/create', { method: 'POST' })
    const json = await res.json()
    if (!json.success) showToast('❌ Error: ' + json.error)
    else { showToast('✓ New season created'); loadSeason() }
    setSaving(false)
  }

  const totalPct = parseInt(top10) + parseInt(top100) + parseInt(top1000) + parseInt(random)
  const pctOk    = totalPct === 100

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

      {/* Airdrop Reserve Banner */}
      <div style={{
        background: '#0a0d14', border: '1px solid #1a2230',
        borderRadius: 6, padding: '12px 14px', marginBottom: 12,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>TOTAL AIRDROP RESERVE</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#f0a500', fontWeight: 700 }}>
            {AIRDROP_RESERVE.toLocaleString()} $RTM
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>ALLOCATED TO SEASONS</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#ff4455', fontWeight: 700 }}>
            {totalSpent.toLocaleString()} $RTM
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', letterSpacing: '1px', marginBottom: 4 }}>REMAINING BALANCE</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#00e5a0', fontWeight: 700 }}>
            {(AIRDROP_RESERVE - totalSpent).toLocaleString()} $RTM
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
              <label style={lbl}>SEASON NAME</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} />
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

            {/* Pool info */}
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

                {/* ✅ New: directly set the current/live pool amount */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...lbl, marginBottom: 3 }}>SET CURRENT POOL ($RTM)</label>
                  <input
                    style={inp}
                    type="number"
                    value={poolCurrent}
                    onChange={e => setPoolCurrent(e.target.value)}
                  />
                </div>

                <div>Current: <span style={{ color: '#00e5a0' }}>{Math.floor(season?.pool_current ?? 0).toLocaleString()} $RTM</span></div>
                <div>Filled: <span style={{ color: '#9d7fd4' }}>
                  {season && season.pool_size > 0 ? ((season.pool_current / season.pool_size) * 100).toFixed(1) : 0}%
                </span></div>
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
            <button style={{ ...btn('#00e5a0', '#0a1a10', '#00e5a0'), marginTop: 6 }} disabled={saving} onClick={createNewSeason}>
              + CREATE NEW SEASON
            </button>
          </div>
        </div>

        {/* Reward tiers */}
        <div style={panel}>
          <div style={panelHead}>
            REWARD TIERS
            <span style={{
              marginLeft: 8,
              color: pctOk ? '#00e5a0' : '#ff4455',
              fontSize: 9,
            }}>
              TOTAL: {totalPct}% {pctOk ? '✓' : '(must = 100%)'}
            </span>
          </div>
          <div style={panelBody}>
            <div style={{
              fontFamily: "'Share Tech Mono'", fontSize: 9,
              color: '#4a5a70', letterSpacing: '2px',
              paddingBottom: 8, borderBottom: '1px solid #1a2230', marginBottom: 12,
            }}>
              POOL DISTRIBUTION
            </div>

            {[
              { label: 'TOP 10 SHARE (%)',    val: top10,   set: setTop10   },
              { label: 'TOP 100 SHARE (%)',   val: top100,  set: setTop100  },
              { label: 'TOP 1,000 SHARE (%)', val: top1000, set: setTop1000 },
              { label: 'RANDOM ACTIVE (%)',   val: random,  set: setRandom  },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: 12 }}>
                <label style={lbl}>{row.label}</label>
                <input
                  style={inp} type="number" min="0" max="100"
                  value={row.val}
                  onChange={e => row.set(e.target.value)}
                />
              </div>
            ))}

            {/* Preview */}
            <div style={{
              background: '#080a0f', border: '1px solid #1a2230',
              borderRadius: 4, padding: '10px 12px', marginBottom: 12,
            }}>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginBottom: 6 }}>PREVIEW (based on current pool)</div>
              {[
                { tier: 'TOP 10',   pct: parseInt(top10),   count: 10  },
                { tier: 'TOP 100',  pct: parseInt(top100),  count: 90  },
                { tier: 'TOP 1K',   pct: parseInt(top1000), count: 900 },
              ].map(row => {
                const poolAmt = (season?.pool_current ?? 0) * (row.pct / 100)
                const perUser = poolAmt / row.count
                return (
                  <div key={row.tier} style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#c0cce0', marginBottom: 4 }}>
                    {row.tier} → <span style={{ color: '#f0a500' }}>{Math.floor(poolAmt).toLocaleString()} $RTM</span>
                    {' '}= <span style={{ color: '#00e5a0' }}>{Math.floor(perUser).toLocaleString()} $RTM each</span>
                  </div>
                )
              })}
            </div>

            <button
              style={btn(pctOk ? '#9d7fd4' : '#4a5a70', '#0f0820', pctOk ? '#7b5ea7' : '#1a2230')}
              disabled={!pctOk || saving}
              onClick={() => showToast('✓ Reward tiers saved (applied at season end)')}
            >
              SAVE TIERS
            </button>
          </div>
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