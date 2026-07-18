'use client'

import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string }) => {
        show: () => Promise<void>
      }
    }
  }
}

const BLOCK_ID = '38746'
const REQUIRED_ADS = 3

interface CheckinStatus {
  watched: number
  required: number
  locked: boolean
  unlockAt: string | null
}

export default function DailyCheckin({ telegramId }: { telegramId: number }) {
  const [status, setStatus] = useState<CheckinStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/checkin?telegramId=${telegramId}`)
    const data = await res.json()
    if (data.success) {
      setStatus({
        watched: data.watched,
        required: data.required,
        locked: data.locked,
        unlockAt: data.unlockAt,
      })
    }
  }, [telegramId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleWatchAd = async () => {
    if (!window.Adsgram) {
      setError('Ads not ready yet — try again in a moment')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const controller = window.Adsgram.init({ blockId: BLOCK_ID })
      await controller.show() // resolves only if ad was watched to completion

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        await fetchStatus()
      }
    } catch {
      // User closed the ad early or it failed to load — no reward, no penalty
      setError('Ad was not completed')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return null

  if (status.locked) {
    const hoursLeft = status.unlockAt
      ? Math.ceil((new Date(status.unlockAt).getTime() - Date.now()) / 3_600_000)
      : 0
    return (
      <div className="checkin-card locked">
        <p>Daily check-in claimed ✅</p>
        <p className="text-sm opacity-70">Next check-in in ~{hoursLeft}h</p>
      </div>
    )
  }

  return (
    <div className="checkin-card">
      <p>Daily Check-in — watch {REQUIRED_ADS} ads for 0.2 RTM</p>
      <p className="text-sm opacity-70">{status.watched}/{REQUIRED_ADS} watched</p>
      <button onClick={handleWatchAd} disabled={loading}>
        {loading ? 'Loading ad...' : 'Watch Ad'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}