import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { recentPRs, topE1RMs } from '../../lib/strength.js'
import { EX_DB } from '../../lib/exerciseDb.js'

function exerciseName(id) {
  return EX_DB[id]?.name || id
}

function fmtDateShort(dateKey) {
  if (!dateKey) return ''
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PRCard() {
  const { state } = useUserDataContext()
  const prs = recentPRs(state, 30)
  const top = topE1RMs(state, 5)

  if (prs.length === 0 && top.length === 0) return null

  return (
    <div className="card">
      <p className="card-title">🏆 Strength</p>

      {prs.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>
            RECENT PRS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: top.length > 0 ? 14 : 0 }}>
            {prs.slice(0, 4).map((pr, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', background: 'var(--accent-light)',
                border: '1px solid var(--accent)', borderRadius: 8,
              }}>
                <span style={{ fontSize: 16 }}>{EX_DB[pr.exerciseId]?.icon || '💪'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exerciseName(pr.exerciseId)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {pr.set?.weight} × {pr.set?.reps}
                    {pr.set?.rpe ? ` @ ${pr.set.rpe}` : ''} · {fmtDateShort(pr.dateKey)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
                    {Math.round(pr.e1rm)}
                  </p>
                  <p style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                    e1RM
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {top.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 6 }}>
            TOP LIFTS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {top.map((t, i) => (
              <div key={t.exerciseId} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 4px', borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', width: 20 }}>
                  #{i + 1}
                </span>
                <span style={{ fontSize: 14 }}>{EX_DB[t.exerciseId]?.icon || '💪'}</span>
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exerciseName(t.exerciseId)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                  {Math.round(t.e1rm)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
