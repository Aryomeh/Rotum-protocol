'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { nextLevelCost } from '@/lib/hash'
import type { UpgradeCatalogue, UserNode } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  hardware:       'HARDWARE',
  infrastructure: 'INFRASTRUCTURE',
  advanced:       'ADVANCED',
}

export default function Nodes() {
  const { user, upgrades, userNodes, setUserNodes, setUser } = useStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast]     = useState<string | null>(null)

  const nodeMap = Object.fromEntries(userNodes.map((n) => [n.upgrade_slug, n]))

  const grouped = upgrades.reduce<Record<string, UpgradeCatalogue[]>>((acc, u) => {
    if (!acc[u.category]) acc[u.category] = []
    acc[u.category].push(u)
    return acc
  }, {})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleInstall(slug: string) {
    if (!user || loading) return
    setLoading(slug)
    try {
      const res  = await fetch('/api/node/install', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, slug }),
      })
      const json = await res.json()
      if (!json.success) { showToast(json.error ?? 'Failed'); return }

      // Update local store optimistically
      const existing = nodeMap[slug]
      const newNode: UserNode = existing
        ? { ...existing, level: json.new_level }
        : {
            id:           crypto.randomUUID(),
            user_id:      user.id,
            upgrade_slug: slug,
            level:        1,
            installed_at: new Date().toISOString(),
          }

      const updatedNodes = [
        ...userNodes.filter((n) => n.upgrade_slug !== slug),
        newNode,
      ]
      setUserNodes(updatedNodes)
      setUser({ ...user, hash_power: json.new_hash, rtm_balance: user.rtm_balance - json.cost })

      const upgrade = upgrades.find((u) => u.slug === slug)
      showToast(`✓ ${upgrade?.name ?? slug} installed · Hash rate boosted`)
    } catch {
      showToast('Network error — try again')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="animate-page px-3 pt-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="section-label" style={{ paddingBottom: 0 }}>
          NODE INFRASTRUCTURE
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-amber)' }}>
          BAL:{' '}
          <span style={{ color: 'var(--rtm-text)' }}>
            {Math.floor(user?.rtm_balance ?? 0).toLocaleString()} $RTM
          </span>
        </div>
      </div>

      {/* Grouped upgrades */}
      {['hardware', 'infrastructure', 'advanced'].map((cat) => (
        <div key={cat} className="mb-4">
          <div
            className="font-mono text-xs mb-2 pb-1"
            style={{
              color:        'var(--rtm-muted)',
              letterSpacing: '2px',
              borderBottom: '1px solid var(--rtm-border)',
            }}
          >
            — {CATEGORY_LABELS[cat]}
          </div>

          <div className="flex flex-col gap-2">
            {(grouped[cat] ?? []).map((upgrade) => (
              <UpgradeCard
                key={upgrade.slug}
                upgrade={upgrade}
                node={nodeMap[upgrade.slug] ?? null}
                balance={user?.rtm_balance ?? 0}
                isLoading={loading === upgrade.slug}
                onInstall={handleInstall}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function UpgradeCard({
  upgrade,
  node,
  balance,
  isLoading,
  onInstall,
}: {
  upgrade:   UpgradeCatalogue
  node:      UserNode | null
  balance:   number
  isLoading: boolean
  onInstall: (slug: string) => void
}) {
  const currentLevel = node?.level ?? 0
  const maxed        = currentLevel >= upgrade.max_level
  const cost         = nextLevelCost(upgrade, currentLevel)
  const canAfford    = balance >= cost

  return (
    <div
      className="rtm-card flex items-center gap-3 px-3 py-2.5 transition-all duration-200"
      style={{
        borderColor: maxed ? 'var(--rtm-border)' : undefined,
        opacity:     maxed ? 0.65 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded text-lg flex-shrink-0"
        style={{
          width:  38,
          height: 38,
          border: '1px solid var(--rtm-border)',
          background: 'var(--rtm-bg)',
        }}
      >
        {upgrade.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="font-head font-semibold"
          style={{ fontSize: 14, color: 'var(--rtm-text)' }}
        >
          {upgrade.name}
        </div>
        <div
          className="font-mono mt-0.5"
          style={{ fontSize: 9, color: 'var(--rtm-muted)' }}
        >
          {upgrade.description} · +{upgrade.hash_per_level} {upgrade.unit}/lvl
        </div>

        {/* Level dots */}
        <div className="flex gap-1 mt-1.5">
          {Array.from({ length: upgrade.max_level }).map((_, i) => (
            <div
              key={i}
              className={`lvl-dot${i < currentLevel ? ' filled' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="text-right flex-shrink-0" style={{ minWidth: 80 }}>
        {maxed ? (
          <div className="maxed-badge">MAXED</div>
        ) : (
          <>
            <div
              className="font-mono"
              style={{ fontSize: 11, color: 'var(--rtm-amber)' }}
            >
              {Math.floor(cost)} $RTM
            </div>
            <div
              className="font-mono mt-0.5"
              style={{ fontSize: 9, color: 'var(--rtm-green)' }}
            >
              +{upgrade.hash_per_level} {upgrade.unit}
            </div>
            <button
              className="btn-rtm mt-1.5 w-full"
              disabled={!canAfford || isLoading}
              onClick={() => onInstall(upgrade.slug)}
              style={{ fontSize: 10, padding: '3px 8px' }}
            >
              {isLoading ? '...' : canAfford ? 'INSTALL' : 'NO FUNDS'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
