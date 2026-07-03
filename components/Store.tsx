'use client'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { NODE_TON_PRICES, toNano } from '@/lib/tonconnect'

const EARLY_CONTRIBUTOR_PRICE_TON = 1.0
const EARLY_CONTRIBUTOR_ENABLED   = false   // flip to true when ready to go live

export default function Store() {
  const { user, setUser } = useStore()
  const [tonConnectUI] = useTonConnectUI()
  const walletAddress  = useTonAddress()

  const [processing, setProcessing] = useState(false)
  const [toast, setToast]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  const alreadyMinted = user?.nft_minted ?? false

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function buyEarlyContributor() {
    if (!user || !walletAddress) {
      showToast('Connect your TON wallet in Profile first')
      return
    }
    if (alreadyMinted) return

    setProcessing(true)
    try {
      // 1. Initiate payment intent
      const initRes  = await fetch('/api/ton-payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, slug: 'early_contributor', action: 'initiate' }),
      })
      const initData = await initRes.json()
      if (!initData.success) throw new Error(initData.error || 'Payment init failed')

      // 2. Send 1 TON via TON Connect
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
          address: initData.merchantWallet,
          amount:  toNano(EARLY_CONTRIBUTOR_PRICE_TON),
        }],
      })

      // 3. Trigger backend: mint NFT + credit rewards
      const mintRes  = await fetch('/api/nft/mint', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, walletAddress }),
      })
      const mintData = await mintRes.json()
      if (!mintData.success) throw new Error(mintData.error || 'Mint failed')

      // 4. Update local state so UI reflects immediately
      setUser({
        ...user,
        nft_minted:   true,
        rtm_balance:  (user.rtm_balance ?? 0) + 1000,
        hash_power:   (user.hash_power  ?? 0) * 2,
      })
      setDone(true)
      showToast('🎉 Early Contributor NFT minted!')
    } catch (err: any) {
      showToast(err?.message || 'Transaction cancelled')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="animate-page px-3 pt-3">
      {/* Header */}
      <div className="section-label mb-3" style={{ paddingBottom: 0 }}>POWER STORE</div>

      {/* Early Contributor — one-time offer */}
      <div style={{
        background:   '#0a0d14',
        border:       `1px solid ${alreadyMinted || done ? '#1a4a25' : EARLY_CONTRIBUTOR_ENABLED ? '#7b5ea7' : '#1a2230'}`,
        borderRadius: 8,
        overflow:     'hidden',
        marginBottom: 12,
      }}>
        {/* Badge */}
        <div style={{
          background:   alreadyMinted || done ? '#0a2a14' : EARLY_CONTRIBUTOR_ENABLED ? 'linear-gradient(90deg, #1a0830, #0f0420)' : '#0a0d14',
          borderBottom: `1px solid ${alreadyMinted || done ? '#1a4a25' : EARLY_CONTRIBUTOR_ENABLED ? '#3a1060' : '#1a2230'}`,
          padding:      '8px 14px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: alreadyMinted || done ? '#00e5a0' : EARLY_CONTRIBUTOR_ENABLED ? '#9d7fd4' : 'var(--rtm-muted)', letterSpacing: '2px' }}>
            ⚡ ONE-TIME OFFER
          </div>
          {alreadyMinted || done
            ? <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#00e5a0', background: '#0a2a14', border: '1px solid #1a4a25', padding: '2px 8px', borderRadius: 2 }}>CLAIMED ✓</div>
            : !EARLY_CONTRIBUTOR_ENABLED
              ? <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', background: '#0a0d14', border: '1px solid #1a2230', padding: '2px 8px', borderRadius: 2 }}>COMING SOON</div>
              : <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#f0a500' }}>LIMITED</div>
          }
        </div>

        <div style={{ padding: '16px 14px' }}>
          {/* Title + description */}
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: 'var(--rtm-text)', marginBottom: 4 }}>
            Early Contributor
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Join the founding operators of Rotum Protocol. One NFT, permanent on-chain proof of your early support.
          </div>

          {/* Rewards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { icon: '🖼',  label: 'Early Contributor NFT', sub: 'On-chain forever' },
              { icon: '💎',  label: '+1,000 $RTM',           sub: 'Instant credit'   },
              { icon: '⚡',  label: '2× Hash Rate',          sub: 'Permanent boost'  },
            ].map(r => (
              <div key={r.label} style={{
                background:   '#080a0f',
                border:       '1px solid #1a2230',
                borderRadius: 4,
                padding:      '10px 8px',
                textAlign:    'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-purple)', lineHeight: 1.3 }}>{r.label}</div>
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 8, color: 'var(--rtm-muted)', marginTop: 2 }}>{r.sub}</div>
              </div>
            ))}
          </div>

          {/* Price + CTA */}
          {alreadyMinted || done ? (
            <div style={{
              width:        '100%',
              background:   '#0a2a14',
              border:       '1px solid #1a4a25',
              color:        '#00e5a0',
              fontFamily:   "'Share Tech Mono'",
              fontSize:     12,
              padding:      '12px 0',
              borderRadius: 4,
              textAlign:    'center',
            }}>
              ✓ CLAIMED — Check your TON wallet
            </div>
          ) : !EARLY_CONTRIBUTOR_ENABLED ? (
            <div style={{
              width:        '100%',
              background:   '#0a0d14',
              border:       '1px solid #1a2230',
              color:        'var(--rtm-muted)',
              fontFamily:   "'Share Tech Mono'",
              fontSize:     12,
              padding:      '13px 0',
              borderRadius: 4,
              textAlign:    'center',
              letterSpacing: '1px',
            }}>
              🔒 COMING SOON
            </div>
          ) : (
            <>
              {!walletAddress && (
                <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#f0a500', marginBottom: 8, textAlign: 'center' }}>
                  ⚠ Connect your TON wallet in Profile to purchase
                </div>
              )}

              <button
                onClick={buyEarlyContributor}
                disabled={processing || !walletAddress}
                style={{
                  width:        '100%',
                  background:   !walletAddress ? '#0a0d14' : processing ? '#0f0820' : 'linear-gradient(90deg, #1a0830, #0f0c20)',
                  border:       `1px solid ${!walletAddress ? '#1a2230' : '#7b5ea7'}`,
                  color:        !walletAddress ? 'var(--rtm-muted)' : '#9d7fd4',
                  fontFamily:   "'Share Tech Mono'",
                  fontSize:     12,
                  padding:      '13px 0',
                  borderRadius: 4,
                  cursor:       processing || !walletAddress ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px',
                }}
              >
                {processing ? '⏳ AWAITING WALLET...' : '💎 PAY 1 TON & CLAIM'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* More items coming soon */}
      <div style={{
        background:   '#080a0f',
        border:       '1px solid #1a2230',
        borderRadius: 6,
        padding:      '14px',
        textAlign:    'center',
      }}>
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', letterSpacing: '2px' }}>
          MORE ITEMS COMING SOON
        </div>
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: '#2a3a50', marginTop: 6 }}>
          Hash boosters · Mining crates · Validator slots
        </div>
      </div>

      {toast && (
        <div style={{
          position:   'fixed', bottom: 70, left: 16, right: 16,
          background: '#0f0820', border: '1px solid #7b5ea7',
          color:      '#9d7fd4', fontFamily: "'Share Tech Mono'",
          fontSize:   11, padding:  '10px 16px',
          borderRadius: 4, zIndex: 999, textAlign: 'center',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}