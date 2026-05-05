import { useMemo, useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { useOura } from '../../hooks/useOura.js'
import { useRestTimer } from '../../hooks/useRestTimer.js'
import { addSet, removeSet, getSets } from '../../lib/setLog.js'
import { suggestNextWeight } from '../../lib/prescription.js'
import { setE1RM, isPRDate } from '../../lib/strength.js'
import { summarizePlates } from '../../lib/plateCalc.js'

const REST_DEFAULTS = {
  strength: 120,
  cardio: 60,
  core: 45,
  warmup: 0,
  cooldown: 0,
}

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

export default function SetLogger({ exercise, dateKey, isReadOnly }) {
  const { state, setState } = useUserDataContext()
  const { data: oura } = useOura(state.ouraToken, !!state.hasOura)
  const restTimer = useRestTimer()

  const sets = getSets(state, dateKey, exercise.id)
  const hasWeight = exercise.hasWeight
  const isStrength = exercise.type === 'strength'

  const suggestion = useMemo(
    () => hasWeight
      ? suggestNextWeight({
          state,
          exerciseId: exercise.id,
          exerciseDetail: exercise.detail,
          todayKey: dateKey,
          readinessScore: oura?.readinessScore,
        })
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise.id, dateKey, oura?.readinessScore, sets.length],
  )

  // Inputs default to suggestion (or last logged set today) for fast entry.
  // Lazy init runs once per mount; parent already keys on exercise.id so the
  // component remounts when the user navigates between exercises.
  const lastToday = sets[sets.length - 1]
  const [weight, setWeight] = useState(() =>
    lastToday?.weight ? String(lastToday.weight)
    : suggestion?.weight != null ? String(suggestion.weight)
    : ''
  )
  const [reps, setReps] = useState(() => lastToday?.reps ? String(lastToday.reps) : '')
  const [rpe, setRpe] = useState(() => lastToday?.rpe ? String(lastToday.rpe) : '')

  function logSet() {
    const w = hasWeight ? parseFloat(weight) : 0
    const r = parseInt(reps, 10)
    const rp = rpe ? parseFloat(rpe) : null
    if (hasWeight && (!w || w < 0)) return
    if (!r || r <= 0) return

    setState(prev => addSet(prev, dateKey, exercise.id, { weight: w || 0, reps: r, rpe: rp }))

    // Auto-start rest timer for strength sets
    const restSec = REST_DEFAULTS[exercise.type] ?? 0
    if (restSec > 0) restTimer.start(restSec)

    // Subtle haptic on save
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30)
  }

  function deleteSet(i) {
    setState(prev => removeSet(prev, dateKey, exercise.id, i))
  }

  if (isReadOnly && sets.length === 0) return null

  const totalE1rm = sets.reduce((m, s) => Math.max(m, setE1RM(s)), 0)
  const isPR = sets.length > 0 && isPRDate(state, exercise.id, dateKey)

  return (
    <div style={{ padding: '0 14px 12px' }}>
      {/* Suggestion banner */}
      {hasWeight && !isReadOnly && suggestion?.weight != null && sets.length === 0 && (
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--accent)',
          borderRadius: 8,
          padding: '8px 10px',
          marginBottom: 10,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
            <strong>Suggested:</strong> {suggestion.weight} lbs
            {suggestion.delta !== 0 && (
              <span style={{
                marginLeft: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: suggestion.delta > 0 ? 'var(--accent)' : 'var(--accent2)',
              }}>
                ({suggestion.delta > 0 ? '+' : ''}{suggestion.delta})
              </span>
            )}
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
            {suggestion.reason}
          </p>
        </div>
      )}

      {hasWeight && !isReadOnly && suggestion?.tier === 'deload' && (
        <div style={{
          background: '#fff3e6',
          border: '1px solid var(--warn)',
          borderRadius: 8,
          padding: '6px 10px',
          marginBottom: 8,
          fontSize: 11,
          color: 'var(--text2)',
        }}>
          ⚠ Low recovery — consider a deload session.
        </div>
      )}

      {/* Logged sets */}
      {sets.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {sets.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', marginBottom: 4,
              background: 'var(--surface)', borderRadius: 8,
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--muted)', width: 22 }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text)' }}>
                {hasWeight ? `${s.weight} lbs × ` : ''}{s.reps} reps
                {s.rpe ? <span style={{ color: 'var(--muted)' }}> @ RPE {s.rpe}</span> : null}
              </span>
              {hasWeight && (
                <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                  e1RM {Math.round(setE1RM(s))}
                </span>
              )}
              {!isReadOnly && (
                <button
                  onClick={() => deleteSet(i)}
                  className="secondary sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  aria-label="Remove set"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {totalE1rm > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
              Best e1RM today: <strong style={{ color: 'var(--text)' }}>{Math.round(totalE1rm)}</strong>
              {isPR && (
                <span style={{ color: 'var(--accent2)', marginLeft: 6, fontWeight: 600 }}>🏆 NEW PR</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Entry row */}
      {!isReadOnly && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {hasWeight && (
            <input
              type="number"
              inputMode="decimal"
              step="2.5"
              placeholder="lbs"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              style={{ flex: '0 0 80px', padding: '8px 10px', fontSize: 13 }}
            />
          )}
          <input
            type="number"
            inputMode="numeric"
            step="1"
            placeholder="reps"
            value={reps}
            onChange={e => setReps(e.target.value)}
            style={{ flex: '0 0 70px', padding: '8px 10px', fontSize: 13 }}
          />
          {isStrength && (
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="1"
              max="10"
              placeholder="RPE"
              value={rpe}
              onChange={e => setRpe(e.target.value)}
              style={{ flex: '0 0 70px', padding: '8px 10px', fontSize: 13 }}
              title="Rate of perceived exertion (1-10)"
            />
          )}
          <button
            type="button"
            onClick={logSet}
            className="orange sm"
            style={{ padding: '8px 14px', flex: 1, minWidth: 90 }}
          >
            + Log set
          </button>
        </div>
      )}

      {/* Plate calc */}
      {hasWeight && !isReadOnly && weight && parseFloat(weight) > 45 && (
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          Per side: {summarizePlates(parseFloat(weight))}
        </p>
      )}

      {/* Rest timer */}
      {restTimer.running && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>
            ⏱ {fmtTime(restTimer.secondsLeft)}
          </span>
          <button onClick={() => restTimer.adjust(-15)} className="secondary sm" style={{ padding: '4px 10px' }}>-15</button>
          <button onClick={() => restTimer.adjust(15)} className="secondary sm" style={{ padding: '4px 10px' }}>+15</button>
          <button onClick={restTimer.stop} className="secondary sm" style={{ padding: '4px 10px' }}>skip</button>
        </div>
      )}
      {restTimer.finished && (
        <div style={{
          marginTop: 10,
          padding: '6px 12px',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          borderRadius: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>✓ Rest complete</span>
          <button onClick={restTimer.stop} className="secondary sm" style={{ padding: '2px 10px' }}>dismiss</button>
        </div>
      )}
    </div>
  )
}
