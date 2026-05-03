import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { getWeekDateStr, todayStr } from '../../lib/dateUtils.js'
import { totalDrinksThisWeek } from '../../lib/gamification.js'

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function AlcoholTracker() {
  const { state, setState } = useUserDataContext()
  const total = totalDrinksThisWeek(state)
  const todayDow = new Date().getDay()

  function adjust(date, delta) {
    setState(prev => {
      const cur = prev.weekDrinks?.[date] || 0
      const next = Math.max(0, cur + delta)
      return { ...prev, weekDrinks: { ...prev.weekDrinks, [date]: next } }
    })
  }

  function addToday() { adjust(todayStr(), 1) }
  function removeToday() { adjust(todayStr(), -1) }

  function editDay(date) {
    const cur = state.weekDrinks?.[date] || 0
    const input = window.prompt(`How many drinks on ${formatDate(date)}? (current: ${cur})`, String(cur))
    if (input === null) return
    const val = parseInt(input)
    if (isNaN(val) || val < 0) return
    setState(prev => ({ ...prev, weekDrinks: { ...prev.weekDrinks, [date]: val } }))
  }

  const totalColor = total > 4 ? 'var(--danger)' : total === 0 ? 'var(--success)' : 'var(--accent2)'

  return (
    <div className="card">
      <p className="card-title">Alcohol — weekly</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1, color: totalColor }}>{total}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>this week · target ≤4</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={addToday} className="orange" style={{ flex: 1, padding: 9, fontSize: 13 }}>+ Drink today</button>
        <button onClick={removeToday} className="secondary" style={{ flex: 1, padding: 9, fontSize: 13 }}>− Undo</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {DAY_NAMES.map((d, i) => {
          const date = getWeekDateStr(i)
          const cnt = state.weekDrinks?.[date] || 0
          const [y, m, dd] = date.split('-').map(Number)
          const dt = new Date(y, m - 1, dd)
          const isPast = dt <= new Date()
          const isToday = i === todayDow
          const hasDrinks = cnt > 0
          const dryDay = !hasDrinks && isPast
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button
                type="button"
                onClick={() => isPast && editDay(date)}
                disabled={!isPast}
                style={{
                  width: 32, height: 32, padding: 0, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                  background: hasDrinks ? 'rgba(224,92,26,0.15)' : dryDay ? 'rgba(42,125,79,0.15)' : 'var(--surface2)',
                  color: hasDrinks ? 'var(--accent2)' : dryDay ? 'var(--success)' : 'var(--muted)',
                  border: '1.5px solid',
                  borderColor: hasDrinks ? 'var(--accent2)' : dryDay ? 'var(--success)' : 'var(--border)',
                  boxShadow: isToday ? '0 0 0 2px var(--accent3)' : 'none',
                  cursor: isPast ? 'pointer' : 'default',
                }}
              >
                {hasDrinks ? cnt : dryDay ? '✓' : ''}
              </button>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{d}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
