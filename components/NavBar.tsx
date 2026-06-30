'use client'
import { useStore } from '@/store/useStore'
import type { AppStore } from '@/lib/types'

const TABS: { id: AppStore['activeTab']; label: string }[] = [
  { id: 'dash',   label: '$RTM'  },
  { id: 'nodes',  label: 'NODES' },
  { id: 'store',  label: 'STORE'  }, // 👈 add this
  { id: 'ranks',  label: 'RANKS' },
  { id: 'season', label: 'SEASON'},
]

export default function NavBar() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <nav
      className="flex sticky top-[49px] z-10"
      style={{
        background:   'var(--rtm-surface)',
        borderBottom: '1px solid var(--rtm-border)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 font-mono text-xs tracking-widest transition-all duration-200"
            style={{
              background:    'none',
              border:        'none',
              borderBottom:  isActive
                ? '2px solid var(--rtm-purple)'
                : '2px solid transparent',
              color: isActive
                ? 'var(--rtm-purple)'
                : 'var(--rtm-muted)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
