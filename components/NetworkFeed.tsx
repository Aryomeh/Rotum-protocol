'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import type { NetworkFeedItem } from '@/lib/types'

const COLOR_MAP: Record<string, string> = {
  accent: 'var(--rtm-purple)',
  green:  'var(--rtm-green)',
  amber:  'var(--rtm-amber)',
}

// Scripted seed events shown before real DB events load
const SEED_EVENTS: Omit<NetworkFeedItem, 'id' | 'created_at'>[] = [
  { type: 'block',   message: 'Block #7,281,341 validated by Rotum network',          color: 'accent' },
  { type: 'upgrade', message: 'Operator #2141 upgraded to <b>Quantum Processor</b>',   color: 'green'  },
  { type: 'event',   message: 'Network difficulty increased to <b>8.4T</b>',           color: 'amber'  },
  { type: 'pool',    message: 'Season pool reached <b>102,450 $RTM</b>',               color: 'green'  },
  { type: 'event',   message: 'Operator #918 hit <b>1 PH/s</b> hash rate',            color: 'accent' },
  { type: 'join',    message: '<b>312</b> new operators joined Rotum Protocol',        color: 'amber'  },
  { type: 'pool',    message: 'Whale stake: <b>+5,000 $RTM</b> added to pool',        color: 'green'  },
  { type: 'event',   message: 'Network surge event active — hash rates <b>+18%</b>',  color: 'accent' },
  { type: 'upgrade', message: 'Operator #5502 completed <b>all hardware tiers</b>',   color: 'green'  },
  { type: 'block',   message: '$RTM block reward confirmed: <b>12.5 $RTM</b>',        color: 'amber'  },
  { type: 'block',   message: 'Validator node #88 confirmed <b>epoch checkpoint</b>', color: 'accent' },
  { type: 'join',    message: 'Referral network: <b>1,204 new joins</b> this hour',   color: 'green'  },
]

function formatTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

export default function NetworkFeed() {
  const { feed } = useStore()
  const listRef  = useRef<HTMLDivElement>(null)

  // Merge seeded + real feed, deduplicated by id
  const seeded: NetworkFeedItem[] = SEED_EVENTS.map((e, i) => ({
    ...e,
    id:         -(i + 1),
    created_at: new Date(Date.now() - (SEED_EVENTS.length - i) * 8_000).toISOString(),
  }))

  const realIds  = new Set(feed.map((f) => f.id))
  const combined = [
    ...feed,
    ...seeded.filter((s) => !realIds.has(s.id)),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  return (
    <div
      className="rtm-card overflow-hidden mb-2.5"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 font-mono text-xs tracking-widest"
        style={{
          color:        'var(--rtm-muted)',
          borderBottom: '1px solid var(--rtm-border)',
          letterSpacing: '2px',
        }}
      >
        <span className="pulse-dot" />
        ROTUM NETWORK FEED
      </div>

      {/* Feed list */}
      <div
        ref={listRef}
        style={{ maxHeight: 140, overflowY: 'auto' }}
      >
        {combined.map((item) => (
          <FeedRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function FeedRow({ item }: { item: NetworkFeedItem }) {
  const dotColor = COLOR_MAP[item.color] ?? 'var(--rtm-purple)'

  return (
    <div
      className="animate-feed flex items-center gap-2 px-3 font-mono text-xs"
      style={{
        padding:      '5px 12px',
        borderBottom: '1px solid var(--rtm-border)',
        color:        'var(--rtm-text)',
        fontSize:     11,
      }}
    >
      {/* Colour dot */}
      <span
        style={{
          width:        4,
          height:       4,
          borderRadius: '50%',
          background:   dotColor,
          flexShrink:   0,
        }}
      />

      {/* Message — allows <b> tags for highlights */}
      <span
        style={{ flex: 1 }}
        dangerouslySetInnerHTML={{ __html: '⚡ ' + item.message }}
      />

      {/* Timestamp */}
      <span
        style={{ color: 'var(--rtm-muted)', fontSize: 9, flexShrink: 0 }}
      >
        {formatTime(item.created_at)}
      </span>
    </div>
  )
}
