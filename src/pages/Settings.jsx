import { useState } from 'react'
import { useUserDataContext } from '../contexts/UserDataContext.jsx'
import { signOut } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import EquipmentGrid from '../components/settings/EquipmentGrid.jsx'
import { generateWorkouts } from '../lib/workoutGenerator.js'
import { testOuraToken } from '../lib/oura.js'
import { todayStr } from '../lib/dateUtils.js'

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
  const [coachKey, setCoachKey] = useState(state.anthropicKey || '')

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

  function saveCoachKey() {
    const trimmed = coachKey.trim()
    setState(prev => ({ ...prev, anthropicKey: trimmed || null }))
  }
  function clearCoachKey() {
    setCoachKey('')
    setState(prev => ({ ...prev, anthropicKey: null }))
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymiq-export-${todayStr()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'This permanently deletes your GymIQ data and signs you out. Continue?'
    )
    if (!confirmed) return
    const second = window.prompt('Type "delete" to confirm.')
    if (second?.trim().toLowerCase() !== 'delete') return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('user_data').delete().eq('id', user.id)
      }
      try { localStorage.removeItem('gymiqState') } catch { /* noop */ }
      await signOut()
    } catch (e) {
      window.alert('Delete failed: ' + (e.message || e))
    }
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
        <p className="card-title">🧠 Coach (Claude API)</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>
          Paste an Anthropic API key (console.anthropic.com) to enable the
          coach. Stored only in your account. Each question costs ~$0.001.
        </p>
        {state.anthropicKey ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 8 }}>
              ✓ Coach enabled (key ending …{state.anthropicKey.slice(-4)})
            </p>
            <button onClick={clearCoachKey} className="danger" style={{ width: '100%' }}>
              Remove key
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={coachKey}
              onChange={e => setCoachKey(e.target.value)}
            />
            <button onClick={saveCoachKey} disabled={!coachKey.trim()} className="orange" style={{ flexShrink: 0 }}>
              Save
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <p className="card-title">Other</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="secondary" onClick={rerunWizard}>Re-run setup wizard</button>
          <button className="secondary" onClick={exportData}>Download my data (JSON)</button>
          <button className="secondary" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Danger zone</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>
          Permanently delete your GymIQ data. Your auth account remains — re-signing in starts you fresh.
        </p>
        <button className="danger" onClick={deleteAccount} style={{ width: '100%' }}>
          Delete my data
        </button>
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
