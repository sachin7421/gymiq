import { useEffect } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { ALL_BADGES } from '../../lib/gamification.js'
import { todayStr } from '../../lib/dateUtils.js'

export default function BadgeCollection() {
  const { state, setState } = useUserDataContext()

  // Award any newly-eligible badges on view
  useEffect(() => {
    const earned = state.earnedBadges || {}
    const newly = ALL_BADGES.filter(b => !earned[b.id] && b.check(state))
    if (newly.length === 0) return
    const today = todayStr()
    setState(prev => {
      const next = { ...(prev.earnedBadges || {}) }
      newly.forEach(b => { if (!next[b.id]) next[b.id] = today })
      return { ...prev, earnedBadges: next }
    })
  }, [state, setState])

  const earnedMap = state.earnedBadges || {}
  const earnedCount = ALL_BADGES.filter(b => earnedMap[b.id]).length

  return (
    <div className="card">
      <p className="card-title">Badges · {earnedCount}/{ALL_BADGES.length}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 8 }}>
        {ALL_BADGES.map(b => {
          const got = !!earnedMap[b.id]
          return (
            <div
              key={b.id}
              title={b.name + (got ? ` — earned ${earnedMap[b.id]}` : ' — locked')}
              style={{
                padding: 10,
                background: got ? 'var(--accent-light)' : 'var(--surface2)',
                border: `1.5px solid ${got ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                textAlign: 'center',
                opacity: got ? 1 : 0.4,
                transition: 'opacity 0.2s',
              }}
            >
              <p style={{ fontSize: 26, marginBottom: 4 }}>{b.icon}</p>
              <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: got ? 'var(--accent)' : 'var(--muted)', lineHeight: 1.2 }}>
                {b.name}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
