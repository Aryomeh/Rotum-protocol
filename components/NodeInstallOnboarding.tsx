'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'

export default function NodeInstallOnboarding() {
  const { user, setFirstTime, setNodeInstallProgress, setLoading } = useStore()[cite: 2]
  const [isInstalling, setIsInstalling] = useState(false)[cite: 2]
  const [installComplete, setInstallComplete] = useState(false)[cite: 2]
  const [error, setError] = useState<string | null>(null)[cite: 2]
  const [progress, setProgress] = useState(0)[cite: 2]

  const DURATION = 15000 // 15 seconds[cite: 2]

  // Safe helper to grab the Telegram WebApp object
  const getTelegramWebApp = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      return (window as any).Telegram.WebApp
    }
    return null
  }

  // 1. Recover background state on mount
  useEffect(() => {
    if (!user?.id) return[cite: 2]

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
    if (!isInstalling || !user?.id) return[cite: 2]

    let interval: NodeJS.Timeout[cite: 2]
    const tg = getTelegramWebApp()

    const startLoop = (savedStartTime: string) => {
      const startTime = parseInt(savedStartTime, 10)
      const targetEndTime = startTime + DURATION

      const updateProgress = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const currentProgress = Math.min((elapsed / DURATION) * 100, 100)[cite: 2]

        if (now >= targetEndTime) {
          setProgress(100)[cite: 2]
          setInstallComplete(true)[cite: 2]
          setIsInstalling(false)[cite: 2]
          
          if (tg?.CloudStorage) {
            tg.CloudStorage.removeItem(`node_install_start_${user.id}`)
          } else {
            localStorage.removeItem(`node_install_start_${user.id}`)
          }
          clearInterval(interval)[cite: 2]
        } else {
          setProgress(currentProgress)[cite: 2]
        }
      }

      updateProgress()
      interval = setInterval(updateProgress, 50)[cite: 2]
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
      if (interval) clearInterval(interval)[cite: 2]
    }
  }, [isInstalling, user?.id])

  const handleInstallClick = async () => {
    try {
      setError(null)[cite: 2]

      if (!user?.id) {
        throw new Error('User ID not found')[cite: 2]
      }

      // 1. Track timestamp immediately so it persists if they close the app right after paying
      const nowStr = Date.now().toString()
      const tg = getTelegramWebApp()

      if (tg?.CloudStorage) {
        tg.CloudStorage.setItem(`node_install_start_${user.id}`, nowStr)
      } else {
        localStorage.setItem(`node_install_start_${user.id}`, nowStr)
      }

      setIsInstalling(true)[cite: 2]

      // 2. Fire and forget the simulation API call
      const token = sessionStorage.getItem('rtm_token')[cite: 2]
      const response = await fetch('/api/node/install-first', {[cite: 2]
        method: 'POST',[cite: 2]
        headers: {[cite: 2]
          'Content-Type': 'application/json',[cite: 2]
          'Authorization': `Bearer ${token}`,[cite: 2]
        },[cite: 2]
        body: JSON.stringify({ user_id: user.id }),[cite: 2]
      })[cite: 2]

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))[cite: 2]
        throw new Error(errorData.error || 'Failed to install first node')[cite: 2]
      }
    } catch (err: any) {
      console.error('Installation error:', err)[cite: 2]
      setError(err.message || 'Installation failed')[cite: 2]
      setIsInstalling(false)[cite: 2]
      setProgress(0)[cite: 2]

      const tg = getTelegramWebApp()
      if (user?.id) {
        if (tg?.CloudStorage) tg.CloudStorage.removeItem(`node_install_start_${user.id}`)
        localStorage.removeItem(`node_install_start_${user.id}`)
      }
    }
  }

  const handleContinue = () => {
    setFirstTime(false)[cite: 2]
    setLoading(true)[cite: 2]
    window.location.reload()[cite: 2]
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6" style={{ background: 'var(--rtm-bg)' }}>[cite: 2]
      {/* Header */}
      <div className="text-center">[cite: 2]
        <div className="font-mono text-sm tracking-widest mb-2" style={{ color: 'var(--rtm-purple)' }}>[cite: 2]
          ROTUM PROTOCOL
        </div>[cite: 2]
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>[cite: 2]
          Welcome to the network
        </div>[cite: 2]
      </div>[cite: 2]

      {/* Project Description */}
      <div className="max-w-sm text-center">[cite: 2]
        <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-text)' }}>[cite: 2]
          Rotum Protocol is a distributed computing network. Your first node will begin contributing computing power to the network immediately upon installation.[cite: 2]
        </p>[cite: 2]
      </div>[cite: 2]

      {/* Node Installation Card */}
      <div className="rtm-card rtm-card-purple w-full max-w-sm p-6 relative">[cite: 2]
        <div className="text-center mb-6">[cite: 2]
          <div className="font-mono text-xs tracking-wider mb-4" style={{ color: 'var(--rtm-muted)' }}>[cite: 2]
            FIRST NODE
          </div>[cite: 2]
          <div className="font-mono text-2xl font-bold" style={{ color: 'var(--rtm-green)' }}>[cite: 2]
            {installComplete ? '✓ READY' : isInstalling ? 'INSTALLING...' : 'READY TO INSTALL'}[cite: 2]
          </div>[cite: 2]
        </div>[cite: 2]

        {/* Progress Bar */}
        {(isInstalling || installComplete) && ([cite: 2]
          <div className="progress-track mb-4">[cite: 2]
            <div
              className="progress-fill-green"[cite: 2]
              style={{ width: `${progress}%` }}[cite: 2]
            />[cite: 2]
          </div>[cite: 2]
        )}

        {/* Status Text */}
        {isInstalling && ([cite: 2]
          <div className="text-center mb-4">[cite: 2]
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>[cite: 2]
              {Math.round(progress)}% installed[cite: 2]
            </div>[cite: 2]
          </div>[cite: 2]
        )}

        {/* Error Message */}
        {error && ([cite: 2]
          <div className="text-center mb-4">[cite: 2]
            <div className="font-mono text-xs" style={{ color: 'var(--rtm-red)' }}>[cite: 2]
              {error}[cite: 2]
            </div>[cite: 2]
          </div>[cite: 2]
        )}

        {/* Installation Info */}
        {!isInstalling && !installComplete && ([cite: 2]
          <div className="text-center mb-6">[cite: 2]
            <div className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-muted)' }}>[cite: 2]
              Click below to install your first node. This will take about 15 seconds.[cite: 2]
            </div>[cite: 2]
          </div>[cite: 2]
        )}

        {installComplete && ([cite: 2]
          <div className="text-center mb-6">[cite: 2]
            <div className="font-mono text-xs leading-relaxed" style={{ color: 'var(--rtm-green)' }}>[cite: 2]
              Your node is installed and running! Let's get started.[cite: 2]
            </div>[cite: 2]
          </div>[cite: 2]
        )}

        {/* Action Button */}
        {!isInstalling && !installComplete && ([cite: 2]
          <button
            onClick={handleInstallClick}[cite: 2]
            className="btn-green w-full"[cite: 2]
            disabled={isInstalling}[cite: 2]
          >[cite: 2]
            INSTALL FIRST NODE[cite: 2]
          </button>[cite: 2]
        )}

        {installComplete && ([cite: 2]
          <button
            onClick={handleContinue}[cite: 2]
            className="btn-green w-full"[cite: 2]
          >[cite: 2]
            CONTINUE[cite: 2]
          </button>[cite: 2]
        )}

        {error && !isInstalling && ([cite: 2]
          <button
            onClick={() => {
              setError(null)[cite: 2]
              setProgress(0)[cite: 2]
            }}[cite: 2]
            className="btn-rtm w-full mt-2"[cite: 2]
          >[cite: 2]
            RETRY[cite: 2]
          </button>[cite: 2]
        )}
      </div>[cite: 2]

      {/* Footer */}
      <div className="max-w-sm text-center">[cite: 2]
        <div className="font-mono text-xs" style={{ color: 'var(--rtm-muted)' }}>[cite: 2]
          You can install additional nodes later from the Nodes section.[cite: 2]
        </div>[cite: 2]
      </div>[cite: 2]
    </div>[cite: 2]
  )
}