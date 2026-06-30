// ── Supabase DB row types ─────────────────────────────────

export interface User {
  id: string
  telegram_id: number
  telegram_username: string | null
  telegram_name: string | null
  referral_code: string
  referred_by: string | null
  hash_power: number
  hash_boost: number
  boost_expires_at: string | null
  rtm_balance: number
  rtm_earned_total: number
  uptime_pct: number
  last_active_at: string
  joined_at: string
  is_banned: boolean
}

export interface Season {
  id: number
  name: string
  status: 'upcoming' | 'active' | 'ended'
  pool_size: number
  pool_current: number
  starts_at: string
  ends_at: string
}

export interface UpgradeCatalogue {
  id: number
  slug: string
  name: string
  category: 'hardware' | 'infrastructure' | 'advanced'
  icon: string
  description: string
  max_level: number
  hash_per_level: number
  unit: string
  cost_base: number
  cost_scale: number
  sort_order: number
}

export interface UserNode {
  id: string
  user_id: string
  upgrade_slug: string
  level: number
  installed_at: string
}

export interface SeasonRanking {
  season_id: number
  user_id: string
  rank: number
  hash_power: number
  network_share: number
  est_reward: number
  updated_at: string
  // joined from users
  telegram_name?: string
  telegram_username?: string
}

export interface NetworkFeedItem {
  id: number
  type: string
  message: string
  color: 'accent' | 'green' | 'amber'
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  item_slug: string
  item_name: string
  price_stars: number | null
  price_rtm: number | null
  telegram_charge_id: string | null
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  applied: boolean
  purchased_at: string
}

// ── API response shapes ───────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthResponse {
  user: User
  isNew: boolean
  sessionToken: string
}

export interface InstallNodeResponse {
  new_level: number
  cost: number
  new_hash: number
}

// ── Telegram Mini App initData ────────────────────────────

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramInitData {
  user?: TelegramUser
  chat_instance?: string
  chat_type?: string
  start_param?: string  // referral code passed here
  auth_date: number
  hash: string
}

// ── App store shape ───────────────────────────────────────

export interface AppStore {
  user: User | null
  season: Season | null
  upgrades: UpgradeCatalogue[]
  userNodes: UserNode[]
  rankings: SeasonRanking[]
  myRank: SeasonRanking | null
  feed: NetworkFeedItem[]
  activeTab: 'dash' | 'nodes' | 'store' | 'ranks' | 'season'
  isLoading: boolean
  error: string | null

  setUser: (u: User) => void
  setSeason: (s: Season) => void
  setUpgrades: (u: UpgradeCatalogue[]) => void
  setUserNodes: (n: UserNode[]) => void
  setRankings: (r: SeasonRanking[]) => void
  setMyRank: (r: SeasonRanking | null) => void
  addFeedItem: (item: NetworkFeedItem) => void
  setActiveTab: (tab: AppStore['activeTab']) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}
