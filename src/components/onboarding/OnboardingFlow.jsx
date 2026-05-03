import { useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { EQUIPMENT_LIST, EQUIPMENT_CATEGORIES } from '../../lib/exerciseDb.js'
import { generateWorkouts } from '../../lib/workoutGenerator.js'
import { todayStr } from '../../lib/dateUtils.js'
import { testOuraToken } from '../../lib/oura.js'

const TOTAL_STEPS = 6

const STEP_LABELS = ['Welcome', 'Profile', 'Equipment', 'Schedule', 'Level', 'Wearable']

export default function OnboardingFlow() {
  const { state, setState } = useUserDataContext()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: state?.userName || '',
    weight: state?.currentWeight || '',
    goal: state?.goalWeight || '',
    calories: state?.calorieTarget || 2100,
    equipment: state?.equipment || [],
    days: state?.trainingDays || 4,
    level: state?.fitnessLevel || 'intermediate',
    wearable: state?.wearable || 'none',
    ouraToken: state?.ouraToken || '',
  })
  const [error, setError] = useState(null)

  function next() {
    setError(null)
    if (step === 1) {
      if (!data.name.trim()) return setError('Please enter your name')
      const w = parseFloat(data.weight)
      const g = parseFloat(data.goal)
      if (!w || w < 100) return setError('Please enter a valid current weight')
      if (!g || g < 100) return setError('Please enter a valid goal weight')
    }
    if (step === 2 && data.equipment.length === 0) {
      return setError('Please select at least one piece of equipment')
    }
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
  }

  function back() {
    setError(null)
    if (step > 0) setStep(s => s - 1)
  }

  function finish() {
    const today = todayStr()
    const w = parseFloat(data.weight) || 0
    const g = parseFloat(data.goal) || 0
    const c = parseInt(data.calories) || 2100
    const generatedWorkouts = generateWorkouts(data.equipment, data.days, data.level)

    setState(prev => ({
      ...prev,
      onboardingComplete: true,
      userName: data.name.trim(),
      currentWeight: w,
      startWeight: w,
      goalWeight: g,
      calorieTarget: c,
      startDate: today,
      lastResetDate: today,
      weightHistory: [{ date: today, weight: w, prev: w }],
      equipment: data.equipment,
      trainingDays: data.days,
      fitnessLevel: data.level,
      wearable: data.wearable,
      hasOura: data.wearable === 'oura' && !!data.ouraToken,
      ouraToken: data.wearable === 'oura' ? data.ouraToken : null,
      generatedWorkouts,
    }))
  }

  return (
    <div className="app" style={{ paddingBottom: 32, minHeight: '100vh' }}>
      <Stepper step={step} />

      {step === 0 && <Welcome onNext={next} />}
      {step === 1 && <Profile data={data} setData={setData} />}
      {step === 2 && <Equipment data={data} setData={setData} />}
      {step === 3 && <Schedule data={data} setData={setData} />}
      {step === 4 && <Level data={data} setData={setData} />}
      {step === 5 && <Wearable data={data} setData={setData} />}

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: 12 }}>
          {error}
        </p>
      )}

      {step > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="secondary" onClick={back} style={{ flex: 1 }}>Back</button>
          {step < TOTAL_STEPS - 1
            ? <button onClick={next} style={{ flex: 2 }}>Continue</button>
            : <button onClick={finish} style={{ flex: 2 }}>Finish setup →</button>}
        </div>
      )}
    </div>
  )
}

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '32px 0 24px' }}>
      {STEP_LABELS.map((_, i) => (
        <div
          key={i}
          style={{
            width: 28,
            height: 4,
            borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  )
}

function Welcome({ onNext }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 }}>WELCOME TO</p>
      <h1 style={{ marginBottom: 24 }}>Gym<span style={{ color: 'var(--accent)' }}>IQ</span></h1>
      <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 32px' }}>
        Your gym, your data, your plan. Quick 6-step setup tunes your workouts to your equipment and level.
      </p>
      <button onClick={onNext} style={{ width: '100%', maxWidth: 320, padding: '14px 24px', fontSize: 15 }}>
        Let's go →
      </button>
    </div>
  )
}

