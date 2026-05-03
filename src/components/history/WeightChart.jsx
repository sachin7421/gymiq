import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

export default function WeightChart({ history, goal }) {
  if (!history || history.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
        Log a weight to see your trend.
      </p>
    )
  }

  // recharts wants oldest first
  const data = [...history]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({ date: e.date.slice(5), weight: e.weight }))

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent2)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
          />
          {goal != null && goal > 0 && (
            <ReferenceLine y={goal} stroke="var(--success)" strokeDasharray="4 4" label={{ value: `Goal ${goal}`, fill: 'var(--success)', fontSize: 10, position: 'right' }} />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#weightGrad)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--accent2)', stroke: 'var(--accent2)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
