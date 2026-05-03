import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import { signOut } from '../hooks/useAuth.js'
import { calcDailyPoints, MAX_PTS, getTotalPoints, getLevel, getNextLevel, totalDrinksThisWeek } from '../lib/gamification.js'
import { daysSinceStart } from '../lib/dateUtils.js'

export default function Dashboard() {
  const { state, setState, syncStatus } = useUserDataContext()

  const points = calcDailyPoints(state.habits)
  const total = getTotalPoints(state)
  const lvl = getLevel(total)
  const nextLvl = getNextLevel(lvl)
  const lvlPct = nextLvl ? Math.min(100, Math.round(((total - lvl.min) / (nextLvl.min - lvl.min)) * 100)) : 100
  const lost = state.startWeight - state.currentWeight
  const goalDelta = state.startWeight - state.goalWeight
  const progressPct = goalDelta > 0 ? Math.min(100, Math.max(0, Math.round((lost / goalDelta) * 100))) : 0
  const drinks = totalDrinksThisWeek(state)

  return (
    <>
      <header style={{ margin: '32px 0 20px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>
          {state.userName ? `Hey, ${state.userName}` : 'Today'}
        </p>
        <h1 style={{ fontSize: 'clamp(40px,9vw,64px)' }}>
          Day <span style={{ color: 'var(--accent)' }}>{daysSinceStart(state.startDate)}</span>
        </h1>
        <SyncBadge status={syncStatus} />
      </header>

      <div className="card">
        <p className="card-title">Level</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{lvl.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: lvl.color }}>{lvl.title}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {nextLvl ? `${total} pts — ${nextLvl.min - total} to ${nextLvl.title}` : `${total} pts — MAX LEVEL`}
            </p>
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${lvlPct}%`, background: lvl.color, transition: 'width 0.6s' }} />
        </div>
      </div>

      <div className="card">
        <p className="card-title">Weight</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1 }}>{state.currentWeight}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>lbs</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Goal {state.goalWeight} · <span style={{ color: 'var(--accent2)' }}>{Math.max(0, state.currentWeight - state.goalWeight)} lbs to go</span> · {lost.toFixed(1)} lost
        </p>
        <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--accent2), var(--accent))', transition: 'width 0.8s' }} />
        </div>
      </div>

      <div className="card">
        <p className="card-title">Today's habits</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>
          {points}<span style={{ fontSize: 18, color: 'var(--muted)' }}>/{MAX_PTS}</span>
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          Streak: {state.bestStreak || state.streak || 0} · Drinks this week: {drinks}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10, lineHeight: 1.5 }}>
          Habit checklist, calorie ring, alcohol grid, weekly challenge, and Oura card land here next.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Account</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          Onboarded with {state.equipment.length} equipment items · {state.trainingDays} day/wk · {state.fitnessLevel}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={() => setState({ onboardingComplete: false })} style={{ flex: 1 }}>
            Re-run setup
          </button>
          <button className="danger" onClick={() => signOut()} style={{ flex: 1 }}>Sign out</button>
        </div>
      </div>
    </>
  )
}

function SyncBadge({ status }) {
  const map = {
    idle: { color: 'var(--muted)', label: '· idle' },
    syncing: { color: 'var(--warn)', label: '· syncing' },
    synced: { color: 'var(--success)', label: '· synced' },
    error: { color: 'var(--danger)', label: '· sync error' },
  }
  const m = map[status] || map.idle
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: m.color, marginTop: 6 }}>
      {m.label}
    </p>
  )
}
