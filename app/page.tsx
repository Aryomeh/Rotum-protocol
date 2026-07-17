'use client'
import Store from '@/components/Store' 
import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useUser } from '@/hooks/useUser'
import { useRealtime } from '@/hooks/useRealtime'
import NavBar from '@/components/NavBar'
import Dashboard from '@/components/Dashboard'
import Nodes from '@/components/Nodes'
import Leaderboard from '@/components/Leaderboard'
import Season from '@/components/Season'
import Profile from '@/components/Profile'
import NodeInstallOnboarding from '@/components/NodeInstallOnboarding'

export default function Home() {
  useUser()
  useRealtime()

  const { activeTab, isLoading, error, isFirstTime } = useStore()
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const twa = (window as any).Telegram.WebApp
      twa.ready()
      twa.expand()
      twa.setHeaderColor('#080a0f')
      twa.setBackgroundColor('#080a0f')
    }
  }, [])

  // Show onboarding for first-time users (before loading state ends)
  if (isFirstTime) {
    return <NodeInstallOnboarding />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="font-mono text-sm tracking-widest" style={{ color: 'var(--rtm-purple)' }}>
          ROTUM PROTOCOL
        </div>
        <div className="flex gap-1">
          {[0,1,2,3].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--rtm-purple)', animation: `blink 1.2s infinite ${i*0.2}s` }} />
          ))}
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>Syncing network...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-red)' }}>CONNECTION ERROR</div>
        <div className="font-mono text-xs text-center" style={{ color: 'var(--rtm-muted)' }}>{error}</div>
        <button className="btn-rtm mt-2" onClick={() => window.location.reload()}>RETRY</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--rtm-bg)' }}>
      <TopBar onProfileClick={() => setShowProfile(true)} />
      <NavBar />
      <main className="flex-1 overflow-y-auto pb-4">
        {activeTab === 'dash'   && <Dashboard />}
        {activeTab === 'nodes'  && <Nodes />}
        {activeTab === 'store' && <Store />}
        {activeTab === 'ranks'  && <Leaderboard />}
        {activeTab === 'season' && <Season />}
      </main>

      {/* Profile modal */}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  )
}

function TopBar({ onProfileClick }: { onProfileClick: () => void }) {
  const { season, user } = useStore()
  const [rtmPriceUsd, setRtmPriceUsd] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPrice() {
      try {
        const res = await fetch('/api/stats/rtm-price')
        const data = await res.json()
        if (!cancelled && typeof data.rtm_price_usd === 'number') {
          setRtmPriceUsd(data.rtm_price_usd)
        }
      } catch (err) {
        console.error('Failed to load RTM price:', err)
      }
    }

    loadPrice()
    const id = setInterval(loadPrice, 60_000) // refresh every 60s
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const balance = user?.rtm_balance ?? 0
  const usdEstimate = rtmPriceUsd != null ? balance * rtmPriceUsd : null

  return (
    <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 z-10"
      style={{ background: 'var(--rtm-surface)', borderBottom: '1px solid var(--rtm-border)' }}>

      {/* Profile button — replaces ROTUM PROTOCOL text */}
      <button
        onClick={onProfileClick}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          background:   'none',
          border:       'none',
          cursor:       'pointer',
          padding:      0,
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width:        34,
          height:       34,
          borderRadius: '50%',
          background:   '#1a1030',
          border:       '1px solid var(--rtm-accent)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontFamily:   "'Share Tech Mono'",
          fontSize:     13,
          color:        'var(--rtm-purple)',
          flexShrink:   0,
        }}>
          {user?.telegram_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily:   "'Share Tech Mono'",
            fontSize:     11,
            color:        'var(--rtm-text)',
            lineHeight:   1,
          }}>
            {user?.telegram_name ?? 'Operator'}
          </div>
          <div style={{
            fontFamily:   "'Share Tech Mono'",
            fontSize:     9,
            color:        'var(--rtm-green)',
            marginTop:    2,
          }}>
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $RTM
            {usdEstimate != null && (
              <span style={{ color: 'var(--rtm-muted)', marginLeft: 6 }}>
                (≈${usdEstimate.toFixed(2)})
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Pool display */}
      <div className="font-mono text-xs flex items-center gap-1" style={{ color: 'var(--rtm-muted)' }}>
        <span className="pulse-dot" />
        POOL:&nbsp;
        <span style={{ color: 'var(--rtm-green)' }}>
          {season ? Math.floor(season.pool_size).toLocaleString() : '—'} $RTM
        </span>
      </div>
    </div>
  )
}