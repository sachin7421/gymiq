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
  currentRoutine: 'A',
  viewDow: null,

  // Sync
  lastSync: null,
  tzMigrated: true,
}

// Keys never written to Supabase (regenerate from inputs).
export const EPHEMERAL_KEYS = ['generatedWorkouts']
