'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'

export function useUser() {
  const { setUser, setSeason, setUpgrades, setUserNodes,
          setRankings, setMyRank, setLoading, setError } = useStore()
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    async function bootstrap() {
      try {
        setLoading(true)

        // 1. Get Telegram initData from the Mini App SDK
        // In production this comes from window.Telegram.WebApp.initData
        const initData = typeof window !== 'undefined'
          ? (window as any).Telegram?.WebApp?.initData ?? ''
          : ''

        // 2. Auth — create or fetch user via our API route
        const authRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })

        if (!authRes.ok) throw new Error('Auth failed')
        const { user, sessionToken } = await authRes.json()
        setUser(user)

        // Store session token for subsequent requests
        sessionStorage.setItem('rtm_token', sessionToken)

        // 3. Load everything in parallel
        const [seasonRes, upgradesRes, nodesRes, rankingsRes] = await Promise.all([
          supabase
            .from('seasons')
            .select('*')
            .eq('status', 'active')
            .single(),

          supabase
            .from('upgrade_catalogue')
            .select('*')
            .order('sort_order'),

          supabase
            .from('user_nodes')
            .select('*')
            .eq('user_id', user.id),

          supabase
            .from('season_rankings')
            .select(`
              *,
              users ( telegram_name, telegram_username )
            `)
            .eq('season_id', parseInt(process.env.NEXT_PUBLIC_SEASON_ID || '1'))
            .order('rank', { ascending: true })
            .limit(100),
        ])

        if (seasonRes.data)   setSeason(seasonRes.data)
        if (upgradesRes.data) setUpgrades(upgradesRes.data)
        if (nodesRes.data)    setUserNodes(nodesRes.data)

        if (rankingsRes.data) {
          // Flatten the joined user fields
          const flat = rankingsRes.data.map((r: any) => ({
            ...r,
            telegram_name:     r.users?.telegram_name,
            telegram_username: r.users?.telegram_username,
            users: undefined,
          }))
          setRankings(flat)
          const mine = flat.find((r: any) => r.user_id === user.id) ?? null
          setMyRank(mine)
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])
}
