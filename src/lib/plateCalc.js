// Plate calculator. Given a target weight + bar weight, return the plates
// loaded *per side* (greedy from largest available).
//
// Default plate set is what most US home gyms have; a different set can be
// passed for kg gyms or odd inventories.

const DEFAULT_PLATES_LBS = [45, 35, 25, 10, 5, 2.5]

export function platesPerSide(target, barWeight = 45, plates = DEFAULT_PLATES_LBS) {
  if (target == null || target <= 0) return { plates: [], remainder: 0 }
  if (target <= barWeight) return { plates: [], remainder: target - barWeight }
  let perSide = (target - barWeight) / 2
  const out = []
  for (const p of plates) {
    while (perSide >= p - 1e-6) {
      out.push(p)
      perSide -= p
    }
  }
  return { plates: out, remainder: perSide }
}

export function summarizePlates(target, barWeight = 45) {
  const { plates, remainder } = platesPerSide(target, barWeight)
  if (plates.length === 0 && remainder === 0) return ''
  // Group same plates: "45×2 + 25 + 10"
  const groups = []
  for (const p of plates) {
    const last = groups[groups.length - 1]
    if (last && last.weight === p) last.count++
    else groups.push({ weight: p, count: 1 })
  }
  const parts = groups.map(g => g.count > 1 ? `${g.weight}×${g.count}` : `${g.weight}`)
  let s = parts.join(' + ')
  if (Math.abs(remainder) > 0.01) s += ` (~${remainder.toFixed(1)} lb short)`
  return s
}
