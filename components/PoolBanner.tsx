'use client'
import { useStore } from '@/store/useStore'

export default function PoolBanner() {
  const { season } = useStore()

  const pool = season ? Math.floor(season.pool_current) : 0  // ✅ CORRECT
  const poolMax    = season ? season.pool_size : 100_000
  const barPct     = Math.min(100, (pool / poolMax) * 100)
  const endsAt     = season ? new Date(season.ends_at) : null
  const daysLeft   = endsAt
    ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000))
    : 0

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
        style={{ fontSize: 30, color: 'var(--rtm-purple)', lineHeight: 1 }}
      >
        {pool.toLocaleString()}
        <span
          className="ml-1"
          style={{ fontSize: 14, color: 'var(--rtm-accent)' }}
        >
          $RTM
        </span>
      </div>

      <div
        className="font-mono text-xs mt-1.5"
        style={{ color: 'var(--rtm-muted)' }}
      >
        {daysLeft}d remaining · 248,142 operators competing
      </div>

      {/* Pool fill bar */}
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
    </div>
  )
}
