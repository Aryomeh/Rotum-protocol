import { create } from 'zustand'
import type { AppStore } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export const useStore = create<AppStore>((set, get) => ({
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
  isFirstTime: false,
  nodeInstallProgress: 0,
  toast: null,
  operatorCount: 0,

  setUser:      (user)    => set({ user }),
  setSeason:    (season)  => set({ season }),
  setUpgrades:  (upgrades)  => set({ upgrades }),
  setUserNodes: (userNodes) => set({ userNodes }),
  setRankings:  (rankings)  => set({ rankings }),
  setMyRank:    (myRank)    => set({ myRank }),
  setOperatorCount: (operatorCount) => set({ operatorCount }),

  addFeedItem: (item) =>
    set((state) => ({
      feed: [item, ...state.feed].slice(0, 30),
    })),

  setActiveTab: (activeTab) => set({ activeTab }),
  setLoading:   (isLoading) => set({ isLoading }),
  setError:     (error)     => set({ error }),
  setFirstTime: (isFirstTime) => set({ isFirstTime }),
  setNodeInstallProgress: (progress) => set({ nodeInstallProgress: progress }),

  showToast: (message) => {
    set({ toast: message })
    setTimeout(() => set({ toast: null }), 3000)
  },

  loadUserData: async () => {
    const currentUser = get().user
    if (!currentUser?.id) return

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    if (error) {
      console.error('loadUserData failed:', error)
      return
    }

    set({ user: data })
  },
}))