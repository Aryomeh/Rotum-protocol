import { create } from 'zustand'
import type { AppStore } from '@/lib/types'

export const useStore = create<AppStore>((set) => ({
  user:       null,
  season:     null,
  upgrades:   [],
  userNodes:  [],
  rankings:   [],
  myRank:     null,
  feed:       [],
  activeTab:  'dash',
  isLoading:  true,
  error:      null,

  setUser:      (user)    => set({ user }),
  setSeason:    (season)  => set({ season }),
  setUpgrades:  (upgrades)  => set({ upgrades }),
  setUserNodes: (userNodes) => set({ userNodes }),
  setRankings:  (rankings)  => set({ rankings }),
  setMyRank:    (myRank)    => set({ myRank }),

  addFeedItem: (item) =>
    set((state) => ({
      feed: [item, ...state.feed].slice(0, 30),
    })),

  setActiveTab: (activeTab) => set({ activeTab }),
  setLoading:   (isLoading) => set({ isLoading }),
  setError:     (error)     => set({ error }),
}))
