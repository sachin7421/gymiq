import { signOut } from '../hooks/useAuth.js'
import { useAuth } from '../hooks/useAuth.js'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <>
      <header style={{ margin: '40px 0 24px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>TODAY</p>
        <h1>Gym<span style={{ color: 'var(--accent)' }}>IQ</span></h1>
      </header>

      <div className="card">
        <p className="card-title">Signed in</p>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>{user?.email ?? 'unknown'}</p>
        <button className="secondary" onClick={() => signOut()}>Sign out</button>
      </div>

      <div className="card">
        <p className="card-title">Migration in progress</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
          The dashboard cards (Oura, Level/XP, Weekly Challenge, Weight, Calorie ring, Alcohol, Habits)
          will land here as we migrate from the legacy index.html.
        </p>
      </div>
    </>
  )
}
