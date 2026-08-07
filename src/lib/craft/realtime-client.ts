'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const CHANNEL_PREFIX = 'craft-presence:'

/** Sub-second presence via Supabase Realtime (badge_scans + broadcast). Falls back silently if unavailable. */
export function useCraftPresenceRealtime(schoolId: string, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`${CHANNEL_PREFIX}${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'badge_scans',
          filter: `school_id=eq.${schoolId}`,
        },
        () => onRefreshRef.current()
      )
      .on('broadcast', { event: 'presence-refresh' }, () => onRefreshRef.current())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [schoolId])
}

export async function broadcastCraftPresenceRefresh(schoolId: string): Promise<void> {
  try {
    const supabase = createClient()
    const channel = supabase.channel(`${CHANNEL_PREFIX}${schoolId}`)
    await channel.subscribe()
    await channel.send({
      type: 'broadcast',
      event: 'presence-refresh',
      payload: { at: Date.now() },
    })
    void supabase.removeChannel(channel)
  } catch {
    // Realtime optional — polling still works
  }
}
