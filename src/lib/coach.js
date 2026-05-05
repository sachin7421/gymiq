// Claude-powered "ask my data" coach. Calls the Anthropic Messages API
// directly from the browser using the user's own API key (stored in their
// Supabase blob; never leaves their device beyond their own Anthropic call).
//
// Model: claude-haiku-4-5 — cheap, fast, plenty smart for fitness Q&A.
//
// We compose a system prompt that summarizes the user's recent data so the
// model has grounding without us shipping the entire blob (token cost).
// The summary is curated server-of-truth fields: profile, last 14 days of
// habits/points, last 30 days of weight, last 14 days of workout log w/
// per-exercise top sets and e1RMs, and current Oura snapshot if connected.

import { recentPRs, topE1RMs, bestE1RMHistory, setE1RM } from './strength.js'
import { iterExerciseHistory, getSets } from './setLog.js'
import { localDateStr, todayStr } from './dateUtils.js'
import { EX_DB } from './exerciseDb.js'

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'
const VERSION = '2023-06-01'

export function buildContext(state, ouraSnapshot) {
  const lines = []
  lines.push('USER PROFILE')
  lines.push(`- Name: ${state.userName || '(not set)'}`)
  lines.push(`- Fitness level: ${state.fitnessLevel || 'intermediate'}`)
  lines.push(`- Training days/week: ${state.trainingDays || 4}`)
  if (state.currentWeight) lines.push(`- Current weight: ${state.currentWeight} lbs`)
  if (state.startWeight) lines.push(`- Start weight: ${state.startWeight} lbs`)
  if (state.goalWeight) lines.push(`- Goal weight: ${state.goalWeight} lbs`)
  if (state.calorieTarget) lines.push(`- Daily calorie target: ${state.calorieTarget}`)
  if (state.equipment?.length) lines.push(`- Equipment: ${state.equipment.join(', ')}`)

  if (ouraSnapshot) {
    lines.push('')
    lines.push('OURA TODAY')
    if (ouraSnapshot.readinessScore != null) lines.push(`- Readiness: ${ouraSnapshot.readinessScore}`)
    if (ouraSnapshot.sleepScore != null) lines.push(`- Sleep score: ${ouraSnapshot.sleepScore}`)
    if (ouraSnapshot.sleepHours != null) lines.push(`- Sleep duration: ${ouraSnapshot.sleepHours}h`)
    if (ouraSnapshot.averageHrv != null) lines.push(`- HRV: ${ouraSnapshot.averageHrv}ms`)
    if (ouraSnapshot.restingHr != null) lines.push(`- Resting HR: ${ouraSnapshot.restingHr}bpm`)
    if (ouraSnapshot.activeCalories != null) lines.push(`- Active calories: ${ouraSnapshot.activeCalories}`)
  }

  // Last 14 days of habit points
  const points14 = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const k = localDateStr(d)
    if (state.dailyPoints?.[k] != null) points14.push(`${k}=${state.dailyPoints[k]}`)
  }
  if (points14.length) {
    lines.push('')
    lines.push('HABIT POINTS (last 14d)')
    lines.push('- ' + points14.reverse().join(', '))
  }

  // Recent weights
  const weights = (state.weightHistory || []).slice(-10)
  if (weights.length) {
    lines.push('')
    lines.push('WEIGHT TREND (last 10 logs)')
    weights.forEach(w => lines.push(`- ${w.date}: ${w.weight} lbs`))
  }

  // Workout sessions in last 14 days
  const log = state.setLog || {}
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14)
  const cutoffKey = localDateStr(cutoff)
  const recentDates = Object.keys(log).filter(d => d >= cutoffKey).sort().reverse()
  if (recentDates.length) {
    lines.push('')
    lines.push('RECENT WORKOUTS (last 14d)')
    recentDates.forEach(date => {
      const exs = log[date] || {}
      const exLines = Object.entries(exs).map(([id, sets]) => {
        const top = sets.reduce((b, s) => (setE1RM(s) > setE1RM(b || {}) ? s : b), null)
        return `${EX_DB[id]?.name || id}: ${sets.length}sets, top ${top.weight}×${top.reps}${top.rpe ? `@${top.rpe}` : ''} (e1RM ${Math.round(setE1RM(top))})`
      })
      if (exLines.length) lines.push(`- ${date}:\n    ${exLines.join('\n    ')}`)
    })
  }

  // Top lifts + recent PRs
  const top = topE1RMs(state, 5)
  if (top.length) {
    lines.push('')
    lines.push('TOP LIFTS (current best e1RM)')
    top.forEach(t => lines.push(`- ${EX_DB[t.exerciseId]?.name || t.exerciseId}: ${Math.round(t.e1rm)} lbs`))
  }
  const prs = recentPRs(state, 30)
  if (prs.length) {
    lines.push('')
    lines.push('RECENT PRS (last 30d)')
    prs.slice(0, 5).forEach(p => lines.push(`- ${EX_DB[p.exerciseId]?.name || p.exerciseId}: ${Math.round(p.e1rm)} on ${p.dateKey}`))
  }

  return lines.join('\n')
}

const SYSTEM_PROMPT = `You are GymIQ Coach — a knowledgeable, no-nonsense strength and conditioning coach assisting one specific user. You have access to their training data, body composition, habits, and (sometimes) Oura recovery metrics.

Style:
- Direct, specific, evidence-based.
- Reference the user's actual numbers when relevant — don't speak in generalities when their data tells a clearer story.
- If the user asks about programming/recovery and their Oura readiness is below 70, factor that in.
- If the user asks for a recommendation that isn't supported by their data (e.g., "should I bench more?" but they haven't benched in 3 weeks), say so.
- Avoid medical/injury diagnosis. Suggest seeing a professional for pain or persistent issues.
- Keep replies short (under 200 words) unless the user asks for detail.

Today's date: ${todayStr()}`

export async function askCoach(apiKey, userMessage, contextText) {
  if (!apiKey) throw new Error('Missing Anthropic API key — set one in Settings.')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n--- USER DATA ---\n${contextText}`,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Coach API ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const text = (json.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
  return text || '(no response)'
}

// Suggest helpful starter questions based on what we know
export function suggestQuestions(state, oura) {
  const out = ['How was my training this week?']
  if (oura?.readinessScore != null && oura.readinessScore < 70) {
    out.push('My Oura readiness is low — should I still train today?')
  }
  if (Object.keys(state.setLog || {}).length > 0) {
    out.push('Any lifts where I\'m plateauing?')
    out.push('What should I focus on next week?')
  }
  if (state.startWeight && state.currentWeight && state.goalWeight) {
    out.push('Am I on track for my weight goal?')
  }
  return out.slice(0, 4)
}

const COACH_KEY_FIELD = 'anthropicKey'
export { COACH_KEY_FIELD }
