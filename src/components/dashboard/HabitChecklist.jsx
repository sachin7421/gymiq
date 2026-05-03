import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { HABIT_DEFS, MAX_PTS, calcDailyPoints } from '../../lib/gamification.js'
import { todayStr } from '../../lib/dateUtils.js'

export default function HabitChecklist() {
  const { state, setState } = useUserDataContext()
  const points = calcDailyPoints(state.habits)
  const pct = points / MAX_PTS
  const label =
    pct === 0 ? 'Check off habits below' :
    pct < 0.4 ? 'Good start — keep going!' :
    pct < 0.7 ? 'Solid day — push for more!' :
    pct < 1   ? 'Almost perfect!' :
                '🔥 Perfect day!'

  function toggle(key) {
    setState(prev => ({
      ...prev,
      habits: { ...prev.habits, [key]: !prev.habits?.[key] },
    }))
  }

  function saveDay() {
    const today = todayStr()
    setState(prev => {
      const pts = calcDailyPoints(prev.habits)
      const perfect = pts === MAX_PTS
      let streak = prev.streak || 0
      let bestStreak = prev.bestStreak || 0
      if (perfect && prev.lastHabitDate !== today) {
        streak = streak + 1
        if (streak > bestStreak) bestStreak = streak
      } else if (prev.lastHabitDate !== today) {
        streak = 0
      }
      return {
        ...prev,
        dailyPoints: { ...(prev.dailyPoints || {}), [today]: pts },
        weeklyHabits: { ...(prev.weeklyHabits || {}), [today]: { ...prev.habits } },
        streak,
        bestStreak,
        lastHabitDate: today,
      }
    })
  }

  return (
    <div className="card">
      <p className="card-title">Today's habits</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--accent)', lineHeight: 1 }}>{points}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--muted)' }}>/{MAX_PTS}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{label}</p>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{
          height: '100%',
          width: `${Math.round(pct * 100)}%`,
          background: 'linear-gradient(90deg, var(--accent2), var(--accent))',
          transition: 'width 0.5s',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {HABIT_DEFS.map(h => {
          const on = !!state.habits?.[h.key]
          return (
            <button
              key={h.key}
              type="button"
              onClick={() => toggle(h.key)}
              className={on ? '' : 'secondary'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: on ? 'var(--accent-light)' : 'var(--surface2)',
                color: 'var(--text2)',
                border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                fontSize: 13,
                fontWeight: 400,
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                background: on ? 'var(--accent)' : 'var(--surface)',
                color: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0,
              }}>
                {on ? '✓' : ''}
              </span>
              <span style={{ fontSize: 16 }}>{h.emoji}</span>
              <span style={{ flex: 1 }}>{h.label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: on ? 'var(--accent)' : 'var(--muted)',
                fontWeight: on ? 600 : 400,
              }}>
                {on ? '+' : ''}{h.pts}pts
              </span>
            </button>
          )
        })}
      </div>
      <button onClick={saveDay} style={{ width: '100%', marginTop: 12 }}>Save today ✓</button>
    </div>
  )
}
