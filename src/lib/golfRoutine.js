// Routine C — Golf Mobility & Strength.
//
// A dedicated, equipment-aware session focused on the qualities that transfer
// to the golf swing: thoracic + hip rotation, anti-rotation core control,
// posterior-chain power, single-leg stability, and shoulder/posture health.
//
// Unlike Routines A/B (which vary by day type), the golf routine is the same
// every day — it is a standalone option the user can switch to. It degrades
// gracefully: every slot has a bodyweight fallback, so it works with nothing
// but floor space.

const STR = { beginner: '3×8', intermediate: '3×10', advanced: '4×10' }

// Pick the first candidate whose equipment requirement is met.
// An empty/absent `req` means "always available" (bodyweight fallback).
function pickSlot(eq, candidates) {
  const c = candidates.find(o => !o.req || o.req.length === 0 || o.req.some(r => eq.has(r)))
  return c ? c.ex : null
}

export function buildGolfRoutine(equipment = [], fitnessLevel = 'intermediate') {
  const eq = new Set(equipment)
  const str = STR[fitnessLevel] || STR.intermediate

  const warmup = (eq.has('treadmill') || eq.has('bike') || eq.has('rower'))
    ? { id: 'golf_wu_machine', name: 'Cardio Warm-up', detail: '5 min easy', icon: '🚴', type: 'warmup', hasWeight: false, cue: 'Raise core temperature before rotating under load.', yt: 'cardio warm up' }
    : { id: 'golf_wu_bw', name: 'Dynamic Warm-up', detail: '5 min', icon: '🤸', type: 'warmup', hasWeight: false, cue: 'Arm circles, trunk twists, leg swings — prime the rotators.', yt: 'golf dynamic warm up' }

  // Mobility — always bodyweight, the foundation of swing range of motion.
  const mobility = [
    { id: 'golf_open_books', name: 'Thoracic Rotations (Open Books)', detail: '2×10 each side', icon: '📖', type: 'mobility', hasWeight: false, cue: 'Lie on your side, open the top arm to the floor. Drives backswing turn.', yt: 'open book thoracic rotation' },
    { id: 'golf_9090', name: '90/90 Hip Switches', detail: '2×10 each side', icon: '🦵', type: 'mobility', hasWeight: false, cue: 'Rotate both hips side to side under control. Unlocks the hip turn.', yt: '90 90 hip mobility drill' },
    { id: 'golf_wgs', name: "World's Greatest Stretch", detail: '2×5 each side', icon: '🤸', type: 'mobility', hasWeight: false, cue: 'Lunge, plant the hand, rotate and reach. Full-body rotational prep.', yt: "world's greatest stretch" },
    { id: 'golf_wrist', name: 'Wrist & Forearm Mobility', detail: '1–2 min', icon: '✋', type: 'mobility', hasWeight: false, cue: 'Circles plus flexor/extensor stretch. Protects the lead wrist.', yt: 'wrist mobility golf' },
  ]

  // Rotational power + anti-rotation core — the engine of the swing.
  const chop = pickSlot(eq, [
    { req: ['cable_machine'], ex: { id: 'golf_cable_chop', name: 'Cable Woodchop', detail: '3×12 each side', icon: '🪓', type: 'core', hasWeight: true, cue: 'Rotate from the core, not the arms. High-to-low, mirror both sides.', yt: 'cable woodchop' } },
    { req: ['resistance_bands'], ex: { id: 'golf_band_chop', name: 'Band Woodchop', detail: '3×12 each side', icon: '🌀', type: 'core', hasWeight: true, cue: 'Anchor high, pull across and down. Hips lead the rotation.', yt: 'resistance band woodchop' } },
    { req: [], ex: { id: 'golf_russian_twist', name: 'Russian Twist', detail: '3×16 each side', icon: '🔄', type: 'core', hasWeight: false, cue: 'Rotate the shoulders, keep the chest tall. Slow and controlled.', yt: 'russian twist form' } },
  ])

  const pallof = pickSlot(eq, [
    { req: ['cable_machine'], ex: { id: 'golf_cable_pallof', name: 'Pallof Press', detail: '3×10s hold each side', icon: '🎯', type: 'core', hasWeight: true, cue: 'Resist the rotation. Press straight out, brace hard — anti-rotation strength.', yt: 'pallof press' } },
    { req: ['resistance_bands'], ex: { id: 'golf_band_pallof', name: 'Band Pallof Press', detail: '3×10s hold each side', icon: '🎯', type: 'core', hasWeight: true, cue: 'Anchor at chest height, press out and resist being pulled in.', yt: 'band pallof press' } },
    { req: [], ex: { id: 'golf_bird_dog', name: 'Bird Dog', detail: '3×10 each side', icon: '🐦', type: 'core', hasWeight: false, cue: 'Extend opposite arm and leg, keep hips square. Anti-rotation control.', yt: 'bird dog exercise' } },
  ])

  // Posterior chain — power comes from the ground up through the hips.
  const hinge = pickSlot(eq, [
    { req: ['barbell', 'dumbbells'], ex: { id: 'golf_rdl', name: 'Romanian Deadlift', detail: str, icon: '🔻', type: 'strength', hasWeight: true, cue: 'Hinge at the hips, push them back, feel the hamstring stretch.', yt: 'romanian deadlift form' } },
    { req: ['kettlebells'], ex: { id: 'golf_kb_swing', name: 'Kettlebell Swing', detail: '3×15', icon: '🏺', type: 'strength', hasWeight: true, cue: 'Explosive hip snap — the bell floats, hips drive it. Mirrors swing power.', yt: 'kettlebell swing how to' } },
    { req: [], ex: { id: 'golf_glute_bridge', name: 'Glute Bridge', detail: '3×15', icon: '⬆️', type: 'strength', hasWeight: false, cue: 'Drive through the heels, squeeze glutes hard at the top.', yt: 'glute bridge form' } },
  ])

  const singleLeg = pickSlot(eq, [
    { req: ['dumbbells', 'kettlebells'], ex: { id: 'golf_reverse_lunge', name: 'Reverse Lunge (loaded)', detail: '3×10 each leg', icon: '👣', type: 'strength', hasWeight: true, cue: 'Step back, drop straight down. Builds the single-leg stability you load into at impact.', yt: 'dumbbell reverse lunge' } },
    { req: [], ex: { id: 'golf_bw_lunge', name: 'Reverse Lunge', detail: '3×12 each leg', icon: '👣', type: 'strength', hasWeight: false, cue: 'Controlled step back, front shin vertical. Balance over speed.', yt: 'reverse lunge bodyweight' } },
  ])

  // Posture & shoulder health — keep the upper back resilient.
  const posture = pickSlot(eq, [
    { req: ['cable_machine'], ex: { id: 'golf_cable_facepull', name: 'Cable Face Pull', detail: '3×15', icon: '🎯', type: 'strength', hasWeight: true, cue: 'Rope to face, elbows out and back. Balances all that rotation.', yt: 'cable face pull' } },
    { req: ['resistance_bands'], ex: { id: 'golf_band_pullapart', name: 'Band Pull-Apart', detail: '3×15', icon: '🌀', type: 'strength', hasWeight: false, cue: 'Arms straight, pull the band apart, squeeze the shoulder blades.', yt: 'band pull apart' } },
    { req: [], ex: { id: 'golf_wall_angel', name: 'Wall Angels', detail: '3×12', icon: '😇', type: 'strength', hasWeight: false, cue: 'Back flat to wall, slide arms up and down. Opens the upper back.', yt: 'wall angels exercise' } },
  ])

  const cooldown = [
    { id: 'golf_cool_stretch', name: 'Hip & T-Spine Stretch', detail: '5–8 min', icon: '🧎', type: 'cooldown', hasWeight: false, cue: 'Hip flexors, glutes, thoracic openers. Hold 30–45s each.', yt: 'golf flexibility stretches' },
    { id: 'golf_cool_breath', name: 'Breathing Down-regulation', detail: '3–5 min', icon: '🧘', type: 'cooldown', hasWeight: false, cue: 'Slow nasal breathing. Calm the nervous system for steady tempo.', yt: 'breathing exercise relaxation' },
  ]

  return [warmup, ...mobility, chop, pallof, hinge, singleLeg, posture, ...cooldown].filter(Boolean)
}
