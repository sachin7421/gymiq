// Automatic Apple Health sync. An iOS Shortcuts automation posts daily
// totals to the ingest-health edge function; rows land in public.health_daily
// and get merged into state.healthData here so every card that already reads
// healthData (steps, readiness, brief) picks them up.

import { supabase } from './supabase.js'
import { addDays, todayStr } from './dateUtils.js'

export const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-health`

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function getOrCreateIngestToken(userId) {
  const { data } = await supabase.from('ingest_tokens').select('token').eq('user_id', userId).maybeSingle()
  if (data?.token) return data.token
  const token = randomToken()
  const { error } = await supabase.from('ingest_tokens').upsert({ user_id: userId, token }, { onConflict: 'user_id' })
  if (error) throw error
  return token
}

export async function rotateIngestToken(userId) {
  const token = randomToken()
  const { error } = await supabase.from('ingest_tokens').upsert({ user_id: userId, token }, { onConflict: 'user_id' })
  if (error) throw error
  return token
}

export async function fetchHealthDaily(userId, days = 35) {
  const since = addDays(todayStr(), -days)
  const { data, error } = await supabase
    .from('health_daily')
    .select('date, steps, active_calories, sleep_hours, resting_hr, hrv, updated_at')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

// Merge rows into healthData. Returns { next, changed, latest } where latest
// is the newest updated_at seen (used to skip no-op merges).
export function mergeHealthDaily(state, rows) {
  if (!rows.length) return { next: state, changed: false, latest: state.lastHealthSync || null }
  const healthData = { ...(state.healthData || {}) }
  let changed = false
  let latest = state.lastHealthSync || null
  for (const r of rows) {
    const cur = healthData[r.date] || {}
    const upd = { ...cur }
    if (r.steps != null && (cur.steps == null || r.steps > cur.steps || cur.autoSynced)) upd.steps = r.steps
    if (r.active_calories != null) upd.activeCalories = r.active_calories
    if (r.sleep_hours != null) upd.sleepHours = Number(r.sleep_hours)
    if (r.resting_hr != null) upd.restingHr = r.resting_hr
    if (r.hrv != null) upd.hrv = Number(r.hrv)
    upd.autoSynced = r.updated_at
    if (JSON.stringify(upd) !== JSON.stringify(cur)) { healthData[r.date] = upd; changed = true }
    if (!latest || r.updated_at > latest) latest = r.updated_at
  }
  if (!changed && latest === (state.lastHealthSync || null)) return { next: state, changed: false, latest }
  return { next: { ...state, healthData, lastHealthSync: latest }, changed: true, latest }
}

// Ready-to-paste JSON body for the Shortcut's "Get Contents of URL" action.
export function shortcutBodyExample(token) {
  return JSON.stringify({ token, date: 'YYYY-MM-DD', steps: 0 }, null, 2)
}
