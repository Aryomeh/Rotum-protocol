'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

interface Achievement {
  id:          string
  title:       string
  description: string
  icon:        string
  reward_rtm:  number
  target:      number
  category:    'nodes' | 'ads' | 'stars' | 'ton' | 'season'
}

interface AchievementStatus extends Achievement {
  unlocked: boolean
  canClaim: boolean
  progress: number
}

// ── 10 achievements, rewards scaled 5-20 $RTM ──────────────────
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_rig',      title: 'First Rig',       description: 'Install your first node',        icon: '⚙️', reward_rtm: 5,  target: 1,   category: 'nodes'  },
  { id: 'node_collector', title: 'Node Collector',  description: 'Install 5 nodes',                 icon: '🖥️', reward_rtm: 10, target: 5,   category: 'nodes'  },
  { id: 'full_stack',     title: 'Full Stack',      description: 'Max out every node category',     icon: '🏗️', reward_rtm: 20, target: 1,   category: 'nodes'  },
  { id: 'ad_watcher',     title: 'Ad Watcher',      description: 'Watch 10 rewarded ads',            icon: '📺', reward_rtm: 5,  target: 10,  category: 'ads'    },
  { id: 'ad_grinder',     title: 'Ad Grinder',      description: 'Watch 50 rewarded ads',            icon: '📡', reward_rtm: 15, target: 50,  category: 'ads'    },
  { id: 'star_spender',   title: 'Star Spender',    description: 'Spend 100 Telegram Stars',         icon: '⭐', reward_rtm: 10, target: 100, category: 'stars'  },
  { id: 'big_spender',    title: 'Big Spender',     description: 'Spend 500 Telegram Stars',         icon: '💫', reward_rtm: 20, target: 500, category: 'stars'  },
  { id: 'ton_believer',   title: 'TON Believer',    description: 'Spend 1 TON on-chain',             icon: '💎', reward_rtm: 10, target: 1,   category: 'ton'    },
  { id: 'ton_whale',      title: 'TON Whale',       description: 'Spend 5 TON on-chain',             icon: '🐋', reward_rtm: 20, target: 5,   category: 'ton'    },
  { id: 'season_veteran', title: 'Season Veteran',  description: 'Finish top 1000 in any season',    icon: '🏆', reward_rtm: 15, target: 1000, category: 'season' },
]

export default function Achievements() {
  const { user, setUser } = useStore()
  const [items, setItems]     = useState<AchievementStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadAchievements()
  }, [user])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function loadAchievements() {
    if (!user) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/achievements?userId=${user.id}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.achievements)
      } else {
        setItems(ACHIEVEMENTS.map(a => ({ ...a, unlocked: false, canClaim: false, progress: 0 })))
      }
    } catch {
      setItems(ACHIEVEMENTS.map(a => ({ ...a, unlocked: false, canClaim: false, progress: 0 })))
    }
    setLoading(false)
  }

  async function claimAchievement(a: AchievementStatus) {
    if (!user || claiming) return
    setClaiming(a.id)
    try {
      const res  = await fetch('/api/achievements/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, slug: a.id }),
      })
      const json = await res.json()

      if (!json.success) {
        showToast(json.error ?? 'Failed to claim')
      } else {
        showToast(`✓ +${json.reward} $RTM claimed!`)
        setUser({ ...user, rtm_balance: user.rtm_balance + json.reward })
        loadAchievements()
      }
    } catch {
      showToast('Network error')
    }
    setClaiming(null)
  }

  const unlockedCount = items.filter(i => i.unlocked).length

  return (
    <div className="animate-page px-3 pt-3">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 11, color: 'var(--rtm-muted)', letterSpacing: '2px' }}>
          ACHIEVEMENTS
        </div>
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-purple)' }}>
          {unlockedCount} / {ACHIEVEMENTS.length} UNLOCKED
        </div>
      </div>

      {loading ? (
        <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 10, color: 'var(--rtm-muted)', textAlign: 'center', padding: '40px 0' }}>
          Loading...
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              claiming={claiming === a.id}
              onClaim={() => claimAchievement(a)}
            />
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AchievementCard({ achievement, claiming, onClaim }: {
  achievement: AchievementStatus
  claiming:    boolean
  onClaim:     () => void
}) {
  const { unlocked, canClaim, progress, target } = achievement
  const pct = Math.min(100, (progress / target) * 100)
  const active = unlocked || canClaim

  return (
    <div style={{
      position:     'relative',
      background:   'var(--rtm-card)',
      border:       `1px solid ${active ? 'var(--rtm-purple)' : 'var(--rtm-border)'}`,
      borderRadius: 6,
      padding:      '12px',
      overflow:     'hidden',
      boxShadow:    active ? '0 0 14px rgba(123, 94, 167, 0.25)' : 'none',
      transition:   'border-color 0.4s ease, box-shadow 0.4s ease',
    }}>
      {/* Icon watermark — grayscale + faint when locked, full brand color once unlocked */}
      <img
        src="/icon.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', top: -10, right: -10,
          width: 72, height: 72, objectFit: 'contain',
          opacity: active ? 0.16 : 0.06,
          filter: active ? 'none' : 'grayscale(1)',
          transition: 'opacity 0.4s ease, filter 0.4s ease',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: active ? '#2a1a3a' : '#0f1117',
          border: `1px solid ${active ? '#7b5ea7' : 'var(--rtm-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
          filter: active ? 'none' : 'grayscale(1)',
          opacity: active ? 1 : 0.45,
        }}>
          {active ? achievement.icon : '🔒'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Rajdhani'", fontSize: 14, fontWeight: 600,
            color: active ? '#f0e8ff' : 'var(--rtm-text)',
          }}>
            {achievement.title}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 1 }}>
            {achievement.description}
          </div>

          {!active && target > 1 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 3, background: '#1a2230', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: pct + '%',
                  background: 'var(--rtm-purple)', borderRadius: 2,
                  transition: 'width .5s ease',
                }} />
              </div>
              <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 9, color: 'var(--rtm-muted)', marginTop: 2 }}>
                {progress} / {target}
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Share Tech Mono'", fontSize: 12, fontWeight: 700,
            color: active ? 'var(--rtm-amber)' : 'var(--rtm-muted)',
          }}>
            +{achievement.reward_rtm} $RTM
          </div>
          {unlocked ? (
            <span style={{
              fontFamily: "'Share Tech Mono'", fontSize: 9,
              color: '#00e5a0', background: '#0a2a14',
              border: '1px solid #1a4a25', padding: '2px 7px', borderRadius: 2,
              display: 'inline-block', marginTop: 4,
            }}>
              UNLOCKED
            </span>
          ) : canClaim ? (
            <button
              onClick={onClaim}
              disabled={claiming}
              style={{
                background: '#0a2a14', border: '1px solid var(--rtm-green)',
                color: 'var(--rtm-green)', fontFamily: "'Share Tech Mono'",
                fontSize: 10, padding: '4px 10px', borderRadius: 2,
                cursor: claiming ? 'not-allowed' : 'pointer', marginTop: 4,
              }}
            >
              {claiming ? '...' : 'CLAIM'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}