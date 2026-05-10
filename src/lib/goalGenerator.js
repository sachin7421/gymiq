// Goal-driven workout generator. Replaces the legacy schedule-based
// generator when state.dayGoals is defined.
//
// For each day-of-week the user has set a `goal` and optional `focus`.
// We pick exercises from EX_DB matching the focus muscles + available
// equipment, then build a per-goal set/rep/rest scheme, modulated by
// today's readiness multiplier.

import { EX_DB } from './exerciseDb.js'
import { GOAL_DEFS, FOCUS_DEFS, DEFAULT_DAY_GOALS } from './dayGoals.js'

const LEVEL_NUM = { beginner: 1, intermediate: 2, advanced: 3 }

function repSchemeFor(goalKey, fitnessLevel) {
  // Returns the human-readable detail string per goal/level
  const lvl = fitnessLevel || 'intermediate'
  const schemes = {
    strength: { beginner: '4×5', intermediate: '4×5', advanced: '5×3' },
    hypertrophy: { beginner: '3×10', intermediate: '4×10', advanced: '4×12' },
    cardio: { beginner: '20 min steady', intermediate: '8×30s on / 60s off', advanced: '10×30s on / 30s off' },
    mobility: { beginner: '2×8 each side', intermediate: '3×10 each side', advanced: '3×12 each side' },
    recovery: { beginner: '20 min easy', intermediate: '20-30 min easy', advanced: '30 min easy' },
    rest: { beginner: '—', intermediate: '—', advanced: '—' },
  }
  return schemes[goalKey]?.[lvl] || '3×10'
}

function adjustForReadiness(detail, readiness) {
  // For deload/maintain tiers, modify the rep scheme inline with a hint.
  if (!readiness || readiness.tier === 'unknown' || readiness.tier === 'normal' || readiness.tier === 'push') {
    return detail
  }
  if (readiness.tier === 'deload') return `${detail} (deload: -10% wt, -1 set)`
  if (readiness.tier === 'maintain') return `${detail} (hold weight, cap RPE 8)`
  return detail
}

function pickExercises(eq, fitnessLevel, muscles, count, excludeIds = []) {
  const lvlNum = LEVEL_NUM[fitnessLevel] || 2
  return Object.entries(EX_DB)
    .filter(([id, ex]) =>
      muscles.some(m => ex.muscles.includes(m)) &&
      ex.level <= lvlNum &&
      ex.req.some(r => eq.has(r)) &&
      !excludeIds.includes(id)
    )
    .sort((a, b) => b[1].level - a[1].level)
    .slice(0, count)
    .map(([id, ex]) => ({ id, ex }))
}

function pickCardio(eq, count = 1, excludeIds = []) {
  return Object.entries(EX_DB)
    .filter(([id, ex]) =>
      ex.muscles[0] === 'cardio' &&
      ex.req.some(r => eq.has(r)) &&
      !excludeIds.includes(id)
    )
    .slice(0, count)
    .map(([id, ex]) => ({ id, ex }))
}

function makeExerciseEntry({ id, ex }, goalKey, fitnessLevel, readiness) {
  const detail = adjustForReadiness(repSchemeFor(goalKey, fitnessLevel), readiness)
  const isCore = ex.muscles[0] === 'core'
  const isCardio = ex.muscles[0] === 'cardio'
  const type = isCardio ? 'cardio' : isCore ? 'core' : 'strength'
  return {
    id,
    name: ex.name,
    detail,
    icon: ex.icon,
    type,
    hasWeight: !isCore && !isCardio,
    cue: ex.cue,
    yt: ex.yt,
  }
}

function warmup(eq) {
  const hasMachine = eq.has('treadmill') || eq.has('bike') || eq.has('rower')
  return [{
    id: 'warmup',
    name: hasMachine ? 'Cardio Warm-up' : 'Bodyweight Warm-up',
    detail: '5 min easy + dynamic stretching',
    icon: '🤸',
    type: 'warmup',
    hasWeight: false,
    cue: 'Get blood flowing — leg swings, arm circles, light cardio.',
    yt: 'dynamic warm up',
  }]
}

function cooldown() {
  return [
    { id: 'cool_stretch', name: 'Full Body Stretch', detail: '5-10 min', icon: '🤸', type: 'cooldown', hasWeight: false, cue: 'Hold 30-45s each. Focus on what was worked.', yt: 'post workout stretch' },
    { id: 'cool_med', name: 'Meditation', detail: '5-10 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Slow breathing, let HR drop fully.', yt: 'guided meditation' },
  ]
}

function buildStrengthDay(eq, fitnessLevel, focus, readiness, variant = 'A') {
  const muscles = FOCUS_DEFS[focus]?.muscles || FOCUS_DEFS.upper.muscles
  const count = focus === 'full' ? 5 : 4
  // Variant B uses the same goal but pulls different exercises from the pool
  // (offset the pool by 1).
  const all = pickExercises(eq, fitnessLevel, muscles, count * 2)
  const slice = variant === 'A' ? all.slice(0, count) : all.slice(count, count * 2)
  const exs = (slice.length >= 2 ? slice : all.slice(0, count))
    .map(p => makeExerciseEntry(p, 'strength', fitnessLevel, readiness))
  const core = pickExercises(eq, fitnessLevel, ['core'], 2, slice.map(s => s.id))
    .map(p => makeExerciseEntry(p, 'strength', fitnessLevel, readiness))
    .map(e => ({ ...e, type: 'core', hasWeight: false }))
  return [...warmup(eq), ...exs, ...core, ...cooldown()]
}

