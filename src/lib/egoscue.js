// Egoscue "Back" menu — a guided, timed sequence for low-back relief.
// Each entry is either timed (seconds) or manual (reps, user taps Done).
// `perSide: true` expands into Left then Right steps of `seconds` each.

const BASE = 'https://www.egoscue.com/WebMenus/ECiseHTML/'

export const EGOSCUE_BACK = {
  id: 'egoscue_back',
  name: 'Back / Egoscue',
  icon: '🧘',
  habitKey: 'egoscue',
  exercises: [
    { id: 'hip_crossover', name: 'Hip Crossover Stretch — Palms Down', seconds: 60, perSide: true, link: BASE + '383.html', cue: 'Lie on your back, knees bent, arms out palms down. Let the knees fall to one side and hold.' },
    { id: 'gluteal_squeezes', name: 'Hooklying Gluteal Squeezes', reps: 60, link: BASE + '28.html', cue: 'Knees bent, feet flat. Squeeze the glutes together and release. Count 60.' },
    { id: 'static_back', name: 'Static Back', seconds: 300, link: BASE + '30.html', cue: 'Legs up on a chair or block at 90°. Arms out, palms up. Breathe from the belly and let the back settle.' },
    { id: 'knee_pillow_squeezes', name: 'Static Back Knee Pillow Squeezes', seconds: 180, link: BASE + '453.html', cue: 'Same position, pillow between the knees. Squeeze and release in a steady rhythm.' },
    { id: 'pull_overs', name: 'Static Back Pull Overs with Pillow', seconds: 180, link: BASE + '280.html', cue: 'Hold a pillow overhead with straight arms, lower it to the floor behind you and back.' },
    { id: 'airbench', name: 'Airbench', seconds: 120, link: BASE + '27.html', cue: 'Back flat on the wall, thighs parallel, knees over ankles. Press the low back into the wall.' },
  ],
}

// Flatten into runnable steps: per-side exercises become two steps.
export function buildSteps(menu = EGOSCUE_BACK) {
  const steps = []
  menu.exercises.forEach((ex, idx) => {
    if (ex.perSide) {
      steps.push({ ...ex, key: ex.id + ':L', side: 'Left', exerciseIndex: idx })
      steps.push({ ...ex, key: ex.id + ':R', side: 'Right', exerciseIndex: idx })
    } else {
      steps.push({ ...ex, key: ex.id, exerciseIndex: idx })
    }
  })
  return steps
}

export function totalSeconds(menu = EGOSCUE_BACK) {
  return menu.exercises.reduce((a, ex) => a + (ex.seconds || 0) * (ex.perSide ? 2 : 1), 0)
}

export function fmtDuration(ex) {
  if (ex.reps) return `×${ex.reps}`
  const m = Math.floor(ex.seconds / 60)
  const s = ex.seconds % 60
  const base = `${m}:${String(s).padStart(2, '0')}`
  return ex.perSide ? `${base} per side` : base
}

export function fmtClock(totalSec) {
  const s = Math.max(0, Math.round(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
