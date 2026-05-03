export default function Workouts() {
  return (
    <>
      <header style={{ margin: '40px 0 24px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>WORKOUT</p>
        <h2>Today's session</h2>
      </header>
      <div className="card">
        <p className="card-title">Coming soon</p>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Day navigator, routine A/B, exercise list with weight logging.</p>
      </div>
    </>
  )
}
