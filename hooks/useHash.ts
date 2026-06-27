'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { calculateHashPower, jitteredHash, formatHashRate } from '@/lib/hash'

export function useHash() {
  const { user, userNodes, upgrades } = useStore()
  const [displayHash, setDisplayHash] = useState('2.00')
  const [baseHash, setBaseHash] = useState(2.0)

  // Recalculate base whenever nodes change
  useEffect(() => {
    if (!user) return
    const h = calculateHashPower(userNodes, upgrades, user.hash_boost)
    setBaseHash(h)
  }, [user, userNodes, upgrades])

  // Jitter every 2s for the live effect
  useEffect(() => {
    const tick = () => {
      const j = jitteredHash(baseHash, 0.025)
      setDisplayHash(formatHashRate(j))
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => clearInterval(id)
  }, [baseHash])

  const networkSharePct = baseHash > 0
    ? ((baseHash / 142_800_000) * 100).toFixed(6)
    : '0.000000'

  return { displayHash, baseHash, networkSharePct, formatHashRate }
}
