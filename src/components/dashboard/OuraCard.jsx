import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { useOura } from '../../hooks/useOura.js'

function readinessAdvice(score) {
  if (score == null) return null
  if (score >= 85) return { tier: 'optimal', msg: 'Optimal recovery — push hard today.' }
  if (score >= 70) return { tier: 'good', msg: 'Good readiness — train as planned.' }
  if (score >= 60) return { tier: 'moderate', msg: 'Moderate — moderate intensity, watch form.' }
  return { tier: 'low', msg: 'Low recovery — light cardio or rest.' }
}

export default function OuraCard() {
  const { state, setState } = useUserDataContext()
  const { data, loading, error, refresh } = useOura(state.ouraToken, !!state.hasOura)

  if (!state.hasOura) return null

  const advice = readinessAdvice(data?.readinessScore)

  function applyActiveCalories() {
    if (!data?.activeCalories) return
    setState(prev => ({ ...prev, burned: data.activeCalories }))
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="card-title" style={{ marginBottom: 0 }}>💍 Oura Ring</p>
        <button onClick={refresh} className="secondary sm" disabled={loading}>
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          {error}
        </p>
      )}

      {!data && loading && (
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Loading…</p>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            <Stat label="Readiness" value={data.readinessScore} />
            <Stat label="Sleep" value={data.sleepScore} />
            <Stat label="HRV" value={data.averageHrv} unit="ms" />
            <Stat label="RHR" value={data.restingHr} unit="bpm" />
            <Stat label="Sleep" value={data.sleepHours} unit="h" />
            <Stat label="Active cal" value={data.activeCalories} />
          </div>

          {advice && (
            <p style={{
              fontSize: 12,
              padding: '8px 10px',
              background: 'var(--surface2)',
              borderRadius: 8,
              marginBottom: 10,
              color: 'var(--text2)',
              borderLeft: `3px solid ${advice.tier === 'optimal' ? 'var(--accent)' : advice.tier === 'good' ? 'var(--success)' : advice.tier === 'moderate' ? 'var(--warn)' : 'var(--danger)'}`,
            }}>
              {advice.msg}
            </p>
          )}

          {data.activeCalories != null && (
            <button className="secondary sm" onClick={applyActiveCalories} style={{ width: '100%' }}>
              Apply {data.activeCalories} active cal to burn tracker
              {data.activityDate && data.activityDate !== new Date().toISOString().slice(0, 10) && (
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 6 }}>
                  ({data.activityDate})
                </span>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}>
        {value != null ? value : '—'}{value != null && unit ? <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>{unit}</span> : null}
      </p>
    </div>
  )
}
