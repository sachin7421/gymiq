import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { MAX_PTS, getWeekGrade } from '../../lib/gamification.js'
import { getWeekDateStr } from '../../lib/dateUtils.js'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function WeeklyScorecard() {
  const { state } = useUserDataContext()
  const scores = DAY_LABELS.map((_, i) => {
    const d = getWeekDateStr(i)
    return state.dailyPoints?.[d] || 0
  })
  const total = scores.reduce((a, v) => a + v, 0)
  const possible = 7 * MAX_PTS
  const grade = getWeekGrade(total / possible)

  return (
    <div className="card">
      <p className="card-title">Weekly scorecard</p>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 64, color: grade.color, lineHeight: 1 }}>{grade.grade}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{grade.label}</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {total} / {possible} pts this week
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, alignItems: 'end', height: 80 }}>
        {scores.map((s, i) => {
          const pct = Math.round((s / MAX_PTS) * 100)
          const col =
            s >= MAX_PTS ? 'var(--accent)' :
            s >= MAX_PTS * 0.7 ? 'var(--success)' :
            s >= MAX_PTS * 0.4 ? 'var(--warn)' :
            s > 0 ? 'var(--accent2)' : 'var(--border)'
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: s > 0 ? col : 'var(--muted)', marginBottom: 4 }}>
                {s > 0 ? s : ''}
              </span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${pct}%`, background: col, borderRadius: 4, transition: 'height 0.6s' }} />
              </div>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', marginTop: 4 }}>{DAY_LABELS[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
