import { PROGRAM, PROGRAM_TOTAL_DAYS, programDay, checkpointStatus, daysUntil, fmtShort } from '../../lib/program.js'
import { todayStr } from '../../lib/dateUtils.js'

const STATUS_STYLE = {
  past: { color: 'var(--muted)', label: 'done' },
  now: { color: 'var(--accent2)', label: 'this window' },
  upcoming: { color: 'var(--accent3)', label: '' },
}

export default function ProgramCard() {
  const today = todayStr()
  const day = programDay(today)
  const pct = Math.min(100, Math.max(0, (day / PROGRAM_TOTAL_DAYS) * 100))
  const daysLeft = Math.max(0, daysUntil(PROGRAM.end, today))
  const notStarted = today < PROGRAM.start

  return (
    <div className="card">
      <p className="card-title">Program · {fmtShort(PROGRAM.start)} → {fmtShort(PROGRAM.end)}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, color: 'var(--accent)' }}>
          {notStarted ? '—' : `Day ${day}`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          of {PROGRAM_TOTAL_DAYS} · {notStarted ? `starts in ${daysUntil(PROGRAM.start, today)}d` : `${daysLeft}d left`}
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 100, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.6s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PROGRAM.checkpoints.map(cp => {
          const status = checkpointStatus(cp, today)
          const s = STATUS_STYLE[status]
          const until = daysUntil(cp.date, today)
          const range = cp.windowEnd ? `${fmtShort(cp.date)}–${fmtShort(cp.windowEnd)}` : fmtShort(cp.date)
          return (
            <div key={cp.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 10,
              background: status === 'now' ? 'rgba(224,92,26,0.08)' : 'var(--surface2)',
              border: `1px solid ${status === 'now' ? 'var(--accent2)' : 'var(--border)'}`,
              opacity: status === 'past' ? 0.6 : 1,
            }}>
              <span style={{ fontSize: 18 }}>{cp.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, textDecoration: status === 'past' ? 'line-through' : 'none' }}>{cp.label}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{cp.when} · {range}</p>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, color: s.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {status === 'upcoming' ? `in ${until}d` : s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
