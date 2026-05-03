import { useEffect, useRef, useState } from 'react'
import { fetchOuraSummary } from '../lib/oura.js'

export function useOura(token, enabled = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  async function refresh() {
    if (!token || !enabled) return
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const summary = await fetchOuraSummary(token)
      setData(summary)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
      inFlight.current = false
    }
  }

  useEffect(() => {
    if (token && enabled) refresh()
  }, [token, enabled])

  return { data, loading, error, refresh }
}
