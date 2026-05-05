// Adaptive prescription: given the last session for an exercise (and optional
// Oura readiness), recommend today's working weight + reasoning.
//
// Rules of thumb (intermediate lifter, lbs, % of last working weight):
//   RPE  ≤ 6   → +5% (last set was easy; double-jump)
//   RPE  7     → +2.5%
//   RPE  8     → +0% (target zone — repeat to consolidate)
//   RPE  9     → -2.5% (close to failure; back off slightly)
//   RPE 10     → -5%   (grinder; repeat lighter to keep moving well)
//
//   Reps short of target → -5% on top of the above.
//
// Oura readiness modulates progression:
//   ≥ 85  → push (allow full recommended jump)
//   70-84 → normal
//   60-69 → cap progression at 0% (no PR attempts; maintenance)
//   < 60  → deload (-10% from last working weight, regardless of RPE)
//
// We round to nearest 5 lbs by default (closest plate setup most home gyms support).

import { getLastSession, getTopSet } from './setLog.js'

const ROUND_TO = 5

function roundTo(weight, step = ROUND_TO) {
  return Math.round(weight / step) * step
}

function pctFromRPE(rpe) {
  if (rpe == null) return 0
  if (rpe <= 6) return 0.05
  if (rpe <= 7) return 0.025
  if (rpe <= 8) return 0
  if (rpe <= 9) return -0.025
  return -0.05
}

export function readinessTier(score) {
  if (score == null) return 'unknown'
  if (score >= 85) return 'push'
  if (score >= 70) return 'normal'
  if (score >= 60) return 'maintain'
  return 'deload'
}

// Parse the target rep range from an exercise's `detail` string ("3 sets x 8-12 reps", etc.).
// Returns { min, max } or null. Used to detect "short of target" automatically.
export function parseTargetReps(detail) {
  if (!detail) return null
  // Look for patterns like "8-12 reps", "x 10", "5×5"
  const range = detail.match(/(\d+)\s*[-–]\s*(\d+)\s*reps?/i)
  if (range) return { min: +range[1], max: +range[2] }
  const single = detail.match(/[x×]\s*(\d+)\b(?!\s*sec)/i)
  if (single) return { min: +single[1], max: +single[1] }
  return null
}

export function suggestNextWeight({
  state,
  exerciseId,
  exerciseDetail,
  todayKey,
  readinessScore,
}) {
  const last = getLastSession(state, exerciseId, todayKey)
  if (!last) {
    return {
      weight: null,
      reason: 'No history yet — start with a weight you can hit for clean reps.',
      tier: readinessTier(readinessScore),
    }
  }
  const top = getTopSet(last.sets)
  if (!top || !top.weight) {
    return {
      weight: null,
      reason: 'Last session had no weighted sets.',
      tier: readinessTier(readinessScore),
    }
  }

  const tier = readinessTier(readinessScore)
  const target = parseTargetReps(exerciseDetail)
  const repsShort = target && top.reps != null && top.reps < target.min

  let pct = pctFromRPE(top.rpe ?? 8)
  if (repsShort) pct -= 0.05

  // Readiness override
  if (tier === 'deload') pct = -0.10
  else if (tier === 'maintain' && pct > 0) pct = 0
  // 'push' uses the unmodified pct

  const suggested = roundTo(top.weight * (1 + pct))

  const parts = []
  parts.push(`Last: ${top.weight} × ${top.reps}${top.rpe ? ` @ RPE ${top.rpe}` : ''} on ${last.dateKey}.`)
  if (tier === 'deload') {
    parts.push('Oura readiness is low — deload 10% to recover.')
  } else if (tier === 'maintain') {
    parts.push('Readiness is moderate — hold weight today.')
  } else if (repsShort) {
    parts.push(`Came up short of ${target.min} reps — back off slightly.`)
  } else if (pct > 0) {
    parts.push(`RPE ${top.rpe ?? 8} suggests +${(pct * 100).toFixed(1)}%.`)
  } else if (pct < 0) {
    parts.push(`Hard set — back off ${(Math.abs(pct) * 100).toFixed(1)}% to keep form.`)
  } else {
    parts.push('Repeat last weight to consolidate.')
  }

  return {
    weight: suggested,
    delta: suggested - top.weight,
    reason: parts.join(' '),
    tier,
    last: top,
  }
}
