// Web Push client helpers. Subscriptions are stored in public.push_subscriptions
// and the schedule in public.reminder_prefs; the send-reminders edge function
// does the actual delivery on a cron.

import { supabase } from './supabase.js'

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const VAPID_CACHE_KEY = 'gymiqVapidPublicKey'

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
}

export function permissionState() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York' } catch { return 'America/New_York' }
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Public key comes from the edge function (it generated the pair on first run).
export async function getVapidPublicKey() {
  const cached = localStorage.getItem(VAPID_CACHE_KEY)
  if (cached) return cached
  const res = await fetch(`${FN_BASE}/send-reminders?vapid=1`)
  if (!res.ok) throw new Error('Reminder service not deployed yet')
  const { publicKey } = await res.json()
  if (!publicKey) throw new Error('No VAPID key returned')
  localStorage.setItem(VAPID_CACHE_KEY, publicKey)
  return publicKey
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function subscribePush(userId) {
  if (!pushSupported()) throw new Error('Push not supported in this browser')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were not allowed')
  const reg = await navigator.serviceWorker.ready
  const key = await getVapidPublicKey()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return sub
}

export async function unsubscribePush() {
  const sub = await getCurrentSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function loadPrefs(userId) {
  const { data } = await supabase.from('reminder_prefs').select('*').eq('user_id', userId).maybeSingle()
  return data
}

export async function savePrefs(userId, prefs) {
  const row = { user_id: userId, tz: deviceTimeZone(), updated_at: new Date().toISOString(), ...prefs }
  const { data, error } = await supabase.from('reminder_prefs').upsert(row, { onConflict: 'user_id' }).select().maybeSingle()
  if (error) throw error
  return data
}

// kind: 'test' | 'morning' | 'evening'
export async function sendTestPush(kind = 'test') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  const res = await fetch(`${FN_BASE}/send-reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ test: true, kind }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}
