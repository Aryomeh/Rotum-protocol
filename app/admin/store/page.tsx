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

// Default shop items (stored locally — in production move to a DB table)
const DEFAULT_ITEMS = [
  { slug: 'hash_boost_24h',   icon: '⚡', name: 'Hash Boost (24h)',  stars: 25,  rtm: 25,  effect: '2× rate 24h',  active: true  },
  { slug: 'mining_crate',     icon: '📦', name: 'Mining Crate',      stars: 50,  rtm: 50,  effect: 'Random item',  active: true  },
  { slug: 'accelerator_pack', icon: '🚀', name: 'Accelerator Pack',  stars: 100, rtm: 100, effect: '+10% perm',    active: true  },
  { slug: 'validator_slot',   icon: '🔮', name: 'Validator Slot',    stars: 200, rtm: 200, effect: 'Unlock tier',  active: false },
  { slug: 'quantum_upgrade',  icon: '⚛️', name: 'Quantum Upgrade',   stars: 500, rtm: 500, effect: 'Unlock tier',  active: false },
]

interface StoreItem {
  slug:   string
  icon:   string
  name:   string
  stars:  number
  rtm:    number
  effect: string
  active: boolean
}

interface Purchase {
  id:          string
  user_id:     string
  item_slug:   string
  item_name:   string
  price_stars: number | null
  status:      string
  purchased_at: string
}

