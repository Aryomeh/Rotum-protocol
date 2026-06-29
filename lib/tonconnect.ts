'use client' // 👈 ADDED THIS LINE
import { TonConnectUI } from '@tonconnect/ui-react'

// 👈 REPLACED HARDCODED MATH & PRICES WITH THIS CLEAN RE-EXPORT:
export { NODE_TON_PRICES, STORE_TON_PRICES, toNano, fromNano } from './ton-prices'

export const TON_MANIFEST_URL =
  'https://rotum-protocol.vercel.app/tonconnect-manifest.json'

let tonConnectInstance: TonConnectUI | null = null

export function getTonConnect(): TonConnectUI {
  if (typeof window === 'undefined') {
    throw new Error('getTonConnect cannot run within a Node rendering environment.')
  }
  if (!tonConnectInstance) {
    tonConnectInstance = new TonConnectUI({
      manifestUrl: TON_MANIFEST_URL,
    })
  }
  return tonConnectInstance
}

export function formatTonAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}