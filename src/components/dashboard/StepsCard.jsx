import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { todayStr, mondayWeekDates } from '../../lib/dateUtils.js'
import { stepsFor, stepsTier, stepsSource, minutesToTarget, STEPS_TIER_STYLE, STEPS_FLOOR, STEPS_TARGET } from '../../lib/steps.js'

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function StepsCard() {
  const { state, setState } = useUserDataContext()
  const [input, setInput] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const today = todayStr()
  const todaySteps = stepsFor(state, today)
  const source = stepsSource(state, today)
  const tier = stepsTier(todaySteps)
  const style = STEPS_TIER_STYLE[tier]
  const week = mondayWeekDates()
  const synced = state.healthData?.[today]?.autoSynced
  const syncedAt = synced ? new Date(synced) : null
  const hasAutoSetup = !!state.lastHealthSync

  function save(date, raw) {
    const val = parseInt(String(raw).replace(/[^\d]/g, ''), 10)
    if (isNaN(val) || val < 0 || val > 100000) return
    setState(prev => ({ ...prev, stepsLog: { ...(prev.stepsLog || {}), [date]: val } }))
  }

  function logToday() {
    save(today, input)
    setInput('')
    setManualOpen(false)
  }

  function editDay(date) {
    const cur = stepsFor(state, date) || 0
    const raw = window.prompt(`Steps on ${date}?`, cur ? String(cur) : '')
    if (raw === null) return
    save(date, raw)
  }

  const mins = minutesToTarget(todaySteps)
  const barPct = todaySteps == null ? 0 : Math.min(100, (todaySteps / STEPS_TARGET) * 100)
  const floorPct = (STEPS_FLOOR / STEPS_TARGET) * 100
  const evening = new Date().getHours() >= 17

  const sourceLabel =
    source === 'auto' ? `Apple Health · synced ${syncedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` :
    source === 'import' ? 'Apple Health export' :
    source === 'manual' ? 'manual entry' : null

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p className="card-title" style={{ flex: 1 }}>Steps</p>
        {sourceLabel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>{sourceLabel}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1, color: style.color }}>
          {todaySteps == null ? '—' : todaySteps.toLocaleString()}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {tier === 'target' ? 'target hit ✓' : tier === 'none' ? `floor ${STEPS_FLOOR.toLocaleString()} · target ${STEPS_TARGET.toLocaleString()}` : `${(STEPS_TARGET - todaySteps).toLocaleString()} to target`}
        </span>
      </div>

      <div style={{ position: 'relative', height: 10, background: 'var(--surface2)', borderRadius: 100, border: '1px solid var(--border)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: style.color, transition: 'width 0.5s' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${floorPct}%`, width: 2, background: 'var(--text)', opacity: 0.35 }} />
      </div>

      {/* Night-walk nudge: the thing to do right now */}
      {tier !== 'target' && todaySteps != null && (
        <p style={{ fontSize: 13, color: evening ? 'var(--accent2)' : 'var(--text2)', fontWeight: evening ? 600 : 400, marginBottom: 10 }}>
          🚶 {evening ? 'Night walk: ' : ''}~{mins} min easy walk gets you to {STEPS_TARGET.toLocaleString()}.
        </p>
      )}

      {!hasAutoSetup && (
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 10 }}>
          Steps can fill in automatically from Apple Health. <Link to="/settings" style={{ color: 'var(--accent3)' }}>Set up the 3-minute Shortcut →</Link>
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {week.map((date, i) => {
          const n = stepsFor(state, date)
          const t = stepsTier(n)
          const s = STEPS_TIER_STYLE[t]
          const isPast = date <= today
          const isToday = date === today
          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button
                type="button"
                onClick={() => isPast && editDay(date)}
                disabled={!isPast}
                aria-label={`${date}: ${n == null ? 'no steps logged' : `${n} steps, ${s.label}`}`}
                style={{
                  width: '100%', height: 40, padding: 0, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  background: s.bg, color: s.color,
                  border: `1.5px solid ${t === 'none' ? 'var(--border)' : s.color}`,
                  boxShadow: isToday ? '0 0 0 2px var(--accent3)' : 'none',
                  cursor: isPast ? 'pointer' : 'default',
                }}
              >
                {n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}
              </button>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{DAY_NAMES[i]}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
        <Legend color={STEPS_TIER_STYLE.below.color} label={`< ${STEPS_FLOOR.toLocaleString()}`} />
        <Legend color={STEPS_TIER_STYLE.between.color} label="floor" />
        <Legend color={STEPS_TIER_STYLE.target.color} label={`≥ ${STEPS_TARGET.toLocaleString()}`} />
        <button type="button" className="secondary sm" onClick={() => setManualOpen(o => !o)} style={{ marginLeft: 'auto', padding: '3px 8px', fontSize: 10 }}>
          {manualOpen ? 'close' : 'enter manually'}
        </button>
      </div>

      {manualOpen && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Today's steps"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logToday()}
          />
          <button onClick={logToday} style={{ flexShrink: 0 }}>Save</button>
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}
