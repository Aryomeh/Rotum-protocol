'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const NAV = [
  { section: 'OVERVIEW' },
  { id: '/admin',          label: '📊 Dashboard' },
  { id: '/admin/season',   label: '🏆 Season'    },
  { section: 'CONTROL' },
  { id: '/admin/pool',     label: '💰 Pool & Mining' },
  { id: '/admin/store',    label: '🛒 Power Store'   },
  { id: '/admin/events',   label: '⚡ Network Events' },
  { section: 'USERS' },
  { id: '/admin/users',    label: '👥 Operators' },
  { id: '/admin/rewards',  label: '🎁 Rewards'   },
  { section: 'SYSTEM' },
  { id: '/admin/feed',     label: '📡 Feed'     },
  { id: '/admin/settings', label: '⚙️ Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [time, setTime]       = useState('')
  const [loggingOut, setOut]  = useState(false)

  // Clock
  if (typeof window !== 'undefined') {
    setInterval(() => {
      const n = new Date()
      setTime([n.getHours(), n.getMinutes(), n.getSeconds()]
        .map(x => String(x).padStart(2, '0')).join(':'))
    }, 1000)
  }

  async function logout() {
    setOut(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  // Don't wrap login page
  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div style={{ background: '#080a0f', minHeight: '100vh', color: '#c0cce0', fontFamily: "'Rajdhani', sans-serif" }}>
      {/* Top bar */}
      <div style={{
        background:   '#0d1017',
        borderBottom: '1px solid #1a2230',
        padding:      '10px 20px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        position:     'sticky',
        top:          0,
        zIndex:       10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: '#9d7fd4', letterSpacing: 3 }}>
            ROTUM PROTOCOL
          </span>
          <span style={{
            background: '#1a1030', border: '1px solid #7b5ea7',
            color: '#9d7fd4', fontSize: 9, padding: '2px 7px',
            borderRadius: 3, letterSpacing: 2, fontFamily: "'Share Tech Mono'",
          }}>
            ADMIN
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            background: '#0a2a14', border: '1px solid #1a4a25',
            color: '#00e5a0', fontSize: 9, padding: '2px 8px',
            borderRadius: 2, fontFamily: "'Share Tech Mono'", letterSpacing: 1,
          }}>
            ● SUPABASE LIVE
          </span>
          <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: '#4a5a70' }}>
            {time}
          </span>
          <button
            onClick={logout}
            disabled={loggingOut}
            style={{
              background: 'none', border: '1px solid #1a2230',
              color: '#4a5a70', fontFamily: "'Share Tech Mono'",
              fontSize: 10, padding: '4px 10px', borderRadius: 3,
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {loggingOut ? '...' : 'LOGOUT'}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: 'calc(100vh - 45px)' }}>

        {/* Sidebar */}
        <div style={{ background: '#0d1017', borderRight: '1px solid #1a2230', padding: '16px 0' }}>
          {NAV.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} style={{
                  fontFamily: "'Share Tech Mono'", fontSize: 9,
                  color: '#4a5a70', letterSpacing: 2,
                  padding: '12px 16px 4px', opacity: .6,
                }}>
                  {item.section}
                </div>
              )
            }
            const isActive = pathname === item.id
            return (
              <div
                key={item.id}
                onClick={() => router.push(item.id!)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         8,
                  padding:     '9px 16px',
                  fontFamily:  "'Share Tech Mono'",
                  fontSize:    11,
                  letterSpacing: 1,
                  color:       isActive ? '#9d7fd4' : '#4a5a70',
                  background:  isActive ? '#0d0820' : 'none',
                  borderLeft:  isActive ? '2px solid #9d7fd4' : '2px solid transparent',
                  cursor:      'pointer',
                  transition:  'all .15s',
                }}
              >
                {item.label}
              </div>
            )
          })}
        </div>

        {/* Page content */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
