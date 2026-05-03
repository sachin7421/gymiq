import { useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'

const CIRC = 213.6 // 2*pi*r where r=34

export default function CalorieRing() {
  const { state, setState } = useUserDataContext()
  const [eat, setEat] = useState('')
  const [burn, setBurn] = useState('')

  const consumed = state.calories || 0
  const burned = state.burned || 0
  const target = state.calorieTarget || 2100
  const cap = target + burned
  const remaining = Math.max(0, cap - consumed)
  const pct = Math.min(1, consumed / Math.max(1, cap))
  const offset = CIRC - pct * CIRC
  const over = consumed > cap

  function addCalories() {
    const v = parseInt(eat)
    if (!v || v < 0) return
    setState(prev => ({ ...prev, calories: (prev.calories || 0) + v }))
    setEat('')
  }
  function addBurned() {
    const v = parseInt(burn)
    if (!v || v < 0) return
    setState(prev => ({ ...prev, burned: (prev.burned || 0) + v }))
    setBurn('')
  }
  function reset() {
    setState(prev => ({ ...prev, calories: 0, burned: 0 }))
  }

  return (
    <div className="card">
      <p className="card-title">Calorie deficit</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface2)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={over ? 'var(--danger)' : 'var(--accent2)'}
              strokeWidth="6"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s, stroke 0.2s' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>{consumed}</p>
            <p style={{ fontSize: 9, color: 'var(--muted)' }}>eaten</p>
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 13 }}>
          <CalRow label="Eaten" value={consumed} />
          <CalRow label="Burned" value={burned} color="var(--accent)" />
          <CalRow label={over ? 'Over' : 'Remaining'} value={remaining} color={over ? 'var(--danger)' : 'var(--text)'} />
          <CalRow label="Target" value={target} muted />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input type="number" inputMode="numeric" placeholder="+ eaten" value={eat}
          onChange={e => setEat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCalories()} />
        <button onClick={addCalories} className="orange" style={{ flexShrink: 0, padding: '10px 14px', fontSize: 13 }}>Eat</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" inputMode="numeric" placeholder="+ burned" value={burn}
          onChange={e => setBurn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBurned()} />
        <button onClick={addBurned} style={{ flexShrink: 0, padding: '10px 14px', fontSize: 13 }}>Burn</button>
      </div>
      <button className="secondary sm" onClick={reset} style={{ marginTop: 8, width: '100%' }}>Reset today</button>
    </div>
  )
}

function CalRow({ label, value, color, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: muted ? 'var(--muted)' : 'var(--text2)' }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: color || 'inherit' }}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}
