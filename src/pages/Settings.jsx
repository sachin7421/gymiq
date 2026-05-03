import { signOut } from '../hooks/useAuth.js'

export default function Settings() {
  return (
    <>
      <header style={{ margin: '40px 0 24px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>SETTINGS</p>
        <h2>Account</h2>
      </header>
      <div className="card">
        <p className="card-title">Coming soon</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Profile, equipment, training days, fitness level, wearable.</p>
        <button className="danger" onClick={() => signOut()}>Sign out</button>
      </div>
    </>
  )
}
