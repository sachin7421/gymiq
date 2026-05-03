// Local-date helpers. Never use toISOString() — it shifts dates in non-UTC zones.

export function localDateStr(d) {
  const dt = d || new Date()
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr() {
  return localDateStr()
}

// dow: 0=Sunday … 6=Saturday. Returns the local-date string for that day of the current week.
export function getWeekDateStr(dow) {
  const now = new Date()
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const target = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + dow)
  return localDateStr(target)
}

export function daysSinceStart(startDate) {
  if (!startDate) return 1
  return Math.max(1, Math.round((new Date() - new Date(startDate)) / 86400000) + 1)
}

// "week_<n>" key — used for marking weekly-challenge bonus awards once per week.
export function currentWeekKey() {
  return 'week_' + Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}
