'use client'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'

export default function PoolBanner() {
  const { season, user, setUser, showToast } = useStore()

  const pool       = season ? Math.floor(season.pool_current) : 0
  const poolMax    = season ? season.pool_size : 10_000

  const barPct     = poolMax > 0 ? Math.min(100, (pool / poolMax) * 100) : 0

  const endsAt     = season ? new Date(season.ends_at) : null
  const daysLeft   = endsAt
    ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000))
    : 0

  const handleActivate = async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/mining/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Activation failed')

      setUser(json.user)
      showToast('⚡Engine Activated')
    } catch (err: any) {
      showToast('❌ Activation failed: ' + err.message)
    }
  }

  return (
    <div
      className="rounded-md p-3 mb-2.5 text-center"
      style={{
        background:   'linear-gradient(135deg, #0a0a1a, #0f0a20)',
        border:       '1px solid #2a1a50',
      }}
    >
      <div
        className="font-mono text-xs tracking-widest mb-1"
        style={{ color: 'var(--rtm-muted)', letterSpacing: '3px' }}
      >
        SEASON REWARD POOL
      </div>

      <div
        className="font-mono font-bold glow-purple"
        style={{ fontSize: 26, color: 'var(--rtm-purple)', lineHeight: 1 }}
      >
        {pool.toLocaleString()}
        <span
          style={{ fontSize: 14, color: 'var(--rtm-muted)', fontWeight: 'normal', marginLeft: '4px', marginRight: '4px' }}
        >
          /
        </span>
        <span style={{ color: 'var(--rtm-purple)' }}>
          {poolMax.toLocaleString()}
        </span>
        <span
          className="ml-1"
          style={{ fontSize: 14, color: 'var(--rtm-accent)' }}
        >
          $RTM
        </span>
      </div>

      <div
        className="font-mono text-xs mt-1.5 mb-2"
        style={{ color: 'var(--rtm-muted)' }}
      >
        {daysLeft}d remaining · 248,142 operators competing
      </div>

      {!user?.mining_active ? (
        <button
          onClick={handleActivate}
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(90deg, #a855f7, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 12,
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '1px',
            boxShadow: '0 0 12px rgba(168, 85, 247, 0.4)',
            marginTop: '8px'
          }}
        >
          ⚡ ACTIVATE MINING NODE
        </button>
      ) : (
        <>
          <div className="progress-track mt-2">
            <div
              className="progress-fill-green"
              style={{ width: `${barPct}%` }}
            />
          </div>

          <div
            className="font-mono text-xs mt-1 flex justify-between"
            style={{ color: 'var(--rtm-muted)' }}
          >
            <span>0</span>
            <span style={{ color: 'var(--rtm-green)' }}>
              {barPct.toFixed(1)}% filled
            </span>
            <span>{poolMax.toLocaleString()} $RTM</span>
          </div>
        </>
      )}
    </div>
  )
}