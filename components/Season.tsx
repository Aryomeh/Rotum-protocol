'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'

const SHOP_ITEMS = [
  {
    slug:  'hash_boost_24h',
    icon:  '⚡',
    name:  'Hash Boost (24h)',
    desc:  '2× your hash rate for 24 hours',
    cost:  25,
  },
  {
    slug:  'mining_crate',
    icon:  '📦',
    name:  'Mining Crate',
    desc:  'Random node upgrade or $RTM bonus',
    cost:  50,
  },
  {
    slug:  'accelerator_pack',
    icon:  '🚀',
    name:  'Accelerator Pack',
    desc:  'Permanent +10% hash rate',
    cost:  100,
  },
  {
    slug:  'validator_slot',
    icon:  '🔮',
    name:  'Validator Slot',
    desc:  'Unlock validator node tier',
    cost:  200,
  },
  {
    slug:  'quantum_upgrade',
    icon:  '⚛️',
    name:  'Quantum Upgrade',
    desc:  'Unlock quantum processor tier',
    cost:  500,
  },
]

const REWARD_TIERS = [
  { tier: '🥇 TOP 10',        operators: '10',     share: '40%', avg: '4,098 $RTM' },
  { tier: '🥈 TOP 100',       operators: '90',     share: '30%', avg: '342 $RTM'   },
  { tier: '🥉 TOP 1,000',     operators: '900',    share: '20%', avg: '23 $RTM'    },
  { tier: '⚡ RANDOM ACTIVE', operators: 'varies', share: '10%', avg: 'varies'      },
]

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!endsAt) return
    function tick() {
      const diff = Math.max(0, new Date(endsAt!).getTime() - Date.now())
      const d    = Math.floor(diff / 86_400_000)
      const h    = Math.floor((diff % 86_400_000) / 3_600_000)
      const m    = Math.floor((diff % 3_600_000)  / 60_000)
      const s    = Math.floor((diff % 60_000)     / 1_000)
      setRemaining(`${d}d ${h}h ${m}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [endsAt])

  return remaining
}

export default function Season() {
  const { season, user } = useStore()
  const [toast, setToast]         = useState<string | null>(null)
  const [buying, setBuying]       = useState<string | null>(null)
  const countdown = useCountdown(season?.ends_at ?? null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function handleBuy(slug: string, cost: number) {
    if (!user || buying) return

    // In production this triggers Telegram.WebApp.openInvoice()
    // For now show what would happen
    const twa = (window as any).Telegram?.WebApp
    if (twa?.openInvoice) {
      // Real flow: your backend creates an invoice link, pass it here
      showToast(`Opening Telegram Stars payment for ${cost} ⭐`)
    } else {
      showToast(`${cost} $RTM · Telegram Stars payment opens in production`)
    }
  }

  const pool     = season ? Math.floor(season.pool_current) : 102_450
  const poolMax  = season ? season.pool_size : 100_000
  const barPct   = Math.min(100, (pool / poolMax) * 100)

  return (
    <div className="animate-page px-3 pt-3">
      {/* Season hero */}
      <div
        className="rounded-md p-4 mb-3 text-center"
        style={{
          background:  'linear-gradient(135deg, #0d0820, #120d28)',
          border:      '1px solid #2a1a50',
        }}
      >
        <div
          className="font-mono mb-1"
          style={{ fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '3px' }}
        >
          SEASON 01 · $RTM GENESIS EPOCH
        </div>
        <div
          className="font-head font-bold glow-purple"
          style={{ fontSize: 26, color: 'var(--rtm-purple)' }}
        >
          ROTUM PROTOCOL
        </div>
        <div
          className="font-mono mt-1"
          style={{ fontSize: 10, color: 'var(--rtm-muted)' }}
        >
          Compete globally. Earn $RTM. Dominate the network.
        </div>

        {/* Pool */}
        <div
          className="font-mono font-bold mt-3"
          style={{ fontSize: 24, color: 'var(--rtm-green)' }}
        >
          {pool.toLocaleString()}
          <span style={{ fontSize: 13, color: 'var(--rtm-accent)', marginLeft: 4 }}>
            $RTM
          </span>
        </div>
        <div className="progress-track mt-2 mx-4">
          <div className="progress-fill-green" style={{ width: `${barPct}%` }} />
        </div>

        {/* Timer */}
        <div
          className="font-mono mt-2"
          style={{ fontSize: 12, color: 'var(--rtm-amber)' }}
        >
          ENDS IN: {countdown || '—'}
        </div>
      </div>

      {/* Reward distribution */}
      <div className="section-label">$RTM REWARD DISTRIBUTION</div>
      <div
        className="rtm-card mb-3 overflow-hidden"
        style={{ borderTop: '2px solid var(--rtm-amber)' }}
      >
        {/* Table header */}
        <div
          className="grid font-mono px-3 py-1.5"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
            fontSize:            9,
            color:               'var(--rtm-muted)',
            letterSpacing:       '1px',
            borderBottom:        '1px solid var(--rtm-border)',
          }}
        >
          <span>TIER</span>
          <span>OPS</span>
          <span>SHARE</span>
          <span className="text-right">AVG REWARD</span>
        </div>

        {REWARD_TIERS.map((row) => (
          <div
            key={row.tier}
            className="grid font-mono px-3 py-2"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
              fontSize:            11,
              color:               'var(--rtm-text)',
              borderBottom:        '1px solid var(--rtm-border)',
            }}
          >
            <span>{row.tier}</span>
            <span style={{ color: 'var(--rtm-muted)' }}>{row.operators}</span>
            <span style={{ color: 'var(--rtm-green)' }}>{row.share}</span>
            <span className="text-right" style={{ color: 'var(--rtm-amber)' }}>
              {row.avg}
            </span>
          </div>
        ))}
      </div>

      {/* Power store */}
      <div className="section-label">$RTM POWER STORE</div>
      <div className="flex flex-col gap-2 mb-4">
        {SHOP_ITEMS.map((item) => (
          <div
            key={item.slug}
            className="rtm-card flex items-center gap-3 px-3 py-2.5"
          >
            <div className="text-xl flex-shrink-0 w-8 text-center">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-head font-semibold"
                style={{ fontSize: 13, color: 'var(--rtm-text)' }}
              >
                {item.name}
              </div>
              <div
                className="font-mono mt-0.5"
                style={{ fontSize: 9, color: 'var(--rtm-muted)' }}
              >
                {item.desc}
              </div>
            </div>
            <button
              className="btn-green flex-shrink-0"
              style={{ fontSize: 11, padding: '5px 10px' }}
              disabled={buying === item.slug}
              onClick={() => handleBuy(item.slug, item.cost)}
            >
              {item.cost} $RTM
            </button>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
