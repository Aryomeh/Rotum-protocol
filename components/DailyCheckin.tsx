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

export default function DailyCheckin({ telegramId }: { telegramId: number }) {
  const [status, setStatus]   = useState<CheckinStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

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
    setLoading(true)
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
      setLoading(false)
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
              Watch {REQUIRED_ADS} ads for 0.2 $RTM
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-purple)' }}>
              {status.watched}/{REQUIRED_ADS}
            </div>
          </div>
          <button
            onClick={handleWatchAd}
            disabled={loading}
            style={{
              width: '100%', background: '#0f0820',
              border: '1px solid var(--rtm-accent)', color: 'var(--rtm-purple)',
              fontFamily: "'Share Tech Mono'", fontSize: 11,
              padding: '10px 0', borderRadius: 3, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'LOADING AD...' : '▶ WATCH AD'}
          </button>
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