import { getWeekDateStr } from './dateUtils.js'
import { weekStats, weekWins, DRINK_CAP } from './alcohol.js'

export const HABIT_DEFS = [
  { key: 'workout', emoji: '🏋️', label: 'Completed workout', pts: 2 },
  { key: 'meditation', emoji: '🧘', label: '5–10 min meditation', pts: 1 },
  { key: 'water', emoji: '💧', label: 'Drank 50+ oz of water', pts: 1 },
  { key: 'protein', emoji: '🥩', label: 'Hit ~170g protein', pts: 2 },
  { key: 'sleep', emoji: '😴', label: 'Got 7–9 hours of sleep', pts: 2 },
  { key: 'noLateSnack', emoji: '🚫', label: 'No eating after 9pm', pts: 1 },
  { key: 'alcohol', emoji: '🍺', label: 'Alcohol-free day', pts: 1 },
  { key: 'egoscue', emoji: '🧘', label: 'Back / Egoscue menu', pts: 1 },
  { key: 'creatine', emoji: '💊', label: 'Creatine (morning)', pts: 1 },
  { key: 'magnesium', emoji: '🌙', label: 'Magnesium (night)', pts: 1 },
]

export const MAX_PTS = HABIT_DEFS.reduce((a, h) => a + h.pts, 0)

export const LEVELS = [
  { min: 0, max: 100, title: 'ROOKIE', icon: '🌱', color: '#888888' },
  { min: 101, max: 300, title: 'COMMITTED', icon: '🔥', color: '#e05c1a' },
  { min: 301, max: 600, title: 'CONSISTENT', icon: '⚡', color: '#c47a00' },
  { min: 601, max: 1000, title: 'DEDICATED', icon: '💪', color: '#1a6fa8' },
  { min: 1001, max: 2000, title: 'ELITE', icon: '🏆', color: '#2a7d4f' },
  { min: 2001, max: 9999, title: 'GYMIQ MASTER', icon: '👑', color: '#6b21a8' },
]

export function calcDailyPoints(habits) {
  return HABIT_DEFS.reduce((a, h) => a + (habits?.[h.key] ? h.pts : 0), 0)
}

export function getTotalPoints(state) {
  const daily = Object.values(state.dailyPoints || {}).reduce((a, v) => a + (v || 0), 0)
  return daily + (state.bonusPoints || 0)
}

export function getLevel(pts) {
  return LEVELS.slice().reverse().find(l => pts >= l.min) || LEVELS[0]
}

export function getNextLevel(lvl) {
  return LEVELS[LEVELS.indexOf(lvl) + 1] || null
}

export function getWeeklyPoints(state) {
  let total = 0
  let days = 0
  for (let i = 0; i < 7; i++) {
    const d = getWeekDateStr(i)
    const pts = state.dailyPoints?.[d]
    if (pts !== undefined) {
      total += pts
      days++
    }
  }
  return { total, days, possible: days * MAX_PTS }
}

export function getWeekGrade(pct) {
  if (pct >= 0.9) return { grade: 'S', label: 'Locked In', color: 'var(--accent)' }
  if (pct >= 0.75) return { grade: 'A', label: 'Strong Week', color: 'var(--success)' }
  if (pct >= 0.6) return { grade: 'B', label: 'Solid', color: 'var(--accent3)' }
  if (pct >= 0.45) return { grade: 'C', label: 'Inconsistent', color: 'var(--warn)' }
  return { grade: 'D', label: 'Reset Needed', color: 'var(--danger)' }
}

export function totalDrinksThisWeek(state) {
  let total = 0
  for (let i = 0; i < 7; i++) total += (state.weekDrinks?.[getWeekDateStr(i)] || 0)
  return total
}

export function countHabitDaysThisWeek(state, key) {
  let c = 0
  for (let i = 0; i < 7; i++) {
    const d = getWeekDateStr(i)
    if (state.weeklyHabits?.[d]?.[key]) c++
  }
  return c
}

export function countDaysAboveScore(state, min) {
  let c = 0
  for (let i = 0; i < 7; i++) {
    const d = getWeekDateStr(i)
    if ((state.dailyPoints?.[d] || 0) >= min) c++
  }
  return c
}

