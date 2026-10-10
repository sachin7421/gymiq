// Shared exercise ranking for both generators.
//
// The old rule was "sort by difficulty, take the first N", which let a push
// day fill up with dips / TRX push-ups / skull crushers and skip shoulders
// entirely. Now we:
//   1. Prefer dumbbell variants when the user owns dumbbells (they asked for
//      more DB shoulder / bicep / chest work), then free-weight, then the rest.
//   2. Round-robin across the requested muscle groups so every group in the
//      focus gets a slot before any group gets a second one.
//
// Input: pool = [[id, ex], …] already filtered for equipment + level.
// Output: same shape, ordered so that `.slice(0, n)` is a balanced pick.

const FREE_WEIGHT = new Set(['dumbbells', 'barbell', 'kettlebells', 'ez_bar'])

function prefScore(ex, eq) {
  if (eq.has('dumbbells') && ex.req.includes('dumbbells')) return 2
  if (ex.req.some(r => FREE_WEIGHT.has(r) && eq.has(r))) return 1
  return 0
}

export function rankPool(pool, muscles, eq) {
  // Stable order within a muscle: preference desc, then harder first, then
  // database order (keeps the classic compounds near the top).
  const indexed = pool.map((entry, i) => ({ entry, i, pref: prefScore(entry[1], eq) }))
  indexed.sort((a, b) => b.pref - a.pref || b.entry[1].level - a.entry[1].level || a.i - b.i)

  // Bucket by primary muscle (first listed), in the order the focus lists them.
  const buckets = new Map(muscles.map(m => [m, []]))
  const other = []
  indexed.forEach(x => {
    const primary = x.entry[1].muscles[0]
    if (buckets.has(primary)) buckets.get(primary).push(x.entry)
    else other.push(x.entry)
  })

  // Round-robin: one from each non-empty bucket per pass.
  const out = []
  let progressed = true
  while (progressed) {
    progressed = false
    for (const m of muscles) {
      const b = buckets.get(m)
      if (b && b.length) { out.push(b.shift()); progressed = true }
    }
  }
  return [...out, ...other]
}
