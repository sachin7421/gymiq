import { useMemo } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { totalVolume } from '../../lib/setLog.js'
import { localDateStr } from '../../lib/dateUtils.js'

// 8-week sparkline of weekly tonnage (sum of weight × reps across all
// strength sets) + session count. Pure-CSS bars — no recharts cost.

function weekBuckets(setLog) {
  const buckets = []
  const today = new Date()
  // Anchor each bucket on the Sunday of that week, going back 8 weeks.
  for (let w = 7; w >= 0; w--) {
    const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - w * 7)
    const next = new Date(sunday); next.setDate(sunday.getDate() + 7)
    const startKey = localDateStr(sunday)
    const endKey = localDateStr(next)
    let volume = 0
    let sessions = 0
    for (const [date, exs] of Object.entries(setLog || {})) {
      if (date >= startKey && date < endKey) {
        let dayVolume = 0
        for (const sets of Object.values(exs || {})) dayVolume += totalVolume(sets)
        if (dayVolume > 0) sessions++
        volume += dayVolume
      }
    }
    buckets.push({ startKey, volume, sessions })
  }
  return buckets
}

function fmtWeek(startKey) {
  const [y, m, d] = startKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

export default function TrainingLoadCard() {
  const { state } = useUserDataContext()
  const buckets = useMemo(() => weekBuckets(state.setLog), [state.setLog])

  const totalVolumeAll = buckets.reduce((s, b) => s + b.volume, 0)
  if (totalVolumeAll === 0) return null

  const max = Math.max(...buckets.map(b => b.volume), 1)
  const lastWeek = buckets[buckets.length - 1]
  const prevWeek = buckets[buckets.length - 2]
  const wow = prevWeek?.volume > 0 ? ((lastWeek.volume - prevWeek.volume) / prevWeek.volume) * 100 : 0

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="card-title" style={{ marginBottom: 0 }}>📈 Training Load</p>
        {prevWeek?.volume > 0 && (
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: wow > 0 ? 'var(--accent)' : wow < 0 ? 'var(--accent2)' : 'var(--muted)',
          }}>
            {wow > 0 ? '↑' : wow < 0 ? '↓' : '='} {Math.abs(wow).toFixed(0)}% WoW
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
        {buckets.map((b, i) => {
          const h = b.volume === 0 ? 4 : Math.max(6, (b.volume / max) * 76)
          const isLast = i === buckets.length - 1
          return (
            <div key={b.startKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div
                title={`Week of ${fmtWeek(b.startKey)}: ${Math.round(b.volume).toLocaleString()} lbs · ${b.sessions} sessions`}
                style={{
                  width: '100%',
                  height: h,
                  background: isLast ? 'var(--accent)' : 'var(--accent3)',
                  opacity: b.volume === 0 ? 0.3 : 1,
                  borderRadius: 4,
                  transition: 'height 0.3s',
                }}
              />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        <span>{fmtWeek(buckets[0].startKey)}</span>
        <span>this week</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
        <Stat label="This week" value={Math.round(lastWeek.volume).toLocaleString()} unit="lbs" />
        <Stat label="Sessions" value={lastWeek.sessions} unit={lastWeek.sessions === 1 ? 'day' : 'days'} />
      </div>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}>
        {value}
        {unit && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 3 }}>{unit}</span>}
      </p>
    </div>
  )
}
