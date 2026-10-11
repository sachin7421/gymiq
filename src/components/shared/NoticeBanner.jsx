import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { takeNoticeFromUrl, saveNotice, formatNoticeTime } from '../../lib/notices.js'

// Shows the text of the push notification that opened the app (iOS clears the
// notification on tap, so this is where you actually get to read it). Stays
// until dismissed. Also catches pushes that arrive while the app is open.
export default function NoticeBanner() {
  // Read the ?notice= param once, at mount, and persist it.
  const [notice, setNotice] = useState(() => {
    const n = takeNoticeFromUrl()
    if (!n) return null
    const withTs = { ...n, ts: n.ts || Date.now() }
    saveNotice(withTs)
    return withTs
  })
  const navigate = useNavigate()

  useEffect(() => {
    // Server payloads may carry a hash route (#/workouts); BrowserRouter
    // ignores hashes, so hop there ourselves.
    const h = window.location.hash
    if (/^#\/[a-z]/i.test(h)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      navigate(h.slice(1), { replace: true })
    }

    if (!('serviceWorker' in navigator)) return
    const onMsg = (e) => {
      if (e.data?.type !== 'gymiq-notice' || !e.data.notice) return
      const n = { ...e.data.notice, ts: e.data.notice.ts || Date.now() }
      saveNotice(n)
      setNotice(n)
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [navigate])

  if (!notice) return null
  return (
    <div
      role="status"
      style={{
        position: 'sticky', top: 8, zIndex: 50, margin: '8px 0 0',
        background: 'var(--surface)', border: '1.5px solid var(--accent)', borderRadius: 12,
        padding: '10px 12px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>
          Reminder · {formatNoticeTime(notice.ts)}
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: notice.body ? 4 : 0 }}>{notice.title}</p>
        {notice.body && <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.45 }}>{notice.body}</p>}
      </div>
      <button className="secondary sm" onClick={() => setNotice(null)} aria-label="Dismiss" style={{ flexShrink: 0 }}>Close</button>
    </div>
  )
}
