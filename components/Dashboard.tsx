'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import HashPanel from './HashPanel'
import PoolBanner from './PoolBanner'
import NetworkFeed from './NetworkFeed'

const STAT_CARDS = [
  {
    key:    'rank',
    label:  'GLOBAL RANK',
    color:  'var(--rtm-purple)',
    top:    'var(--rtm-purple)',
    sub:    'TOP 12.4%',
  },
  {
    key:    'reward',
    label:  'EST. REWARD',
    color:  'var(--rtm-green)',
    top:    'var(--rtm-green)',
    sub:    'THIS SEASON',
  },
  {
    key:    'nodes',
    label:  'ACTIVE NODES',
    color:  'var(--rtm-amber)',
    top:    'var(--rtm-amber)',
    sub:    'OF 12 SLOTS',
  },
  {
    key:    'uptime',
    label:  'UPTIME',
    color:  '#00ccdd',
    top:    '#00ccdd',
    sub:    'SINCE GENESIS',
  },
]

export default function Dashboard() {
  const { user, myRank, userNodes, season } = useStore()
  const [blockNum, setBlockNum] = useState(7_281_341)

  useEffect(() => {
    const id = setInterval(() => setBlockNum((n) => n + 1), 7_500)
    return () => clearInterval(id)
  }, [])

  const rank    = myRank?.rank ?? '—'
  const nodes   = userNodes.length
  const uptime  = user?.uptime_pct?.toFixed(1) ?? '100.0'

  // --- LIVE COMPRESSION ESTIMATED REWARD CALCULATOR ---
  const calculateLiveReward = () => {
    if (!myRank || !user) return 0

    // 1. Core pool statistics from state
    const currentPool = season ? season.pool_current : 0
    const maxPool = season ? season.pool_size : 10000
    const baseReward = myRank.est_reward ?? 0

    if (maxPool === 0 || currentPool === 0) return 0

    // 2. Pool reduction ratio (e.g., 982 / 1000 = 0.982)
    const poolRatio = currentPool / maxPool

    // 3. Hash Rate Performance Scale
    const userHashPower = user.hash_power ?? 1.0
    
    // Standard baseline expectations configuration 
    const standardBaseline = 100.0 
    const operationalEfficiency = Math.min(2.5, userHashPower / standardBaseline)

    // 4. Combined Dynamic Formula
    const reductionMitigation = poolRatio + ((1 - poolRatio) * (operationalEfficiency / 2.5))
    const finalCalculatedReward = baseReward * reductionMitigation

    return Math.max(1, Math.floor(finalCalculatedReward))
  }

  const reward = calculateLiveReward()
  // ----------------------------------------------------

  const statValues: Record<string, string> = {
    rank:   typeof rank === 'number' ? `#${rank.toLocaleString()}` : '—',
    reward: `${reward.toLocaleString()} $RTM`,
    nodes:  String(nodes),
    uptime: `${uptime}%`,
  }

  return (
    <div className="animate-page px-3 pt-3">
      {/* Hash rate */}
      <HashPanel />

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rtm-card px-3 py-2.5"
            style={{ borderTop: `2px solid ${card.top}` }}
          >
            <div
              className="font-mono mb-1"
              style={{ fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '1.5px' }}
            >
              {card.label}
            </div>
            <div
              className="font-mono font-bold"
              style={{ fontSize: 17, color: card.color, lineHeight: 1 }}
            >
              {statValues[card.key]}
            </div>
            <div
              className="font-mono mt-1"
              style={{ fontSize: 9, color: 'var(--rtm-muted)' }}
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Pool */}
      <PoolBanner />

      {/* Live feed */}
      <NetworkFeed />

      {/* Terminal line */}
      <div className="terminal-line">
        uptime: 18d 4h 22m &nbsp;|&nbsp; block: #
        {blockNum.toLocaleString()} &nbsp;|&nbsp; $RTM/block: 12.5
      </div>
    </div>
  )
}