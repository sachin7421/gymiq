import { useState, useRef } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { importHealthFile } from '../../lib/appleHealth.js'

function fmtBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function AppleHealthImport() {
  const { state, setState } = useUserDataContext()
  const fileInputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setResult(null)
    setBusy(true)
    setProgress({ stage: 'reading', label: `Reading ${fmtBytes(file.size)}…` })
    try {
      const out = await importHealthFile(file, {
        onProgress: (p) => {
          if (p.done) return
          setProgress({
            stage: 'parsing',
            label: `Parsing… ${p.recordCount?.toLocaleString() || 0} records`,
          })
        },
      })

      // Merge into state. Preserve existing days where the new import has no data
      // (e.g. partial export).
      setState(prev => ({
        ...prev,
        healthData: { ...(prev.healthData || {}), ...out.dailyData },
        healthWorkouts: out.workouts.slice(0, 200),
        lastHealthImport: new Date().toISOString(),
      }))
      setResult(out.stats)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const dayCount = Object.keys(state.healthData || {}).length

  return (
    <div className="card">
      <p className="card-title">🍎 Apple Health</p>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
        On your iPhone: Health app → tap your photo (top-right) → <strong>Export All Health Data</strong>.
        AirDrop / email the .zip to yourself, then drop it here. We extract steps, sleep,
        HRV, resting HR, body weight, VO2 max, and recent workouts.
      </p>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          background: dragOver ? 'var(--accent-light)' : 'var(--surface2)',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
          {busy ? '⏳ Processing…' : '📥 Drop export.zip here or click to choose'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Accepts .zip or pre-extracted export.xml
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.xml,application/zip,text/xml"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      {progress && (
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          {progress.label}
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{
          marginTop: 10,
          padding: '10px 12px',
          background: 'var(--accent-light)',
          borderRadius: 8,
          borderLeft: '3px solid var(--accent)',
          fontSize: 12,
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          ✓ Imported <strong>{result.recordCount.toLocaleString()}</strong> records
          and <strong>{result.workoutCount}</strong> workouts.
          {result.dateRange?.[0] && <> Range: {result.dateRange[0]} → {result.dateRange[1]}.</>}
        </div>
      )}

      {dayCount > 0 && !busy && (
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 10 }}>
          {dayCount} days on file
          {state.lastHealthImport && ` · last import ${new Date(state.lastHealthImport).toLocaleString()}`}
        </p>
      )}
    </div>
  )
}
