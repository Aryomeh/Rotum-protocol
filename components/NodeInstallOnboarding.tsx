'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'

export default function NodeInstallOnboarding() {
  const { user, setFirstTime, setNodeInstallProgress, setLoading } = useStore()
  const [isInstalling, setIsInstalling] = useState(false)
  const [installComplete, setInstallComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const DURATION = 15000 // 15 seconds

  // Safe helper to grab the Telegram WebApp object
  const getTelegramWebApp = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      return (window as any).Telegram.WebApp
    }
    return null
  }

  // 1. Recover background state on mount
  useEffect(() => {
    if (!user?.id) return

    const tg = getTelegramWebApp()

    const handleRecovery = (savedStartTime: string) => {
      const startTime = parseInt(savedStartTime, 10)
      const now = Date.now()
      
      if (now - startTime >= DURATION) {
        setProgress(100)
        setInstallComplete(true)
        setIsInstalling(false)
      } else {
        setIsInstalling(true)
      }
    }

    if (tg?.CloudStorage) {
      tg.CloudStorage.getItem(`node_install_start_${user.id}`, (err: any, value: string) => {
        if (!err && value) {
          handleRecovery(value)
        }
      })
    } else {
      const savedStartTime = localStorage.getItem(`node_install_start_${user.id}`)
      if (savedStartTime) {
        handleRecovery(savedStartTime)
      }
    }
  }, [user?.id])

  // 2. Persistent Progress Loop
  useEffect(() => {
    if (!isInstalling || !user?.id) return

    let interval: NodeJS.Timeout
    const tg = getTelegramWebApp()

    const startLoop = (savedStartTime: string) => {
      const startTime = parseInt(savedStartTime, 10)
      const targetEndTime = startTime + DURATION

      const updateProgress = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const currentProgress = Math.min((elapsed / DURATION) * 100, 100)

        if (now >= targetEndTime) {
          setProgress(100)
          setInstallComplete(true)
          setIsInstalling(false)
          
          if (tg?.CloudStorage) {
            tg.CloudStorage.removeItem(`node_install_start_${user.id}`)
          } else {
            localStorage.removeItem(`node_install_start_${user.id}`)
          }
          clearInterval(interval)
        } else {
          setProgress(currentProgress)
        }
      }

      updateProgress()
      interval = setInterval(updateProgress, 50)
    }

    if (tg?.CloudStorage) {
      tg.CloudStorage.getItem(`node_install_start_${user.id}`, (err: any, value: string) => {
        if (!err && value) startLoop(value)
      })
    } else {
      const savedStartTime = localStorage.getItem(`node_install_start_${user.id}`)
      if (savedStartTime) startLoop(savedStartTime)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isInstalling, user?.id])

  const handleInstallClick = async () => {
    try {
      setError(null)

      if (!user?.id) {
        throw new Error('User ID not found')
      }

      // 1. Track timestamp immediately so it persists if they close the app right after paying
      const nowStr = Date.now().toString()
      const tg = getTelegramWebApp()

      if (tg?.CloudStorage) {
        tg.CloudStorage.setItem(`node_install_start_${user.id}`, nowStr)
      } else {
        localStorage.setItem(`node_install_start_${user.id}`, nowStr)
      }

      setIsInstalling(true)

      // 2. Fire and forget the simulation API call
      const token = sessionStorage.getItem('rtm_token')
      const response = await fetch('/api/node/install-first', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to install first node')
      }
    } catch (err: any) {
      console.error('Installation error:', err)
      setError(err.message || 'Installation failed')
      setIsInstalling(false)
      setProgress(0)

      const tg = getTelegramWebApp()
      if (user?.id) {
        if (tg?.CloudStorage) tg.CloudStorage.removeItem(`node_install_start_${user.id}`)
        localStorage.removeItem(`node_install_start_${user.id}`)
      }
    }
  }

  const handleContinue = () => {
    setFirstTime(false)
    setLoading(true)
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6" style={{ background: 'var(--rtm-bg)' }}>
      {/* Header */}
      <div className="text-center">
        <div className="font-mono text-sm tracking-widest mb-2" style={{ color: 'var(--rtm-purple)' }}>
          ROTUM PROTOCOL
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>
          Welcome to the network
        </div>
      </div>

      {/* Project Description */}
      <div className="max-w-sm text-center">
        <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-text)' }}>
          Rotum Protocol is a distributed computing network. Your first node will begin contributing computing power to the network immediately upon installation.
        </p>
      </div>

      {/* Node Installation Card */}
      <div className="rtm-card rtm-card-purple w-full max-w-sm p-6 relative">
        <div className="text-center mb-6">
          <div className="font-mono text-xs tracking-wider mb-4" style={{ color: 'var(--rtm-muted)' }}>
            FIRST NODE
          </div>
          <div className="font-mono text-2xl font-bold" style={{ color: 'var(--rtm-green)' }}>
            {installComplete ? '✓ READY' : isInstalling ? 'INSTALLING...' : 'READY TO INSTALL'}
          </div>
        </div>

        {/* Progress Bar */}
        {(isInstalling || installComplete) && (
          <div className="progress-track mb-4">
            <div
              className="progress-fill-green"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Status Text */}
        {isInstalling && (
          <div className="text-center mb-4">
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>
              {Math.round(progress)}% installed
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-center mb-4">
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-red)' }}>
              {error}
            </div>
          </div>
        )}

        {/* Installation Info */}
        {!isInstalling && !installComplete && (
          <div className="text-center mb-6">
            <div className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-muted)' }}>
              Click below to install your first node. This will take about 15 seconds.
            </div>
          </div>
        )}

        {installComplete && (
          <div className="text-center mb-6">
            <div className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-green)' }}>
              Your node is installed and running! Let's get started.
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isInstalling && !installComplete && (
          <button
            onClick={handleInstallClick}
            className="btn-green w-full"
            disabled={isInstalling}
          >
            INSTALL FIRST NODE
          </button>
        )}

        {installComplete && (
          <button
            onClick={handleContinue}
            className="btn-green w-full"
          >
            CONTINUE
          </button>
        )}

        {error && !isInstalling && (
          <button
            onClick={() => {
              setError(null)
              setProgress(0)
            }}
            className="btn-rtm w-full mt-2"
          >
            RETRY
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-sm text-center">
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>
          You can install additional nodes later from the Nodes section.
        </div>
      </div>
    </div>
  )
}