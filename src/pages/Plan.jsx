import { useNavigate } from 'react-router-dom'
import { useUserDataContext } from '../contexts/UserDataContext.jsx'

const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Plan() {
  const { state, setState } = useUserDataContext()
  const navigate = useNavigate()
  const today = new Date().getDay()
  const workouts = state.generatedWorkouts || {}

  function openDay(dow) {
    setState(prev => ({ ...prev, viewDow: dow }))
    navigate('/workouts')
  }

  return (
    <>
      <header style={{ margin: '32px 0 16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>WEEKLY PLAN</p>
        <h2 style={{ fontSize: 36 }}>{state.trainingDays}-day split</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {state.fitnessLevel} · {state.equipment?.length || 0} equipment items
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DOW_LONG.map((name, dow) => {
          const w = workouts[dow]
          const isToday = dow === today
          const isRest = !w || w.name === 'Rest Day'
          const aCount = (w?.A || []).filter(e => e.type === 'strength' || e.type === 'cardio').length
          const bCount = (w?.B || []).filter(e => e.type === 'strength' || e.type === 'cardio').length
          return (
            <button
              key={dow}
              type="button"
              onClick={() => openDay(dow)}
              style={{
                padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface)',
                color: 'var(--text)',
                border: `1.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12,
                textAlign: 'left',
                fontWeight: 400,
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{w?.icon || '💪'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{w?.name || '—'}</p>
                  {isToday && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--accent)' }}>TODAY</span>}
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {DOW_SHORT[dow]}{!isRest && ` · A: ${aCount} ex · B: ${bCount} ex`}
                </p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
