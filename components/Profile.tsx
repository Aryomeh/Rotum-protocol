'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'

interface ProfileProps {
  onClose: () => void
}

interface ReferralStats {
  total:   number
  bonus:   number
}

export default function Profile({ onClose }: ProfileProps) {
  const { user } = useStore()
  const [referralStats, setReferralStats] = useState<ReferralStats>({ total: 0, bonus: 0 })
  const [copied, setCopied]               = useState(false)
  const [loading, setLoading]             = useState(true)

  // Real TON Connect Hooks
  const [tonConnectUI] = useTonConnectUI()
  // Returns a user-friendly format (e.g., EQD... or UQD...) or an empty string if not connected
  const userFriendlyAddress = useTonAddress() 
  const walletConnected = !!userFriendlyAddress

  useEffect(() => {
    if (user) loadReferralStats()
  }, [user])

  async function loadReferralStats() {
    setLoading(true)
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user!.id)
    setReferralStats({
      total: count ?? 0,
      bonus: (count ?? 0) * 5,
    })
    setLoading(false)
  }

  function copyReferral() {
    const link = `https://t.me/rotumprotocolbot?startapp=${user?.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareReferral() {
    const twa = (window as any).Telegram?.WebApp
    const link = `https://t.me/rotumprotocolbot?startapp=${user?.referral_code}`
    const text = `Join me on Rotum Protocol and earn $RTM! Mine your way to the top of the leaderboard.`
    if (twa?.openTelegramLink) {
      twa.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    }
  }

  // Trigger the official TON connection modal selector
  async function connectWallet() {
    try {
      await tonConnectUI.openModal()
    } catch (error) {
      console.error("Failed to open TON Connect modal", error)
    }
  }

  // Handle disconnecting the active wallet session
  async function disconnectWallet() {
    try {
      await tonConnectUI.disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet", error)
    }
  }

  // Helper to slice long raw string formats nicely inside your UI container
  function formatAddress(addr: string) {
    if (!addr) return ''
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  const joinDate = user?.joined_at
    ? new Date(user.joined_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex:     50,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position:     'fixed',
        bottom:       0,
        left:         0,
        right:        0,
        background:   '#0d1017',
        border:       '1px solid #1a2230',
        borderRadius: '12px 12px 0 0',
        zIndex:       51,
        padding:      '20px 16px 32px',
        maxHeight:    '90vh',
        overflowY:    'auto',
      }}>

        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, background: '#1a2230',
          borderRadius: 2, margin: '0 auto 20px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#1a1030', border: '2px solid var(--rtm-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Share Tech Mono'", fontSize: 22, color: 'var(--rtm-purple)',
            flexShrink: 0,
          }}>
            {user?.telegram_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>

          <div>
            <div style={{ fontFamily: "'Rajdhani'", fontSize: 18, fontWeight: 700, color: 'var(--rtm-text)' }}>
              {user?.telegram_name ?? 'Operator'}
            </div>
            {user?.telegram_username && (
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', marginTop: 2 }}>
                @{user.telegram_username}
              </div>
            )}
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>
              Joined {joinDate}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none',
              border: '1px solid #1a2230', color: 'var(--rtm-muted)',
              fontFamily: "'Share Tech Mono'", fontSize: 10,
              padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Balance cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{
            background: '#111520', border: '1px solid #1a2230',
            borderTop: '2px solid var(--rtm-purple)',
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '1px', marginBottom: 4 }}>
              CURRENT BALANCE
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 20, color: 'var(--rtm-purple)', fontWeight: 700 }}>
              {Math.floor(user?.rtm_balance ?? 0).toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>$RTM</div>
          </div>

          <div style={{
            background: '#111520', border: '1px solid #1a2230',
            borderTop: '2px solid var(--rtm-green)',
            borderRadius: 6, padding: '10px 12px',
          }}>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '1px', marginBottom: 4 }}>
              TOTAL EARNED
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 20, color: 'var(--rtm-green)', fontWeight: 700 }}>
              {Math.floor(user?.rtm_earned_total ?? 0).toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>$RTM</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'HASH POWER', val: user?.hash_power ? user.hash_power.toFixed(1) + ' TH/s' : '—', color: 'var(--rtm-purple)' },
            { label: 'UPTIME',     val: (user?.uptime_pct ?? 100).toFixed(1) + '%',                     color: '#00ccdd'           },
            { label: 'REFERRALS', val: loading ? '...' : String(referralStats.total),                   color: 'var(--rtm-amber)'  },
          ].map(s => (
            <div key={s.label} style={{
              background: '#111520', border: '1px solid #1a2230',
              borderRadius: 6, padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 8, color: 'var(--rtm-muted)', letterSpacing: '1px', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 14, color: s.color, fontWeight: 700 }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Referral section */}
        <div style={{
          background: '#111520', border: '1px solid #1a2230',
          borderRadius: 6, padding: '12px', marginBottom: 10,
        }}>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '2px', marginBottom: 10 }}>
            REFERRAL PROGRAM
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-text)' }}>
              {loading ? '...' : referralStats.total} friends invited
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-green)' }}>
              +{loading ? '...' : referralStats.bonus}% hash bonus
            </div>
          </div>

          {/* Referral code */}
          <div style={{
            background: '#080a0f', border: '1px solid var(--rtm-border)',
            borderRadius: 4, padding: '8px 10px', marginBottom: 8,
            fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-purple)',
            letterSpacing: '1px', wordBreak: 'break-all',
          }}>
            t.me/rotumprotocolbot?startapp={user?.referral_code ?? '...'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={copyReferral}
              style={{
                background: copied ? '#0a2a14' : '#0f0820',
                border: `1px solid ${copied ? 'var(--rtm-green)' : 'var(--rtm-accent)'}`,
                color: copied ? 'var(--rtm-green)' : 'var(--rtm-purple)',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {copied ? '✓ COPIED' : '📋 COPY LINK'}
            </button>
            <button
              onClick={shareReferral}
              style={{
                background: '#0a1a10', border: '1px solid var(--rtm-green)',
                color: 'var(--rtm-green)', fontFamily: "'Share Tech Mono'",
                fontSize: 11, padding: '8px 0', borderRadius: 3, cursor: 'pointer',
              }}
            >
              📤 SHARE
            </button>
          </div>
        </div>

        {/* TON Wallet */}
        <div style={{
          background: '#111520', border: '1px solid #1a2230',
          borderRadius: 6, padding: '12px', marginBottom: 10,
        }}>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '2px', marginBottom: 10 }}>
            TON WALLET
          </div>

          {walletConnected ? (
            <div>
              <div style={{
                background: '#080a0f', border: '1px solid #1a4a25',
                borderRadius: 4, padding: '8px 10px', marginBottom: 8,
                fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-green)',
              }}>
                ● {formatAddress(userFriendlyAddress)}
              </div>
              <button
                onClick={disconnectWallet}
                style={{
                  width: '100%', background: '#1a0810',
                  border: '1px solid var(--rtm-red)', color: 'var(--rtm-red)',
                  fontFamily: "'Share Tech Mono'", fontSize: 11,
                  padding: '8px 0', borderRadius: 3, cursor: 'pointer',
                }}
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              style={{
                width: '100%', background: '#0a1020',
                border: '1px solid #0088cc', color: '#00aaff',
                fontFamily: "'Share Tech Mono'", fontSize: 11,
                padding: '10px 0', borderRadius: 3, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>💎</span> CONNECT TON WALLET
            </button>
          )}
        </div>

        {/* Telegram link info */}
        <div style={{
          background: '#080a0f', border: '1px solid #1a2230',
          borderRadius: 6, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>✈️</span>
          <div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-text)' }}>
              Linked to Telegram
            </div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>
              @{user?.telegram_username ?? user?.telegram_name ?? 'connected'}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', background: '#0a2a14',
            border: '1px solid #1a4a25', color: 'var(--rtm-green)',
            fontFamily: "'Share Tech Mono'", fontSize: 9,
            padding: '2px 8px', borderRadius: 2,
          }}>
            ACTIVE
          </div>
        </div>
      </div>
    </>
  )
}