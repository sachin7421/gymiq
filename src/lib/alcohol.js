// Weekly drinking-cap model.
//
// A "drinking day" is any day with at least one drink, logged with one tap
// into state.drinkDays[dateKey] = true. Weeks run Monday→Sunday. A week is a
// win when its drinking-day count is at or under the cap.
//
// The long-run metric is alcohol-free % of days since the program start,
// tracked against a goal line through the program end date.

import { addDays, daysBetween, mondayWeekDates, parseLocalDate, todayStr } from './dateUtils.js'
import { PROGRAM } from './program.js'

export const DRINK_CAP = 2            // drinking days allowed per week
export const AF_GOAL_PCT = 85         // alcohol-free % target
export const AF_START = PROGRAM.start // '2026-10-04'
export const AF_TARGET_DATE = PROGRAM.end // '2027-01-02'

export function isDrinkDay(state, dateKey) {
  return !!state.drinkDays?.[dateKey]
}

// Mon..Sun date keys for the week containing `date` (default today).
export function weekDates(date) {
  return mondayWeekDates(date ? parseLocalDate(date) : undefined)
}

// { dates, used, cap, remaining, over, win, complete }
export function weekStats(state, date = todayStr()) {
  const dates = weekDates(date)
  const used = dates.filter(d => isDrinkDay(state, d)).length
  const complete = dates[6] < todayStr()
  return {
    dates,
    used,
    cap: DRINK_CAP,
    remaining: Math.max(0, DRINK_CAP - used),
    over: used > DRINK_CAP,
    // A win is only final once the week has fully elapsed; in-progress weeks
    // are "on track" while used <= cap.
    win: used <= DRINK_CAP,
    complete,
  }
}

// Alcohol-free stats from AF_START through `today` inclusive.
// { elapsed, afDays, drinkDays, pct, goalPct, daysLeft }
export function afStats(state, today = todayStr()) {
  const end = today < AF_START ? AF_START : today
  const elapsed = daysBetween(AF_START, end) + 1
  let drink = 0
  for (let i = 0; i < elapsed; i++) {
    if (isDrinkDay(state, addDays(AF_START, i))) drink++
  }
  const afDays = elapsed - drink
  const pct = elapsed > 0 ? (afDays / elapsed) * 100 : 0
  return {
    elapsed,
    afDays,
    drinkDays: drink,
    pct,
    goalPct: AF_GOAL_PCT,
    daysLeft: Math.max(0, daysBetween(today, AF_TARGET_DATE)),
    onTrack: pct >= AF_GOAL_PCT,
  }
}

// Running AF% series, one point per day from AF_START to today (for a sparkline).
export function afSeries(state, today = todayStr()) {
  const end = today < AF_START ? AF_START : today
  const n = daysBetween(AF_START, end) + 1
  const out = []
  let drink = 0
  for (let i = 0; i < n; i++) {
    const d = addDays(AF_START, i)
    if (isDrinkDay(state, d)) drink++
    out.push({ date: d, pct: ((i + 1 - drink) / (i + 1)) * 100 })
  }
  return out
}

// Completed program weeks (Mon→Sun fully elapsed, starting the first Monday
// on/after AF_START) and how many were wins. { weeks, wins }
export function weekWins(state, today = todayStr()) {
  const monOfStart = mondayWeekDates(parseLocalDate(AF_START))[0]
  const first = monOfStart < AF_START ? addDays(monOfStart, 7) : monOfStart
  const weeks = []
  for (let mon = first; addDays(mon, 6) < today; mon = addDays(mon, 7)) {
    const dates = mondayWeekDates(parseLocalDate(mon))
    const used = dates.filter(d => isDrinkDay(state, d)).length
    weeks.push({ monday: mon, used, win: used <= DRINK_CAP })
  }
  return { weeks, wins: weeks.filter(w => w.win).length }
}

// Migrate legacy weekDrinks counts (>0) into drinkDays. Idempotent.
export function migrateWeekDrinks(state) {
  const src = state.weekDrinks || {}
  const dates = Object.keys(src).filter(d => (src[d] || 0) > 0 && !state.drinkDays?.[d])
  if (dates.length === 0) return state
  const drinkDays = { ...(state.drinkDays || {}) }
  dates.forEach(d => { drinkDays[d] = true })
  return { ...state, drinkDays }
}
