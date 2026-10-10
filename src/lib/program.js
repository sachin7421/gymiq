// Current training program window and its checkpoints.
// Dates are local 'YYYY-MM-DD' strings. Checkpoints with a `windowEnd` are
// shown as a date range; otherwise they are a single-day milestone.

import { daysBetween, todayStr } from './dateUtils.js'

export const PROGRAM = {
  name: 'Fall 2026 block',
  start: '2026-10-04',
  end: '2027-01-02',
  checkpoints: [
    { id: 'skin', icon: '🪞', label: 'Skin verdict', when: 'Early November', date: '2026-11-01', windowEnd: '2026-11-07' },
    { id: 'bloodwork', icon: '🩸', label: 'Bloodwork — ALT + vitamin D', when: 'Mid-to-late November', date: '2026-11-15', windowEnd: '2026-11-30' },
    { id: 'scorecard', icon: '🏁', label: 'Full scorecard', when: 'Jan 2', date: '2027-01-02' },
  ],
}

export const PROGRAM_TOTAL_DAYS = daysBetween(PROGRAM.start, PROGRAM.end) + 1

// 1-based day of program for `date` (default today). Clamped to [0, total].
export function programDay(date = todayStr()) {
  const d = daysBetween(PROGRAM.start, date) + 1
  return Math.max(0, Math.min(PROGRAM_TOTAL_DAYS, d))
}

export function programActive(date = todayStr()) {
  return date >= PROGRAM.start && date <= PROGRAM.end
}

// 'past' | 'now' | 'upcoming' for a checkpoint relative to `date`.
export function checkpointStatus(cp, date = todayStr()) {
  const end = cp.windowEnd || cp.date
  if (date > end) return 'past'
  if (date >= cp.date) return 'now'
  return 'upcoming'
}

export function daysUntil(dateStr, from = todayStr()) {
  return daysBetween(from, dateStr)
}

export function fmtShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
