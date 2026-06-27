'use client'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useUser } from '@/hooks/useUser'
import { useRealtime } from '@/hooks/useRealtime'
import NavBar from '@/components/NavBar'
import Dashboard from '@/components/Dashboard'
import Nodes from '@/components/Nodes'
import Leaderboard from '@/components/Leaderboard'
import Season from '@/components/Season'

export default function Home() {
  useUser()
  useRealtime()

  const { activeTab, isLoading, error } = useStore()

  // Expand Telegram Mini App to full height
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const twa = (window as any).Telegram.WebApp
      twa.ready()
      twa.expand()
      twa.setHeaderColor('#080a0f')
      twa.setBackgroundColor('#080a0f')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div
          className="font-mono text-sm tracking-widest"
          style={{ color: 'var(--rtm-purple)' }}
        >
          ROTUM PROTOCOL
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--rtm-purple)',
                animation: `blink 1.2s infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <div
          className="font-mono text-xs"
          style={{ color: 'var(--rtm-muted)' }}
        >
          Syncing network...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-red)' }}>
          CONNECTION ERROR
        </div>
        <div
          className="font-mono text-xs text-center"
          style={{ color: 'var(--rtm-muted)' }}
        >
          {error}
        </div>
        <button
          className="btn-rtm mt-2"
          onClick={() => window.location.reload()}
        >
          RETRY
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--rtm-bg)' }}
    >
      {/* Sticky top bar */}
      <TopBar />

      {/* Nav tabs */}
      <NavBar />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-4">
        {activeTab === 'dash'   && <Dashboard />}
        {activeTab === 'nodes'  && <Nodes />}
        {activeTab === 'ranks'  && <Leaderboard />}
        {activeTab === 'season' && <Season />}
      </main>
    </div>
  )
}

function TopBar() {
  const { season, user } = useStore()

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 sticky top-0 z-10"
      style={{
        background:  'var(--rtm-surface)',
        borderBottom: '1px solid var(--rtm-border)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-sm tracking-widest"
          style={{ color: 'var(--rtm-purple)' }}
        >
          ROTUM PROTOCOL
        </span>
        <span className="rtm-badge">$RTM</span>
      </div>

      <div
        className="font-mono text-xs flex items-center gap-1"
        style={{ color: 'var(--rtm-muted)' }}
      >
        <span className="pulse-dot" />
        POOL:&nbsp;
        <span style={{ color: 'var(--rtm-green)' }}>
          {season
            ? Math.floor(season.pool_current).toLocaleString()
            : '—'}{' '}
          $RTM
        </span>
      </div>
    </div>
  )
}
