import { NextResponse } from 'next/server'

// Peg: 1 RTM = 0.05 TON (~$0.10 at current TON price)
const RTM_TON_RATIO = 0.05

let cachedPrice: { value: number; timestamp: number } | null = null
const CACHE_TTL_MS = 60_000 // 60s

async function fetchTonPriceUsd(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error(`CoinGecko fetch failed: ${res.status}`)
  const data = await res.json()
  const price = data?.['the-open-network']?.usd
  if (typeof price !== 'number') throw new Error('Unexpected CoinGecko response shape')
  return price
}

export async function GET() {
  const now = Date.now()

  if (cachedPrice && now - cachedPrice.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ rtm_price_usd: cachedPrice.value })
  }

  try {
    const tonPrice = await fetchTonPriceUsd()
    const rtmPrice = tonPrice * RTM_TON_RATIO
    cachedPrice = { value: rtmPrice, timestamp: now }
    return NextResponse.json({ rtm_price_usd: rtmPrice })
  } catch (err) {
    console.error('Failed to fetch RTM price:', err)
    // Serve last known good price rather than breaking the UI
    if (cachedPrice) {
      return NextResponse.json({ rtm_price_usd: cachedPrice.value, stale: true })
    }
    // Last resort fallback so the UI never shows nothing
    return NextResponse.json({ rtm_price_usd: 0.1, fallback: true })
  }
}