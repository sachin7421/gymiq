// Local daily brief generator. Produces a 1-3 sentence narrative explaining
// today's plan: goal, why this goal today, modifications based on
// readiness, last-session reference for the primary lift. No LLM call —
// pure templating from local data so it renders instantly.

import { avgMetric } from './appleHealth.js'
import { GOAL_DEFS, FOCUS_DEFS } from './dayGoals.js'

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function buildBrief({ state, dayGoal, readiness, oura }) {
  const dow = new Date().getDay()
  const goalKey = dayGoal?.goal || 'rest'
  const def = GOAL_DEFS[goalKey] || GOAL_DEFS.rest
  const focus = dayGoal?.focus
  const focusLabel = focus && FOCUS_DEFS[focus] ? FOCUS_DEFS[focus].label : null

  const headline = focusLabel
    ? `${def.label} · ${focusLabel} day`
    : `${def.label} day`

  // Body — explain the plan + modifications
  const body = []

  if (goalKey === 'rest') {
    body.push('Off-day. Sleep and protein are the work.')
  } else if (goalKey === 'recovery') {
    body.push('Active recovery. Walk, stretch, breathe — no hard intensity.')
  } else if (goalKey === 'cardio') {
    body.push(`Cardio. ${def.desc}`)
    // Steps last 7 days
    if (state.healthData) {
      const stepsAvg = avgMetric(state.healthData, 'steps', 7)
      if (stepsAvg) {
        if (stepsAvg < 7000) body.push(`Step count averaging ${Math.round(stepsAvg).toLocaleString()}/day — push the volume today.`)
        else if (stepsAvg > 12000) body.push(`Already moving a lot (~${Math.round(stepsAvg / 1000)}k/day) — keep this short and intense.`)
      }
    }
  } else {
    // Strength or hypertrophy
    body.push(`${def.sets} sets × ${def.reps} reps. Rest ~${def.restSec}s between sets.`)
  }

  // Readiness modifier
  if (readiness && readiness.tier !== 'unknown' && goalKey !== 'rest') {
    if (readiness.tier === 'deload') {
      body.push(`⚠ Readiness ${readiness.score} — recovery is low. Drop weights 10% and cut one set per exercise. No PR attempts.`)
    } else if (readiness.tier === 'maintain') {
      body.push(`Readiness ${readiness.score} — moderate. Hold last week's weights, cap RPE 8.`)
    } else if (readiness.tier === 'push') {
      body.push(`Readiness ${readiness.score} — strong. Today is a green-light day for PR attempts.`)
    } else {
      body.push(`Readiness ${readiness.score} — train as planned.`)
    }
    if (readiness.reasons?.length) {
      body.push(`Why: ${readiness.reasons.join(' · ')}.`)
    }
  } else if (oura?.readinessScore != null && goalKey !== 'rest') {
    // Oura-only fallback if no Apple Health composite
    if (oura.readinessScore < 60) body.push(`⚠ Oura readiness ${oura.readinessScore} — consider deloading.`)
    else if (oura.readinessScore < 70) body.push(`Oura readiness ${oura.readinessScore} — train moderate.`)
  }

  return {
    dow,
    dowName: DOW_NAMES[dow],
    headline,
    icon: def.icon,
    color: def.color,
    body: body.join(' '),
    goalKey,
    readinessTier: readiness?.tier || 'unknown',
    readinessScore: readiness?.score ?? null,
  }
}
