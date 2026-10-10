import { useEffect, useRef, useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { EGOSCUE_BACK, buildSteps, totalSeconds, fmtDuration, fmtClock } from '../../lib/egoscue.js'

const STEPS = buildSteps(EGOSCUE_BACK)
const TOTAL = totalSeconds(EGOSCUE_BACK)

// Guided "Back / Egoscue" sequence. Timed steps count down from a timestamp
// (survives tab throttling), vibrate at zero and auto-advance. Rep-based
// steps wait for a manual Done tap. Finishing the last step checks the
// `egoscue` habit for today.
export default function EgoscueMenu() {
  const { state, setState } = useUserDataContext()
  const doneToday = !!state.habits?.egoscue
  const [running, setRunning] = useState(false)

  function setHabit(on) {
    setState(prev => ({ ...prev, habits: { ...(prev.habits || {}), egoscue: on } }))
  }

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--accent3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <p className="card-title" style={{ marginBottom: 0, flex: 1 }}>Rehab · {EGOSCUE_BACK.name}</p>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>~{Math.round(TOTAL / 60)} min + 60 squeezes</span>
      </div>

      {running ? (
        <GuidedSession
          onExit={() => setRunning(false)}
          onComplete={() => { setHabit(true); setRunning(false) }}
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {EGOSCUE_BACK.exercises.map((ex, i) => (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', width: 16 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{fmtDuration(ex)}</p>
                </div>
                <a href={ex.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent3)', textDecoration: 'none', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>e-cise ↗</a>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRunning(true)} style={{ flex: 1, padding: 12, fontSize: 14, background: 'var(--accent3)' }}>▶ Start guided</button>
            <button
              type="button"
              onClick={() => setHabit(!doneToday)}
              className={doneToday ? '' : 'secondary'}
              style={{ flex: 1, padding: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                border: `2px solid ${doneToday ? '#fff' : 'var(--border)'}`,
                background: doneToday ? 'transparent' : 'var(--surface)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>{doneToday ? '✓' : ''}</span>
              {doneToday ? 'Done today' : 'Mark done'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Session state is one object so moving between steps resets the timer
// atomically (no effect needed): { idx, endsAt (ms epoch | null), pausedLeft (ms | null) }
function sessionFor(i) {
  const st = STEPS[i]
  return { idx: i, endsAt: st.seconds ? Date.now() + st.seconds * 1000 : null, pausedLeft: null }
}

function GuidedSession({ onExit, onComplete }) {
  const [sess, setSess] = useState(() => sessionFor(0))
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)
  const wakeRef = useRef(null)

  const { idx, endsAt, pausedLeft } = sess
  const step = STEPS[idx]
  const timed = !!step?.seconds
  const remainingMs = pausedLeft != null ? pausedLeft : endsAt ? Math.max(0, endsAt - now) : 0
  const paused = pausedLeft != null

  function goTo(i) {
    firedRef.current = false
    setSess(sessionFor(i))
    setNow(Date.now())
  }

  // Tick while a timed step is running.
  useEffect(() => {
    if (!endsAt || paused) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt, paused])

  // Auto-advance at zero.
  useEffect(() => {
    if (!timed || paused || !endsAt) return
    if (remainingMs === 0 && !firedRef.current) {
      firedRef.current = true
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      const t = setTimeout(() => advance(), 400)
      return () => clearTimeout(t)
    }
  })

  // Keep the screen on during the session (Static Back is 5 minutes).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (navigator.wakeLock) {
          const lock = await navigator.wakeLock.request('screen')
          if (cancelled) lock.release()
          else wakeRef.current = lock
        }
      } catch { /* not supported or denied — fine */ }
    })()
    return () => {
      cancelled = true
      wakeRef.current?.release?.()
      wakeRef.current = null
    }
  }, [])

  function advance() {
    if (idx >= STEPS.length - 1) onComplete()
    else goTo(idx + 1)
  }
  function back() { if (idx > 0) goTo(idx - 1) }
  function togglePause() {
    if (!timed) return
    if (paused) {
      setSess(s => ({ ...s, endsAt: Date.now() + s.pausedLeft, pausedLeft: null }))
      setNow(Date.now())
    } else {
      setSess(s => ({ ...s, pausedLeft: remainingMs }))
    }
  }

  const pct = timed ? 100 - (remainingMs / (step.seconds * 1000)) * 100 : 0

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        Step {idx + 1} of {STEPS.length}{step.side ? ` · ${step.side} side` : ''}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.05, marginBottom: 6 }}>{step.name}</p>
      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12 }}>{step.cue}</p>

      <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
        {timed ? (
          <>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 72, lineHeight: 1, color: remainingMs === 0 ? 'var(--success)' : paused ? 'var(--warn)' : 'var(--accent3)' }}>
              {fmtClock(remainingMs / 1000)}
            </p>
            <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 10 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent3)', transition: 'width 0.25s linear' }} />
            </div>
          </>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 72, lineHeight: 1, color: 'var(--accent3)' }}>×{step.reps}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Count them out, then tap Done.</p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="secondary" onClick={back} disabled={idx === 0} style={{ width: 56, padding: 0, fontSize: 18 }}>‹</button>
        {timed ? (
          <button onClick={togglePause} className={paused ? '' : 'secondary'} style={{ flex: 1, padding: 12, fontSize: 14 }}>
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
        ) : (
          <button onClick={advance} style={{ flex: 1, padding: 12, fontSize: 14, background: 'var(--accent3)' }}>✓ Done — next</button>
        )}
        <button className="secondary" onClick={advance} style={{ width: 56, padding: 0, fontSize: 18 }} aria-label="Skip">›</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={step.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent3)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>e-cise page ↗</a>
        <button className="secondary sm" onClick={onExit}>End session</button>
      </div>
    </div>
  )
}
