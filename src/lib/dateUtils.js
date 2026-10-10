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

// Parse 'YYYY-MM-DD' as a local Date (new Date(str) would parse as UTC).
export function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Monday-based week: the Monday on/before `ref` (default today).
export function mondayOf(ref) {
  const d = ref || new Date()
  const back = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back)
}

// Seven local-date strings Mon..Sun for the week containing `ref`.
export function mondayWeekDates(ref) {
  const mon = mondayOf(ref)
  return Array.from({ length: 7 }, (_, i) =>
    localDateStr(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)))
}

// Add n days to a 'YYYY-MM-DD' string.
export function addDays(str, n) {
  const d = parseLocalDate(str)
  return localDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

// Whole days from a to b (both 'YYYY-MM-DD'): b − a.
export function daysBetween(a, b) {
  return Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86400000)
}

// "week_<n>" key — used for marking weekly-challenge bonus awards once per week.
export function currentWeekKey() {
  return 'week_' + Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}
