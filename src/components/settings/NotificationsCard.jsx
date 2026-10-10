import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import {
  pushSupported, isIOS, isStandalone, permissionState, deviceTimeZone,
  getCurrentSubscription, subscribePush, unsubscribePush, loadPrefs, savePrefs, sendTestPush,
} from '../../lib/push.js'

const DEFAULT_PREFS = { morning_enabled: true, morning_time: '07:00', evening_enabled: true, evening_time: '20:00' }

export default function NotificationsCard() {
  const { user } = useAuth()
  const [subscribed, setSubscribed] = useState(false)
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const supported = pushSupported()
  const needsInstall = isIOS() && !isStandalone()
  const perm = permissionState()

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      try {
        const [sub, p] = await Promise.all([getCurrentSubscription().catch(() => null), loadPrefs(user.id)])
        if (!alive) return
        setSubscribed(!!sub)
        if (p) setPrefs({ morning_enabled: p.morning_enabled, morning_time: p.morning_time.slice(0, 5), evening_enabled: p.evening_enabled, evening_time: p.evening_time.slice(0, 5) })
      } catch { /* offline — leave defaults */ }
    })()
    return () => { alive = false }
  }, [user?.id])

  async function enable() {
    setBusy(true); setMsg(null)
    try {
      await subscribePush(user.id)
      await savePrefs(user.id, prefs)
      setSubscribed(true)
      setMsg({ ok: true, text: '✅ On. Morning + night reminders will arrive on this device.' })
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || e}` })
    }
    setBusy(false)
  }

  async function disable() {
    setBusy(true); setMsg(null)
    try {
      await unsubscribePush()
      setSubscribed(false)
      setMsg({ ok: true, text: 'Notifications off for this device.' })
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || e}` })
    }
    setBusy(false)
  }

  async function updatePrefs(patch) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    if (!user?.id) return
    try { await savePrefs(user.id, next) } catch (e) { setMsg({ ok: false, text: `❌ ${e.message || e}` }) }
  }

  async function test(kind) {
    setBusy(true); setMsg(null)
    try {
      const r = await sendTestPush(kind)
      setMsg({ ok: true, text: r.sent ? `📨 Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}` : 'No subscribed devices found — enable first.' })
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || e}` })
    }
    setBusy(false)
  }

  return (
    <div className="card">
      <p className="card-title">🔔 Reminders</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.45 }}>
        A morning push with today's session and a motivational line (plus your creatine nudge),
        and a night push that checks your live step count and tells you how long a walk gets you to 10k
        (plus magnesium). Times are local — {deviceTimeZone()}.
      </p>

      {!supported && (
        <Note tone="warn">This browser can't receive push notifications.</Note>
      )}
      {supported && needsInstall && (
        <Note tone="warn">On iPhone, notifications only work once GymIQ is on your Home Screen: Share → <b>Add to Home Screen</b>, then open it from there and come back here.</Note>
      )}
      {supported && perm === 'denied' && (
        <Note tone="danger">Notifications are blocked for this site. Allow them in iOS Settings → Notifications → GymIQ (or your browser's site settings), then try again.</Note>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <TimeRow
          emoji="☀️" label="Morning workout + creatine"
          enabled={prefs.morning_enabled} time={prefs.morning_time}
          onToggle={() => updatePrefs({ morning_enabled: !prefs.morning_enabled })}
          onTime={t => updatePrefs({ morning_time: t })}
        />
        <TimeRow
          emoji="🌙" label="Night walk + magnesium"
          enabled={prefs.evening_enabled} time={prefs.evening_time}
          onToggle={() => updatePrefs({ evening_enabled: !prefs.evening_enabled })}
          onTime={t => updatePrefs({ evening_time: t })}
        />
      </div>

      {subscribed ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="secondary" onClick={() => test('morning')} disabled={busy} style={{ flex: 1 }}>Test morning</button>
          <button className="secondary" onClick={() => test('evening')} disabled={busy} style={{ flex: 1 }}>Test night</button>
          <button className="danger sm" onClick={disable} disabled={busy} style={{ width: '100%' }}>Turn off on this device</button>
        </div>
      ) : (
        <button onClick={enable} disabled={busy || !supported || needsInstall || perm === 'denied'} style={{ width: '100%', padding: 12 }}>
          {busy ? '…' : 'Turn on reminders on this device'}
        </button>
      )}

      {msg && (
        <p style={{ fontSize: 13, marginTop: 10, fontFamily: 'var(--font-mono)', color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>{msg.text}</p>
      )}
    </div>
  )
}

function TimeRow({ emoji, label, enabled, time, onToggle, onTime }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <button
        type="button" onClick={onToggle} aria-pressed={enabled}
        style={{
          width: 40, height: 24, borderRadius: 100, padding: 2, flexShrink: 0,
          background: enabled ? 'var(--accent)' : 'var(--border)', position: 'relative',
        }}
      >
        <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: enabled ? 'translateX(16px)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 14, opacity: enabled ? 1 : 0.6 }}>{label}</span>
      <input
        type="time" value={time} onChange={e => onTime(e.target.value)} disabled={!enabled}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 14, padding: '4px 6px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
      />
    </div>
  )
}

function Note({ tone, children }) {
  const color = tone === 'danger' ? 'var(--danger)' : 'var(--warn)'
  return (
    <p style={{ fontSize: 13, lineHeight: 1.45, color, background: 'var(--surface2)', border: `1px solid ${color}55`, borderRadius: 10, padding: '8px 10px', marginBottom: 10 }}>
      {children}
    </p>
  )
}
