// Per-set logging data layer. Replaces the legacy single-weight-per-exercise
// shape with a richer per-set structure that enables e1RM tracking, PR
// detection, and adaptive prescription.
//
// Shape:
//   state.setLog[dateKey][exerciseId] = [{ weight, reps, rpe, ts }, ...]
//
// `weight`: number (lbs)        — required for hasWeight exercises, 0 for bodyweight
// `reps`:   number              — required
// `rpe`:    number 1..10 | null — optional perceived exertion
// `ts`:     ISO string          — set save time (used to order sets within a day)
//
// Backwards compat: any reads must also fall back to legacy `exerciseWeights`
// so historical data still surfaces. Writes update setLog only — legacy
// `exerciseWeights` is mirrored on save so old UI keeps working during the
// transition.

import { todayStr } from './dateUtils.js'

export function getSets(state, dateKey, exerciseId) {
  return state?.setLog?.[dateKey]?.[exerciseId] || []
}

export function isExerciseDone(state, dateKey, exerciseId) {
  if (state?.exerciseDone?.[dateKey]?.[exerciseId]) return true
  return getSets(state, dateKey, exerciseId).length > 0
}

export function addSet(state, dateKey, exerciseId, set) {
  const day = state.setLog?.[dateKey] || {}
  const existing = day[exerciseId] || []
  const ts = set.ts || new Date().toISOString()
  const next = [...existing, { ...set, ts }]
  return {
    ...state,
    setLog: { ...(state.setLog || {}), [dateKey]: { ...day, [exerciseId]: next } },
    // Legacy mirrors
    exerciseDone: {
      ...(state.exerciseDone || {}),
      [dateKey]: { ...(state.exerciseDone?.[dateKey] || {}), [exerciseId]: true },
    },
    exerciseWeights: set.weight > 0
      ? {
          ...(state.exerciseWeights || {}),
          [exerciseId]: {
            date: todayStr(),
            weight: set.weight,
            prev: state.exerciseWeights?.[exerciseId]?.weight ?? null,
          },
        }
      : (state.exerciseWeights || {}),
  }
}

export function removeSet(state, dateKey, exerciseId, index) {
  const existing = state.setLog?.[dateKey]?.[exerciseId] || []
  if (index < 0 || index >= existing.length) return state
  const next = existing.filter((_, i) => i !== index)
  const day = { ...(state.setLog?.[dateKey] || {}) }
  if (next.length === 0) {
    delete day[exerciseId]
  } else {
    day[exerciseId] = next
  }
  const setLog = { ...(state.setLog || {}), [dateKey]: day }
  // If we deleted the last set, also clear the legacy done flag for this exercise
  let exerciseDone = state.exerciseDone
  if (next.length === 0) {
    const dayDone = { ...(state.exerciseDone?.[dateKey] || {}) }
    delete dayDone[exerciseId]
    exerciseDone = { ...(state.exerciseDone || {}), [dateKey]: dayDone }
  }
  return { ...state, setLog, exerciseDone }
}

// Walk every dated entry (most-recent-first) for this exercise. Yields
// { dateKey, sets } so callers can compute streaks, PRs, last-time, etc.
export function* iterExerciseHistory(state, exerciseId) {
  const log = state?.setLog || {}
  const dates = Object.keys(log).sort().reverse()
  for (const dateKey of dates) {
    const sets = log[dateKey]?.[exerciseId]
    if (sets && sets.length) yield { dateKey, sets }
  }
}

export function getLastSession(state, exerciseId, beforeDate) {
  for (const entry of iterExerciseHistory(state, exerciseId)) {
    if (beforeDate && entry.dateKey >= beforeDate) continue
    return entry
  }
  return null
}

export function getTopSet(sets) {
  if (!sets || !sets.length) return null
  return sets.reduce((best, s) => (s.weight > (best?.weight ?? -Infinity) ? s : best), null)
}

export function totalVolume(sets) {
  return (sets || []).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
}
