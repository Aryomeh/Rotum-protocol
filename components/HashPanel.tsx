'use client'
import { useHash } from '@/hooks/useHash'
import { useStore } from '@/store/useStore'

export default function HashPanel() {
  const { displayHash, baseHash, networkSharePct } = useHash()
  const { season } = useStore()

  const barPct = Math.min(95, (baseHash / 500_000) * 100)

  return (
    <div
      className="rtm-card p-3 mb-2.5 relative overflow-hidden"
      style={{ borderTop: '2px solid var(--rtm-purple)' }}
    >
      {/* Watermark */}
      <span className="rtm-watermark">RTM</span>

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-mono text-xs tracking-widest"
          style={{ color: 'var(--rtm-muted)' }}
        >
          HASH RATE
        </span>
        <span
          className="font-mono text-xs flex items-center gap-1"
          style={{ color: 'var(--rtm-green)' }}
        >
          <span className="pulse-dot" />
          LIVE MINING
        </span>
      </div>

      {/* Big hash number */}
      <div
        className="font-mono font-bold glow-purple"
        style={{ fontSize: 30, color: 'var(--rtm-purple)', lineHeight: 1 }}
      >
        {displayHash}
      </div>

      {/* Progress bar */}
      <div className="progress-track my-2">
        <div
          className="progress-fill-purple"
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Meta row */}
      <div
        className="flex justify-between font-mono text-xs"
        style={{ color: 'var(--rtm-muted)' }}
      >
        <span>NET: 142.8 PH/s</span>
        <span>
          SHARE:{' '}
          <span style={{ color: 'var(--rtm-text)' }}>{networkSharePct}%</span>
        </span>
        <span>
          DIFF:{' '}
          <span style={{ color: 'var(--rtm-text)' }}>8.4T</span>
        </span>
      </div>
    </div>
  )
}
