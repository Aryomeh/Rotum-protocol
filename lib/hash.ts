import type { UpgradeCatalogue, UserNode } from './types'

// Mirrors the calculate_hash_power() Postgres function
// Use client-side for display; always trust the DB value for rankings

export const BASE_HASH = 2.0  // every operator starts with 2 GH/s

export function calculateHashPower(
  nodes: UserNode[],
  catalogue: UpgradeCatalogue[],
  boost: number = 1.0
): number {
  const catMap = Object.fromEntries(catalogue.map(c => [c.slug, c]))

  const nodeHash = nodes.reduce((sum, node) => {
    const cat = catMap[node.upgrade_slug]
    if (!cat) return sum
    return sum + cat.hash_per_level * node.level
  }, 0)

  return (BASE_HASH + nodeHash) * boost
}

// Cost of next level for a given upgrade (mirrors cost_scale in DB)
export function nextLevelCost(
  upgrade: UpgradeCatalogue,
  currentLevel: number  // 0 = not owned
): number {
  return upgrade.cost_base * Math.pow(upgrade.cost_scale, currentLevel)
}

// Format hash rate for display
export function formatHashRate(th: number): string {
  if (th >= 1_000_000)  return `${(th / 1_000_000).toFixed(2)} EH/s`
  if (th >= 1_000)      return `${(th / 1_000).toFixed(2)} PH/s`
  if (th >= 1)          return `${th.toFixed(2)} TH/s`
  return `${(th * 1000).toFixed(1)} GH/s`
}

// Add ±jitter for the live display fluctuation effect
export function jitteredHash(base: number, pct = 0.02): number {
  const delta = base * pct * (Math.random() * 2 - 1)
  return Math.max(0.001, base + delta)
}
