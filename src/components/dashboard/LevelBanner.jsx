import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { getTotalPoints, getLevel, getNextLevel, getWeeklyPoints, getWeekGrade } from '../../lib/gamification.js'

export default function LevelBanner() {
  const { state } = useUserDataContext()
  const total = getTotalPoints(state)
  const lvl = getLevel(total)
  const nextLvl = getNextLevel(lvl)
  const lvlPct = nextLvl ? Math.min(100, Math.round(((total - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100
  const wk = getWeeklyPoints(state)
  const wPct = wk.possible > 0 ? wk.total / wk.possible : 0
  const grade = getWeekGrade(wPct)

  return (
    <div className="card" style={{ borderColor: lvl.color + '66' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 32 }}>{lvl.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: lvl.color, lineHeight: 1 }}>{lvl.title}</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {nextLvl ? `${total} pts — ${nextLvl.min - total} to ${nextLvl.title}` : `${total} pts — MAX LEVEL`}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: grade.color, lineHeight: 1 }}>
            {wk.days > 0 ? grade.grade : '—'}
          </p>
          <p style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginTop: 2 }}>WEEK</p>
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${lvlPct}%`, background: lvl.color, transition: 'width 0.6s' }} />
      </div>
    </div>
  )
}
