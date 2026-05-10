// Apple Health export parser. Accepts the export.zip from iOS Health
// "Export All Health Data", or a pre-unzipped export.xml.
//
// We do NOT parse the full XML tree — exports are typically 100-500MB and
// 95% of records are types we don't care about (audio events, environmental
// noise, etc.). Instead we regex over the raw text for self-closing
// <Record .../> and <Workout .../> tags whose `type` matches our allowlist
// and aggregate to daily values.
//
// Output shape:
//   {
//     dailyData: { '2026-05-09': { steps, activeCalories, restingHr, hrv, sleepHours, weight, vo2Max } },
//     workouts:  [{ date, type, durationMin, calories, distanceMi }, ...]   // last 90 days
//     stats:     { recordCount, workoutCount, dateRange: [start, end] }
//   }

// JSZip is lazy-loaded (only when the user drops a .zip) to keep the main
// bundle small.

const TRACKED_TYPES = new Set([
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierVO2Max',
  'HKCategoryTypeIdentifierSleepAnalysis',
])

// Workouts in last 90 days only — beyond that we don't need granular cardio
const WORKOUT_LOOKBACK_DAYS = 90

function localDateKey(isoString) {
  // Apple records are like "2026-05-09 07:23:45 -0700". Extract YYYY-MM-DD
  // from the local-time portion.
  return isoString.slice(0, 10)
}

function parseDate(isoString) {
  // " " separator instead of "T" — Date constructor handles both with the
  // timezone offset in modern engines; spec was sketchy historically.
  const normalized = isoString.replace(' ', 'T')
  return new Date(normalized)
}

function attrValue(tag, attr) {
  const re = new RegExp(`\\b${attr}="([^"]*)"`)
  const m = tag.match(re)
  return m ? m[1] : null
}

function kgToLb(kg) { return kg * 2.20462 }
function metersToMi(m) { return m * 0.000621371 }

export async function loadHealthFile(file) {
  // Accepts a .zip OR a .xml. Returns the export.xml as a string.
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xml')) {
    return await file.text()
  }
  if (name.endsWith('.zip')) {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(file)
    // Apple's export puts the file at apple_health_export/export.xml
    let entry = zip.file('apple_health_export/export.xml')
    if (!entry) {
      // some users rename the folder; search for any export.xml
      const candidates = Object.keys(zip.files).filter(k => k.endsWith('/export.xml') || k === 'export.xml')
      if (candidates.length === 0) throw new Error('No export.xml found inside zip.')
      entry = zip.file(candidates[0])
    }
    return await entry.async('string')
  }
  throw new Error('Unsupported file. Expected .zip or .xml.')
}

