import { useEffect, useRef, useState, useCallback } from 'react'

// Web Speech API wrapper. Lets the user dictate a set: "8 reps at 185 RPE 8"
// or "185 by 8" or "8 at 185" etc. Returns parsed { weight, reps, rpe } from
// the transcript. Falls back gracefully on unsupported browsers — caller
// can check `supported`.

function getSR() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

// Pull numbers out of a phrase. We map number-words → digits because
// recognizers often spell short numbers ("eight reps").
const WORD_NUMS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
}

function normalize(text) {
  let t = text.toLowerCase().replace(/-/g, ' ')
  for (const [w, n] of Object.entries(WORD_NUMS)) {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n))
  }
  return t
}

export function parseSetPhrase(text) {
  if (!text) return {}
  const t = normalize(text)
  const out = {}

  // RPE: "rpe 8", "at rpe 8.5"
  const rpeMatch = t.match(/rpe\s*(\d+(?:\.\d+)?)/)
  if (rpeMatch) out.rpe = parseFloat(rpeMatch[1])

  // Weight: "185 lbs", "at 185", "by 185"
  const weightMatch =
    t.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/) ||
    t.match(/\b(?:at|@)\s*(\d+(?:\.\d+)?)/) ||
    t.match(/\bby\s*(\d+(?:\.\d+)?)/)
  if (weightMatch) out.weight = parseFloat(weightMatch[1])

  // Reps: "8 reps", "for 8"
  const repsMatch =
    t.match(/(\d+)\s*(?:reps?|times)\b/) ||
    t.match(/\bfor\s*(\d+)\b/)
  if (repsMatch) out.reps = parseInt(repsMatch[1], 10)

  // Heuristic fallback: "<n> by <m>" or "<n> at <m>" — first number is reps,
  // second is weight (typical "8 by 185" pattern). Ignore RPE, already handled.
  if (out.reps == null || out.weight == null) {
    const nums = [...t.matchAll(/\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]))
    const filtered = out.rpe != null
      ? nums.filter(n => n !== out.rpe)
      : nums
    if (out.reps == null && out.weight == null && filtered.length >= 2) {
      // Pattern "<reps> by/at <weight>" — first num is small, second is large
      if (filtered[0] < filtered[1]) {
        out.reps = Math.round(filtered[0])
        out.weight = filtered[1]
      } else {
        out.weight = filtered[0]
        out.reps = Math.round(filtered[1])
      }
    } else if (out.reps == null && filtered.length === 1 && filtered[0] < 30) {
      out.reps = Math.round(filtered[0])
    } else if (out.weight == null && filtered.length === 1 && filtered[0] >= 30) {
      out.weight = filtered[0]
    }
  }

  return out
}

export function useVoiceInput({ onResult } = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recRef = useRef(null)
  const SR = getSR()
  const supported = !!SR

  const start = useCallback(() => {
    if (!SR) { setError('Voice input not supported in this browser'); return }
    try {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.continuous = false
      rec.maxAlternatives = 1
      rec.onresult = (e) => {
        const text = e.results[0]?.[0]?.transcript || ''
        setTranscript(text)
        const parsed = parseSetPhrase(text)
        if (onResult) onResult({ text, parsed })
      }
      rec.onerror = (e) => setError(e.error || 'recognition error')
      rec.onend = () => setListening(false)
      rec.start()
      recRef.current = rec
      setError(null)
      setListening(true)
    } catch (e) {
      setError(e.message || String(e))
      setListening(false)
    }
  }, [SR, onResult])

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop() } catch { /* noop */ }
    }
    setListening(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { listening, transcript, error, supported, start, stop }
}
