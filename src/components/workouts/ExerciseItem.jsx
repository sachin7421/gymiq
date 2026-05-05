import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { isExerciseDone } from '../../lib/setLog.js'
import SetLogger from './SetLogger.jsx'

const SECTION_BADGE = {
  warmup: { label: 'Warm-up', color: 'var(--accent3)' },
  strength: { label: 'Strength', color: 'var(--accent2)' },
  core: { label: 'Core', color: 'var(--warn)' },
  cooldown: { label: 'Cool-down', color: 'var(--success)' },
  cardio: { label: 'Cardio', color: 'var(--accent3)' },
}

export default function ExerciseItem({ exercise, dateKey, showSectionBadge }) {
  const { state, setState } = useUserDataContext()
  const done = isExerciseDone(state, dateKey, exercise.id)
  const trackable = exercise.hasWeight || exercise.type === 'strength' || exercise.type === 'cardio' || exercise.type === 'core'

  function toggleDone() {
    setState(prev => {
      const day = prev.exerciseDone?.[dateKey] || {}
      return {
        ...prev,
        exerciseDone: {
          ...(prev.exerciseDone || {}),
          [dateKey]: { ...day, [exercise.id]: !day[exercise.id] },
        },
      }
    })
  }

  const badge = SECTION_BADGE[exercise.type]
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.yt || exercise.name)}`

  return (
    <div style={{
      background: 'var(--surface2)',
      border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {showSectionBadge && badge && (
        <div style={{ padding: '8px 14px 0' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2,
            textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100,
            color: badge.color, border: `1px solid ${badge.color}55`,
            background: badge.color + '22',
          }}>
            {badge.label}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={toggleDone}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          width: '100%', background: 'transparent', color: 'var(--text)',
          textAlign: 'left', borderRadius: 0,
        }}
      >
        <span style={{ fontSize: 22 }}>{exercise.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{exercise.name}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{exercise.detail}</p>
        </div>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
          background: done ? 'var(--accent)' : 'var(--surface)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>
          {done ? '✓' : ''}
        </span>
      </button>

      {exercise.cue && (
        <p style={{
          padding: '0 14px 10px',
          fontSize: 12,
          color: 'var(--text2)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {exercise.cue}
        </p>
      )}

      <div style={{ padding: '0 14px 8px' }}>
        <a
          href={yt}
          target="_blank"
          rel="noreferrer"
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            color: 'var(--text2)',
            padding: '6px 12px',
            borderRadius: 10,
            fontSize: 12,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ▶ Watch
        </a>
      </div>

      {trackable && <SetLogger exercise={exercise} dateKey={dateKey} />}
    </div>
  )
}
