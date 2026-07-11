'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import Tasks from './Tasks'
import Achievements from './Achievements'
import { showRewardedAd } from '@/lib/ads'
import { AD_UNLOCK_REQUIREMENTS } from '@/lib/adConfig'

const SHOP_ITEMS = [
  { slug: 'hash_boost_24h',   icon: '⚡', name: 'Hash Boost (24h)',  desc: '2× your hash rate for 24 hours',   stars: 25  },
  { slug: 'mining_crate',     icon: '📦', name: 'Mining Crate',      desc: 'Random node upgrade or $RTM bonus', stars: 50  },
  { slug: 'accelerator_pack', icon: '🚀', name: 'Accelerator Pack',  desc: 'Permanent +10% hash rate boost',    stars: 100 },
  { slug: 'validator_slot',   icon: '🔮', name: 'Validator Slot',    desc: 'Unlock the Validator Node tier',    stars: 200 },
  { slug: 'quantum_upgrade',  icon: '⚛️', name: 'Quantum Upgrade',   desc: 'Unlock the Quantum Processor tier', stars: 500 },
]

const REWARD_TIERS = [
  { tier: '🥇 TOP 10',        operators: '10',     share: '40%', avg: '4,098 $RTM' },
  { tier: '🥈 TOP 100',       operators: '90',     share: '30%', avg: '342 $RTM'   },
  { tier: '🥉 TOP 1,000',     operators: '900',    share: '20%', avg: '23 $RTM'    },
  { tier: '⚡ RANDOM ACTIVE', operators: 'varies', share: '10%', avg: 'varies'      },
]

