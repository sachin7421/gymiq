import { DEFAULT_STATE } from './state.js'
import { localDateStr } from './dateUtils.js'

export function mergeHabits(local, cloud) {
  if (!local) return cloud || { ...DEFAULT_STATE.habits }
  if (!cloud) return local
  const merged = {}
  Object.keys(DEFAULT_STATE.habits).forEach(k => {
    merged[k] = (local[k] || false) || (cloud[k] || false)
  })
  return merged
}

// Merge local in-memory state with the cloud copy. Cloud is the base; local
// overrides are applied per-field with the rules below.
export function mergeStates(local, cloud) {
  const merged = { ...DEFAULT_STATE, ...cloud }

  // Weight history: dedupe by date, keep first occurrence
  const allWeights = [...(cloud.weightHistory || []), ...(local.weightHistory || [])]
  const weightByDate = {}
  allWeights.forEach(e => { if (!weightByDate[e.date]) weightByDate[e.date] = e })
  merged.weightHistory = Object.values(weightByDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // Current weight: use whichever was logged most recently
  const localLastLog = local.weightHistory?.[0]
  const cloudLastLog = cloud.weightHistory?.[0]
  if (localLastLog && cloudLastLog) {
    merged.currentWeight = new Date(localLastLog.date) >= new Date(cloudLastLog.date)
      ? local.currentWeight : cloud.currentWeight
  } else {
    merged.currentWeight = local.currentWeight || cloud.currentWeight || 230
  }

  // Calories & burned & habits: use today's session
  const today = localDateStr()
  const localResetDate = local.lastResetDate || ''
  const cloudResetDate = cloud.lastResetDate || ''
  if (localResetDate === today && cloudResetDate === today) {
    merged.calories = Math.max(local.calories || 0, cloud.calories || 0)
    merged.burned = Math.max(local.burned || 0, cloud.burned || 0)
    merged.habits = mergeHabits(local.habits, cloud.habits)
  } else if (localResetDate === today) {
    merged.calories = local.calories || 0
    merged.burned = local.burned || 0
    merged.habits = local.habits || { ...DEFAULT_STATE.habits }
  } else if (cloudResetDate === today) {
    merged.calories = cloud.calories || 0
    merged.burned = cloud.burned || 0
    merged.habits = cloud.habits || { ...DEFAULT_STATE.habits }
  }

  // Weekly drinks: max per day
  const localDrinks = local.weekDrinks || {}
  const cloudDrinks = cloud.weekDrinks || {}
  const allDrinkDates = new Set([...Object.keys(localDrinks), ...Object.keys(cloudDrinks)])
  merged.weekDrinks = {}
  allDrinkDates.forEach(d => {
    merged.weekDrinks[d] = Math.max(localDrinks[d] || 0, cloudDrinks[d] || 0)
  })

  // Exercise weights: keep most recent by date
  const localWeights = local.exerciseWeights || {}
  const cloudWeights = cloud.exerciseWeights || {}
  merged.exerciseWeights = { ...cloudWeights }
  Object.entries(localWeights).forEach(([id, v]) => {
    const c = cloudWeights[id]
    if (!c || new Date(v.date) >= new Date(c.date)) merged.exerciseWeights[id] = v
  })

  // Exercise done: union per date
  const localDone = local.exerciseDone || {}
  const cloudDone = cloud.exerciseDone || {}
  merged.exerciseDone = { ...cloudDone }
  Object.entries(localDone).forEach(([date, exMap]) => {
    if (!merged.exerciseDone[date]) merged.exerciseDone[date] = {}
    Object.assign(merged.exerciseDone[date], exMap)
  })

  // Completed workouts: union
  merged.completedWorkouts = { ...(cloud.completedWorkouts || {}), ...(local.completedWorkouts || {}) }

  // Streak: take higher
  merged.streak = Math.max(local.streak || 0, cloud.streak || 0)
  merged.bestStreak = Math.max(local.bestStreak || 0, cloud.bestStreak || 0)

  // Daily points: max per day
  const lp = local.dailyPoints || {}
  const cp = cloud.dailyPoints || {}
  merged.dailyPoints = {}
  new Set([...Object.keys(lp), ...Object.keys(cp)]).forEach(d => {
    merged.dailyPoints[d] = Math.max(lp[d] || 0, cp[d] || 0)
  })

  // Last sync: most recent
  if (local.lastSync && cloud.lastSync) {
    merged.lastSync = new Date(local.lastSync) > new Date(cloud.lastSync) ? local.lastSync : cloud.lastSync
  } else {
    merged.lastSync = local.lastSync || cloud.lastSync || null
  }

  // Never restore generated workouts — regenerate from inputs.
  merged.generatedWorkouts = null

  return merged
}
