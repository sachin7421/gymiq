// Reminder notices — the text of push notifications the user has received.
//
// iOS dismisses a notification the moment it's tapped and the app opens, so
// the body is easy to miss. The service worker appends the notification's
// title/body to the URL it opens (?notice=...), and when the app is already
// open it posts the same payload via postMessage. Both land here, get stored
// in localStorage (last 20), and are shown in a banner + Settings list.

const KEY = 'gymiqNotices'
const MAX = 20

export function loadNotices() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function saveNotice(n) {
  if (!n || (!n.title && !n.body)) return loadNotices()
  const list = loadNotices().filter(x => !(x.ts === n.ts && x.title === n.title))
  list.unshift({ title: n.title || 'GymIQ', body: n.body || '', ts: n.ts || Date.now(), tag: n.tag || null })
  const trimmed = list.slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch { /* storage full/private */ }
  return trimmed
}

export function clearNotices() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Pull ?notice=<json> off the current URL (and strip it so a reload doesn't
// re-show it). Returns the notice or null.
export function takeNoticeFromUrl() {
  try {
    const u = new URL(window.location.href)
    const raw = u.searchParams.get('notice')
    if (!raw) return null
    u.searchParams.delete('notice')
    window.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash)
    const n = JSON.parse(raw)
    return n && typeof n === 'object' ? n : null
  } catch { return null }
}

export function formatNoticeTime(ts) {
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? `Today ${time}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
}
