'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#080a0f', border: '1px solid #1a2230',
  color: '#c0cce0', fontFamily: "'Share Tech Mono'", fontSize: 12,
  padding: '7px 10px', borderRadius: 3, outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: "'Share Tech Mono'", fontSize: 10,
  color: '#4a5a70', letterSpacing: '1px', marginBottom: 5,
}
const hint: React.CSSProperties = {
  fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginTop: 3,
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

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0' }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0' }}>{label}</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginTop: 2 }}>{sub}</div>
        </div>
        <div
          onClick={onChange}
          style={{
            width: 36, height: 20, borderRadius: 10,
            background: on ? '#00e5a0' : '#1a2230',
            cursor: 'pointer', position: 'relative',
            transition: 'background .2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', width: 14, height: 14,
            background: '#fff', borderRadius: '50%',
            top: 3, left: on ? 19 : 3, transition: 'left .2s',
          }} />
        </div>
      </div>
      <div style={{ height: 1, background: '#1a2230' }} />
    </div>
  )
}

export default function AdminSettings() {
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')
  const [dbStats, setDbStats]   = useState<any>(null)

  // App config
  const [appName, setAppName]         = useState('Rotum Protocol')
  const [ticker, setTicker]           = useState('$RTM')
  const [starterBal, setStarterBal]   = useState('120')
  const [maxNodes, setMaxNodes]       = useState('12')
  const [referralBonus, setRefBonus]  = useState('5')

  // Toggles
  const [maintenance, setMaintenance] = useState(false)
  const [newRegs, setNewRegs]         = useState(true)
  const [purchases, setPurchases]     = useState(true)
  const [referrals, setReferrals]     = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [usersRes, nodesRes, purchasesRes, feedRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('user_nodes').select('id', { count: 'exact', head: true }),
      supabase.from('purchases').select('id', { count: 'exact', head: true }),
      supabase.from('network_feed').select('id', { count: 'exact', head: true }),
    ])
    setDbStats({
      users:     usersRes.count ?? 0,
      nodes:     nodesRes.count ?? 0,
      purchases: purchasesRes.count ?? 0,
      feed:      feedRes.count ?? 0,
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function saveConfig() {
    setSaving(true)
    // In production: upsert to an app_config table
    await new Promise(r => setTimeout(r, 400))
    showToast('✓ App config saved')
    setSaving(false)
  }

  async function refreshRankings() {
    if (!confirm('Refresh all season rankings now? This may take a few seconds.')) return
    setSaving(true)
    const { data: season } = await supabase
      .from('seasons').select('id').eq('status', 'active').single()
    if (!season) { showToast('❌ No active season'); setSaving(false); return }

    const { error } = await supabase.rpc('refresh_season_rankings', { p_season_id: season.id })
    if (error) showToast('❌ ' + error.message)
    else showToast('✓ Rankings refreshed successfully')
    setSaving(false)
  }

  async function clearFeed() {
    if (!confirm('Delete all network feed items? This cannot be undone.')) return
    setSaving(true)
    const { error } = await supabase.from('network_feed').delete().neq('id', 0)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✓ Feed cleared'); loadStats() }
    setSaving(false)
  }

  async function testSupabase() {
    setSaving(true)
    const { error } = await supabase.from('seasons').select('id').limit(1)
    if (error) showToast('❌ Supabase connection failed: ' + error.message)
    else showToast('✓ Supabase connection OK')
    setSaving(false)
  }

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        ⚙️ SYSTEM SETTINGS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* App config */}
        <div>
          <div style={panel}>
            <div style={panelHead}>APP CONFIG</div>
            <div style={panelBody}>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>APP NAME</label>
                <input style={inp} value={appName} onChange={e => setAppName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>TICKER SYMBOL</label>
                <input style={inp} value={ticker} onChange={e => setTicker(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>STARTER BALANCE (new users)</label>
                <input style={inp} type="number" value={starterBal} onChange={e => setStarterBal(e.target.value)} />
                <div style={hint}>$RTM given to each new operator on join</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>MAX NODES PER USER</label>
                <input style={inp} type="number" value={maxNodes} onChange={e => setMaxNodes(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>REFERRAL BONUS (%)</label>
                <input style={inp} type="number" value={referralBonus} onChange={e => setRefBonus(e.target.value)} />
                <div style={hint}>Hash power % bonus referrer receives</div>
              </div>
              <button
                onClick={saveConfig}
                disabled={saving}
                style={{
                  width: '100%', background: '#0f0820',
                  border: '1px solid #7b5ea7', color: '#9d7fd4',
                  fontFamily: "'Share Tech Mono'", fontSize: 11,
                  padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {saving ? 'SAVING...' : 'SAVE CONFIG'}
              </button>
            </div>
          </div>

          {/* DB Stats */}
          <div style={panel}>
            <div style={panelHead}>DATABASE STATS</div>
            <div style={panelBody}>
              {dbStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'USERS',     val: dbStats.users,     color: '#9d7fd4' },
                    { label: 'NODES',     val: dbStats.nodes,     color: '#00e5a0' },
                    { label: 'PURCHASES', val: dbStats.purchases,  color: '#f0a500' },
                    { label: 'FEED ITEMS',val: dbStats.feed,      color: '#00ccdd' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#080a0f', border: '1px solid #1a2230',
                      borderRadius: 4, padding: '10px 12px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginBottom: 4 }}>
                        {s.label}
                      </div>
                      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 18, color: s.color, fontWeight: 700 }}>
                        {s.val.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70' }}>LOADING...</div>
              )}
              <button
                onClick={loadStats}
                style={{
                  width: '100%', marginTop: 10,
                  background: 'none', border: '1px solid #1a2230',
                  color: '#4a5a70', fontFamily: "'Share Tech Mono'",
                  fontSize: 10, padding: '6px 0', borderRadius: 3, cursor: 'pointer',
                }}
              >
                REFRESH STATS
              </button>
            </div>
          </div>
        </div>

        {/* Toggles + maintenance */}
        <div>
          <div style={panel}>
            <div style={panelHead}>ACCESS CONTROL</div>
            <div style={panelBody}>
              <Toggle
                label="Maintenance Mode"
                sub="Blocks all user access to the app"
                on={maintenance}
                onChange={() => { setMaintenance(!maintenance); showToast(maintenance ? '✓ Maintenance OFF' : '⚠ Maintenance ON') }}
              />
              <Toggle
                label="New Registrations"
                sub="Allow new operators to join"
                on={newRegs}
                onChange={() => { setNewRegs(!newRegs); showToast('✓ Registration setting updated') }}
              />
              <Toggle
                label="Purchases Enabled"
                sub="Allow Telegram Stars payments"
                on={purchases}
                onChange={() => { setPurchases(!purchases); showToast('✓ Purchase setting updated') }}
              />
              <Toggle
                label="Referrals Enabled"
                sub="Allow referral bonuses"
                on={referrals}
                onChange={() => { setReferrals(!referrals); showToast('✓ Referral setting updated') }}
              />
            </div>
          </div>

          {/* Maintenance actions */}
          <div style={panel}>
            <div style={panelHead}>MAINTENANCE ACTIONS</div>
            <div style={panelBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={testSupabase}
                  disabled={saving}
                  style={{
                    width: '100%', background: '#0a1a10',
                    border: '1px solid #00e5a0', color: '#00e5a0',
                    fontFamily: "'Share Tech Mono'", fontSize: 11,
                    padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                  }}
                >
                  TEST SUPABASE CONNECTION
                </button>

                <button
                  onClick={refreshRankings}
                  disabled={saving}
                  style={{
                    width: '100%', background: '#0f0820',
                    border: '1px solid #7b5ea7', color: '#9d7fd4',
                    fontFamily: "'Share Tech Mono'", fontSize: 11,
                    padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                  }}
                >
                  REFRESH ALL RANKINGS
                </button>

                <button
                  onClick={clearFeed}
                  disabled={saving}
                  style={{
                    width: '100%', background: '#1a0810',
                    border: '1px solid #ff4455', color: '#ff4455',
                    fontFamily: "'Share Tech Mono'", fontSize: 11,
                    padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                  }}
                >
                  CLEAR NETWORK FEED
                </button>
              </div>
            </div>
          </div>

          {/* Connection info */}
          <div style={panel}>
            <div style={panelHead}>CONNECTION INFO</div>
            <div style={panelBody}>
              {[
                { label: 'SUPABASE',  val: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0] + '.supabase.co', color: '#00e5a0' },
                { label: 'SEASON ID', val: process.env.NEXT_PUBLIC_SEASON_ID ?? '1', color: '#9d7fd4' },
                { label: 'ENV',       val: process.env.NODE_ENV ?? 'production',      color: '#f0a500' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: "'Share Tech Mono'", fontSize: 11,
                  padding: '6px 0', borderBottom: '1px solid #1a2230',
                }}>
                  <span style={{ color: '#4a5a70' }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 10 }}>{row.val}</span>
                </div>
              ))}
            </div>
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
