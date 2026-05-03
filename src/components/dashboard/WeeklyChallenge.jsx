import { useEffect } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { getWeeklyChallenge } from '../../lib/gamification.js'
import { currentWeekKey } from '../../lib/dateUtils.js'

export default function WeeklyChallenge() {
  const { state, setState } = useUserDataContext()
  const ch = getWeeklyChallenge(state)
  const prog = ch.progress()
  const done = ch.check()
  const pct = Math.min(100, Math.round((prog.cur / prog.max) * 100))
  const wkKey = currentWeekKey()
  const awarded = !!state.challengeAwards?.[wkKey]

  // Auto-award bonus points once per week when completed
  useEffect(() => {
    if (done && !awarded) {
      setState(prev => ({
        ...prev,
        challengeAwards: { ...(prev.challengeAwards || {}), [wkKey]: true },
        bonusPoints: (prev.bonusPoints || 0) + ch.pts,
      }))
    }
  }, [done, awarded, wkKey, ch.pts, setState])

  return (
    <div className="card" style={done ? { borderColor: 'var(--accent)', background: 'var(--accent-light)' } : undefined}>
      <p className="card-title">🎯 Weekly Challenge</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{ch.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: done ? 'var(--accent)' : 'var(--text)' }}>{ch.title}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>+{ch.pts}pts</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>{ch.desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.5s' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {prog.cur}/{prog.max} {done ? '✅' : ''}
        </span>
      </div>
      {(awarded || done) && (
        <p style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 8, textAlign: 'center' }}>
          +{ch.pts} BONUS POINTS EARNED 🎉
        </p>
      )}
    </div>
  )
}
