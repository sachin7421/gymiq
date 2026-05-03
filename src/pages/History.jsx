import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import WeightChart from '../components/history/WeightChart.jsx'
import WeeklyScorecard from '../components/history/WeeklyScorecard.jsx'
import LiftingLog from '../components/history/LiftingLog.jsx'
import BadgeCollection from '../components/history/BadgeCollection.jsx'
import BackupRestore from '../components/history/BackupRestore.jsx'
import { daysSinceStart } from '../lib/dateUtils.js'

export default function History() {
  const { state } = useUserDataContext()
  const lost = state.startWeight - state.currentWeight
  const days = daysSinceStart(state.startDate)
  const pace = days > 0 ? (lost / days * 7).toFixed(2) : '0'
  const goalDelta = state.startWeight - state.goalWeight
  const remaining = Math.max(0, state.currentWeight - state.goalWeight)
  // Linear projection — assumes current pace continues.
  let etaDate = null
  if (lost > 0 && remaining > 0 && days > 0) {
    const dailyRate = lost / days
    const daysToGoal = remaining / dailyRate
    if (isFinite(daysToGoal) && daysToGoal > 0 && daysToGoal < 3650) {
      const d = new Date()
      d.setDate(d.getDate() + Math.round(daysToGoal))
      etaDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }
  const completedCount = Object.values(state.completedWorkouts || {}).filter(Boolean).length

  return (
    <>
      <header style={{ margin: '32px 0 16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>HISTORY</p>
        <h2 style={{ fontSize: 36 }}>Progress</h2>
      </header>

      <div className="card">
        <p className="card-title">Weight trend</p>
        <WeightChart history={state.weightHistory || []} goal={state.goalWeight} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          <Stat label="Lost" value={`${lost.toFixed(1)} lbs`} />
          <Stat label="Pace" value={`${pace} lb/wk`} />
          <Stat label="Day" value={days} />
          <Stat label="ETA" value={etaDate || '—'} small />
        </div>
      </div>

      <div className="card">
        <p className="card-title">Workouts logged</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>{completedCount}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Sessions completed since {state.startDate || 'start'}</p>
      </div>

      <WeeklyScorecard />
      <LiftingLog />
      <BadgeCollection />
      <BackupRestore />
    </>
  )
}

function Stat({ label, value, small }) {
  return (
    <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: small ? 12 : 16, fontWeight: 500 }}>{value}</p>
    </div>
  )
}
