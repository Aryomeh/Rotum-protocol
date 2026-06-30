// lib/ton-prices.ts

export const NODE_TON_PRICES: Record<string, number> = {
  cpu_cluster:       0.5,
  gpu_farm:          1.0,
  asic_cluster:      2.5,
  cooling_system:    0.8,
  power_grid:        1.2,
  ai_optimizer:      4.0,
  validator_node:    8.0,
  quantum_processor: 20.0,
}

export const STORE_TON_PRICES: Record<string, number> = {
  early_contributor: 1.0,  // 👈 just add this line
  premium_skin_01:   2.0,
  hash_booster_2x:   4.5,
  energy_recharge:   0.2,
}

export function toNano(amount: number): string {
  return String(Math.floor(amount * 1_000_000_000))
}

export function fromNano(amount: string | number): number {
  return Number(amount) / 1_000_000_000
}