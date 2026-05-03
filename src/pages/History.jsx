export default function History() {
  return (
    <>
      <header style={{ margin: '40px 0 24px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>HISTORY</p>
        <h2>Progress</h2>
      </header>
      <div className="card">
        <p className="card-title">Coming soon</p>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Weight chart, lifting log, weekly scorecard, badges, backup/restore.</p>
      </div>
    </>
  )
}
