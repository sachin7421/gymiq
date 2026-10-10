import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth.js'
import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import { fetchHealthDaily, mergeHealthDaily } from '../lib/healthSync.js'

const MIN_INTERVAL_MS = 2 * 60 * 1000

// Pull Apple Health rows (posted by the iOS Shortcut) into state on mount and
// whenever the app comes back to the foreground. Cheap: one indexed select.
export function useHealthDailySync() {
  const { user } = useAuth()
  const { setState } = useUserDataContext()
  const lastRun = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function run(force = false) {
      const now = Date.now()
      if (!force && now - lastRun.current < MIN_INTERVAL_MS) return
      lastRun.current = now
      try {
        const rows = await fetchHealthDaily(user.id)
        if (cancelled || rows.length === 0) return
        setState(prev => {
          const { next, changed } = mergeHealthDaily(prev, rows)
          return changed ? next : prev
        })
      } catch (e) {
        console.warn('health sync failed:', e.message || e)
      }
    }

    run(true)
    const onVis = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [user?.id, setState])
}
