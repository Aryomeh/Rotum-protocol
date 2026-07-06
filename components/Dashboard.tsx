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
  const { user, myRank, userNodes, season } = useStore()[cite: 2]
  const [blockNum, setBlockNum] = useState(7_281_341)[cite: 2]

  useEffect(() => {
    const id = setInterval(() => setBlockNum((n) => n + 1), 7_500)[cite: 2]
    return () => clearInterval(id)[cite: 2]
  }, [])

  const rank    = myRank?.rank ?? '—'[cite: 2]
  const nodes   = userNodes.length[cite: 2]
  const uptime  = user?.uptime_pct?.toFixed(1) ?? '100.0'[cite: 2]

  // --- LIVE COMPRESSION ESTIMATED REWARD CALCULATOR ---
  const calculateLiveReward = () => {
    if (!myRank || !user) return 0

    // 1. Core pool statistics from state
    const currentPool = season ? season.pool_current : 0[cite: 3]
    const maxPool = season ? season.pool_size : 10000[cite: 3]
    const baseReward = myRank.est_reward ?? 0

    if (maxPool === 0 || currentPool === 0) return 0

    // 2. Pool reduction ratio (e.g., 982 / 1000 = 0.982)
    const poolRatio = currentPool / maxPool[cite: 3]

    // 3. Hash Rate Performance Scale
    // Fallback benchmark calculation based on the user's current infrastructure power
    const userHashPower = user.hash_power ?? 1.0
    
    // We assume a standard target expectation (e.g., 100 TH/s baseline). 
    // If user up-levels architecture or uses the 2x Early Contributor boost, power multiplier climbs.
    const standardBaseline = 100.0 
    const operationalEfficiency = Math.min(2.5, userHashPower / standardBaseline)

    // 4. Combined Dynamic Formula:
    // Pool depletion drops rewards, but active hardware upgrades (operationalEfficiency) scale up 
    // protection against pool contraction and compression factors.
    const reductionMitigation = poolRatio + ((1 - poolRatio) * (operationalEfficiency / 2.5))
    
    const finalCalculatedReward = baseReward * reductionMitigation

    return Math.max(1, Math.floor(finalCalculatedReward))
  }

  const reward = calculateLiveReward()
  // ----------------------------------------------------

  const statValues: Record<string, string> = {
    rank:   typeof rank === 'number' ? `#${rank.toLocaleString()}` : '—',[cite: 2]
    reward: `${reward.toLocaleString()} $RTM`,
    nodes:  String(nodes),[cite: 2]
    uptime: `${uptime}%`,[cite: 2]
  }

  return (
    <div className="animate-page px-3 pt-3">[cite: 2]
      {/* Hash rate */}
      <HashPanel />[cite: 2]

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">[cite: 2]
        {STAT_CARDS.map((card) => ([cite: 2]
          <div
            key={card.key}[cite: 2]
            className="rtm-card px-3 py-2.5"[cite: 2]
            style={{ borderTop: `2px solid ${card.top}` }}[cite: 2]
          >
            <div
              className="font-mono mb-1"[cite: 2]
              style={{ fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '1.5px' }}[cite: 2]
            >
              {card.label}[cite: 2]
            </div>
            <div
              className="font-mono font-bold"[cite: 2]
              style={{ fontSize: 17, color: card.color, lineHeight: 1 }}[cite: 2]
            >
              {statValues[card.key]}[cite: 2]
            </div>
            <div
              className="font-mono mt-1"[cite: 2]
              style={{ fontSize: 9, color: 'var(--rtm-muted)' }}[cite: 2]
            >
              {card.sub}[cite: 2]
            </div>
          </div>
        ))}
      </div>

      {/* Pool */}
      <PoolBanner />[cite: 2]

      {/* Live feed */}
      <NetworkFeed />[cite: 2]

      {/* Terminal line */}
      <div className="terminal-line">[cite: 2]
        uptime: 18d 4h 22m &nbsp;|&nbsp; block: #[cite: 2]
        {blockNum.toLocaleString()} &nbsp;|&nbsp; $RTM/block: 12.5[cite: 2]
      </div>
    </div>
  )
}