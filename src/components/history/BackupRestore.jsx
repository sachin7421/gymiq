import { useRef, useState } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { DEFAULT_STATE, EPHEMERAL_KEYS } from '../../lib/state.js'
import { todayStr } from '../../lib/dateUtils.js'
import { generateWorkouts } from '../../lib/workoutGenerator.js'

function strip(state) {
  const out = { ...state }
  EPHEMERAL_KEYS.forEach(k => { delete out[k] })
  return out
}

export default function BackupRestore() {
  const { state, setState, flushSave } = useUserDataContext()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(strip(state), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gymiq-backup-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg({ ok: true, text: '✅ Backup downloaded' })
  }

  function onPickFile() { fileRef.current?.click() }

  function importJson(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.startDate) throw new Error('Not a valid GymIQ backup')
        if (!window.confirm('Import this backup? Replaces current data.')) return
        const merged = { ...DEFAULT_STATE, ...parsed, onboardingComplete: true }
        // Regenerate workouts from imported equipment/days/level — never trust the saved value.
        merged.generatedWorkouts = generateWorkouts(
          merged.equipment || [],
          merged.trainingDays || 4,
          merged.fitnessLevel || 'intermediate',
        )
        setState(merged)
        setMsg({ ok: true, text: '✅ Imported — syncing…' })
        setTimeout(() => flushSave(), 200)
      } catch (err) {
        setMsg({ ok: false, text: `❌ ${err.message || 'Invalid backup file'}` })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="card">
      <p className="card-title">Backup & restore</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Export a JSON snapshot to keep, or import one to restore. Cloud sync runs automatically.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={exportJson} className="secondary" style={{ flex: 1 }}>↓ Export JSON</button>
        <button onClick={onPickFile} className="secondary" style={{ flex: 1 }}>↑ Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />
      </div>
      {msg && (
        <p style={{ fontSize: 12, marginTop: 10, fontFamily: 'var(--font-mono)', color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
