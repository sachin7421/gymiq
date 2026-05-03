import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import LevelBanner from '../components/dashboard/LevelBanner.jsx'
import WeightCard from '../components/dashboard/WeightCard.jsx'
import CalorieRing from '../components/dashboard/CalorieRing.jsx'
import AlcoholTracker from '../components/dashboard/AlcoholTracker.jsx'
import WeeklyChallenge from '../components/dashboard/WeeklyChallenge.jsx'
import HabitChecklist from '../components/dashboard/HabitChecklist.jsx'
import OuraCard from '../components/dashboard/OuraCard.jsx'
import { daysSinceStart } from '../lib/dateUtils.js'

export default function Dashboard() {
  const { state, syncStatus } = useUserDataContext()

  return (
    <>
      <header style={{ margin: '32px 0 16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>
          {state.userName ? `Hey, ${state.userName}` : 'Today'}
        </p>
        <h1 style={{ fontSize: 'clamp(40px,9vw,64px)' }}>
          Day <span style={{ color: 'var(--accent)' }}>{daysSinceStart(state.startDate)}</span>
        </h1>
        <SyncBadge status={syncStatus} />
      </header>

      <OuraCard />
      <LevelBanner />
      <WeeklyChallenge />
      <WeightCard />
      <CalorieRing />
      <AlcoholTracker />
      <HabitChecklist />
    </>
  )
}

function SyncBadge({ status }) {
  const map = {
    idle: { color: 'var(--muted)', label: 'idle' },
    syncing: { color: 'var(--warn)', label: 'syncing…' },
    synced: { color: 'var(--success)', label: 'synced' },
    error: { color: 'var(--danger)', label: 'sync error' },
  }
  const m = map[status] || map.idle
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: m.color, marginTop: 6 }}>
      · {m.label}
    </p>
  )
}
