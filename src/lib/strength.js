// Strength model: estimated 1-rep max + PR detection + plateau signal.
//
// e1RM uses Epley with an RPE adjustment. RPE 10 means a true grinder — no
// reps in reserve — so the formula treats RPE 10 reps at face value. Lower
// RPE means reps in reserve (RIR), so we add the missing reps before applying
// Epley. RIR = 10 - rpe (clamped at 0).
//
//   adjusted_reps = reps + max(0, 10 - rpe)
//   e1RM = weight * (1 + adjusted_reps / 30)
//
// If RPE is missing we treat the set as RPE 8 (a reasonable working-set
// default) so logs without RPE still produce useful numbers.

import { iterExerciseHistory } from './setLog.js'

export function rirFromRpe(rpe) {
  if (rpe == null) return 2          // assume RPE 8 default
  return Math.max(0, 10 - rpe)
}

export function epley1RM(weight, reps, rpe) {
  if (!weight || !reps) return 0
  const adj = reps + rirFromRpe(rpe)
  return weight * (1 + adj / 30)
}

export function setE1RM(set) {
  return epley1RM(set?.weight, set?.reps, set?.rpe)
}

export function bestE1RMFromSets(sets) {
  return (sets || []).reduce((best, s) => Math.max(best, setE1RM(s)), 0)
}

// Walk full history for an exercise; return the best e1RM ever logged, the
// date it happened, and the runner-up so callers can show "PR set" + "last PR".
export function bestE1RMHistory(state, exerciseId) {
  let best = { value: 0, dateKey: null, set: null }
  let prev = { value: 0, dateKey: null, set: null }
  for (const { dateKey, sets } of iterExerciseHistory(state, exerciseId)) {
    for (const s of sets) {
      const v = setE1RM(s)
      if (v > best.value) {
        prev = best
        best = { value: v, dateKey, set: s }
      } else if (v > prev.value) {
        prev = { value: v, dateKey, set: s }
      }
    }
  }
  return { best, prev }
}

// Was a PR set on this date for this exercise? Compares the day's best e1RM
// against everything before it.
export function isPRDate(state, exerciseId, dateKey) {
  let bestBefore = 0
  let bestOn = 0
  for (const entry of iterExerciseHistory(state, exerciseId)) {
    const dayBest = bestE1RMFromSets(entry.sets)
    if (entry.dateKey === dateKey) bestOn = Math.max(bestOn, dayBest)
    else if (entry.dateKey < dateKey) bestBefore = Math.max(bestBefore, dayBest)
  }
  return bestOn > 0 && bestOn > bestBefore
}

// Recent PRs across all exercises in the last `days` days, newest first.
// Used by the dashboard to surface fresh accomplishments.
export function recentPRs(state, days = 30) {
  const log = state?.setLog || {}
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffKey = cutoff.toISOString().slice(0, 10)

  const exerciseIds = new Set()
  for (const day of Object.values(log)) {
    for (const id of Object.keys(day || {})) exerciseIds.add(id)
  }

  const prs = []
  for (const id of exerciseIds) {
    let bestEver = 0
    let bestEverDate = null
    let bestEverSet = null
    let bestBeforeCutoff = 0
    for (const { dateKey, sets } of iterExerciseHistory(state, id)) {
      const dayBest = bestE1RMFromSets(sets)
      if (dayBest > bestEver) {
        bestEver = dayBest
        bestEverDate = dateKey
        bestEverSet = sets.reduce((b, s) => (setE1RM(s) > setE1RM(b || {}) ? s : b), null)
      }
      if (dateKey < cutoffKey) bestBeforeCutoff = Math.max(bestBeforeCutoff, dayBest)
    }
    if (bestEverDate && bestEverDate >= cutoffKey && bestEver > bestBeforeCutoff) {
      prs.push({ exerciseId: id, e1rm: bestEver, dateKey: bestEverDate, set: bestEverSet })
    }
  }
  prs.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  return prs
}

// Top N exercises by current best e1RM. Used by dashboard "strength leaders".
export function topE1RMs(state, limit = 5) {
  const log = state?.setLog || {}
  const exerciseIds = new Set()
  for (const day of Object.values(log)) {
    for (const id of Object.keys(day || {})) exerciseIds.add(id)
  }
  const list = []
  for (const id of exerciseIds) {
    const { best } = bestE1RMHistory(state, id)
    if (best.value > 0) list.push({ exerciseId: id, e1rm: best.value, dateKey: best.dateKey })
  }
  list.sort((a, b) => b.e1rm - a.e1rm)
  return list.slice(0, limit)
}

// Plateau detection: returns true if the exercise's best e1RM hasn't improved
// in `weeks` weeks AND it's been worked at least `minSessions` times in that
// window. Useful for prompting an accessory swap or a deload.
export function isPlateauing(state, exerciseId, { weeks = 4, minSessions = 4 } = {}) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)
  const cutoffKey = cutoff.toISOString().slice(0, 10)

  let sessionsInWindow = 0
  let bestInWindow = 0
  let bestBeforeWindow = 0
  for (const { dateKey, sets } of iterExerciseHistory(state, exerciseId)) {
    const dayBest = bestE1RMFromSets(sets)
    if (dateKey >= cutoffKey) {
      sessionsInWindow++
      bestInWindow = Math.max(bestInWindow, dayBest)
    } else {
      bestBeforeWindow = Math.max(bestBeforeWindow, dayBest)
    }
  }
  if (sessionsInWindow < minSessions) return false
  return bestInWindow <= bestBeforeWindow
}
