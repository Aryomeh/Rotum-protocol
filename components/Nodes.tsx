'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { nextLevelCost } from '@/lib/hash'
import { NODE_TON_PRICES, toNano } from '@/lib/tonconnect'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import type { UpgradeCatalogue, UserNode } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  hardware:       'HARDWARE',
  infrastructure: 'INFRASTRUCTURE',
  advanced:       'ADVANCED',
}

const INSTALL_TIMERS: Record<string, number> = {
  cpu_cluster:       5 * 60,
  gpu_farm:          15 * 60,
  asic_cluster:      30 * 60,
  cooling_system:    10 * 60,
  power_grid:        10 * 60,
  ai_optimizer:      45 * 60,
  validator_node:    2 * 60 * 60,
  quantum_processor: 4 * 60 * 60,
}

interface InstallState {
  slug:      string
  name:      string
  cost:      number
  startedAt: number
  duration:  number
  done:      boolean
}

function getTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp
  }
  return null
}

export default function Nodes() {
  const { user, upgrades, userNodes, setUserNodes, setUser } = useStore()
  const [toast, setToast]       = useState<string | null>(null)
  const [installing, setInstalling] = useState<InstallState | null>(null)
  const [payModal, setPayModal] = useState<{ upgrade: UpgradeCatalogue; cost: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [processingTon, setProcessingTon] = useState(false)

  // TON React UI hooks
  const [tonConnectUI] = useTonConnectUI()
  const walletAddress = useTonAddress()

  const nodeMap = Object.fromEntries(userNodes.map((n) => [n.upgrade_slug, n]))

  const grouped = upgrades.reduce<Record<string, UpgradeCatalogue[]>>((acc, u) => {
    if (!acc[u.category]) acc[u.category] = []
    acc[u.category].push(u)
    return acc
  }, {})

  // ✅ Recover in-progress install on mount — survives closing the app
  useEffect(() => {
    if (!user?.id) return

    const tg = getTelegramWebApp()
    const key = `node_installing_${user.id}`

    const restore = (raw: string) => {
      try {
        const saved: InstallState = JSON.parse(raw)
        const elapsed = (Date.now() - saved.startedAt) / 1000
        if (elapsed >= saved.duration) {
          setInstalling({ ...saved, done: true })
          setProgress(100)
          setTimeLeft(0)
        } else {
          setInstalling(saved)
          setProgress(Math.min(100, (elapsed / saved.duration) * 100))
          setTimeLeft(Math.max(0, saved.duration - elapsed))
        }
      } catch {
        // ignore malformed saved state
      }
    }

    if (tg?.CloudStorage) {
      tg.CloudStorage.getItem(key, (err: any, value: string) => {
        if (!err && value) restore(value)
      })
    } else {
      const raw = localStorage.getItem(key)
      if (raw) restore(raw)
    }
  }, [user?.id])

  useEffect(() => {
    if (!installing || installing.done) return
    const id = setInterval(() => {
      const elapsed  = (Date.now() - installing.startedAt) / 1000
      const pct      = Math.min(100, (elapsed / installing.duration) * 100)
      const left     = Math.max(0, installing.duration - elapsed)
      setProgress(pct)
      setTimeLeft(left)
      if (pct >= 100) {
        setInstalling(prev => prev ? { ...prev, done: true } : null)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [installing])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function formatTime(secs: number): string {
    if (secs >= 3600) return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`
    if (secs >= 60)   return `${Math.floor(secs/60)}m ${Math.floor(secs%60)}s`
    return `${Math.floor(secs)}s`
  }

  function openPayModal(upgrade: UpgradeCatalogue) {
    const currentLevel = nodeMap[upgrade.slug]?.level ?? 0
    const cost = nextLevelCost(upgrade, currentLevel)
    setPayModal({ upgrade, cost })
  }

  async function payWithRTM() {
    if (!payModal || !user) return
    const { upgrade, cost } = payModal

    if (user.rtm_balance < cost) {
      showToast('Insufficient $RTM balance')
      return
    }

    setPayModal(null)
    startInstall(upgrade, cost)
  }

  async function payWithTON() {
    if (!payModal || !user) return
    const { upgrade } = payModal

    if (!walletAddress) {
      showToast('Please connect your TON wallet first inside your Profile')
      return
    }

    const tonPrice = NODE_TON_PRICES[upgrade.slug] ?? 1.0
    setProcessingTon(true)

    try {
      // 1. Post to your new route to store transaction intent and get unique payload memo
      const initRes = await fetch('/api/ton-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          slug: upgrade.slug,
          action: 'initiate'
        }),
      })
      const initData = await initRes.json()
      if (!initData.success) throw new Error(initData.error || 'Initialization rejected')

      // 2. Format request payload for client wallet execution
      const transactionPayload = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: initData.merchantWallet,
            amount: toNano(tonPrice),
          }
        ]
      }

      await tonConnectUI.sendTransaction(transactionPayload)

      // 3. Close payment UI and kickoff installer
      setPayModal(null)
      await startInstall(upgrade, 0)
      showToast('💎 Transaction sent! Installing node...')
    } catch (err: any) {
      showToast(err?.message || 'TON Payment cancelled')
    } finally {
      setProcessingTon(false)
    }
  }

  async function startInstall(upgrade: UpgradeCatalogue, cost: number) {
    if (!user) return
    const duration = INSTALL_TIMERS[upgrade.slug] ?? 5 * 60

    if (cost > 0) {
      setUser({ ...user, rtm_balance: user.rtm_balance - cost })
    }

    const newInstall: InstallState = {
      slug:      upgrade.slug,
      name:      upgrade.name,
      cost,
      startedAt: Date.now(),
      duration,
      done:      false,
    }

    setInstalling(newInstall)
    setProgress(0)
    setTimeLeft(duration)

    // ✅ persist so it survives closing the app
    const tg = getTelegramWebApp()
    const key = `node_installing_${user.id}`
    const value = JSON.stringify(newInstall)
    if (tg?.CloudStorage) {
      tg.CloudStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, value)
    }
  }

  async function completeInstall() {
    if (!installing || !user) return

    try {
      const res  = await fetch('/api/node/install', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, slug: installing.slug }),
      })
      const json = await res.json()

      if (!json.success) {
        showToast(json.error ?? 'Install failed')
        if (installing.cost > 0) {
          setUser({ ...user, rtm_balance: user.rtm_balance + installing.cost })
        }
        clearPersistedInstall()
        setInstalling(null)
        return
      }

      const existing = nodeMap[installing.slug]
      const newNode: UserNode = existing
        ? { ...existing, level: json.new_level }
        : {
            id:           crypto.randomUUID(),
            user_id:      user.id,
            upgrade_slug: installing.slug,
            level:        1,
            installed_at: new Date().toISOString(),
          }

      setUserNodes([...userNodes.filter(n => n.upgrade_slug !== installing.slug), newNode])
      setUser({ ...user, hash_power: json.new_hash, rtm_balance: user.rtm_balance - installing.cost })
      showToast('✓ ' + installing.name + ' installed!')
    } catch {
      showToast('Network error')
    }

    // ✅ clear persisted state now that install is complete
    clearPersistedInstall()
    setInstalling(null)
  }

  function clearPersistedInstall() {
    if (!user?.id) return
    const tg = getTelegramWebApp()
    const key = `node_installing_${user.id}`
    if (tg?.CloudStorage) {
      tg.CloudStorage.removeItem(key)
    } else {
      localStorage.removeItem(key)
    }
  }

  return (
    <div className="animate-page px-3 pt-3">
      {installing && (
        <div className="rtm-card rtm-card-purple mb-3 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-purple)' }}>
              {installing.done ? '✓ INSTALL COMPLETE' : '⚙ INSTALLING...'}
            </div>
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>
              {installing.done ? 'Ready to activate' : formatTime(timeLeft) + ' left'}
            </div>
          </div>

          <div className="font-head mb-2" style={{ fontSize: 14, color: 'var(--rtm-text)' }}>
            {installing.name}
          </div>

          <div className="progress-track mb-2">
            <div className="progress-fill-green" style={{ width: `${progress}%` }} />
          </div>

          {!installing.done && (
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>
              Initializing {installing.name.toLowerCase()} hardware stack...
            </div>
          )}

          {installing.done && (
            <button
              onClick={completeInstall}
              style={{
                width:      '100%',
                background: '#0a2a14',
                border:     '1px solid var(--rtm-green)',
                color:      'var(--rtm-green)',
                fontFamily: "'Share Tech Mono'",
                fontSize:   11,
                padding:    '8px 0',
                borderRadius: 3,
                cursor:     'pointer',
              }}
            >
              ✓ ACTIVATE NODE
            </button>
          )}
        </div>
      )}

      {/* Upgrade groups */}
      {['hardware', 'infrastructure', 'advanced'].map((cat) => (
        <div key={cat} className="mb-4">
          <div className="font-mono text-xs mb-2 pb-1" style={{
            color: 'var(--rtm-muted)', letterSpacing: '2px',
            borderBottom: '1px solid var(--rtm-border)',
          }}>
            — {CATEGORY_LABELS[cat]}
          </div>
          <div className="flex flex-col gap-2">
            {(grouped[cat] ?? []).map((upgrade) => (
              <UpgradeCard
                key={upgrade.slug}
                upgrade={upgrade}
                node={nodeMap[upgrade.slug] ?? null}
                balance={user?.rtm_balance ?? 0}
                isInstalling={installing?.slug === upgrade.slug && !installing.done}
                onInstall={() => openPayModal(upgrade)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Payment modal */}
      {payModal && (
        <>
          <div
            onClick={() => !processingTon && setPayModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#0d1017', border: '1px solid #1a2230',
            borderRadius: '12px 12px 0 0', zIndex: 51,
            padding: '20px 16px 32px',
          }}>
            <div style={{ width: 36, height: 4, background: '#1a2230', borderRadius: 2, margin: '0 auto 20px' }} />

            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', letterSpacing: '2px', marginBottom: 4 }}>
              INSTALL NODE
            </div>
            <div style={{ fontFamily: "'Rajdhani'", fontSize: 20, fontWeight: 700, color: 'var(--rtm-text)', marginBottom: 4 }}>
              {payModal.upgrade.name}
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', marginBottom: 16 }}>
              +{payModal.upgrade.hash_per_level} {payModal.upgrade.unit} · Install time: {formatTime(INSTALL_TIMERS[payModal.upgrade.slug] ?? 300)}
            </div>

            {/* Alternating dual-currency box option split layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#080a0f', border: '1px solid #1a2230', borderRadius: 4, padding: '10px' }}>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 8, color: 'var(--rtm-muted)' }}>RTM PRICE</div>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 14, color: 'var(--rtm-purple)', fontWeight: 700, marginTop: 2 }}>
                  {Math.floor(payModal.cost)} $RTM
                </div>
              </div>
              <div style={{ background: '#080a0f', border: '1px solid #1a2230', borderRadius: 4, padding: '10px' }}>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 8, color: 'var(--rtm-muted)' }}>TON PRICE</div>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 14, color: '#00aaff', fontWeight: 700, marginTop: 2 }}>
                  {NODE_TON_PRICES[payModal.upgrade.slug] ?? 1.0} TON
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '2px', marginBottom: 10 }}>
              SELECT PAYMENT METHOD
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={payWithRTM}
                disabled={(user?.rtm_balance ?? 0) < payModal.cost || processingTon}
                style={{
                  width:      '100%',
                  background: (user?.rtm_balance ?? 0) < payModal.cost ? '#0a0d14' : '#0f0820',
                  border:     `1px solid ${(user?.rtm_balance ?? 0) < payModal.cost ? '#1a2230' : 'var(--rtm-accent)'}`,
                  color:      (user?.rtm_balance ?? 0) < payModal.cost ? 'var(--rtm-muted)' : 'var(--rtm-purple)',
                  fontFamily: "'Share Tech Mono'", fontSize: 12, padding: '12px', borderRadius: 4,
                  cursor:     ((user?.rtm_balance ?? 0) < payModal.cost || processingTon) ? 'not-allowed' : 'pointer',
                  display:    'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>💜 Pay with $RTM</span>
                <span style={{ fontSize: 11, color: (user?.rtm_balance ?? 0) < payModal.cost ? 'var(--rtm-red)' : 'var(--rtm-muted)' }}>
                  {(user?.rtm_balance ?? 0) < payModal.cost
                    ? 'Insufficient balance'
                    : `Balance: ${Math.floor(user?.rtm_balance ?? 0).toLocaleString()} $RTM`}
                </span>
              </button>

              <button
                onClick={payWithTON}
                disabled={processingTon}
                style={{
                  width:      '100%',
                  background: '#0a1020',
                  border:     '1px solid #0088cc',
                  color:      '#00aaff',
                  fontFamily: "'Share Tech Mono'", fontSize: 12, padding: '12px', borderRadius: 4,
                  cursor:     processingTon ? 'not-allowed' : 'pointer',
                  display:    'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>💎 {processingTon ? 'AWAITING WALLET...' : 'Pay with TON'}</span>
                <span style={{ fontSize: 11, color: '#6ab6ff' }}>
                  {!walletAddress ? 'Wallet Disconnected' : 'Ready'}
                </span>
              </button>

              <button
                onClick={() => setPayModal(null)}
                disabled={processingTon}
                style={{
                  width: '100%', background: 'none', border: '1px solid #1a2230', color: 'var(--rtm-muted)',
                  fontFamily: "'Share Tech Mono'", fontSize: 11, padding: '10px', borderRadius: 4,
                  cursor: processingTon ? 'not-allowed' : 'pointer', marginTop: 4,
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function UpgradeCard({ upgrade, node, balance, isInstalling, onInstall }: {
  upgrade:      UpgradeCatalogue
  node:         UserNode | null
  balance:      number
  isInstalling: boolean
  onInstall:    () => void
}) {
  const currentLevel = node?.level ?? 0
  const maxed        = currentLevel >= upgrade.max_level
  const cost         = nextLevelCost(upgrade, currentLevel)

  return (
    <div className="rtm-card flex items-center gap-3 px-3 py-2.5 transition-all duration-200"
      style={{ opacity: maxed ? 0.6 : 1 }}>
      <div className="flex items-center justify-center rounded text-lg flex-shrink-0"
        style={{ width: 38, height: 38, border: '1px solid var(--rtm-border)', background: 'var(--rtm-bg)' }}>
        {upgrade.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-head font-semibold" style={{ fontSize: 14, color: 'var(--rtm-text)' }}>
          {upgrade.name}
        </div>
        <div className="font-mono mt-0.5" style={{ fontSize: 9, color: 'var(--rtm-muted)' }}>
          {upgrade.description} · +{upgrade.hash_per_level} {upgrade.unit}/lvl
        </div>
        <div className="flex gap-1 mt-1.5">
          {Array.from({ length: upgrade.max_level }).map((_, i) => (
            <div key={i} className={`lvl-dot${i < currentLevel ? ' filled' : ''}`} />
          ))}
        </div>
      </div>

      <div className="text-right flex-shrink-0" style={{ minWidth: 80 }}>
        {maxed ? (
          <div className="maxed-badge">MAXED</div>
        ) : isInstalling ? (
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-purple)' }}>
            INSTALLING
          </div>
        ) : (
          <>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--rtm-amber)' }}>
              {Math.floor(cost)} $RTM
            </div>
            <div className="font-mono mt-0.5" style={{ fontSize: 9, color: 'var(--rtm-green)' }}>
              +{upgrade.hash_per_level} {upgrade.unit}
            </div>
            <button
              className="btn-rtm mt-1.5 w-full"
              onClick={onInstall}
              style={{ fontSize: 10, padding: '3px 8px' }}
            >
              INSTALL
            </button>
          </>
        )}
      </div>
    </div>
  )
}