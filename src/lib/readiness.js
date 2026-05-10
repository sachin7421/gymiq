// Composite readiness model. Combines Oura readiness + Apple Health (HRV
// trend, sleep last night, RHR delta) into a single 0..100 score and a
// progression multiplier the workout generator can apply.
//
// Inputs are all optional — model returns 'unknown' tier if nothing is
// available, in which case the generator runs at planned intensity.
//
// Tier outcomes:
//   push     (≥ 85)  — full progression OK; PR attempts welcome
//   normal   (70-84) — train as planned
//   maintain (60-69) — hold weight, no PR attempts; cap RPE 8
//   deload   (< 60)  — drop weight 10%, reduce sets by 1
//
// Multiplier on planned set count: 1.0 normal, 0.85 maintain, 0.7 deload, 1.0 push.

import { latestMetric, avgMetric } from './appleHealth.js'
import { todayStr } from './dateUtils.js'

function score(value, low, high, invert = false) {
  // Linear map value→[0,100]. Clamps. invert=true means lower is better (e.g. RHR).
  if (value == null || isNaN(value)) return null
  const v = Math.max(low, Math.min(high, value))
  const pct = (v - low) / (high - low)
  return Math.round(100 * (invert ? 1 - pct : pct))
}

export function computeReadiness({ oura, healthData }) {
  const components = []

  if (oura?.readinessScore != null) {
    components.push({ name: 'Oura readiness', score: oura.readinessScore, weight: 2 })
  }
  if (oura?.sleepScore != null) {
    components.push({ name: 'Oura sleep', score: oura.sleepScore, weight: 1 })
  }

  if (healthData) {
    // Last-night sleep hours (0-9h scale, peaks at 8h)
    const sleep = latestMetric(healthData, 'sleepHours', 2)
    if (sleep && sleep.ageDays <= 1) {
      let s = score(sleep.value, 4, 8)
      // Cap at 100 and slightly penalize > 9.5h (oversleep)
      if (sleep.value > 9.5) s = Math.max(60, s - 10)
      components.push({ name: 'Sleep', score: s, weight: 2 })
    }

    // HRV trend: today's HRV vs 14-day baseline
    const todayHrv = latestMetric(healthData, 'hrv', 3)
    const baseHrv = avgMetric(healthData, 'hrv', 30)
    if (todayHrv && baseHrv) {
      const ratio = todayHrv.value / baseHrv
      const s = score(ratio, 0.7, 1.2)
      components.push({ name: 'HRV vs baseline', score: s, weight: 2 })
    }

    // Resting HR: today's vs 14-day baseline (lower is better)
    const todayRhr = latestMetric(healthData, 'restingHr', 3)
    const baseRhr = avgMetric(healthData, 'restingHr', 30)
    if (todayRhr && baseRhr) {
      const ratio = todayRhr.value / baseRhr
      const s = score(ratio, 0.85, 1.2, true)  // invert: lower ratio = better
      components.push({ name: 'Resting HR vs baseline', score: s, weight: 1 })
    }
  }

  if (components.length === 0) {
    return { tier: 'unknown', score: null, multiplier: 1.0, components: [], reasons: [] }
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0)
  const composite = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight
  )

  let tier, multiplier
  if (composite >= 85) { tier = 'push'; multiplier = 1.0 }
  else if (composite >= 70) { tier = 'normal'; multiplier = 1.0 }
  else if (composite >= 60) { tier = 'maintain'; multiplier = 0.85 }
  else { tier = 'deload'; multiplier = 0.7 }

  const reasons = components
    .map(c => ({ ...c, contribution: (c.score * c.weight) / totalWeight }))
    .sort((a, b) => Math.abs(50 - a.score) - Math.abs(50 - b.score))
    .reverse()
    .slice(0, 3)
    .map(c => {
      if (c.score >= 80) return `${c.name} strong (${c.score})`
      if (c.score <= 50) return `${c.name} weak (${c.score})`
      return null
    })
    .filter(Boolean)

  return { tier, score: composite, multiplier, components, reasons, dateKey: todayStr() }
}
