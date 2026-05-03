import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { EX_DB } from '../../lib/exerciseDb.js'

export default function LiftingLog() {
  const { state } = useUserDataContext()
  const weights = state.exerciseWeights || {}
  const entries = Object.entries(weights)
    .map(([id, v]) => ({ id, ...v, name: EX_DB[id]?.name || id, icon: EX_DB[id]?.icon || '🏋️' }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (entries.length === 0) {
    return (
      <div className="card">
        <p className="card-title">Lifting log</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 12 }}>
          Log weights on the Workout tab to build your history.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="card-title">Lifting log</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(e => {
          const delta = e.prev != null ? e.weight - e.prev : null
          const deltaColor = delta == null ? 'var(--muted)' :
            delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--accent2)' : 'var(--muted)'
          return (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: 'var(--surface2)',
              borderRadius: 10, border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 18 }}>{e.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</p>
                <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{e.date}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}>{e.weight} <span style={{ fontSize: 10, color: 'var(--muted)' }}>lbs</span></p>
                {delta != null && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: deltaColor }}>
                    {delta > 0 ? `↑ +${delta.toFixed(1)}` : delta < 0 ? `↓ ${delta.toFixed(1)}` : '= prev'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