function buildHypertrophyDay(eq, fitnessLevel, focus, readiness, variant = 'A') {
  const muscles = FOCUS_DEFS[focus]?.muscles || FOCUS_DEFS.upper.muscles
  const count = 5
  const all = pickExercises(eq, fitnessLevel, muscles, count * 2)
  const slice = variant === 'A' ? all.slice(0, count) : all.slice(count, count * 2)
  const exs = (slice.length >= 2 ? slice : all.slice(0, count))
    .map(p => makeExerciseEntry(p, 'hypertrophy', fitnessLevel, readiness))
  const core = pickExercises(eq, fitnessLevel, ['core'], 2, slice.map(s => s.id))
    .map(p => makeExerciseEntry(p, 'hypertrophy', fitnessLevel, readiness))
    .map(e => ({ ...e, type: 'core', hasWeight: false }))
  return [...warmup(eq), ...exs, ...core, ...cooldown()]
}

function buildCardioDay(eq, fitnessLevel, readiness, variant = 'A') {
  const cardios = pickCardio(eq, 2)
  const slice = variant === 'A' ? cardios.slice(0, 1) : cardios.slice(1, 2).length ? cardios.slice(1, 2) : cardios.slice(0, 1)
  const main = (slice.length ? slice : cardios.slice(0, 1))
    .map(p => makeExerciseEntry(p, 'cardio', fitnessLevel, readiness))
  const core = pickExercises(eq, fitnessLevel, ['core'], 2)
    .map(p => makeExerciseEntry(p, 'cardio', fitnessLevel, readiness))
    .map(e => ({ ...e, type: 'core', hasWeight: false }))
  return [...warmup(eq), ...main, ...core, ...cooldown()]
}

function buildMobilityDay(eq, fitnessLevel, readiness) {
  // Mobility uses a curated bodyweight-friendly pool from EX_DB
  const pool = pickExercises(eq, fitnessLevel, ['core', 'glutes'], 4)
  const exs = pool.map(p => makeExerciseEntry(p, 'mobility', fitnessLevel, readiness))
    .map(e => ({ ...e, type: 'core', hasWeight: false }))
  return [
    ...warmup(eq),
    ...exs,
    { id: 'mob_yoga', name: 'Yoga Flow', detail: '15-20 min', icon: '🧘', type: 'core', hasWeight: false, cue: 'Sun salutations, pigeon, deep squats.', yt: 'yoga for athletes' },
    ...cooldown(),
  ]
}

function buildRecoveryDay(eq) {
  return [
    { id: 'rec_walk', name: 'Light Walk', detail: '20-30 min', icon: '🚶', type: 'cardio', hasWeight: false, cue: 'Easy recovery pace. Just move.', yt: 'walking benefits' },
    ...(eq.has('foam_roller') ? [{ id: 'rec_foam', name: 'Foam Roll', detail: '10 min', icon: '🛞', type: 'cooldown', hasWeight: false, cue: 'Pause 30-60s on tight spots.', yt: 'foam rolling' }] : []),
    { id: 'rec_stretch', name: 'Full Body Stretch', detail: '10-15 min', icon: '🤸', type: 'cooldown', hasWeight: false, cue: 'Long holds. No bouncing.', yt: 'full body stretch' },
    { id: 'rec_med', name: 'Meditation', detail: '10 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Reset the nervous system.', yt: 'guided meditation' },
  ]
}

function buildRestDay() {
  return [
    { id: 'rest_med', name: 'Meditation', detail: '5-10 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Sleep + nutrition is the work today.', yt: 'guided meditation' },
  ]
}

export function generateDay(eq, fitnessLevel, dayGoal, readiness, variant = 'A') {
  const goal = dayGoal?.goal || 'rest'
  const focus = dayGoal?.focus
  switch (goal) {
    case 'strength':    return buildStrengthDay(eq, fitnessLevel, focus, readiness, variant)
    case 'hypertrophy': return buildHypertrophyDay(eq, fitnessLevel, focus, readiness, variant)
    case 'cardio':      return buildCardioDay(eq, fitnessLevel, readiness, variant)
    case 'mobility':    return buildMobilityDay(eq, fitnessLevel, readiness)
    case 'recovery':    return buildRecoveryDay(eq)
    case 'rest':
    default:            return buildRestDay()
  }
}

export function generateGoalDrivenWorkouts({ equipment = [], fitnessLevel = 'intermediate', dayGoals, readiness } = {}) {
  const eq = new Set(equipment)
  const goals = dayGoals || DEFAULT_DAY_GOALS
  const out = {}
  for (let dow = 0; dow < 7; dow++) {
    const dg = goals[dow] || { goal: 'rest' }
    const def = GOAL_DEFS[dg.goal] || GOAL_DEFS.rest
    const focusLabel = dg.focus && FOCUS_DEFS[dg.focus] ? ` · ${FOCUS_DEFS[dg.focus].label}` : ''
    out[dow] = {
      goal: dg.goal,
      focus: dg.focus,
      name: `${def.label}${focusLabel}`,
      icon: def.icon,
      A: generateDay(eq, fitnessLevel, dg, readiness, 'A'),
      B: generateDay(eq, fitnessLevel, dg, readiness, 'B'),
    }
  }
  return out
}