// Returns the current week's challenge — auto-rotates by week number.
export function getWeeklyChallenge(state) {
  const wn = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const ch = [
    { id: 'workout4', icon: '🏋️', title: '4 Workouts This Week', desc: 'Complete the workout habit 4 days this week.', pts: 20, check: () => countHabitDaysThisWeek(state, 'workout') >= 4, progress: () => ({ cur: countHabitDaysThisWeek(state, 'workout'), max: 4 }) },
    { id: 'drinkcap', icon: '🍺', title: `Under the ${DRINK_CAP}-Day Cap`, desc: `Finish the week (Mon–Sun) with ${DRINK_CAP} or fewer drinking days.`, pts: 15, check: () => { const w = weekStats(state); return w.complete && w.win }, progress: () => { const w = weekStats(state); return { cur: Math.max(0, DRINK_CAP - w.used), max: DRINK_CAP } } },
    { id: 'protein5', icon: '🥩', title: 'Protein 5 Days', desc: 'Hit your protein goal 5 days this week.', pts: 20, check: () => countHabitDaysThisWeek(state, 'protein') >= 5, progress: () => ({ cur: countHabitDaysThisWeek(state, 'protein'), max: 5 }) },
    { id: 'sleep5', icon: '😴', title: 'Sleep 5 Nights', desc: 'Log 7-9 hours of sleep 5 nights.', pts: 20, check: () => countHabitDaysThisWeek(state, 'sleep') >= 5, progress: () => ({ cur: countHabitDaysThisWeek(state, 'sleep'), max: 5 }) },
    { id: 'meditate5', icon: '🧘', title: 'Meditate 5 Days', desc: 'Complete meditation habit 5 days this week.', pts: 15, check: () => countHabitDaysThisWeek(state, 'meditation') >= 5, progress: () => ({ cur: countHabitDaysThisWeek(state, 'meditation'), max: 5 }) },
    { id: 'score7', icon: '⭐', title: 'Score 7+ Points 5 Days', desc: 'Hit at least 7 points on 5 different days.', pts: 25, check: () => countDaysAboveScore(state, 7) >= 5, progress: () => ({ cur: countDaysAboveScore(state, 7), max: 5 }) },
    { id: 'perfect3', icon: '🔥', title: '3 Perfect Days', desc: 'Achieve a perfect score 3 times this week.', pts: 30, check: () => countDaysAboveScore(state, MAX_PTS) >= 3, progress: () => ({ cur: countDaysAboveScore(state, MAX_PTS), max: 3 }) },
    { id: 'water5', icon: '💧', title: 'Hydrate 5 Days', desc: 'Hit your water goal 5 days this week.', pts: 15, check: () => countHabitDaysThisWeek(state, 'water') >= 5, progress: () => ({ cur: countHabitDaysThisWeek(state, 'water'), max: 5 }) },
  ]
  return ch[wn % ch.length]
}

export const ALL_BADGES = [
  { id: 'first_log', icon: '📝', name: 'First Log', check: s => Object.values(s.completedWorkouts || {}).some(Boolean) },
  { id: 'first_weight', icon: '⚖️', name: 'Weighed In', check: s => (s.weightHistory || []).length > 0 },
  { id: 'streak3', icon: '🔥', name: 'On Fire', check: s => (s.bestStreak || 0) >= 3 },
  { id: 'streak7', icon: '⚡', name: 'Week Warrior', check: s => (s.bestStreak || 0) >= 7 },
  { id: 'workouts5', icon: '💪', name: '5 Workouts', check: s => Object.values(s.completedWorkouts || {}).filter(Boolean).length >= 5 },
  { id: 'workouts10', icon: '🏋️', name: '10 Workouts', check: s => Object.values(s.completedWorkouts || {}).filter(Boolean).length >= 10 },
  { id: 'workouts25', icon: '🏆', name: '25 Workouts', check: s => Object.values(s.completedWorkouts || {}).filter(Boolean).length >= 25 },
  { id: 'dry_week', icon: '🧊', name: 'Dry Week', check: s => weekWins(s).weeks.some(w => w.used === 0) },
  { id: 'cap_win3', icon: '🥂', name: '3 Cap Wins', check: s => weekWins(s).wins >= 3 },
  { id: 'cap_win8', icon: '🏆', name: '8 Cap Wins', check: s => weekWins(s).wins >= 8 },
  { id: 'pts100', icon: '💯', name: 'Century', check: s => getTotalPoints(s) >= 100 },
  { id: 'pts300', icon: '🌟', name: 'Committed', check: s => getTotalPoints(s) >= 300 },
  { id: 'pts500', icon: '🏅', name: 'Dedicated', check: s => getTotalPoints(s) >= 500 },
  { id: 'lbs5', icon: '📉', name: '5 Lbs Down', check: s => (s.startWeight - s.currentWeight) >= 5 },
  { id: 'lbs10', icon: '🎯', name: '10 Lbs Down', check: s => (s.startWeight - s.currentWeight) >= 10 },
  { id: 'lbs20', icon: '🚀', name: 'Halfway There', check: s => (s.startWeight - s.currentWeight) >= 20 },
  { id: 'lbs30', icon: '👑', name: 'GOAL ACHIEVED', check: s => (s.startWeight - s.currentWeight) >= 30 },
  { id: 'chal1', icon: '🎖️', name: 'Challenger', check: s => Object.keys(s.challengeAwards || {}).length >= 1 },
  { id: 'chal5', icon: '🎗️', name: 'Champion', check: s => Object.keys(s.challengeAwards || {}).length >= 5 },
]
