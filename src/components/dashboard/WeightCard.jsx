import { useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { todayStr, daysSinceStart, daysBetween } from '../../lib/dateUtils.js'

export default function WeightCard() {
  const { state, setState } = useUserDataContext()
  const [input, setInput] = useState('')
  const [waistInput, setWaistInput] = useState('')

  const lost = state.startWeight - state.currentWeight
  const goalDelta = state.startWeight - state.goalWeight
  const progressPct = goalDelta > 0 ? Math.min(100, Math.max(0, Math.round((lost / goalDelta) * 100))) : 0
  const remaining = Math.max(0, state.currentWeight - state.goalWeight)

  const waistHist = state.waistHistory || []        // newest first
  const lastWaist = waistHist[0] || null
  const firstWaist = waistHist[waistHist.length - 1] || null
  const waistAge = lastWaist ? daysBetween(lastWaist.date, todayStr()) : null
  const waistDue = lastWaist == null || waistAge >= 7

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

  function logWaist() {
    const val = parseFloat(waistInput)
    if (!val || val < 20 || val > 80) return
    const today = todayStr()
    setState(prev => {
      const history = (prev.waistHistory || []).filter(e => e.date !== today)
      return { ...prev, waistHistory: [{ date: today, waist: val }, ...history] }
    })
    setWaistInput('')
  }

  return (
    <div className="card">
      <p className="card-title">Weight &amp; waist</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 60, lineHeight: 1 }}>{state.currentWeight}</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>lbs</span>
        {lastWaist && (
          <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, color: 'var(--accent3)' }}>{lastWaist.waist}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>in waist</span>
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Goal {state.goalWeight} · <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{remaining} lbs to go</span> · {lost.toFixed(1)} lost · Day {daysSinceStart(state.startDate)}
      </p>
      <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--accent2), var(--accent))', transition: 'width 0.8s' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={waistDue ? 'Waist (in) — weekly check due' : 'Waist (in)'}
          value={waistInput}
          onChange={e => setWaistInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && logWaist()}
          style={{ borderColor: waistDue ? 'var(--accent3)' : undefined }}
        />
        <button onClick={logWaist} style={{ flexShrink: 0, background: 'var(--accent3)' }}>Save</button>
      </div>

      <WaistTrend history={waistHist} first={firstWaist} last={lastWaist} age={waistAge} />
    </div>
  )
}

// Compact waist trend — last 12 entries as a sparkline plus delta since the
// first measurement. Weight can drop while waist holds (water/creatine) or
// waist can drop while weight holds (fat loss + muscle); seeing both matters.
function WaistTrend({ history, first, last, age }) {
  if (!last) {
    return (
      <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
        Measure your waist once a week at the navel — separates fat loss from creatine water.
      </p>
    )
  }
  const pts = [...history].slice(0, 12).reverse() // oldest → newest
  const delta = last.waist - first.waist
  const W = 300, H = 36, PAD = 4
  const vals = pts.map(p => p.waist)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = Math.max(0.5, max - min)
  const x = i => pts.length <= 1 ? W / 2 : PAD + (i / (pts.length - 1)) * (W - PAD * 2)
  const y = v => PAD + (1 - (v - min) / span) * (H - PAD * 2)
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.waist).toFixed(1)}`).join(' ')
  const deltaColor = delta < 0 ? 'var(--success)' : delta > 0 ? 'var(--accent2)' : 'var(--muted)'

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Waist · last logged {age === 0 ? 'today' : `${age}d ago`}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: deltaColor, fontWeight: 600 }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} in since {first.date.slice(5)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} aria-hidden="true">
        {pts.length > 1 && <path d={path} fill="none" stroke="var(--accent3)" strokeWidth="2" strokeLinejoin="round" />}
        {pts.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.waist)} r="2.5" fill="var(--accent3)" />)}
      </svg>
    </div>
  )
}
