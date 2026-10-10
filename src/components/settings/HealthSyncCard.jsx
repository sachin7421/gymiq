import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { getOrCreateIngestToken, rotateIngestToken, personalSyncUrl } from '../../lib/healthSync.js'
import { todayStr } from '../../lib/dateUtils.js'

// Automatic Apple Health → GymIQ via an iOS Shortcuts automation.
// The server handles the token, timezone and date, so the Shortcut is three
// actions: read today's steps, sum them, POST to the personal link.
export default function HealthSyncCard() {
  const { user } = useAuth()
  const { state } = useUserDataContext()
  const [token, setToken] = useState(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    getOrCreateIngestToken(user.id).then(setToken).catch(e => setMsg({ ok: false, text: e.message }))
  }, [user?.id])

  const todayAuto = state.healthData?.[todayStr()]
  const lastSync = state.lastHealthSync ? new Date(state.lastHealthSync) : null
  const link = token ? personalSyncUrl(token) : ''

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: `Copied ${label}` }) }
    catch { setMsg({ ok: false, text: 'Copy failed — long-press the link to select it instead' }) }
  }

  async function rotate() {
    if (!window.confirm('Make a new link? The Shortcut will stop working until you paste the new one.')) return
    try { setToken(await rotateIngestToken(user.id)); setMsg({ ok: true, text: 'New link ready — paste it into the Shortcut' }) }
    catch (e) { setMsg({ ok: false, text: e.message }) }
  }

  return (
    <div className="card">
      <p className="card-title">🍎 Apple Health auto-sync</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 10 }}>
        Web apps can't read Health, so a 3-action Shortcut sends your steps here every evening. Your private link
        already includes your token and timezone — nothing else to configure.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <Stat label="Last sync" value={lastSync ? lastSync.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never'} />
        <Stat label="Today's steps" value={todayAuto?.steps != null ? todayAuto.steps.toLocaleString() : '—'} />
      </div>

      <button onClick={() => link && copy(link, 'your sync link')} disabled={!token} style={{ width: '100%', marginBottom: 8 }}>
        📋 Copy my sync link
      </button>
      <button className="secondary" onClick={() => setOpen(o => !o)} style={{ width: '100%', marginBottom: open ? 10 : 0 }}>
        {open ? 'Hide steps' : 'Show the 3 steps'}
      </button>

      {open && (
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', margin: '4px 0 6px' }}>Build (Shortcuts app → + )</p>
          <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><b>Find Health Samples</b> — tap <i>Health Samples</i>, set Type to <b>Steps</b>. Tap <i>Add Filter</i> → <b>Start Date</b> → <b>is today</b>.</li>
            <li><b>Calculate Statistics</b> — leave it on <b>Sum</b>. It will pick up Health Samples automatically.</li>
            <li><b>Get Contents of URL</b> — paste your link into the URL. Tap the arrow ▸ to expand: Method <b>POST</b> · Request Body <b>JSON</b> · <i>Add new field</i> → <b>Number</b> · key <code>steps</code> · value: tap the field and pick the <b>Statistics</b> variable.</li>
          </ol>
          <p style={{ marginTop: 8 }}>Tap ▶ to run it once. Allow Health access when asked. "Today's steps" above fills in within seconds.</p>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', margin: '12px 0 6px' }}>Automate (Shortcuts → Automation tab → + )</p>
          <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><b>Time of Day</b> → <b>7:45 PM</b> · Daily · choose <b>Run Immediately</b> → Next.</li>
            <li>Pick your shortcut. Done. (Optional: a second one at <b>11:30 PM</b> catches the final count.)</li>
          </ol>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button className="secondary sm" onClick={rotate} disabled={!token}>Make a new link</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Treat the link like a password — anyone with it can post steps to your account.</span>
      </div>

      {msg && (
        <p style={{ fontSize: 13, marginTop: 10, fontFamily: 'var(--font-mono)', color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</p>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>{value}</p>
    </div>
  )
}
