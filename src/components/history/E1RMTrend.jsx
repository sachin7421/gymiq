import { useMemo, useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { iterExerciseHistory, getTopSet } from '../../lib/setLog.js'
import { setE1RM } from '../../lib/strength.js'
import { EX_DB } from '../../lib/exerciseDb.js'

// Per-exercise e1RM progression. Pure SVG so it stays cheap and visually
// matches the rest of the app (no recharts variance per chart).

const MIN_SESSIONS = 3   // hide exercises with too few data points
const W = 220
const H = 60
const PAD = 6

function trendFor(state, exerciseId) {
  const points = []
  for (const { dateKey, sets } of iterExerciseHistory(state, exerciseId)) {
    const top = getTopSet(sets)
    if (top?.weight && top?.reps) {
      points.push({ dateKey, e1rm: setE1RM(top), set: top })
    }
  }
  return points.reverse() // chronological
}

function fmtDate(k) {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Sparkline({ points }) {
  if (points.length < 2) return null
  const values = points.map(p => p.e1rm)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const xStep = (W - PAD * 2) / (points.length - 1)

  const path = points
    .map((p, i) => {
      const x = PAD + i * xStep
      const y = H - PAD - ((p.e1rm - min) / range) * (H - PAD * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const fill = path + ` L ${PAD + (points.length - 1) * xStep} ${H - PAD} L ${PAD} ${H - PAD} Z`

  const last = points[points.length - 1]
  const lastX = PAD + (points.length - 1) * xStep
  const lastY = H - PAD - ((last.e1rm - min) / range) * (H - PAD * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', flex: 1 }}>
      <path d={fill} fill="var(--accent-light)" />
      <path d={path} stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill="var(--accent)" />
    </svg>
  )
}

export default function E1RMTrend() {
  const { state } = useUserDataContext()
  const [expanded, setExpanded] = useState(false)

  const exerciseIds = useMemo(() => {
    const log = state.setLog || {}
    const ids = new Set()
    for (const day of Object.values(log)) {
      for (const id of Object.keys(day || {})) ids.add(id)
    }
    return Array.from(ids)
  }, [state.setLog])

  const trends = useMemo(() => {
    return exerciseIds
      .map(id => ({ id, points: trendFor(state, id) }))
      .filter(t => t.points.length >= MIN_SESSIONS)
      .map(t => {
        const first = t.points[0].e1rm
        const last = t.points[t.points.length - 1].e1rm
        return { ...t, delta: last - first, pct: ((last - first) / first) * 100, current: last }
      })
      .sort((a, b) => b.current - a.current)
  }, [state, exerciseIds])

  if (trends.length === 0) return null

  const visible = expanded ? trends : trends.slice(0, 5)

  return (
    <div className="card">
      <p className="card-title">📊 Strength Progression</p>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
        e1RM over time per lift. Logged with reps + RPE; estimated 1-rep max.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(t => {
          const ex = EX_DB[t.id]
          const first = t.points[0]
          const last = t.points[t.points.length - 1]
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>{ex?.icon || '🏋️'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex?.name || t.id}
                </p>
                <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {fmtDate(first.dateKey)} → {fmtDate(last.dateKey)} · {t.points.length} sessions
                </p>
              </div>
              <Sparkline points={t.points} />
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>
                  {Math.round(t.current)}
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: t.delta > 0 ? 'var(--accent)' : t.delta < 0 ? 'var(--accent2)' : 'var(--muted)',
                }}>
                  {t.delta > 0 ? '↑' : t.delta < 0 ? '↓' : '='} {Math.abs(t.pct).toFixed(0)}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {trends.length > 5 && (
        <button onClick={() => setExpanded(!expanded)} className="secondary sm" style={{ width: '100%', marginTop: 8 }}>
          {expanded ? `Show top 5` : `Show all ${trends.length}`}
        </button>
      )}
    </div>
  )
}
