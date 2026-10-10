import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { todayStr } from '../../lib/dateUtils.js'
import { weekStats, afStats, afSeries, weekWins, isDrinkDay, AF_START, AF_TARGET_DATE } from '../../lib/alcohol.js'
import { fmtShort } from '../../lib/program.js'

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function AlcoholTracker() {
  const { state, setState } = useUserDataContext()
  const today = todayStr()
  const week = weekStats(state)
  const af = afStats(state)
  const series = afSeries(state)
  const wins = weekWins(state)
  const todayIsDrink = isDrinkDay(state, today)

  function toggleDay(date) {
    setState(prev => {
      const drinkDays = { ...(prev.drinkDays || {}) }
      const on = !drinkDays[date]
      if (on) drinkDays[date] = true
      else delete drinkDays[date]
      // Keep the daily "alcohol-free day" habit in sync for today only.
      const habits = date === today ? { ...(prev.habits || {}), alcohol: !on } : prev.habits
      return { ...prev, drinkDays, habits }
    })
  }

  const usedColor = week.over ? 'var(--danger)' : week.used === week.cap ? 'var(--warn)' : 'var(--success)'
  const afColor = af.onTrack ? 'var(--success)' : af.pct >= af.goalPct - 10 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div className="card">
      <p className="card-title">Alcohol — weekly cap</p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1, color: usedColor }}>{week.used}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--muted)' }}>/{week.cap}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>
          drinking days this week · {week.over ? `${week.used - week.cap} over cap` : `${week.remaining} left`}
        </span>
      </div>

      <button
        onClick={() => toggleDay(today)}
        className={todayIsDrink ? 'secondary' : 'orange'}
        style={{ width: '100%', padding: 12, fontSize: 14, margin: '8px 0 14px' }}
      >
        {todayIsDrink ? '✓ Drinking day logged — tap to undo' : '🍺 Log a drinking day (today)'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 16 }}>
        {week.dates.map((date, i) => {
          const isPast = date <= today
          const isToday = date === today
          const drink = isDrinkDay(state, date)
          const dry = !drink && isPast
          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button
                type="button"
                onClick={() => isPast && toggleDay(date)}
                disabled={!isPast}
                aria-label={`${date} ${drink ? 'drinking day' : 'alcohol-free'}`}
                style={{
                  width: 34, height: 34, padding: 0, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  background: drink ? 'rgba(224,92,26,0.15)' : dry ? 'rgba(42,125,79,0.15)' : 'var(--surface2)',
                  color: drink ? 'var(--accent2)' : dry ? 'var(--success)' : 'var(--muted)',
                  border: '1.5px solid',
                  borderColor: drink ? 'var(--accent2)' : dry ? 'var(--success)' : 'var(--border)',
                  boxShadow: isToday ? '0 0 0 2px var(--accent3)' : 'none',
                  cursor: isPast ? 'pointer' : 'default',
                }}
              >
                {drink ? '🍺' : dry ? '✓' : ''}
              </button>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{DAY_NAMES[i]}</span>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Alcohol-free since {fmtShort(AF_START)}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: afColor }}>
            {af.pct.toFixed(0)}%
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          {af.afDays}/{af.elapsed} days · goal {af.goalPct}% by {fmtShort(AF_TARGET_DATE)} · {af.daysLeft}d left
        </p>
        <AfSparkline series={series} goal={af.goalPct} color={afColor} />
        {wins.weeks.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
            🏆 {wins.wins}/{wins.weeks.length} completed weeks at or under the cap
          </p>
        )}
      </div>
    </div>
  )
}

// Running alcohol-free % with the goal drawn as a dashed line. Inline SVG so
// the dashboard doesn't pay for another chart library mount.
function AfSparkline({ series, goal, color }) {
  const W = 300, H = 56, PAD = 4
  const n = series.length
  const x = i => n <= 1 ? PAD : PAD + (i / (n - 1)) * (W - PAD * 2)
  const y = pct => PAD + (1 - Math.max(0, Math.min(100, pct)) / 100) * (H - PAD * 2)
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ')
  const last = series[n - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} aria-hidden="true">
      <line x1={PAD} x2={W - PAD} y1={y(goal)} y2={y(goal)} stroke="var(--success)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - PAD} y={y(goal) - 3} fontSize="8" fill="var(--success)" textAnchor="end" fontFamily="var(--font-mono)">{goal}% goal</text>
      {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />}
      {last && <circle cx={x(n - 1)} cy={y(last.pct)} r="3" fill={color} />}
    </svg>
  )
}
