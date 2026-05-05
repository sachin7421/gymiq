import { useState, useMemo } from 'react'
import { useUserDataContext } from '../../contexts/UserDataContext.jsx'
import { useOura } from '../../hooks/useOura.js'
import { askCoach, buildContext, suggestQuestions } from '../../lib/coach.js'

export default function CoachCard() {
  const { state } = useUserDataContext()
  const { data: oura } = useOura(state.ouraToken, !!state.hasOura)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const hasKey = !!state.anthropicKey
  const suggestions = useMemo(() => suggestQuestions(state, oura), [state, oura])

  async function ask(q) {
    const text = (q || question).trim()
    if (!text) return
    setLoading(true)
    setError(null)
    setAnswer('')
    try {
      const ctx = buildContext(state, oura)
      const reply = await askCoach(state.anthropicKey, text, ctx)
      setAnswer(reply)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!hasKey) {
    return (
      <div className="card">
        <p className="card-title">🧠 Coach</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.5 }}>
          Get a personal coach that knows your training data. Add an Anthropic
          API key in Settings to enable.
        </p>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Key stays in your account — only sent to Anthropic when you ask a question.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="card-title">🧠 Coach</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Ask anything about your training…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          disabled={loading}
        />
        <button
          onClick={() => ask()}
          disabled={loading || !question.trim()}
          className="orange"
          style={{ flexShrink: 0 }}
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      {!answer && !loading && !error && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setQuestion(s); ask(s) }}
              className="secondary sm"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          {error}
        </p>
      )}

      {answer && (
        <div style={{
          marginTop: 10,
          padding: '12px 14px',
          background: 'var(--surface2)',
          borderRadius: 10,
          borderLeft: '3px solid var(--accent)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
        }}>
          {answer}
        </div>
      )}

      {loading && (
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          Thinking…
        </p>
      )}
    </div>
  )
}