export function parseHealthXml(xml, { onProgress } = {}) {
  const dailyData = {}
  const workouts = []
  let recordCount = 0
  let workoutCount = 0
  let firstDate = null
  let lastDate = null

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - WORKOUT_LOOKBACK_DAYS)

  // Pre-bucket per-source-per-day for steps and active cal so we can choose
  // the highest-reporting source per day (avoids iPhone+Watch double count).
  const sourceBuckets = {} // bucket[type][date][source] = number

  const recordRe = /<Record\b([^/>]*)\/?>/g
  const workoutRe = /<Workout\b([^/>]*?)\/?>/g

  let m
  let processed = 0
  const total = xml.length

  while ((m = recordRe.exec(xml)) !== null) {
    const tag = m[0]
    const type = attrValue(tag, 'type')
    if (!type || !TRACKED_TYPES.has(type)) {
      // throttle progress reporting
      if ((++processed % 50000) === 0 && onProgress) onProgress({ processed, total: total / 1000 })
      continue
    }
    recordCount++

    const valueStr = attrValue(tag, 'value')
    const startDate = attrValue(tag, 'startDate')
    const endDate = attrValue(tag, 'endDate')
    const unit = attrValue(tag, 'unit')
    const source = attrValue(tag, 'sourceName') || 'unknown'
    const dateKey = startDate ? localDateKey(startDate) : null
    if (!dateKey) continue

    if (!firstDate || dateKey < firstDate) firstDate = dateKey
    if (!lastDate || dateKey > lastDate) lastDate = dateKey

    const day = (dailyData[dateKey] ||= {})

    switch (type) {
      case 'HKQuantityTypeIdentifierStepCount': {
        const v = parseFloat(valueStr) || 0
        const buck = (sourceBuckets.steps ||= {})
        const dayBuck = (buck[dateKey] ||= {})
        dayBuck[source] = (dayBuck[source] || 0) + v
        break
      }
      case 'HKQuantityTypeIdentifierActiveEnergyBurned': {
        const v = parseFloat(valueStr) || 0
        const buck = (sourceBuckets.activeCalories ||= {})
        const dayBuck = (buck[dateKey] ||= {})
        dayBuck[source] = (dayBuck[source] || 0) + v
        break
      }
      case 'HKQuantityTypeIdentifierRestingHeartRate': {
        const v = parseFloat(valueStr)
        if (v) day.restingHr = v // last write wins (records are roughly daily)
        break
      }
      case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': {
        const v = parseFloat(valueStr)
        if (v) {
          // Average of all readings for the day
          if (day._hrvSum == null) { day._hrvSum = 0; day._hrvCount = 0 }
          day._hrvSum += v
          day._hrvCount += 1
        }
        break
      }
      case 'HKQuantityTypeIdentifierBodyMass': {
        const v = parseFloat(valueStr)
        if (v) {
          const lbs = unit === 'kg' ? kgToLb(v) : v
          day.weight = +lbs.toFixed(1) // last write wins
        }
        break
      }
      case 'HKQuantityTypeIdentifierBodyFatPercentage': {
        const v = parseFloat(valueStr)
        if (v) day.bodyFatPct = +(v * 100).toFixed(1) // Apple stores as fraction
        break
      }
      case 'HKQuantityTypeIdentifierVO2Max': {
        const v = parseFloat(valueStr)
        if (v) day.vo2Max = +v.toFixed(1)
        break
      }
      case 'HKCategoryTypeIdentifierSleepAnalysis': {
        // Sum durations of asleep records, attribute to the date the sleep
        // session ended (so a session crossing midnight goes to today).
        if (valueStr && valueStr.includes('Asleep') && startDate && endDate) {
          const start = parseDate(startDate)
          const end = parseDate(endDate)
          const hours = Math.max(0, (end - start) / 3600000)
          if (hours > 0 && hours < 16) { // sanity bound
            const sleepDateKey = localDateKey(endDate)
            const sleepDay = (dailyData[sleepDateKey] ||= {})
            sleepDay.sleepHours = +((sleepDay.sleepHours || 0) + hours).toFixed(2)
          }
        }
        break
      }
    }

    if ((++processed % 50000) === 0 && onProgress) onProgress({ processed, recordCount })
  }

  // Resolve sourceBuckets: pick max reporting source per day for sums
  for (const type of ['steps', 'activeCalories']) {
    const buck = sourceBuckets[type]
    if (!buck) continue
    for (const [dateKey, sources] of Object.entries(buck)) {
      const max = Math.max(...Object.values(sources))
      if (!isFinite(max) || max <= 0) continue
      ;(dailyData[dateKey] ||= {})[type] = Math.round(max)
    }
  }

  // Finalize HRV (avg)
  for (const day of Object.values(dailyData)) {
    if (day._hrvCount > 0) {
      day.hrv = +(day._hrvSum / day._hrvCount).toFixed(1)
    }
    delete day._hrvSum
    delete day._hrvCount
  }

  // Workouts (last 90d only)
  while ((m = workoutRe.exec(xml)) !== null) {
    const tag = m[0]
    const startDate = attrValue(tag, 'startDate')
    if (!startDate) continue
    const start = parseDate(startDate)
    if (start < cutoff) continue
    const activityType = (attrValue(tag, 'workoutActivityType') || '').replace('HKWorkoutActivityType', '')
    const duration = parseFloat(attrValue(tag, 'duration')) || 0
    const durationUnit = attrValue(tag, 'durationUnit') || 'min'
    const totalEnergy = parseFloat(attrValue(tag, 'totalEnergyBurned')) || 0
    const distance = parseFloat(attrValue(tag, 'totalDistance')) || 0
    const distanceUnit = attrValue(tag, 'totalDistanceUnit') || 'mi'
    const dateKey = localDateKey(startDate)

    const durationMin = durationUnit === 'sec' ? duration / 60 : duration
    const distanceMi = distanceUnit === 'km' ? distance * 0.621371
      : distanceUnit === 'm' ? metersToMi(distance)
      : distance

    workouts.push({
      date: dateKey,
      type: activityType || 'Unknown',
      durationMin: +durationMin.toFixed(1),
      calories: Math.round(totalEnergy),
      distanceMi: distanceMi > 0 ? +distanceMi.toFixed(2) : null,
    })
    workoutCount++
  }

  // Sort workouts newest first
  workouts.sort((a, b) => b.date.localeCompare(a.date))

  if (onProgress) onProgress({ processed, recordCount, done: true })

  return {
    dailyData,
    workouts,
    stats: {
      recordCount,
      workoutCount,
      dateRange: [firstDate, lastDate],
    },
  }
}

export async function importHealthFile(file, opts) {
  const xml = await loadHealthFile(file)
  return parseHealthXml(xml, opts)
}

// Latest non-null value for a metric across the last `days` days
export function latestMetric(healthData, metric, days = 14) {
  if (!healthData) return null
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const val = healthData[key]?.[metric]
    if (val != null) return { value: val, date: key, ageDays: i }
  }
  return null
}

// Average of a metric across a window
export function avgMetric(healthData, metric, days = 14) {
  if (!healthData) return null
  const today = new Date()
  let sum = 0, count = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const val = healthData[key]?.[metric]
    if (val != null) { sum += val; count++ }
  }
  return count > 0 ? sum / count : null
}
