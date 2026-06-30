'use client'
import { useStore } from '@/store/useStore'
import { formatHashRate } from '@/lib/hash'

const MEDALS = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']

export default function Leaderboard() {
  const { rankings, myRank, user } = useStore()

  return (
    <div className="animate-page px-3 pt-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="section-label" style={{ paddingBottom: 0 }}>
          GLOBAL OPERATORS
        </div>
        <div
          className="font-mono text-xs"
          style={{ color: 'var(--rtm-muted)' }}
        >
          SEASON 1 · LIVE
        </div>
      </div>

      {/* Top rows */}
      <div className="flex flex-col gap-1.5 mb-3">
        {rankings.length === 0 ? (
          <PlaceholderRows />
        ) : (
          rankings.map((r) => {
            const isYou = r.user_id === user?.id
            return (
              <RankRow
                key={r.user_id}
                rank={r.rank}
                name={r.telegram_name ?? r.telegram_username ?? `Operator #${r.rank}`}
                hash={formatHashRate(r.hash_power)}
                reward={`${Math.floor(r.est_reward).toLocaleString()} $RTM`}
                isYou={isYou}
              />
            )
          })
        )}

        {/* Ellipsis spacer */}
        <div
          className="font-mono text-center py-1.5"
          style={{ fontSize: 9, color: 'var(--rtm-muted)' }}
        >
          ··· {(248_142 - rankings.length).toLocaleString()} more operators ···
        </div>
      </div>

      {/* Your position sticky card */}
      <div
        className="rounded-md px-3 py-2.5 flex justify-between items-center"
        style={{
          background:  '#0d0820',
          border:      '1px solid var(--rtm-purple)',
        }}
      >
        <span className="rtm-badge">YOU</span>
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--rtm-text)' }}
        >
          #{(myRank?.rank ?? '—').toLocaleString()} of 248,142
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--rtm-green)' }}
        >
          EST.{' '}
          {myRank ? Math.floor(myRank.est_reward).toLocaleString() : '0'} $RTM
        </span>
      </div>

      {/* Tier info */}
      <div
        className="rtm-card mt-3 px-3 py-2.5"
        style={{ borderTop: '2px solid var(--rtm-amber)' }}
      >
        <div
          className="font-mono mb-2"
          style={{ fontSize: 9, color: 'var(--rtm-muted)', letterSpacing: '2px' }}
        >
          REWARD TIERS
        </div>
        {[
          { tier: '🥇 TOP 10',         pct: '40%', avg: '4,098 $RTM' },
          { tier: '🥈 TOP 100',        pct: '30%', avg: '342 $RTM'   },
          { tier: '🥉 TOP 1,000',      pct: '20%', avg: '23 $RTM'    },
          { tier: '⚡ RANDOM ACTIVE',  pct: '10%', avg: 'varies'      },
        ].map((row) => (
          <div
            key={row.tier}
            className="flex justify-between font-mono py-1"
            style={{
              fontSize:    11,
              color:       'var(--rtm-text)',
              borderBottom: '1px solid var(--rtm-border)',
            }}
          >
            <span>{row.tier}</span>
            <span style={{ color: 'var(--rtm-green)' }}>{row.pct}</span>
            <span style={{ color: 'var(--rtm-amber)' }}>{row.avg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankRow({
  rank,
  name,
  hash,
  reward,
  isYou,
}: {
  rank:   number
  name:   string
  hash:   string
  reward: string
  isYou:  boolean
}) {
  const isMedal    = rank <= 3
  const rankColor  = isMedal ? MEDAL_COLORS[rank - 1] : 'var(--rtm-muted)'
  const rankLabel  = isMedal ? MEDALS[rank - 1] : `#${rank}`

  return (
    <div
      className="rtm-card flex items-center gap-2 px-3 py-2"
      style={isYou ? { borderColor: 'var(--rtm-purple)', background: '#0d0820' } : {}}
    >
      <div
        className="font-mono font-bold text-center flex-shrink-0"
        style={{ width: 32, fontSize: 13, color: rankColor }}
      >
        {rankLabel}
      </div>

      <div
        className="font-mono flex-1 truncate"
        style={{ fontSize: 11, color: isYou ? 'var(--rtm-purple)' : 'var(--rtm-text)' }}
      >
        {name}
        {isYou && (
          <span className="rtm-badge ml-2" style={{ fontSize: 8 }}>
            YOU
          </span>
        )}
      </div>

      <div
        className="font-mono flex-shrink-0"
        style={{ fontSize: 10, color: 'var(--rtm-muted)' }}
      >
        {hash}
      </div>

      <div
        className="font-mono text-right flex-shrink-0"
        style={{ fontSize: 10, color: 'var(--rtm-green)', minWidth: 80 }}
      >
        {reward}
      </div>
    </div>
  )
}

// Shown while real data loads — uses plausible fake entries
function PlaceholderRows() {
  return (
    <div style={{
      fontFamily: "'Share Tech Mono'",
      fontSize: 10,
      color: 'var(--rtm-muted)',
      textAlign: 'center',
      padding: '30px 0',
    }}>
      No operators ranked yet.<br/>
      Rankings update every 5 minutes.
    </div>
  )
}
  return (
    <>
      {rows.map((r) => (
        <RankRow
          key={r.rank}
          rank={r.rank}
          name={r.name}
          hash={r.hash}
          reward={r.reward}
          isYou={false}
        />
      ))}
    </>
  )
}
