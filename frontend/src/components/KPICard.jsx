// src/components/KPICard.jsx
export default function KPICard({ label, value, sub, color = 'blue' }) {
  const gradients = {
    blue:   'from-blue-500 to-blue-700',
    green:  'from-emerald-500 to-emerald-700',
    red:    'from-red-500 to-red-700',
    amber:  'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-700',
    sky:    'from-sky-500 to-cyan-600',
    teal:   'from-teal-500 to-teal-700',
    indigo: 'from-indigo-500 to-indigo-700',
    rose:   'from-rose-500 to-pink-600',
    lime:   'from-lime-500 to-green-600',
  }
  return (
    <div className={`kpi-card bg-gradient-to-br ${gradients[color] ?? gradients.blue} text-white`}>
      <div className="text-xs uppercase tracking-widest opacity-80 font-semibold">{label}</div>
      <div className="text-3xl font-extrabold mt-1 mb-0.5 tracking-tight">{value ?? '—'}</div>
      <div className="text-xs opacity-75">{sub}</div>
    </div>
  )
}
