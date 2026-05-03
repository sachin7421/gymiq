import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', icon: '◎' },
  { to: '/workouts', label: 'Workout', icon: '◢' },
  { to: '/plan', label: 'Plan', icon: '☰' },
  { to: '/history', label: 'History', icon: '∿' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'var(--safe-bottom)',
      zIndex: 100,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 4px 12px',
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            })}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
