import { EQUIPMENT_LIST, EQUIPMENT_CATEGORIES } from '../../lib/exerciseDb.js'

export default function EquipmentGrid({ selected, onToggle }) {
  return (
    <>
      {EQUIPMENT_CATEGORIES.map(cat => {
        const items = EQUIPMENT_LIST.filter(e => e.cat === cat)
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>{cat}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 6 }}>
              {items.map(eq => {
                const on = selected.includes(eq.id)
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => onToggle(eq.id)}
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
    </>
  )
}
