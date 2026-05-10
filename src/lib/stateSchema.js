// Zod schema for the persisted user state. Used to validate blobs coming from
// Supabase before merging into local state — protects against silent
// corruption (e.g. a renamed field that drops to undefined and clobbers
// a real value on save).
//
// We use `.passthrough()` so unknown fields aren't dropped — that keeps the
// schema additive: introducing a new field in client code doesn't require a
// schema bump before users on older clients save their data.

import { z } from 'zod'

const numLike = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)])

const Habits = z.object({
  workout: z.boolean().optional(),
  water: z.boolean().optional(),
  protein: z.boolean().optional(),
  sleep: z.boolean().optional(),
  noLateSnack: z.boolean().optional(),
  alcohol: z.boolean().optional(),
  meditation: z.boolean().optional(),
}).partial().passthrough()

const SetEntry = z.object({
  weight: z.number().nonnegative().optional().default(0),
  reps: z.number().int().nonnegative(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  ts: z.string().optional(),
}).passthrough()

export const StateSchema = z.object({
  onboardingComplete: z.boolean().optional(),
  userName: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  trainingDays: z.number().int().min(1).max(7).optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  hasOura: z.boolean().optional(),
  ouraToken: z.string().nullable().optional(),
  wearable: z.string().optional(),
  anthropicKey: z.string().nullable().optional(),

  currentWeight: numLike.optional(),
  startWeight: numLike.optional(),
  goalWeight: numLike.optional(),
  startDate: z.string().optional(),
  weightHistory: z.array(z.any()).optional(),

  calories: z.number().optional(),
  burned: z.number().optional(),
  calorieTarget: z.number().optional(),
  lastResetDate: z.string().optional(),

  weekDrinks: z.record(z.string(), z.number()).optional(),

  habits: Habits.optional(),

  dailyPoints: z.record(z.string(), z.number()).optional(),
  weeklyHabits: z.record(z.string(), Habits).optional(),
  streak: z.number().optional(),
  bestStreak: z.number().optional(),
  lastHabitDate: z.string().optional(),
  bonusPoints: z.number().optional(),
  challengeAwards: z.record(z.string(), z.any()).optional(),
  earnedBadges: z.record(z.string(), z.any()).optional(),

  completedWorkouts: z.record(z.string(), z.any()).optional(),
  exerciseDone: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  exerciseWeights: z.record(z.string(), z.any()).optional(),
  setLog: z.record(z.string(), z.record(z.string(), z.array(SetEntry))).optional(),
  dayGoals: z.record(z.string(), z.object({
    goal: z.string(),
    focus: z.string().optional(),
  })).nullable().optional(),
  currentRoutine: z.string().optional(),
  viewDow: z.number().nullable().optional(),
  healthData: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  healthWorkouts: z.array(z.any()).optional(),
  lastHealthImport: z.string().nullable().optional(),

  lastSync: z.string().nullable().optional(),
  tzMigrated: z.boolean().optional(),
}).passthrough()

// Returns { ok: true, data } on success, { ok: false, error } on failure.
// On failure callers should fall back to defaults rather than corrupt state.
export function validateState(input) {
  const result = StateSchema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, error: result.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }
}
