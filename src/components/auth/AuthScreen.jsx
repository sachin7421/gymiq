import { useState } from 'react'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../hooks/useAuth.js'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail
    const { error } = await fn(email, password)
    if (error) setError(error.message)
    setBusy(false)
  }

  async function onGoogle() {
    setBusy(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <header style={{ marginBottom: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>YOUR GYM. YOUR DATA. YOUR PLAN.</p>
          <h1 style={{ fontSize: 'clamp(56px,14vw,88px)' }}>Gym<span style={{ color: 'var(--accent)' }}>IQ</span></h1>
        </header>

        <div className="card">
          <button onClick={onGoogle} disabled={busy} style={{ width: '100%', marginBottom: 12, background: '#fff', color: '#1a1a1a', border: '1.5px solid var(--border)' }}>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            OR
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button type="submit" disabled={busy}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, fontFamily: 'var(--font-mono)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="secondary"
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
            style={{ width: '100%', marginTop: 12 }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
