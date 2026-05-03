import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import ExerciseItem from '../components/workouts/ExerciseItem.jsx'
import { localDateStr } from '../lib/dateUtils.js'

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function viewDate(viewDow) {
  const now = new Date()
  const today = now.getDay()
  if (viewDow == null) return now
  const offset = viewDow - today
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
}

export default function Workouts() {
  const { state, setState } = useUserDataContext()
  const dow = state.viewDow == null ? new Date().getDay() : state.viewDow
  const dt = viewDate(state.viewDow)
  const dateKey = localDateStr(dt)
  const isToday = dow === new Date().getDay()
  const routine = state.currentRoutine || 'A'

  const day = state.generatedWorkouts?.[dow]
  const exercises = day?.[routine] || []
  const completedDay = !!state.completedWorkouts?.[dateKey]

  function changeDay(delta) {
    const next = ((dow + delta) % 7 + 7) % 7
    setState(prev => ({ ...prev, viewDow: next }))
  }
  function setRoutine(r) {
    setState(prev => ({ ...prev, currentRoutine: r }))
  }
  function jumpToToday() {
    setState(prev => ({ ...prev, viewDow: null }))
  }
  function markComplete() {
    setState(prev => ({
      ...prev,
      completedWorkouts: { ...(prev.completedWorkouts || {}), [dateKey]: !prev.completedWorkouts?.[dateKey] },
      habits: completedDay ? prev.habits : { ...(prev.habits || {}), workout: true },
    }))
  }

  // Section grouping — show badge on first exercise of each new section
  const sectionFirsts = new Set()
  let lastType = null
  exercises.forEach((ex, i) => {
    if (ex.type !== lastType) {
      sectionFirsts.add(i)
      lastType = ex.type
    }
  })

  return (
    <>
      <header style={{ margin: '32px 0 16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>WORKOUT</p>
        <h2 style={{ fontSize: 36 }}>{day?.icon || '💪'} {day?.name || 'Loading…'}</h2>
      </header>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button className="secondary" onClick={() => changeDay(-1)} style={{ width: 36, height: 36, padding: 0, fontSize: 18 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{DOW_NAMES[dow]}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {isToday && <span style={{ color: 'var(--accent)', marginLeft: 6, letterSpacing: 1 }}>· TODAY</span>}
            </p>
          </div>
          <button className="secondary" onClick={() => changeDay(1)} style={{ width: 36, height: 36, padding: 0, fontSize: 18 }}>›</button>
        </div>

        {!isToday && (
          <button onClick={jumpToToday} className="secondary sm" style={{ width: '100%', marginBottom: 8 }}>Jump to today</button>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {['A', 'B'].map(r => (
            <button
              key={r}
              onClick={() => setRoutine(r)}
              className={routine === r ? '' : 'secondary'}
              style={{ flex: 1, padding: 9, fontSize: 13, fontWeight: 600 }}
            >
              Routine {r}
            </button>
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            No exercises generated for this day. Try updating your equipment in Settings.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercises.map((ex, i) => (
            <ExerciseItem
              key={ex.id + ':' + i}
              exercise={ex}
              dateKey={dateKey}
              showSectionBadge={sectionFirsts.has(i)}
            />
          ))}
        </div>
      )}

      <button
        onClick={markComplete}
        className={completedDay ? 'secondary' : ''}
        style={{ width: '100%', padding: 14, fontSize: 15, marginTop: 16 }}
        disabled={exercises.length === 0}
      >
        {completedDay ? '✓ Workout marked complete — undo' : 'Mark workout complete'}
      </button>
    </>
  )
}
