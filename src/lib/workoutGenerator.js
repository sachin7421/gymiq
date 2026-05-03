import { EX_DB } from './exerciseDb.js'

const LEVEL_NUM = { beginner: 1, intermediate: 2, advanced: 3 }

const SCHEDULES = {
  2: ['upper', 'lower'],
  3: ['push', 'pull', 'lower'],
  4: ['push', 'pull', 'lower', 'upper'],
  5: ['push', 'pull', 'lower', 'upper', 'cardio_hiit'],
}

const DOW_FOR_DAYS = {
  2: [1, 4],          // Mon, Thu
  3: [1, 3, 5],       // Mon, Wed, Fri
  4: [1, 2, 4, 5],    // Mon, Tue, Thu, Fri
  5: [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat
}

const WORKOUT_NAMES = { push: 'Upper Body Push', pull: 'Upper Body Pull', lower: 'Lower Body + Core', upper: 'Upper Body', cardio_hiit: 'HIIT Cardio' }
const WORKOUT_ICONS = { push: '💪', pull: '🔝', lower: '🦵', upper: '💪', cardio_hiit: '⚡' }

export function generateWorkouts(equipment, trainingDays, fitnessLevel) {
  const eq = new Set(equipment)
  const lvl = fitnessLevel
  const lvlNum = LEVEL_NUM[lvl] || 2

  function canDo(id) {
    if (EX_DB[id].level > lvlNum) return false
    return EX_DB[id].req.some(r => eq.has(r))
  }

  function getExercises(muscleGroups, count, excludeIds = []) {
    const pool = Object.entries(EX_DB)
      .filter(([id, ex]) =>
        muscleGroups.some(m => ex.muscles.includes(m)) &&
        canDo(id) &&
        !excludeIds.includes(id)
      )
      .sort((a, b) => b[1].level - a[1].level)
    return pool.slice(0, count).map(([id, ex]) => ({
      id,
      name: ex.name,
      detail: ex.sets[lvl] || ex.sets.i,
      icon: ex.icon,
      type: 'strength',
      hasWeight: !['core', 'cardio'].includes(ex.muscles[0]),
      cue: ex.cue,
      yt: ex.yt,
    }))
  }

  function getCardio(count = 1) {
    const pool = Object.entries(EX_DB)
      .filter(([id]) => canDo(id) && EX_DB[id].muscles[0] === 'cardio')
    return pool.slice(0, count).map(([id, ex]) => ({
      id,
      name: ex.name,
      detail: ex.sets[lvl] || ex.sets.i,
      icon: ex.icon,
      type: 'cardio',
      hasWeight: false,
      cue: ex.cue,
      yt: ex.yt,
    }))
  }

  function getCore(count = 2) {
    return getExercises(['core'], count).map(e => ({ ...e, type: 'core', hasWeight: false }))
  }

  const hasCardioMachine = eq.has('treadmill') || eq.has('bike') || eq.has('rower')
  const warmupEx = hasCardioMachine
    ? [{
        id: 'warmup_machine',
        name: eq.has('treadmill') ? 'Treadmill Warm-up' : eq.has('bike') ? 'Bike Warm-up' : 'Rower Warm-up',
        detail: '5 min easy pace + dynamic stretching',
        icon: '🚴', type: 'warmup', hasWeight: false,
        cue: 'Easy pace to elevate heart rate. Leg swings, arm circles.',
        yt: 'cardio warm up',
      }]
    : [{
        id: 'warmup_bw',
        name: 'Bodyweight Warm-up',
        detail: '5 min jumping jacks, leg swings, arm circles',
        icon: '🤸', type: 'warmup', hasWeight: false,
        cue: 'Get blood flowing. Dynamic movements only — no static stretching.',
        yt: 'warm up exercises no equipment',
      }]

  const cooldownEx = [
    { id: 'cool_med', name: 'Meditation', detail: '5–10 min — Headspace, Calm, or quiet breathing', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Slow breathing, let heart rate drop fully.', yt: 'guided meditation after workout' },
    { id: 'cool_stretch', name: 'Full Body Stretch', detail: 'Hip flexors, chest, hamstrings, shoulders', icon: '🤸', type: 'cooldown', hasWeight: false, cue: 'Hold 30-45s each stretch. Focus on what was worked today.', yt: 'full body stretch' },
  ]

  const schedule = SCHEDULES[trainingDays] || SCHEDULES[4]
  const activeDays = DOW_FOR_DAYS[trainingDays] || DOW_FOR_DAYS[4]
  const allDays = [0, 1, 2, 3, 4, 5, 6]

  const dayWorkoutMap = {}
  activeDays.forEach((dow, i) => { dayWorkoutMap[dow] = schedule[i % schedule.length] })

  const workouts = {}

  allDays.forEach(dow => {
    const wType = dayWorkoutMap[dow]
    if (!wType) {
      workouts[dow] = {
        name: 'Rest Day',
        icon: '😴',
        A: [
          { id: 'rest_walk', name: 'Light Walk', detail: '20–30 min', icon: '🚶', type: 'cardio', hasWeight: false, cue: 'Easy recovery pace. Just move.', yt: 'active recovery benefits' },
          ...(eq.has('foam_roller') ? [{ id: 'rest_foam', name: 'Foam Roll', detail: '10 min', icon: '🛞', type: 'cooldown', hasWeight: false, cue: 'Focus on tight areas. Pause 30-60s on knots.', yt: 'foam rolling how to' }] : []),
          { id: 'cool_med', name: 'Meditation', detail: '5–10 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Rest and mental recovery.', yt: 'guided meditation' },
        ],
        B: [
          { id: 'rest_walk', name: 'Light Walk', detail: '20–30 min', icon: '🚶', type: 'cardio', hasWeight: false, cue: 'Easy pace, fresh air.', yt: 'active recovery' },
          { id: 'cool_med', name: 'Meditation', detail: '5–10 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Rest and reset.', yt: 'guided meditation' },
        ],
      }
      return
    }

    let exA = []
    let exB = []

    if (wType === 'push' || wType === 'upper') {
      const chestA = getExercises(['chest'], 2)
      const shoulderA = getExercises(['shoulders'], 2)
      const tricepA = getExercises(['triceps'], 1)
      exA = [...warmupEx, ...chestA, ...shoulderA, ...tricepA, ...getCore(2), ...cooldownEx]

      const chestB = getExercises(['chest'], 2, chestA.map(e => e.id))
      const shoulderB = getExercises(['shoulders'], 2, shoulderA.map(e => e.id))
      const tricepB = getExercises(['triceps'], 1, tricepA.map(e => e.id))
      exB = [...warmupEx, ...chestB, ...shoulderB, ...tricepB, ...getCore(2), ...cooldownEx]
    } else if (wType === 'pull') {
      const backA = getExercises(['back'], 3)
      const bicepA = getExercises(['biceps'], 2)
      exA = [...warmupEx, ...backA, ...bicepA, ...getCore(2), ...cooldownEx]

      const backB = getExercises(['back'], 3, backA.map(e => e.id))
      const bicepB = getExercises(['biceps'], 2, bicepA.map(e => e.id))
      exB = [...warmupEx, ...backB, ...bicepB, ...getCore(2), ...cooldownEx]
    } else if (wType === 'lower') {
      const quadA = getExercises(['quads'], 2)
      const hamA = getExercises(['hamstrings', 'glutes'], 2)
      exA = [...warmupEx, ...quadA, ...hamA, ...getCore(3), ...cooldownEx]

      const quadB = getExercises(['quads'], 2, quadA.map(e => e.id))
      const hamB = getExercises(['hamstrings', 'glutes'], 2, hamA.map(e => e.id))
      exB = [...warmupEx, ...quadB, ...hamB, ...getCore(3), ...cooldownEx]
    } else if (wType === 'cardio_hiit') {
      const cardioA = getCardio(2)
      exA = [...warmupEx, ...cardioA, ...getCore(2), ...cooldownEx]
      exB = [...warmupEx, ...getCardio(2).reverse(), ...getCore(2), ...cooldownEx]
    }

    if (exA.length <= 2) {
      exA = [...warmupEx, ...getExercises(['chest', 'back', 'quads'], 4), ...getCore(2), ...cooldownEx]
    }
    if (exB.length <= 2) exB = exA

    workouts[dow] = {
      name: WORKOUT_NAMES[wType] || wType,
      icon: WORKOUT_ICONS[wType] || '💪',
      A: exA.filter(Boolean),
      B: exB.filter(Boolean),
    }
  })

  return workouts
}
