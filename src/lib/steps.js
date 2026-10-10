// Daily step tracking. Manual entry wins; Apple Health import is the fallback.

export const STEPS_FLOOR = 8500
export const STEPS_TARGET = 10000

export function stepsFor(state, dateKey) {
  const manual = state.stepsLog?.[dateKey]
  if (manual != null && manual > 0) return manual
  const imported = state.healthData?.[dateKey]?.steps
  return imported != null && imported > 0 ? Math.round(imported) : null
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
