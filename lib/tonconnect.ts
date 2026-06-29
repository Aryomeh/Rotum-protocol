import { TonConnectUI } from '@tonconnect/ui-react'

export const TON_MANIFEST_URL =
  'https://rotum-protocol.vercel.app/tonconnect-manifest.json'

// Singleton instance — reused across the app
let tonConnectInstance: TonConnectUI | null = null

export function getTonConnect(): TonConnectUI {
  if (!tonConnectInstance) {
    tonConnectInstance = new TonConnectUI({
      manifestUrl: TON_MANIFEST_URL,
    })
  }
  return tonConnectInstance
}

// Format TON address for display — shows first 4 and last 4 chars
export function formatTonAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Convert TON amount (nanotons) to TON
export function fromNano(amount: string | number): number {
  return Number(amount) / 1_000_000_000
}

// Convert TON to nanotons
export function toNano(amount: number): string {
  return String(Math.floor(amount * 1_000_000_000))
}

// Node install prices in TON
export const NODE_TON_PRICES: Record<string, number> = {
  cpu_cluster:       0.5,
  gpu_farm:          1.0,
  asic_cluster:      2.0,
  cooling_system:    0.7,
  power_grid:        1.2,
  ai_optimizer:      2.5,
  validator_node:    5.0,
  quantum_processor: 12.0,
}

// Store item prices in TON
export const STORE_TON_PRICES: Record<string, number> = {
  hash_boost_24h:   0.25,
  mining_crate:     0.5,
  accelerator_pack: 1.0,
  validator_slot:   2.0,
  quantum_upgrade:  5.0,
}