function Profile({ data, setData }) {
  return (
    <div className="card">
      <p className="card-title">About you</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Name">
          <input type="text" placeholder="Your name" value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })} />
        </Field>
        <Field label="Current weight (lbs)">
          <input type="number" placeholder="180" value={data.weight}
            onChange={e => setData({ ...data, weight: e.target.value })} />
        </Field>
        <Field label="Goal weight (lbs)">
          <input type="number" placeholder="160" value={data.goal}
            onChange={e => setData({ ...data, goal: e.target.value })} />
        </Field>
        <Field label="Daily calorie target">
          <input type="number" placeholder="2100" value={data.calories}
            onChange={e => setData({ ...data, calories: e.target.value })} />
        </Field>
      </div>
    </div>
  )
}

function Equipment({ data, setData }) {
  function toggle(id) {
    const has = data.equipment.includes(id)
    setData({
      ...data,
      equipment: has ? data.equipment.filter(e => e !== id) : [...data.equipment, id],
    })
  }
  return (
    <div className="card">
      <p className="card-title">What's in your gym?</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        Tap everything you have access to — workouts adapt to match.
      </p>
      {EQUIPMENT_CATEGORIES.map(cat => {
        const items = EQUIPMENT_LIST.filter(e => e.cat === cat)
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>{cat}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 6 }}>
              {items.map(eq => {
                const on = data.equipment.includes(eq.id)
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggle(eq.id)}
                    className={on ? '' : 'secondary'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      justifyContent: 'flex-start',
                      padding: '8px 10px', fontSize: 12,
                      borderColor: on ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{eq.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Schedule({ data, setData }) {
  return (
    <div className="card">
      <p className="card-title">How often?</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        Days per week you'll commit to a workout.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {[2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setData({ ...data, days: n })}
            className={data.days === n ? '' : 'secondary'}
            style={{ padding: 16, fontSize: 16, fontWeight: 700 }}
          >
            {n} days/week
          </button>
        ))}
      </div>
    </div>
  )
}

function Level({ data, setData }) {
  const opts = [
    { id: 'beginner', label: 'Beginner', desc: 'New to lifting or returning after a long break' },
    { id: 'intermediate', label: 'Intermediate', desc: '6+ months of consistent training' },
    { id: 'advanced', label: 'Advanced', desc: 'Years of training, comfortable with heavy compounds' },
  ]
  return (
    <div className="card">
      <p className="card-title">Fitness level</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map(o => {
          const on = data.level === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setData({ ...data, level: o.id })}
              className={on ? '' : 'secondary'}
              style={{
                padding: 14,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                borderColor: on ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>{o.label}</span>
              <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 400 }}>{o.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Wearable({ data, setData }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function testOura() {
    if (!data.ouraToken) {
      setTestResult({ ok: false, msg: '⚠️ Paste your token first' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await testOuraToken(data.ouraToken)
      setTestResult(ok ? { ok: true, msg: '✅ Connected — Oura data will sync' } : { ok: false, msg: '❌ Invalid token' })
    } catch {
      setTestResult({ ok: false, msg: '❌ Connection failed' })
    }
    setTesting(false)
  }

  const opts = [
    { id: 'oura', label: 'Oura Ring', icon: '💍', avail: true },
    { id: 'apple', label: 'Apple Watch', icon: '⌚', avail: false },
    { id: 'garmin', label: 'Garmin', icon: '⏱️', avail: false },
    { id: 'whoop', label: 'Whoop', icon: '➰', avail: false },
    { id: 'none', label: 'No wearable', icon: '🚫', avail: true },
  ]

  return (
    <div className="card">
      <p className="card-title">Wearable</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        Optional — pulls in readiness, sleep, HRV, and active calories.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {opts.map(o => {
          const on = data.wearable === o.id
          return (
            <button
              key={o.id}
              type="button"
              disabled={!o.avail}
              onClick={() => o.avail && setData({ ...data, wearable: o.id })}
              className={on ? '' : 'secondary'}
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                position: 'relative',
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                opacity: o.avail ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: 22 }}>{o.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</span>
              {!o.avail && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: 1 }}>SOON</span>
              )}
            </button>
          )
        })}
      </div>

      {data.wearable === 'oura' && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
            Get a Personal Access Token at <span style={{ color: 'var(--accent)' }}>cloud.ouraring.com/personal-access-tokens</span>
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Paste your Oura token"
              value={data.ouraToken}
              onChange={e => setData({ ...data, ouraToken: e.target.value })}
            />
            <button onClick={testOura} disabled={testing} className="orange" style={{ flexShrink: 0 }}>
              {testing ? 'Testing…' : 'Test'}
            </button>
          </div>
          {testResult && (
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: testResult.ok ? 'var(--success)' : 'var(--danger)' }}>
              {testResult.msg}
            </p>
          )}
        </div>
      )}
    </div>
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
