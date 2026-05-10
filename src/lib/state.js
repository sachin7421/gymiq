// Default user state — mirrors the legacy single-file app's state object.
// Note: `generatedWorkouts` is intentionally NOT persisted to Supabase — always
// regenerate from `equipment + trainingDays + fitnessLevel` on load.

export const DEFAULT_STATE = {
  // Auth & setup
  onboardingComplete: false,
  userName: '',
  equipment: [],
  trainingDays: 4,
  fitnessLevel: 'intermediate',
  hasOura: false,
  ouraToken: null,
  wearable: 'none',
  anthropicKey: null,

  // Weight
  currentWeight: 0,
  startWeight: 0,
  goalWeight: 0,
  startDate: '',
  weightHistory: [],

  // Calories
  calories: 0,
  burned: 0,
  calorieTarget: 2100,
  lastResetDate: '',

  // Alcohol
  weekDrinks: {},

  // Habits
  habits: {
    workout: false,
    water: false,
    protein: false,
    sleep: false,
    noLateSnack: false,
    alcohol: false,
    meditation: false,
  },

  // Points & gamification
  dailyPoints: {},
  weeklyHabits: {},
  streak: 0,
  bestStreak: 0,
  lastHabitDate: '',
  bonusPoints: 0,
  challengeAwards: {},
  earnedBadges: {},

  // Workouts
  completedWorkouts: {},
  exerciseDone: {},
  exerciseWeights: {},
  // setLog[dateKey][exerciseId] = [{ weight, reps, rpe, ts }]
  // Source of truth for per-set history. exerciseWeights/exerciseDone are
  // legacy mirrors kept in sync for any UI still reading them.
  setLog: {},
  // Per-day-of-week goal config. When present, the goal-driven generator
  // runs instead of the legacy schedule-based one.
  // dayGoals[0..6] = { goal, focus? }
  dayGoals: null,
  currentRoutine: 'A',
  viewDow: null,

  // Apple Health import. healthData[dateKey] = { steps, hrv, restingHr, sleepHours, weight, ... }
  healthData: {},
  // Last 90d of workouts pulled from HealthKit
  healthWorkouts: [],
  lastHealthImport: null,

  // Sync
  lastSync: null,
  tzMigrated: true,
}

// Keys never written to Supabase (regenerate from inputs).
export const EPHEMERAL_KEYS = ['generatedWorkouts']
