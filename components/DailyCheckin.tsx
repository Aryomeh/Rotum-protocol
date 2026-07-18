'use client'

import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string }) => { show: () => Promise<void> }
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

export default function DailyCheckin({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [status, setStatus]     = useState<CheckinStatus | null>(null)
  const [adLoading, setAdLoading]     = useState(false)
  const [starLoading, setStarLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/checkin?telegramId=${telegramId}`)
    const data = await res.json()
    if (data.success) {
      setStatus({ watched: data.watched, required: data.required, locked: data.locked, unlockAt: data.unlockAt })
    }
  }, [telegramId])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  async function handleWatchAd() {
    if (!window.Adsgram) {
      setError('Ads not ready yet — try again shortly')
      return
    }
    setAdLoading(true)
    setError(null)
    try {
      const controller = window.Adsgram.init({ blockId: BLOCK_ID })
      await controller.show()

      const res  = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Something went wrong')
      else await fetchStatus()
    } catch {
      setError('Ad was not completed')
    } finally {
      setAdLoading(false)
    }
  }

  async function handleStarCheckin() {
    setStarLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemSlug: 'daily_checkin_star', telegramId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Could not open payment')
        return
      }

      const twa = (window as any).Telegram?.WebApp
      if (twa?.openInvoice) {
        twa.openInvoice(data.invoiceLink, (invoiceStatus: string) => {
          if (invoiceStatus === 'paid') {
            // webhook credits the reward server-side; just refresh status after a short delay
            setTimeout(fetchStatus, 1500)
          }
        })
      } else {
        setError('Payment unavailable outside Telegram')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setStarLoading(false)
    }
  }

  if (!status) return null

  return (
    <div style={{
      background: '#111520', border: '1px solid #1a2230',
      borderRadius: 6, padding: '12px', marginBottom: 14,
    }}>
      <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '2px', marginBottom: 10 }}>
        DAILY CHECK-IN
      </div>

      {status.locked ? (
        <>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-green)' }}>
            ✓ Claimed today
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 4 }}>
            {status.unlockAt && `Resets ${Math.ceil((new Date(status.unlockAt).getTime() - Date.now()) / 3_600_000)}h from now`}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-text)' }}>
              0.2 $RTM check-in
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-purple)' }}>
              {status.watched}/{REQUIRED_ADS} ads
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={handleWatchAd}
              disabled={adLoading}
              style={{
                background: '#0f0820', border: '1px solid var(--rtm-accent)', color: 'var(--rtm-purple)',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '10px 0', borderRadius: 3, cursor: adLoading ? 'default' : 'pointer',
                opacity: adLoading ? 0.6 : 1,
              }}
            >
              {adLoading ? 'LOADING...' : '▶ WATCH AD'}
            </button>

            <button
              onClick={handleStarCheckin}
              disabled={starLoading}
              style={{
                background: '#0a1020', border: '1px solid #0088cc', color: '#00aaff',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '10px 0', borderRadius: 3, cursor: starLoading ? 'default' : 'pointer',
                opacity: starLoading ? 0.6 : 1,
              }}
            >
              {starLoading ? 'LOADING...' : '⭐ CHECK IN (2)'}
            </button>
          </div>

          {error && (
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-red)', marginTop: 6 }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}