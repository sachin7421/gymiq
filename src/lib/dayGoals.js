// Per-day goal definitions. Each day of the week (0=Sun..6=Sat) gets a
// `goal` (strength | hypertrophy | cardio | mobility | recovery | rest)
// and an optional `focus` for muscle group bias on lifting days
// (push | pull | lower | upper | full).
//
// State shape:
//   state.dayGoals = {
//     0: { goal: 'rest' },
//     1: { goal: 'strength', focus: 'push' },
//     ...
//   }
//
// If state.dayGoals is undefined the legacy schedule-based generator runs
// (preserves current behavior for users who haven't opted in).

export const GOAL_DEFS = {
  strength: {
    label: 'Strength',
    icon: '🏋️',
    color: '#1a6fa8',
    desc: 'Heavy compounds, low reps, long rest. Build raw force.',
    sets: '4-5',
    reps: '3-6',
    restSec: 180,
    intensityPct: 0.9,
  },
  hypertrophy: {
    label: 'Hypertrophy',
    icon: '💪',
    color: '#2a7d4f',
    desc: 'Moderate weight, higher reps, short rest. Build muscle.',
    sets: '3-4',
    reps: '8-12',
    restSec: 75,
    intensityPct: 0.75,
  },
  cardio: {
    label: 'Cardio',
    icon: '🏃',
    color: '#e05c1a',
    desc: 'Conditioning. HIIT or steady-state.',
    sets: '1-3',
    reps: '—',
    restSec: 60,
    intensityPct: 0.7,
  },
  mobility: {
    label: 'Mobility',
    icon: '🤸',
    color: '#c47a00',
    desc: 'Joint range, flexibility, activation.',
    sets: '2-3',
    reps: '8-15',
    restSec: 30,
    intensityPct: 0.4,
  },
  recovery: {
    label: 'Recovery',
    icon: '🧘',
    color: '#9b59b6',
    desc: 'Active rest. Walk, stretch, breathe.',
    sets: '1',
    reps: '—',
    restSec: 0,
    intensityPct: 0.3,
  },
  rest: {
    label: 'Rest',
    icon: '😴',
    color: '#888',
    desc: 'Full off-day. Sleep + nutrition.',
    sets: '0',
    reps: '—',
    restSec: 0,
    intensityPct: 0,
  },
}

export const FOCUS_DEFS = {
  push: { label: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  pull: { label: 'Pull', muscles: ['back', 'biceps'] },
  lower: { label: 'Lower', muscles: ['quads', 'hamstrings', 'glutes'] },
  upper: { label: 'Upper', muscles: ['chest', 'shoulders', 'back', 'triceps', 'biceps'] },
  full: { label: 'Full body', muscles: ['chest', 'shoulders', 'back', 'quads', 'hamstrings', 'glutes', 'triceps', 'biceps'] },
}

// Sensible default schedule for someone training 4 days/week with adaptive goals.
export const DEFAULT_DAY_GOALS = {
  0: { goal: 'rest' },
  1: { goal: 'strength', focus: 'lower' },
  2: { goal: 'hypertrophy', focus: 'push' },
  3: { goal: 'cardio' },
  4: { goal: 'strength', focus: 'pull' },
  5: { goal: 'hypertrophy', focus: 'upper' },
  6: { goal: 'recovery' },
}

// Convert legacy trainingDays + schedule pattern to per-day goals
// (used when seeding the editor for the first time).
export function seedDayGoalsFromLegacy(state) {
  const trainingDays = state.trainingDays || 4
  const SCHEDULES = {
    2: ['lower', 'upper'],
    3: ['push', 'pull', 'lower'],
    4: ['lower', 'push', 'pull', 'upper'],
    5: ['lower', 'push', 'pull', 'upper', 'full'],
  }
  const DOWS = {
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 4, 5, 6],
  }
  const sched = SCHEDULES[trainingDays] || SCHEDULES[4]
  const dows = DOWS[trainingDays] || DOWS[4]
  const goals = {}
  for (let d = 0; d < 7; d++) goals[d] = { goal: 'rest' }
  dows.forEach((dow, i) => {
    const focus = sched[i % sched.length]
    // Alternate strength/hypertrophy for variety
    const goal = i % 2 === 0 ? 'strength' : 'hypertrophy'
    goals[dow] = focus === 'cardio' ? { goal: 'cardio' } : { goal, focus }
  })
  return goals
}
