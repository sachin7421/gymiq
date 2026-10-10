// Daily step tracking. Automatic source is Apple Health (via the iOS Shortcut
// → ingest-health → healthData[date].steps); manual entry is an override.
// Within a day the larger number wins: a later sync always has the fuller
// count, and a manual entry after the last sync captures the night walk.

export const STEPS_FLOOR = 8500
export const STEPS_TARGET = 10000

export function stepsFor(state, dateKey) {
  const manual = state.stepsLog?.[dateKey]
  const imported = state.healthData?.[dateKey]?.steps
  const m = manual != null && manual > 0 ? manual : null
  const a = imported != null && imported > 0 ? Math.round(imported) : null
  if (m == null && a == null) return null
  return Math.max(m ?? 0, a ?? 0)
}

// 'auto' (Apple Health sync), 'import' (manual export file), 'manual', or null
export function stepsSource(state, dateKey) {
  const manual = state.stepsLog?.[dateKey]
  const hd = state.healthData?.[dateKey]
  const a = hd?.steps != null && hd.steps > 0 ? hd.steps : null
  if (manual != null && manual > 0 && (a == null || manual >= a)) return 'manual'
  if (a != null) return hd.autoSynced ? 'auto' : 'import'
  return null
}

// 'none' | 'below' | 'between' | 'target'
export function stepsTier(n) {
  if (n == null) return 'none'
  if (n >= STEPS_TARGET) return 'target'
  if (n >= STEPS_FLOOR) return 'between'
  return 'below'
}

export const STEPS_TIER_STYLE = {
  none: { color: 'var(--muted)', bg: 'var(--surface2)', label: 'No entry' },
  below: { color: 'var(--danger)', bg: 'rgba(204,34,34,0.12)', label: 'Below floor' },
  between: { color: 'var(--warn)', bg: 'rgba(196,122,0,0.14)', label: 'Above floor' },
  target: { color: 'var(--success)', bg: 'rgba(26,122,58,0.14)', label: 'Target hit' },
}

// Minutes of easy walking (~100 steps/min) to reach the target from n.
export function minutesToTarget(n) {
  const gap = STEPS_TARGET - (n || 0)
  return gap <= 0 ? 0 : Math.max(5, Math.round(gap / 100))
}
