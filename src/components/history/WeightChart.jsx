import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

// Weight (left axis) and waist (right axis) on one chart so fat loss can be
// separated from water-weight swings: weight flat + waist down = winning.
export default function WeightChart({ history, waist = [], goal }) {
  if ((!history || history.length === 0) && waist.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
        Log a weight to see your trend.
      </p>
    )
  }

  // Union of dates, oldest first, sparse fields left undefined so lines connect.
  const byDate = {}
  ;(history || []).forEach(e => { byDate[e.date] = { ...(byDate[e.date] || {}), date: e.date, weight: e.weight } })
  waist.forEach(e => { byDate[e.date] = { ...(byDate[e.date] || {}), date: e.date, waist: e.waist } })
  const data = Object.values(byDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({ ...e, label: e.date.slice(5) }))
  const hasWaist = waist.length > 0

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: hasWaist ? 0 : 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent2)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
          <YAxis yAxisId="w" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} domain={['auto', 'auto']} />
          {hasWaist && (
            <YAxis yAxisId="in" orientation="right" stroke="var(--accent3)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} domain={['auto', 'auto']} width={34} />
          )}
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            labelStyle={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            formatter={(v, name) => [name === 'waist' ? `${v} in` : `${v} lbs`, name === 'waist' ? 'Waist' : 'Weight']}
          />
          {hasWaist && <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-mono)' }} />}
          {goal != null && goal > 0 && (
            <ReferenceLine yAxisId="w" y={goal} stroke="var(--success)" strokeDasharray="4 4" label={{ value: `Goal ${goal}`, fill: 'var(--success)', fontSize: 11, position: 'insideTopRight' }} />
          )}
          <Line
            yAxisId="w"
            type="monotone"
            dataKey="weight"
            name="weight"
            stroke="url(#weightGrad)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--accent2)', stroke: 'var(--accent2)' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          {hasWaist && (
            <Line
              yAxisId="in"
              type="monotone"
              dataKey="waist"
              name="waist"
              stroke="var(--accent3)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: 'var(--accent3)', stroke: 'var(--accent3)' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
