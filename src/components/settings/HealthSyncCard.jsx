import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { getOrCreateIngestToken, rotateIngestToken, INGEST_URL } from '../../lib/healthSync.js'
import { todayStr } from '../../lib/dateUtils.js'

// Automatic Apple Health → GymIQ via an iOS Shortcuts automation. Shows the
// personal token + endpoint and a step-by-step for building the Shortcut.
export default function HealthSyncCard() {
  const { user } = useAuth()
  const { state } = useUserDataContext()
  const [token, setToken] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    getOrCreateIngestToken(user.id).then(setToken).catch(e => setMsg({ ok: false, text: e.message }))
  }, [user?.id])

  const todayAuto = state.healthData?.[todayStr()]
  const lastSync = state.lastHealthSync ? new Date(state.lastHealthSync) : null

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: `Copied ${label}` }) }
    catch { setMsg({ ok: false, text: 'Copy failed — long-press to select instead' }) }
  }

  async function rotate() {
    if (!window.confirm('Rotate the token? Your existing Shortcut will stop working until you paste the new one.')) return
    try { setToken(await rotateIngestToken(user.id)); setMsg({ ok: true, text: 'New token generated' }) }
    catch (e) { setMsg({ ok: false, text: e.message }) }
  }

  const body = token ? `{"token":"${token}","date":"<Formatted Date>","steps":"<Steps>"}` : ''

  return (
    <div className="card">
      <p className="card-title">🍎 Apple Health auto-sync</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 10 }}>
        iPhone apps on the web can't read Health directly, so a tiny Shortcuts automation does it for you:
        twice a day it reads your step count from Health and posts it here. Steps then fill in automatically on
        the dashboard and the night-walk reminder uses the live number.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <Stat label="Last sync" value={lastSync ? lastSync.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never'} />
        <Stat label="Today's steps" value={todayAuto?.steps != null ? todayAuto.steps.toLocaleString() : '—'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input type="text" readOnly value={token ? (showToken ? token : '•'.repeat(24)) : 'generating…'} style={{ fontSize: 12 }} />
        <button className="secondary sm" onClick={() => setShowToken(s => !s)} style={{ flexShrink: 0 }}>{showToken ? 'Hide' : 'Show'}</button>
        <button className="secondary sm" onClick={() => token && copy(token, 'token')} style={{ flexShrink: 0 }}>Copy</button>
      </div>

      <button className="secondary" onClick={() => setOpen(o => !o)} style={{ width: '100%', marginBottom: open ? 10 : 0 }}>
        {open ? 'Hide setup steps' : 'Show Shortcut setup (one time, ~3 min)'}
      </button>

      {open && (
        <ol style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Open <b>Shortcuts</b> → <b>+</b> new shortcut. Name it <b>GymIQ Steps</b>.</li>
          <li>Add <b>Find Health Samples</b>: Type <b>Steps</b> · Start Date <b>is today</b> · Sort by Start Date · leave Limit off.</li>
          <li>Add <b>Calculate Statistics</b>: <b>Sum</b> of Health Samples.</li>
          <li>Add <b>Format Date</b>: Date <b>Current Date</b> · Format <b>Custom</b> · <code>yyyy-MM-dd</code>.</li>
          <li>Add <b>Get Contents of URL</b> and set:
            <ul style={{ paddingLeft: 16, marginTop: 4 }}>
              <li>URL → <button className="secondary sm" onClick={() => copy(INGEST_URL, 'URL')}>Copy URL</button></li>
              <li>Method <b>POST</b> · Request Body <b>JSON</b></li>
              <li>Field <code>token</code> → paste your token above</li>
              <li>Field <code>date</code> → the <b>Formatted Date</b> variable</li>
              <li>Field <code>steps</code> → the <b>Statistics</b> variable</li>
            </ul>
          </li>
          <li>Run it once — you should see <code>ok</code> and today's steps appear above within a few seconds.</li>
          <li><b>Automate it:</b> Shortcuts → <b>Automation</b> → <b>+</b> → <b>Time of Day</b> → pick <b>7:45 PM</b> daily → <b>Run Immediately</b> (turn off "Ask Before Running") → choose <b>GymIQ Steps</b>. Repeat for <b>11:30 PM</b> so the final count lands too.</li>
        </ol>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="secondary sm" onClick={() => copy(body, 'JSON template')} disabled={!token}>Copy JSON template</button>
        <button className="secondary sm" onClick={rotate} disabled={!token}>Rotate token</button>
      </div>

      {msg && (
        <p style={{ fontSize: 12, marginTop: 10, fontFamily: 'var(--font-mono)', color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</p>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>{value}</p>
    </div>
  )
}
