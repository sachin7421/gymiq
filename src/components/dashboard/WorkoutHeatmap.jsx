import { useMemo } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { totalVolume } from '../../lib/setLog.js'
import { localDateStr } from '../../lib/dateUtils.js'

// 12-week consistency heatmap. Each day is colored by training intensity:
//   no data → empty cell
//   completed habit OR any logged set → light
//   strength session (>5k lbs of volume) → medium
//   heavy session (>15k lbs) → dark
//
// Layout: weeks as columns (newest right), rows as Sun→Sat. Mirrors GitHub.

const WEEKS = 12

function buildGrid(state) {
  const today = new Date()
  // anchor on this week's Sunday
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  const weeks = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    const wkStart = new Date(sunday); wkStart.setDate(sunday.getDate() - w * 7)
    const days = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(wkStart); dt.setDate(wkStart.getDate() + d)
      const key = localDateStr(dt)
      const isFuture = dt > today
      const dayLog = state.setLog?.[key] || {}
      let volume = 0
      let setCount = 0
      for (const sets of Object.values(dayLog)) {
        volume += totalVolume(sets)
        setCount += sets.length
      }
      const habitDone = !!state.weeklyHabits?.[key]?.workout || !!state.completedWorkouts?.[key]
      let level = 0
      if (volume > 15000) level = 4
      else if (volume > 5000) level = 3
      else if (volume > 0 || setCount > 3) level = 2
      else if (habitDone) level = 1
      days.push({ key, level, volume, sets: setCount, isFuture })
    }
    weeks.push({ start: localDateStr(wkStart), days })
  }
  return weeks
}

const COLORS = [
  'var(--surface2)',                 // 0 — empty
  'var(--accent-light)',             // 1 — habit-only
  'rgba(42, 125, 79, 0.45)',         // 2 — light session
  'rgba(42, 125, 79, 0.75)',         // 3 — moderate
  'var(--accent)',                   // 4 — heavy
]

export default function WorkoutHeatmap() {
  const { state } = useUserDataContext()
  const weeks = useMemo(() => buildGrid(state), [state.setLog, state.weeklyHabits, state.completedWorkouts])

  const totalSessions = weeks.reduce(
    (s, w) => s + w.days.filter(d => d.level >= 2).length, 0
  )
  const longestStreak = useMemo(() => {
    let best = 0, cur = 0
    const flat = weeks.flatMap(w => w.days)
    for (const d of flat) {
      if (d.isFuture) continue
      if (d.level >= 1) {
        cur++
        if (cur > best) best = cur
      } else cur = 0
    }
    return best
  }, [weeks])

  if (totalSessions === 0 && longestStreak === 0) return null

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="card-title" style={{ marginBottom: 0 }}>📅 Consistency</p>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          last {WEEKS}w
        </span>
      </div>

      <div style={{ display: 'flex', gap: 3, overflow: 'hidden' }}>
        {weeks.map(w => (
          <div key={w.start} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {w.days.map(d => (
              <div
                key={d.key}
                title={`${d.key}${d.volume ? ` — ${Math.round(d.volume).toLocaleString()} lbs, ${d.sets} sets` : d.level === 1 ? ' — habit checked' : ''}`}
                style={{
                  aspectRatio: '1 / 1',
                  background: d.isFuture ? 'transparent' : COLORS[d.level],
                  border: d.isFuture ? '1px dashed var(--border)' : '1px solid var(--border)',
                  borderRadius: 3,
                  opacity: d.isFuture ? 0.3 : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--muted)' }}>{totalSessions} sessions</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
          less {COLORS.map((c, i) => (
            <span key={i} style={{ width: 9, height: 9, background: c, border: '1px solid var(--border)', borderRadius: 2, display: 'inline-block' }} />
          ))} more
        </span>
        <span style={{ color: 'var(--accent)' }}>🔥 {longestStreak}d streak</span>
      </div>
    </div>
  )
}
