import { useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { todayStr, daysSinceStart } from '../../lib/dateUtils.js'

export default function WeightCard() {
  const { state, setState } = useUserDataContext()
  const [input, setInput] = useState('')

  const lost = state.startWeight - state.currentWeight
  const goalDelta = state.startWeight - state.goalWeight
  const progressPct = goalDelta > 0 ? Math.min(100, Math.max(0, Math.round((lost / goalDelta) * 100))) : 0
  const remaining = Math.max(0, state.currentWeight - state.goalWeight)

  function logWeight() {
    const val = parseFloat(input)
    if (!val || val < 100 || val > 500) return
    const today = todayStr()
    setState(prev => {
      const prevWeight = prev.currentWeight
      const history = (prev.weightHistory || []).filter(e => e.date !== today)
      return {
        ...prev,
        currentWeight: val,
        weightHistory: [{ date: today, weight: val, prev: prevWeight }, ...history],
      }
    })
    setInput('')
  }

  return (
    <div className="card">
      <p className="card-title">Weight</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 60, lineHeight: 1 }}>{state.currentWeight}</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>lbs</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Goal {state.goalWeight} · <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{remaining} lbs to go</span> · {lost.toFixed(1)} lost · Day {daysSinceStart(state.startDate)}
      </p>
      <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--accent2), var(--accent))', transition: 'width 0.8s' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="Log today's weight"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && logWeight()}
        />
        <button className="orange" onClick={logWeight} style={{ flexShrink: 0 }}>Save</button>
      </div>
    </div>
  )
}
