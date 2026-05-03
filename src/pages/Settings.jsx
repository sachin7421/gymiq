import { useState } from 'react'
import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import { signOut } from '../hooks/useAuth.js'
import EquipmentGrid from '../components/settings/EquipmentGrid.jsx'
import { generateWorkouts } from '../lib/workoutGenerator.js'
import { testOuraToken } from '../lib/oura.js'

export default function Settings() {
  const { state, setState } = useUserDataContext()
  const [profile, setProfile] = useState({
    userName: state.userName || '',
    startWeight: state.startWeight ?? '',
    goalWeight: state.goalWeight ?? '',
    calorieTarget: state.calorieTarget ?? 2100,
  })
  const [tokenInput, setTokenInput] = useState(state.ouraToken || '')
  const [tokenStatus, setTokenStatus] = useState(null)
  const [tokenTesting, setTokenTesting] = useState(false)

  function saveProfile() {
    const sw = parseFloat(profile.startWeight) || 0
    const gw = parseFloat(profile.goalWeight) || 0
    const ct = parseInt(profile.calorieTarget) || 2100
    setState(prev => ({
      ...prev,
      userName: profile.userName.trim(),
      startWeight: sw,
      goalWeight: gw,
      calorieTarget: ct,
    }))
  }

  function regenerateAndSave(patch) {
    setState(prev => {
      const next = { ...prev, ...patch }
      next.generatedWorkouts = generateWorkouts(
        next.equipment || [],
        next.trainingDays || 4,
        next.fitnessLevel || 'intermediate',
      )
      return next
    })
  }

  function toggleEquipment(id) {
    const has = state.equipment?.includes(id)
    const equipment = has ? state.equipment.filter(e => e !== id) : [...(state.equipment || []), id]
    regenerateAndSave({ equipment })
  }

  function setDays(n) { regenerateAndSave({ trainingDays: n }) }
  function setLevel(l) { regenerateAndSave({ fitnessLevel: l }) }

  async function connectOura() {
    if (!tokenInput) { setTokenStatus({ ok: false, msg: 'Paste a token first' }); return }
    setTokenTesting(true)
    setTokenStatus(null)
    try {
      const ok = await testOuraToken(tokenInput)
      if (ok) {
        setState(prev => ({ ...prev, wearable: 'oura', hasOura: true, ouraToken: tokenInput }))
        setTokenStatus({ ok: true, msg: '✅ Connected' })
      } else {
        setTokenStatus({ ok: false, msg: '❌ Invalid token' })
      }
    } catch {
      setTokenStatus({ ok: false, msg: '❌ Connection failed' })
    }
    setTokenTesting(false)
  }

  function disconnectOura() {
    setState(prev => ({ ...prev, hasOura: false, ouraToken: null, wearable: 'none' }))
    setTokenInput('')
    setTokenStatus(null)
  }

  function rerunWizard() {
    setState(prev => ({ ...prev, onboardingComplete: false }))
  }

  return (
    <>
      <header style={{ margin: '32px 0 16px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>SETTINGS</p>
        <h2 style={{ fontSize: 36 }}>Profile</h2>
      </header>

      <div className="card">
        <p className="card-title">Account</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Name">
            <input type="text" value={profile.userName} onChange={e => setProfile({ ...profile, userName: e.target.value })} />
          </Field>
          <Field label="Start weight">
            <input type="number" value={profile.startWeight} onChange={e => setProfile({ ...profile, startWeight: e.target.value })} />
          </Field>
          <Field label="Goal weight">
            <input type="number" value={profile.goalWeight} onChange={e => setProfile({ ...profile, goalWeight: e.target.value })} />
          </Field>
          <Field label="Daily calorie target">
            <input type="number" value={profile.calorieTarget} onChange={e => setProfile({ ...profile, calorieTarget: e.target.value })} />
          </Field>
          <button onClick={saveProfile} className="orange" style={{ marginTop: 4 }}>Save profile</button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Training days</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {[2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={state.trainingDays === n ? '' : 'secondary'}
              style={{ padding: 12, fontSize: 14, fontWeight: 600 }}
            >
              {n}/wk
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Fitness level</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['beginner', 'intermediate', 'advanced'].map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={state.fitnessLevel === l ? '' : 'secondary'}
              style={{ padding: 12, fontSize: 14, textAlign: 'left', textTransform: 'capitalize' }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Equipment ({state.equipment?.length || 0} selected)</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>Workouts regenerate when you toggle items.</p>
        <EquipmentGrid selected={state.equipment || []} onToggle={toggleEquipment} />
      </div>

      <div className="card">
        <p className="card-title">Wearable</p>
        {state.hasOura ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 10 }}>💍 Oura Ring connected</p>
            <button onClick={disconnectOura} className="danger" style={{ width: '100%' }}>Disconnect Oura</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Get a token at cloud.ouraring.com/personal-access-tokens
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder="Oura token" value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
              <button onClick={connectOura} disabled={tokenTesting} className="orange" style={{ flexShrink: 0 }}>
                {tokenTesting ? '…' : 'Connect'}
              </button>
            </div>
            {tokenStatus && (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: tokenStatus.ok ? 'var(--success)' : 'var(--danger)' }}>
                {tokenStatus.msg}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <p className="card-title">Other</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="secondary" onClick={rerunWizard}>Re-run setup wizard</button>
          <button className="danger" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  )
}
