const PROXY = import.meta.env.VITE_OURA_PROXY || 'https://gymiq-oura.sachin8.workers.dev/'

async function fetchEndpoint(token, endpoint, start, end) {
  const url = `${PROXY}?endpoint=${endpoint}&start=${start}&end=${end}`
  const res = await fetch(url, { headers: { 'x-oura-token': token } })
  if (!res.ok) throw new Error(`Oura ${endpoint} ${res.status}`)
  return res.json()
}

export async function testOuraToken(token) {
  const today = new Date().toISOString().slice(0, 10)
  const data = await fetchEndpoint(token, 'daily_readiness', today, today)
  return Array.isArray(data?.data)
}

export async function fetchOuraSummary(token) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7)
  const s = start.toISOString().slice(0, 10)
  const e = today.toISOString().slice(0, 10)

  const [readiness, sleep, dailySleep, activity] = await Promise.all([
    fetchEndpoint(token, 'daily_readiness', s, e).catch(() => ({ data: [] })),
    fetchEndpoint(token, 'sleep', s, e).catch(() => ({ data: [] })),
    fetchEndpoint(token, 'daily_sleep', s, e).catch(() => ({ data: [] })),
    fetchEndpoint(token, 'daily_activity', s, e).catch(() => ({ data: [] })),
  ])

  const latestReadiness = (readiness.data || []).at(-1)
  const latestSleep = (sleep.data || []).at(-1)
  const latestDailySleep = (dailySleep.data || []).at(-1)
  const latestActivity = (activity.data || []).at(-1)

  return {
    readinessScore: latestReadiness?.score ?? null,
    sleepScore: latestDailySleep?.score ?? null,
    averageHrv: latestSleep?.average_hrv ?? null,
    restingHr: latestSleep?.lowest_heart_rate ?? null,
    sleepHours: latestSleep?.total_sleep_duration ? +(latestSleep.total_sleep_duration / 3600).toFixed(1) : null,
    activeCalories: latestActivity?.active_calories ?? null,
    activityDate: latestActivity?.day ?? null,
  }
}
