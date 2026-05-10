import { useMemo } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { useOura } from '../../hooks/useOura.js'
import { computeReadiness } from '../../lib/readiness.js'
import { buildBrief } from '../../lib/dailyBrief.js'

const TIER_COLORS = {
  push: 'var(--accent)',
  normal: 'var(--accent3)',
  maintain: 'var(--warn)',
  deload: 'var(--danger)',
  unknown: 'var(--muted)',
}

export default function DailyBrief({ dayGoal }) {
  const { state } = useUserDataContext()
  const { data: oura } = useOura(state.ouraToken, !!state.hasOura)

  const readiness = useMemo(
    () => computeReadiness({ oura, healthData: state.healthData }),
    [oura, state.healthData],
  )

  const brief = useMemo(
    () => buildBrief({ state, dayGoal, readiness, oura }),
    [state, dayGoal, readiness, oura],
  )

  if (!brief) return null

  const tierColor = TIER_COLORS[brief.readinessTier] || TIER_COLORS.unknown

  return (
    <div className="card" style={{ borderLeft: `4px solid ${brief.color}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase' }}>
          TODAY'S BRIEF · {brief.dowName}
        </p>
        {brief.readinessScore != null && (
          <span style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 100,
            background: 'var(--surface2)',
            border: `1px solid ${tierColor}`,
            color: tierColor,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            R {brief.readinessScore} · {brief.readinessTier}
          </span>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: brief.color, marginBottom: 6 }}>
        {brief.icon} {brief.headline}
      </p>
      {brief.body && (
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55 }}>
          {brief.body}
        </p>
      )}
    </div>
  )
}