export default function AdminStore() {
  const [items, setItems]         = useState<StoreItem[]>(DEFAULT_ITEMS)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [saving, setSaving]       = useState<string | null>(null)
  const [toast, setToast]         = useState('')

  // Manual credit form
  const [creditUser, setCreditUser]   = useState('')
  const [creditItem, setCreditItem]   = useState('hash_boost_24h')
  const [creditReason, setCreditReason] = useState('')
  const [crediting, setCrediting]     = useState(false)

  useEffect(() => { loadPurchases() }, [])

  async function loadPurchases() {
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(10)
    if (data) setPurchases(data)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function updateItem(slug: string, field: keyof StoreItem, value: any) {
    setItems(prev => prev.map(i => i.slug === slug ? { ...i, [field]: value } : i))
  }

  async function saveItem(slug: string) {
    setSaving(slug)
    // In production: upsert to a store_items table
    // For now just simulate save
    await new Promise(r => setTimeout(r, 400))
    showToast('✓ ' + items.find(i => i.slug === slug)?.name + ' saved')
    setSaving(null)
  }

  async function creditManual() {
    if (!creditUser || !creditItem) return
    setCrediting(true)

    const item = items.find(i => i.slug === creditItem)
    const { error } = await supabase.from('purchases').insert({
      user_id:     creditUser,
      item_slug:   creditItem,
      item_name:   item?.name ?? creditItem,
      price_stars: null,
      price_rtm:   null,
      status:      'completed',
      applied:     false,
    })

    if (error) showToast('❌ ' + error.message)
    else {
      showToast('✓ ' + item?.name + ' credited to user')
      setCreditUser('')
      setCreditReason('')
      loadPurchases()
    }
    setCrediting(false)
  }

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        🛒 POWER STORE MANAGEMENT
      </div>

      {/* Store items table */}
      <div style={panel}>
        <div style={panelHead}>
          STORE ITEMS
          <span style={{ color: '#00e5a0', fontSize: 9 }}>EDIT PRICES & STATUS</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ITEM', 'STARS PRICE', 'RTM PRICE', 'EFFECT', 'STATUS', 'ACTION'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.slug} style={{ opacity: item.active ? 1 : 0.5 }}>
                  <td style={td}>{item.icon} {item.name}</td>

                  <td style={{ ...td, width: 100 }}>
                    <input
                      style={{ ...inp, padding: '4px 6px', width: 80 }}
                      type="number"
                      value={item.stars}
                      onChange={e => updateItem(item.slug, 'stars', parseInt(e.target.value))}
                    />
                  </td>

                  <td style={{ ...td, width: 100 }}>
                    <input
                      style={{ ...inp, padding: '4px 6px', width: 80 }}
                      type="number"
                      value={item.rtm}
                      onChange={e => updateItem(item.slug, 'rtm', parseInt(e.target.value))}
                    />
                  </td>

                  <td style={{ ...td, color: '#4a5a70' }}>{item.effect}</td>

                  <td style={td}>
                    <span
                      onClick={() => updateItem(item.slug, 'active', !item.active)}
                      style={{
                        fontFamily: "'Share Tech Mono'", fontSize: 9,
                        padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                        background: item.active ? '#0a2a14' : '#1a0810',
                        border: `1px solid ${item.active ? '#1a4a25' : '#3a1020'}`,
                        color: item.active ? '#00e5a0' : '#ff4455',
                      }}
                    >
                      {item.active ? 'ON' : 'OFF'}
                    </span>
                  </td>

                  <td style={td}>
                    <button
                      onClick={() => saveItem(item.slug)}
                      disabled={saving === item.slug}
                      style={{
                        background: '#0f0820', border: '1px solid #7b5ea7',
                        color: '#9d7fd4', fontFamily: "'Share Tech Mono'",
                        fontSize: 10, padding: '4px 10px', borderRadius: 3,
                        cursor: 'pointer',
                      }}
                    >
                      {saving === item.slug ? '...' : 'SAVE'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual credit */}
      <div style={panel}>
        <div style={panelHead}>MANUAL PURCHASE CREDIT</div>
        <div style={panelBody}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={lbl}>TELEGRAM USER ID</label>
              <input style={inp} placeholder="e.g. 123456789" value={creditUser} onChange={e => setCreditUser(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>ITEM</label>
              <select style={{ ...inp }} value={creditItem} onChange={e => setCreditItem(e.target.value)}>
                {items.map(i => (
                  <option key={i.slug} value={i.slug}>{i.icon} {i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>REASON</label>
              <input style={inp} placeholder="e.g. manual payment" value={creditReason} onChange={e => setCreditReason(e.target.value)} />
            </div>
            <button
              onClick={creditManual}
              disabled={crediting || !creditUser}
              style={{
                background: '#0a1a10', border: '1px solid #00e5a0',
                color: '#00e5a0', fontFamily: "'Share Tech Mono'",
                fontSize: 11, padding: '8px 16px', borderRadius: 3,
                cursor: crediting || !creditUser ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {crediting ? '...' : 'CREDIT'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent purchases */}
      <div style={panel}>
        <div style={panelHead}>
          RECENT PURCHASES
          <button
            onClick={loadPurchases}
            style={{
              background: 'none', border: '1px solid #1a2230',
              color: '#4a5a70', fontFamily: "'Share Tech Mono'",
              fontSize: 9, padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
            }}
          >
            REFRESH
          </button>
        </div>
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['USER ID', 'ITEM', 'STARS', 'STATUS', 'DATE'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: 'center', color: '#4a5a70', borderBottom: 'none' }}>
                    No purchases yet
                  </td>
                </tr>
              ) : purchases.map(p => (
                <tr key={p.id}>
                  <td style={{ ...td, color: '#4a5a70', fontSize: 10 }}>
                    {p.user_id.slice(0, 8)}...
                  </td>
                  <td style={td}>{p.item_name}</td>
                  <td style={{ ...td, color: '#f0a500' }}>
                    {p.price_stars ? `⭐ ${p.price_stars}` : '—'}
                  </td>
                  <td style={td}>
                    <span style={{
                      fontFamily: "'Share Tech Mono'", fontSize: 9,
                      padding: '2px 7px', borderRadius: 2,
                      background: p.status === 'completed' ? '#0a2a14' : '#1a1000',
                      border: `1px solid ${p.status === 'completed' ? '#1a4a25' : '#3a2a00'}`,
                      color: p.status === 'completed' ? '#00e5a0' : '#f0a500',
                    }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#4a5a70', fontSize: 10 }}>
                    {new Date(p.purchased_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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