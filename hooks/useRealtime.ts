'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import type { NetworkFeedItem } from '@/lib/types'

export function useRealtime() {
  const { addFeedItem, setSeason } = useStore()

  useEffect(() => {
    // Live network feed
    const feedSub = supabase
      .channel('network_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'network_feed' },
        (payload) => {
          addFeedItem(payload.new as NetworkFeedItem)
        }
      )
      .subscribe()

    // Live season pool updates
    const seasonSub = supabase
      .channel('seasons')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'seasons' },
        (payload) => {
          setSeason(payload.new as any)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(feedSub)
      supabase.removeChannel(seasonSub)
    }
  }, [addFeedItem, setSeason])
}
