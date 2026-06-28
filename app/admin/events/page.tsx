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
const th: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'left', color: '#4a5a70',
  fontSize: 9, letterSpacing: '1px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'",
}
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid #1a2230',
  fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0',
}

interface User {
  id:                string
  telegram_id:       number
  telegram_name:     string | null
  telegram_username: string | null
  hash_power:        number
  rtm_balance:       number
  rtm_earned_total:  number
  uptime_pct:        number
  is_banned:         boolean
  joined_at:         string
  last_active_at:    string
}

export default function AdminUsers() {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState<string | null>(null)
  const [toast, setToast]       = useState('')

  // Credit form
  const [creditId, setCreditId]       = useState('')
  const [creditAmt, setCreditAmt]     = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [crediting, setCrediting]     = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers(q?: string) {
    setLoading(true)
    let query = supabase
      .from('users')
      .select('*')
      .order('hash_power', { ascending: false })
      .limit(50)

    if (q) {
      query = query.or(
        `telegram_name.ilike.%${q}%,telegram_username.ilike.%${q}%,telegram_id.eq.${parseInt(q) || 0}`
      )
    }

    const { data } = await query
    if (data) setUsers(data)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function toggleBan(user: User) {
    const action = user.is_banned ? 'Unban' : 'Ban'
    if (!confirm(`${action} ${user.telegram_name ?? user.telegram_id}?`)) return
    setSaving(user.id)

    const { error } = await supabase
      .from('users')
      .update({ is_banned: !user.is_banned })
      .eq('id', user.id)

    if (error) showToast('❌ ' + error.message)
    else {
      showToast(`✓ Operator ${action.toLowerCase()}ned`)
      loadUsers(search)
    }
    setSaving(null)
  }

  async function creditRTM() {
    if (!creditId || !creditAmt) return
    setCrediting(true)

    // Find user by telegram_id
    const { data: user } = await supabase
      .from('users')
      .select('id, rtm_balance')
      .eq('telegram_id', parseInt(creditId))
      .single()

    if (!user) { showToast('❌ User not found'); setCrediting(false); return }

    const newBalance = user.rtm_balance + parseFloat(creditAmt)
    const { error } = await supabase
      .from('users')
      .update({ rtm_balance: newBalance })
      .eq('id', user.id)

    if (error) showToast('❌ ' + error.message)
    else {
      showToast(`✓ ${creditAmt} $RTM credited`)
      setCreditId('')
      setCreditAmt('')
      setCreditReason('')
      loadUsers(search)
    }
    setCrediting(false)
  }

  function formatHash(h: number): string {
    if (h >= 1_000_000) return (h / 1_000_000).toFixed(2) + ' PH/s'
    if (h >= 1_000)     return (h / 1_000).toFixed(2) + ' TH/s'
    return h.toFixed(2) + ' GH/s'
  }

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        👥 OPERATOR MANAGEMENT
      </div>

      {/* Search */}
      <div style={panel}>
        <div style={panelHead}>
          SEARCH OPERATORS
          <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70' }}>
            {users.length} shown
          </span>
        </div>
        <div style={{ padding: 14, display: 'flex', gap: 10 }}>
          <input
            style={{ ...inp }}
            placeholder="Name, username or Telegram ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadUsers(search)}
          />
          <button
            onClick={() => loadUsers(search)}
            style={{
              background: '#0f0820', border: '1px solid #7b5ea7',
              color: '#9d7fd4', fontFamily: "'Share Tech Mono'",
              fontSize: 11, padding: '8px 18px', borderRadius: 3,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            SEARCH
          </button>
          <button
            onClick={() => { setSearch(''); loadUsers() }}
            style={{
              background: 'none', border: '1px solid #1a2230',
              color: '#4a5a70', fontFamily: "'Share Tech Mono'",
              fontSize: 11, padding: '8px 14px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            RESET
          </button>
        </div>
      </div>

      {/* Users table */}
      <div style={panel}>
        <div style={panelHead}>TOP OPERATORS BY HASH POWER</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['TG ID', 'NAME', 'HASH POWER', 'BALANCE', 'EARNED', 'JOINED', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: '#4a5a70', borderBottom: 'none' }}>
                    LOADING...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: '#4a5a70', borderBottom: 'none' }}>
                    No operators found
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} style={{ opacity: user.is_banned ? 0.5 : 1 }}>
                  <td style={{ ...td, color: '#4a5a70', fontSize: 10 }}>
                    {user.telegram_id}
                  </td>
                  <td style={td}>
                    {user.telegram_name ?? '—'}
                    {user.telegram_username && (
                      <div style={{ fontSize: 9, color: '#4a5a70' }}>@{user.telegram_username}</div>
                    )}
                  </td>
                  <td style={{ ...td, color: '#9d7fd4' }}>
                    {formatHash(user.hash_power)}
                  </td>
                  <td style={{ ...td, color: '#f0a500' }}>
                    {Math.floor(user.rtm_balance).toLocaleString()} $RTM
                  </td>
                  <td style={{ ...td, color: '#00e5a0' }}>
                    {Math.floor(user.rtm_earned_total).toLocaleString()} $RTM
                  </td>
                  <td style={{ ...td, color: '#4a5a70', fontSize: 10 }}>
                    {new Date(user.joined_at).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    <span style={{
                      fontFamily: "'Share Tech Mono'", fontSize: 9,
                      padding: '2px 7px', borderRadius: 2,
                      background: user.is_banned ? '#1a0810' : '#0a2a14',
                      border: `1px solid ${user.is_banned ? '#3a1020' : '#1a4a25'}`,
                      color: user.is_banned ? '#ff4455' : '#00e5a0',
                    }}>
                      {user.is_banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => { setCreditId(String(user.telegram_id)) }}
                      style={{
                        background: '#0a1a10', border: '1px solid #00e5a0',
                        color: '#00e5a0', fontFamily: "'Share Tech Mono'",
                        fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                      }}
                    >
                      CREDIT
                    </button>
                    <button
                      onClick={() => toggleBan(user)}
                      disabled={saving === user.id}
                      style={{
                        background: user.is_banned ? '#0a1a10' : '#1a0810',
                        border: `1px solid ${user.is_banned ? '#00e5a0' : '#ff4455'}`,
                        color: user.is_banned ? '#00e5a0' : '#ff4455',
                        fontFamily: "'Share Tech Mono'",
                        fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                      }}
                    >
                      {saving === user.id ? '...' : user.is_banned ? 'UNBAN' : 'BAN'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual RTM credit */}
      <div style={panel}>
        <div style={panelHead}>MANUAL $RTM CREDIT</div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={lbl}>TELEGRAM ID</label>
              <input
                style={inp}
                placeholder="e.g. 123456789"
                value={creditId}
                onChange={e => setCreditId(e.target.value)}
              />
            </div>
            <div>
              <label style={lbl}>AMOUNT ($RTM)</label>
              <input
                style={inp}
                type="number"
                placeholder="e.g. 500"
                value={creditAmt}
                onChange={e => setCreditAmt(e.target.value)}
              />
            </div>
            <div>
              <label style={lbl}>REASON</label>
              <input
                style={inp}
                placeholder="e.g. season bonus"
                value={creditReason}
                onChange={e => setCreditReason(e.target.value)}
              />
            </div>
            <button
              onClick={creditRTM}
              disabled={crediting || !creditId || !creditAmt}
              style={{
                background: '#0a1a10', border: '1px solid #00e5a0',
                color: '#00e5a0', fontFamily: "'Share Tech Mono'",
                fontSize: 11, padding: '8px 16px', borderRadius: 3,
                cursor: crediting || !creditId || !creditAmt ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {crediting ? '...' : 'CREDIT $RTM'}
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