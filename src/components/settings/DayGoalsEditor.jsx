import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { GOAL_DEFS, FOCUS_DEFS, seedDayGoalsFromLegacy } from '../../lib/dayGoals.js'
import { generateGoalDrivenWorkouts } from '../../lib/goalGenerator.js'

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DayGoalsEditor() {
  const { state, setState } = useUserDataContext()
  const enabled = !!state.dayGoals

  function regenWith(dayGoals) {
    return generateGoalDrivenWorkouts({
      equipment: state.equipment || [],
      fitnessLevel: state.fitnessLevel || 'intermediate',
      dayGoals,
    })
  }

  function enable() {
    const seeded = seedDayGoalsFromLegacy(state)
    setState(prev => ({
      ...prev,
      dayGoals: seeded,
      generatedWorkouts: regenWith(seeded),
    }))
  }

  function disable() {
    setState(prev => ({ ...prev, dayGoals: null }))
  }

  function setGoal(dow, goal) {
    const next = { ...(state.dayGoals || {}), [dow]: { ...(state.dayGoals?.[dow] || {}), goal } }
    // Cardio/mobility/recovery/rest don't carry a focus
    if (!['strength', 'hypertrophy'].includes(goal)) delete next[dow].focus
    else if (!next[dow].focus) next[dow].focus = 'upper'
    setState(prev => ({ ...prev, dayGoals: next, generatedWorkouts: regenWith(next) }))
  }

  function setFocus(dow, focus) {
    const next = { ...(state.dayGoals || {}), [dow]: { ...(state.dayGoals?.[dow] || {}), focus } }
    setState(prev => ({ ...prev, dayGoals: next, generatedWorkouts: regenWith(next) }))
  }

  return (
    <div className="card">
      <p className="card-title">🎯 Per-day goals</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
        Pick a goal for each day. Workouts adapt their rep schemes, exercise selection,
        and rest periods to match. Health data (Oura, Apple Health) modulates intensity day-of.
      </p>

      {!enabled ? (
        <button onClick={enable} className="orange" style={{ width: '100%' }}>
          Enable goal-driven plan
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 0].map(dow => {
              const dg = state.dayGoals?.[dow] || { goal: 'rest' }
              const def = GOAL_DEFS[dg.goal] || GOAL_DEFS.rest
              const showFocus = ['strength', 'hypertrophy'].includes(dg.goal)
              return (
                <div key={dow} style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: def.color }}>
                      {def.icon} {DOW_NAMES[dow]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {def.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: showFocus ? 8 : 0 }}>
                    {Object.entries(GOAL_DEFS).map(([key, g]) => (
                      <button
                        key={key}
                        onClick={() => setGoal(dow, key)}
                        className={dg.goal === key ? '' : 'secondary'}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          background: dg.goal === key ? g.color : 'var(--surface2)',
                          color: dg.goal === key ? '#fff' : 'var(--text)',
                          border: dg.goal === key ? 'none' : '1.5px solid var(--border)',
                        }}
                      >
                        {g.icon} {g.label}
                      </button>
                    ))}
                  </div>
                  {showFocus && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {Object.entries(FOCUS_DEFS).map(([key, f]) => (
                        <button
                          key={key}
                          onClick={() => setFocus(dow, key)}
                          className={dg.focus === key ? '' : 'secondary'}
                          style={{ padding: '3px 9px', fontSize: 10 }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={disable} className="secondary" style={{ width: '100%', marginTop: 10 }}>
            Disable (revert to schedule-based plan)
          </button>
        </>
      )}
    </div>
  )
}
