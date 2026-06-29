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

// Balanced push / pull / cardio week. Heavy compound push & pull early, a
// dedicated cardio day, a combined upper (push+pull) volume day to finish,
// with a mid-week rest and a weekend recovery slot. Exercise selection still
// adapts to whatever equipment the user owns.
export const DEFAULT_DAY_GOALS = {
  0: { goal: 'rest' },                          // Sun
  1: { goal: 'strength', focus: 'push' },       // Mon — Push
  2: { goal: 'strength', focus: 'pull' },       // Tue — Pull
  3: { goal: 'rest' },                          // Wed
  4: { goal: 'cardio' },                        // Thu — Cardio
  5: { goal: 'hypertrophy', focus: 'upper' },   // Fri — Push/Pull
  6: { goal: 'recovery' },                      // Sat
}

// Balanced push / pull / cardio templates keyed by weekly training-day count.
// Each keeps push, pull, and cardio represented; lifting days carry a push or
// pull focus (or a combined `upper` day) and exercises are still filtered to
// the user's available equipment by the generator.
const BALANCED_TEMPLATES = {
  3: {
    1: { goal: 'strength', focus: 'push' },     // Mon — Push
    3: { goal: 'strength', focus: 'pull' },     // Wed — Pull
    5: { goal: 'cardio' },                      // Fri — Cardio
  },
  4: {
    1: { goal: 'strength', focus: 'push' },     // Mon — Push
    2: { goal: 'strength', focus: 'pull' },     // Tue — Pull
    4: { goal: 'cardio' },                      // Thu — Cardio
    5: { goal: 'hypertrophy', focus: 'upper' }, // Fri — Push/Pull
    6: { goal: 'recovery' },                    // Sat — Recovery
  },
  5: {
    1: { goal: 'strength', focus: 'push' },     // Mon — Push
    2: { goal: 'strength', focus: 'pull' },     // Tue — Pull
    3: { goal: 'cardio' },                      // Wed — Cardio
    4: { goal: 'hypertrophy', focus: 'push' },  // Thu — Push
    5: { goal: 'hypertrophy', focus: 'pull' },  // Fri — Pull
    6: { goal: 'recovery' },                    // Sat — Recovery
  },
  6: {
    1: { goal: 'strength', focus: 'push' },     // Mon — Push
    2: { goal: 'strength', focus: 'pull' },     // Tue — Pull
    3: { goal: 'cardio' },                      // Wed — Cardio
    4: { goal: 'hypertrophy', focus: 'push' },  // Thu — Push
    5: { goal: 'hypertrophy', focus: 'pull' },  // Fri — Pull
    6: { goal: 'cardio' },                      // Sat — Cardio
  },
}

// Seed per-day goals from the user's training-day count, using the balanced
// push/pull/cardio templates above. Days not in the template default to rest.
export function seedDayGoalsFromLegacy(state) {
  const trainingDays = state.trainingDays || 4
  const template = BALANCED_TEMPLATES[trainingDays] || BALANCED_TEMPLATES[4]
  const goals = {}
  for (let d = 0; d < 7; d++) goals[d] = { goal: 'rest' }
  Object.entries(template).forEach(([dow, g]) => { goals[dow] = { ...g } })
  return goals
}
