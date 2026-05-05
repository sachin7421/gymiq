import { useEffect, useRef, useState, useCallback } from 'react'

// Simple countdown timer with vibration haptic on completion. The countdown
// uses a timestamp so it survives tab throttling — if the tab is backgrounded
// for 30s we don't drift.

export function useRestTimer() {
  const [endsAt, setEndsAt] = useState(null)        // ms epoch, or null
  const [now, setNow] = useState(() => Date.now())
  const tickedZero = useRef(false)

  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const remaining = endsAt ? Math.max(0, endsAt - now) : 0

  useEffect(() => {
    if (!endsAt) {
      tickedZero.current = false
      return
    }
    if (remaining === 0 && !tickedZero.current) {
      tickedZero.current = true
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [remaining, endsAt])

  const start = useCallback((seconds) => {
    setEndsAt(Date.now() + seconds * 1000)
    setNow(Date.now())
    tickedZero.current = false
  }, [])
  const stop = useCallback(() => setEndsAt(null), [])
  const adjust = useCallback((deltaSeconds) => {
    setEndsAt(prev => {
      if (!prev) return prev
      const next = prev + deltaSeconds * 1000
      return Math.max(Date.now(), next)
    })
  }, [])

  return {
    secondsLeft: Math.ceil(remaining / 1000),
    running: !!endsAt && remaining > 0,
    finished: !!endsAt && remaining === 0,
    start,
    stop,
    adjust,
  }
}
