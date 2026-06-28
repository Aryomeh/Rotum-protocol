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

const COLOR_MAP: Record<string, string> = {
  accent: '#9d7fd4',
  green:  '#00e5a0',
  amber:  '#f0a500',
}

// Preset messages for quick posting
const PRESETS = [
  { msg: 'Block #<b>{{block}}</b> validated by Rotum network',         color: 'accent' },
  { msg: 'Network surge event active — hash rates <b>+50%</b>',        color: 'green'  },
  { msg: 'Season pool reached <b>{{pool}} $RTM</b>',                   color: 'green'  },
  { msg: 'Difficulty spike detected — network adjusting',              color: 'amber'  },
  { msg: 'Whale injection: <b>+5,000 $RTM</b> added to season pool',   color: 'green'  },
  { msg: 'New milestone: <b>{{users}} operators</b> joined the network', color: 'accent' },
  { msg: 'Bull market event: <b>earnings doubled</b> for 6 hours',     color: 'green'  },
  { msg: 'Season ending soon — final push for top rankings!',          color: 'amber'  },
]

interface FeedItem {
  id:         number
  type:       string
  message:    string
  color:      string
  created_at: string
}

interface Toggle {
  label: string
  sub:   string
  key:   string
  on:    boolean
}

export default function AdminFeed() {
  const [feed, setFeed]       = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [toast, setToast]     = useState('')

  // Post form
  const [message, setMessage] = useState('')
  const [color, setColor]     = useState('accent')
  const [type, setType]       = useState('event')

  // Toggles (stored in state — in production store in DB)
  const [toggles, setToggles] = useState<Toggle[]>([
    { label: 'Auto block validation',    sub: 'Generates block # events automatically',      key: 'blocks',     on: true  },
    { label: 'Auto upgrade announcements', sub: 'Posts when users hit advanced tiers',       key: 'upgrades',   on: true  },
    { label: 'Pool milestone alerts',    sub: 'Posts at 25%, 50%, 75%, 100% pool fill',      key: 'milestones', on: true  },
    { label: 'Show scripted events',     sub: 'Fills feed with plausible seed events',       key: 'seed',       on: true  },
    { label: 'New user announcements',   sub: 'Posts when operator count hits milestones',   key: 'users',      on: false },
  ])

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    setLoading(true)
    const { data } = await supabase
      .from('network_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setFeed(data)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function postMessage() {
    if (!message.trim()) return
    setPosting(true)
    const { error } = await supabase.from('network_feed').insert({
      type:    type,
      message: message.trim(),
      color:   color,
    })
    if (error) showToast('❌ ' + error.message)
    else {
      showToast('✓ Message posted to network feed')
      setMessage('')
      loadFeed()
    }
    setPosting(false)
  }

  async function postPreset(preset: { msg: string; color: string }) {
    setPosting(true)
    const { error } = await supabase.from('network_feed').insert({
      type:    'event',
      message: preset.msg,
      color:   preset.color,
    })
    if (error) showToast('❌ ' + error.message)
    else { showToast('✓ Preset posted'); loadFeed() }
    setPosting(false)
  }

  async function deleteItem(id: number) {
    const { error } = await supabase
      .from('network_feed')
      .delete()
      .eq('id', id)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✓ Item deleted'); loadFeed() }
  }

  function toggleSetting(key: string) {
    setToggles(prev => prev.map(t => t.key === key ? { ...t, on: !t.on } : t))
  }

  return (
    <div>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#4a5a70', letterSpacing: '3px', marginBottom: 16 }}>
        📡 NETWORK FEED
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Post message */}
        <div>
          <div style={panel}>
            <div style={panelHead}>POST TO FEED</div>
            <div style={panelBody}>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>MESSAGE (supports &lt;b&gt; tags)</label>
                <textarea
                  style={{ ...inp, resize: 'none' }}
                  rows={3}
                  placeholder="e.g. Network surge active — <b>hash rates +50%!</b>"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>COLOR</label>
                  <select style={{ ...inp }} value={color} onChange={e => setColor(e.target.value)}>
                    <option value="accent">Purple (accent)</option>
                    <option value="green">Green (positive)</option>
                    <option value="amber">Amber (warning)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>TYPE</label>
                  <select style={{ ...inp }} value={type} onChange={e => setType(e.target.value)}>
                    <option value="event">Event</option>
                    <option value="block">Block</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="pool">Pool</option>
                    <option value="season">Season</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              {message && (
                <div style={{
                  background: '#080a0f', border: '1px solid #1a2230',
                  borderRadius: 4, padding: '8px 12px', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: COLOR_MAP[color], flexShrink: 0,
                  }} />
                  <span
                    style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0' }}
                    dangerouslySetInnerHTML={{ __html: '⚡ ' + message }}
                  />
                </div>
              )}

              <button
                onClick={postMessage}
                disabled={posting || !message.trim()}
                style={{
                  width: '100%',
                  background: posting || !message.trim() ? '#0a0d14' : '#0f0820',
                  border: `1px solid ${posting || !message.trim() ? '#1a2230' : '#7b5ea7'}`,
                  color: posting || !message.trim() ? '#4a5a70' : '#9d7fd4',
                  fontFamily: "'Share Tech Mono'", fontSize: 11,
                  padding: '8px 0', borderRadius: 3,
                  cursor: posting || !message.trim() ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {posting ? 'POSTING...' : 'POST TO FEED'}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div style={panel}>
            <div style={panelHead}>QUICK PRESETS</div>
            <div style={panelBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRESETS.map((preset, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 10,
                    background: '#080a0f', border: '1px solid #1a2230',
                    borderRadius: 4, padding: '7px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <span style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: COLOR_MAP[preset.color], flexShrink: 0,
                      }} />
                      <span
                        style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#c0cce0' }}
                        dangerouslySetInnerHTML={{ __html: preset.msg }}
                      />
                    </div>
                    <button
                      onClick={() => postPreset(preset)}
                      disabled={posting}
                      style={{
                        background: 'none', border: '1px solid #1a2230',
                        color: '#4a5a70', fontFamily: "'Share Tech Mono'",
                        fontSize: 9, padding: '3px 8px', borderRadius: 2,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      POST
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Auto settings */}
          <div style={panel}>
            <div style={panelHead}>AUTO FEED SETTINGS</div>
            <div style={panelBody}>
              {toggles.map((t, i) => (
                <div key={t.key}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '8px 0',
                  }}>
                    <div>
                      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: '#c0cce0' }}>
                        {t.label}
                      </div>
                      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#4a5a70', marginTop: 2 }}>
                        {t.sub}
                      </div>
                    </div>
                    <div
                      onClick={() => toggleSetting(t.key)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: t.on ? '#00e5a0' : '#1a2230',
                        cursor: 'pointer', position: 'relative',
                        transition: 'background .2s', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', width: 14, height: 14,
                        background: '#fff', borderRadius: '50%',
                        top: 3, left: t.on ? 19 : 3, transition: 'left .2s',
                      }} />
                    </div>
                  </div>
                  {i < toggles.length - 1 && (
                    <div style={{ height: 1, background: '#1a2230' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live feed */}
        <div style={panel}>
          <div style={panelHead}>
            LIVE FEED
            <button
              onClick={loadFeed}
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
            {loading ? (
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70', padding: 14 }}>
                LOADING...
              </div>
            ) : feed.length === 0 ? (
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70', padding: 14, textAlign: 'center' }}>
                No feed items yet
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['', 'MESSAGE', 'TYPE', 'TIME', ''].map((h, i) => (
                      <th key={i} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feed.map(item => (
                    <tr key={item.id}>
                      <td style={{ ...td, width: 16 }}>
                        <span style={{
                          display: 'inline-block', width: 6, height: 6,
                          borderRadius: '50%', background: COLOR_MAP[item.color] ?? '#9d7fd4',
                        }} />
                      </td>
                      <td style={{ ...td, maxWidth: 200 }}>
                        <span
                          style={{ fontSize: 10 }}
                          dangerouslySetInnerHTML={{ __html: item.message }}
                        />
                      </td>
                      <td style={{ ...td, color: '#4a5a70', fontSize: 9 }}>
                        {item.type}
                      </td>
                      <td style={{ ...td, color: '#4a5a70', fontSize: 9, whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleTimeString()}
                      </td>
                      <td style={td}>
                        <button
                          onClick={() => deleteItem(item.id)}
                          style={{
                            background: 'none', border: '1px solid #3a1020',
                            color: '#ff4455', fontFamily: "'Share Tech Mono'",
                            fontSize: 9, padding: '2px 6px', borderRadius: 2,
                            cursor: 'pointer',
                          }}
                        >
                          DEL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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