const TABS = ['SEASON', 'STORE', 'TASKS', 'ACHIEVEMENTS'] as const
type Tab = typeof TABS[number]

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!endsAt) return
    function tick() {
      const diff = Math.max(0, new Date(endsAt!).getTime() - Date.now())
      const d = Math.floor(diff / 86_400_000)
      const h = Math.floor((diff % 86_400_000) / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setRemaining(`${d}d ${h}h ${m}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [endsAt])
  return remaining
}

// Short countdown for ad-lock reset, e.g. "6h 42m" — no seconds needed here,
// this just needs to reassure the user roughly when it unlocks.
function useShortCountdown(target: string | null) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!target) { setRemaining(''); return }
    function tick() {
      const diff = new Date(target!).getTime() - Date.now()
      if (diff <= 0) { setRemaining(''); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setRemaining(`${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [target])
  return remaining
}

function AdLockLabel({ resetsAt }: { resetsAt: string }) {
  const remaining = useShortCountdown(resetsAt)
  return <>🔒 {remaining ? `Resets in ${remaining}` : 'Resetting...'}</>
}

export default function Season() {
  const { season, user }        = useStore()
  const [activeTab, setTab]     = useState<Tab>('SEASON')
  const [buying, setBuying]     = useState<string | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [adProgress, setAdProgress] = useState<Record<string, number>>({})
  const [adLockedUntil, setAdLockedUntil] = useState<Record<string, string>>({})
  const [watchingAd, setWatchingAd] = useState<string | null>(null)
  const countdown = useCountdown(season?.ends_at ?? null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/watch-ad?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdProgress(data.progress)
          setAdLockedUntil(data.lockedUntil ?? {})
        }
      })
      .catch(() => {})
  }, [user])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function isLocked(slug: string): string | null {
    const resetsAt = adLockedUntil[slug]
    if (!resetsAt) return null
    return new Date(resetsAt).getTime() > Date.now() ? resetsAt : null
  }

  async function handleWatchAd(slug: string) {
    if (!user || watchingAd || buying) return
    if (isLocked(slug)) return
    setWatchingAd(slug)
    try {
      await showRewardedAd()
      const res = await fetch('/api/watch-ad', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, itemSlug: slug }),
      })
      const data = await res.json()

      if (res.status === 429 && data.lockedUntil) {
        setAdLockedUntil(prev => ({ ...prev, [slug]: data.lockedUntil }))
        showToast(data.error || 'Already completed today')
        return
      }

      if (!data.success) {
        showToast(data.error || 'Could not record ad view')
        return
      }
      setAdProgress(prev => ({ ...prev, [slug]: data.watched }))
      if (data.completed) {
        if (data.lockedUntil) {
          setAdLockedUntil(prev => ({ ...prev, [slug]: data.lockedUntil }))
        }
        showToast('🎉 Reward unlocked — item applied! Resets tomorrow (00:00 UTC)')
      } else {
        showToast(`Ad watched! ${data.watched}/${data.required}`)
      }
    } catch {
      showToast('Ad not available — try again shortly')
    } finally {
      setWatchingAd(null)
    }
  }

  async function handleBuy(slug: string, stars: number) {
    if (!user || buying) return
    setBuying(slug)
    try {
      const twa = (window as any).Telegram?.WebApp
      const res = await fetch('/api/invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, itemSlug: slug, telegramId: user.telegram_id }),
      })
      const data = await res.json()
      if (!data.success || !data.invoiceLink) {
        showToast('Failed to create invoice')
        setBuying(null)
        return
      }
      if (twa?.openInvoice) {
        twa.openInvoice(data.invoiceLink, (status: string) => {
          if (status === 'paid')      showToast('Payment successful! Item applied.')
          else if (status === 'cancelled') showToast('Payment cancelled')
          else if (status === 'failed')    showToast('Payment failed — try again')
          setBuying(null)
        })
      } else {
        window.open(data.invoiceLink, '_blank')
        setBuying(null)
      }
    } catch {
      showToast('Network error — try again')
      setBuying(null)
    }
  }

  const pool    = season ? Math.floor(season.pool_size) : 102_450
  const poolMax = season ? season.pool_size : 100_000
  const barPct  = Math.min(100, (pool / poolMax) * 100)

  return (
    <div className="animate-page px-3 pt-3">

      {/* Sub tabs */}
      <div style={{
        display:        'flex',
        background:     'var(--rtm-surface)',
        border:         '1px solid var(--rtm-border)',
        borderRadius:   6,
        marginBottom:   12,
        overflow:       'hidden',
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            style={{
              flex:        1,
              padding:     '8px 4px',
              fontFamily:  "'Share Tech Mono'",
              fontSize:    11,
              letterSpacing: '1px',
              background:  'none',
              border:      'none',
              borderBottom: activeTab === tab
                ? '2px solid var(--rtm-purple)'
                : '2px solid transparent',
              color:       activeTab === tab ? 'var(--rtm-purple)' : 'var(--rtm-muted)',
              cursor:      'pointer',
              transition:  'all .15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SEASON TAB */}
      {activeTab === 'SEASON' && (
        <>
          {/* Hero */}
          <div className="rounded-md p-4 mb-3 text-center" style={{
            background: 'linear-gradient(135deg, #0d0820, #120d28)',
            border:     '1px solid #2a1a50',
          }}>
            <div className="font-mono mb-1" style={{ fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '3px' }}>
              SEASON 01 · $RTM GENESIS EPOCH
            </div>
            <div className="font-head font-bold glow-purple" style={{ fontSize: 26, color: 'var(--rtm-purple)' }}>
              ROTUM PROTOCOL
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--rtm-muted)' }}>
              Compete globally. Earn $RTM. Dominate the network.
            </div>
            <div className="font-mono font-bold mt-3" style={{ fontSize: 24, color: 'var(--rtm-green)' }}>
              {pool.toLocaleString()}
              <span style={{ fontSize: 13, color: 'var(--rtm-accent)', marginLeft: 4 }}>$RTM</span>
            </div>
            <div className="progress-track mt-2 mx-4">
              <div className="progress-fill-green" style={{ width: `${barPct}%` }} />
            </div>
            <div className="font-mono mt-2" style={{ fontSize: 12, color: 'var(--rtm-amber)' }}>
              ENDS IN: {countdown || '—'}
            </div>
          </div>

          {/* Reward tiers */}
          <div className="section-label">$RTM REWARD DISTRIBUTION</div>
          <div className="rtm-card mb-3 overflow-hidden" style={{ borderTop: '2px solid var(--rtm-amber)' }}>
            <div className="grid font-mono px-3 py-1.5" style={{
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
              fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '1px',
              borderBottom: '1px solid var(--rtm-border)',
            }}>
              <span>TIER</span><span>OPS</span><span>SHARE</span><span className="text-right">AVG REWARD</span>
            </div>
            {REWARD_TIERS.map(row => (
              <div key={row.tier} className="grid font-mono px-3 py-2" style={{
                gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
                fontSize: 11, color: 'var(--rtm-text)',
                borderBottom: '1px solid var(--rtm-border)',
              }}>
                <span>{row.tier}</span>
                <span style={{ color: 'var(--rtm-muted)' }}>{row.operators}</span>
                <span style={{ color: 'var(--rtm-green)' }}>{row.share}</span>
                <span className="text-right" style={{ color: 'var(--rtm-amber)' }}>{row.avg}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* STORE TAB */}
      {activeTab === 'STORE' && (
        <>
          <div className="section-label">$RTM POWER STORE</div>
          <div className="flex flex-col gap-2 mb-4">
            {SHOP_ITEMS.map(item => {
              const isBuying = buying === item.slug
              const adsRequired = AD_UNLOCK_REQUIREMENTS[item.slug]
              const isWatchingAd = watchingAd === item.slug
              const watched = adProgress[item.slug] ?? 0
              const lockedUntil = isLocked(item.slug)
              const adDisabled = isBuying || isWatchingAd || !user || !!lockedUntil
              return (
                <div key={item.slug} className="rtm-card flex items-center gap-3 px-3 py-2.5">
                  <div className="text-xl flex-shrink-0 w-8 text-center">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-semibold" style={{ fontSize: 13, color: 'var(--rtm-text)' }}>
                      {item.name}
                    </div>
                    <div className="font-mono mt-0.5" style={{ fontSize: 9, color: 'var(--rtm-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    <button
                      onClick={() => handleBuy(item.slug, item.stars)}
                      disabled={isBuying || isWatchingAd || !user}
                      style={{
                        background:   isBuying ? '#0a0d14' : '#0a1a10',
                        border:       `1px solid ${isBuying ? 'var(--rtm-border)' : 'var(--rtm-green)'}`,
                        color:        isBuying ? 'var(--rtm-muted)' : 'var(--rtm-green)',
                        fontFamily:   "'Share Tech Mono', monospace",
                        fontSize:     11,
                        padding:      '5px 10px',
                        borderRadius: 3,
                        cursor:       isBuying || isWatchingAd || !user ? 'not-allowed' : 'pointer',
                        transition:   'all .2s',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      {isBuying ? '...' : `⭐ ${item.stars}`}
                    </button>

                    {adsRequired && (
                      <button
                        onClick={() => handleWatchAd(item.slug)}
                        disabled={adDisabled}
                        style={{
                          background:   lockedUntil ? '#0a0d14' : isWatchingAd ? '#0a0d14' : '#150c22',
                          border:       `1px solid ${lockedUntil ? 'var(--rtm-border)' : isWatchingAd ? 'var(--rtm-border)' : 'var(--rtm-purple)'}`,
                          color:        lockedUntil ? 'var(--rtm-muted)' : isWatchingAd ? 'var(--rtm-muted)' : 'var(--rtm-purple)',
                          fontFamily:   "'Share Tech Mono', monospace",
                          fontSize:     10,
                          padding:      '4px 10px',
                          borderRadius: 3,
                          cursor:       adDisabled ? 'not-allowed' : 'pointer',
                          transition:   'all .2s',
                          whiteSpace:   'nowrap',
                        }}
                      >
                        {lockedUntil
                          ? <AdLockLabel resetsAt={lockedUntil} />
                          : isWatchingAd
                            ? '⏳ LOADING...'
                            : `▶ ${watched}/${adsRequired} ADS`
                        }
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* TASKS TAB */}
      {activeTab === 'TASKS' && <Tasks />}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === 'ACHIEVEMENTS' && <Achievements />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
