import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEFAULT_STATE, EPHEMERAL_KEYS } from '../lib/state.js'
import { mergeStates } from '../lib/mergeStates.js'
import { generateWorkouts } from '../lib/workoutGenerator.js'
import { localDateStr } from '../lib/dateUtils.js'

const SAVE_DEBOUNCE_MS = 1500
const LS_KEY = 'gymiqState'

function loadLocalState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveLocalState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    // quota or private mode — ignore
  }
}

function applyMidnightReset(state) {
  const today = localDateStr()
  if (state.lastResetDate === today) return state

  // Save yesterday's habit booleans into weeklyHabits before resetting (used by challenges)
  const yesterday = state.lastResetDate
  const weeklyHabits = { ...(state.weeklyHabits || {}) }
  if (yesterday) weeklyHabits[yesterday] = { ...(state.habits || {}) }

  // New day — clear today's transient counters
  return {
    ...state,
    weeklyHabits,
    calories: 0,
    burned: 0,
    habits: { ...DEFAULT_STATE.habits },
    lastResetDate: today,
  }
}

function applyWeeklyDrinkReset(state) {
  // Drinks are stored by date string — just prune anything from previous calendar weeks.
  const now = new Date()
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const fresh = {}
  Object.entries(state.weekDrinks || {}).forEach(([date, count]) => {
    const [y, m, d] = date.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (dt >= sunday) fresh[date] = count
  })
  return { ...state, weekDrinks: fresh }
}

function regenerateWorkouts(state) {
  state.generatedWorkouts = generateWorkouts(
    state.equipment || [],
    state.trainingDays || 4,
    state.fitnessLevel || 'intermediate',
  )
  return state
}

function stripEphemeral(state) {
  const out = { ...state }
  EPHEMERAL_KEYS.forEach(k => { delete out[k] })
  return out
}

export function useUserData(userId) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const saveTimer = useRef(null)
  const latest = useRef(null)
  const mounted = useRef(true)

  // Load on mount / userId change
  useEffect(() => {
    mounted.current = true
    if (!userId) {
      setState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from('user_data')
          .select('data')
          .eq('id', userId)
          .maybeSingle()
        if (dbErr) throw dbErr

        const cloud = data?.data || null
        const local = loadLocalState()

        let merged
        if (cloud && local) merged = mergeStates(local, cloud)
        else if (cloud) merged = { ...DEFAULT_STATE, ...cloud }
        else if (local) merged = { ...DEFAULT_STATE, ...local }
        else merged = { ...DEFAULT_STATE }

        merged = applyMidnightReset(merged)
        merged = applyWeeklyDrinkReset(merged)
        merged = regenerateWorkouts(merged)

        if (!mounted.current) return
        latest.current = merged
        setState(merged)
        saveLocalState(stripEphemeral(merged))
        setLoading(false)
      } catch (e) {
        console.error('useUserData load failed:', e)
        if (!mounted.current) return
        setError(e.message || String(e))
        setState({ ...DEFAULT_STATE })
        setLoading(false)
      }
    })()
    return () => { mounted.current = false }
  }, [userId])

  // Debounced cloud save
  const flushSave = useCallback(async () => {
    if (!userId || !latest.current) return
    const payload = stripEphemeral({
      ...latest.current,
      lastSync: new Date().toISOString(),
    })
    setSyncStatus('syncing')
    try {
      const { error: dbErr } = await supabase
        .from('user_data')
        .upsert({ id: userId, data: payload, updated_at: new Date().toISOString() })
      if (dbErr) throw dbErr
      setSyncStatus('synced')
    } catch (e) {
      console.error('useUserData save failed:', e)
      setSyncStatus('error')
    }
  }, [userId])

  const updateState = useCallback((updater) => {
    setState(prev => {
      const base = prev || { ...DEFAULT_STATE }
      const next = typeof updater === 'function' ? updater(base) : { ...base, ...updater }
      latest.current = next
      saveLocalState(stripEphemeral(next))
      return next
    })

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      flushSave()
    }, SAVE_DEBOUNCE_MS)
  }, [flushSave])

  // Flush on unmount
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      flushSave()
    }
  }, [flushSave])

  return {
    state,
    setState: updateState,
    loading,
    error,
    syncStatus,
    flushSave,
  }
}
