import { useEffect, useState, useCallback } from 'react'
import { fetchOverview, fetchMonitoring } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import { Spinner, EmptyState, ErrorBox } from '../components/UI'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  ReferenceLine
} from 'recharts'

const PIE_COLORS = ['#10b981', '#ef4444']


const TABLE_COLS_SHOW = [
  'material_desc',
  'cb1_bulan',
  'cb1_suhu_rata',
  'cb2_suhu_rata',
  'cb1_rata_ka',
  'cb2_rata_ka',
  'cb1_pct_yield',
  'ck1_pct_yield',
  'cb2_pct_yield',
  'label_display',
]

const COL_LABEL = {
  material_desc:  'Material',
  cb1_bulan:      'Bulan',
  cb1_suhu_rata:  'Suhu CB1 (°C)',
  cb2_suhu_rata:  'Suhu CB2 (°C)',
  cb1_rata_ka:    'Kadar Air CB1 (%)',
  cb2_rata_ka:    'Kadar Air CB2 (%)',
  cb1_pct_yield:  'Yield CB1 (%)',
  ck1_pct_yield:  'Yield CK1 (%)',
  cb2_pct_yield:  'Yield CB2 (%)',
  label_display:  'Status',
}


const THRESHOLDS = {
  'Suhu CB1 (°C)':      { max: 75 },
  'Suhu CB2 (°C)':      { max: 75 },
  'Kadar Air CB1 (%)':  { min: 3.0, max: 5.5 },
  'Kadar Air CB2 (%)':  { min: 3.0, max: 5.5 },
  'Yield CB1 (%)':      { min: 99, max: 103.1 },
  'Yield CB2 (%)':      { min: 99, max: 103.1 },
  'Yield CK1 (%)':      { min: 99, max: 103.1 },
}


function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const thresh = THRESHOLDS[label] ?? {}
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="mb-0.5">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
      {(thresh.min != null || thresh.max != null) && (
        <p className="text-slate-400 mt-1 border-t border-slate-100 pt-1">
          Batas normal:{' '}
          {thresh.min != null ? `≥${thresh.min}` : ''}
          {thresh.min != null && thresh.max != null ? ' – ' : ''}
          {thresh.max != null ? `≤${thresh.max}` : ''}
        </p>
      )}
    </div>
  )
}

export default function Monitoring({ hasData }) {
  const [overview, setOverview] = useState(null)
  const [table,    setTable]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [page,     setPage]     = useState(1)
  const [filters,  setFilters]  = useState({ bulan: 'Semua', line: 'Semua', status: 'Semua' })

  useEffect(() => {
    if (!hasData) return
    setLoading(true)
    fetchOverview()
      .then(r  => setOverview(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Gagal memuat overview'))
      .finally(() => setLoading(false))
  }, [hasData])

  const loadTable = useCallback(() => {
    if (!hasData) return
    fetchMonitoring({ page, limit: 20, ...filters })
      .then(r  => setTable(r.data))
      .catch(() => {})
  }, [hasData, page, filters])

  useEffect(() => { loadTable() }, [loadTable])

  if (!hasData) return <EmptyState />
  if (loading && !overview) return <Spinner />
  if (error) return <ErrorBox message={error} />
  if (!overview) return null

  const { kpi, defect_trend, label_dist, compare_metrics } = overview
  const pieData = [
    { name: 'Normal', value: kpi.normal },
    { name: 'Defect', value: kpi.defect },
  ]

  // Kelompokkan compare_metrics jadi 3 grup
  const suhuData  = (compare_metrics ?? []).filter(d => d.metric.startsWith('Suhu'))
  const kaData    = (compare_metrics ?? []).filter(d => d.metric.startsWith('Kadar Air'))
  const yieldData = (compare_metrics ?? []).filter(d => d.metric.startsWith('Yield'))

  const totalPages = table ? Math.ceil(table.total / 20) : 1
  const opts = table?.filters ?? {}
  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }

  // Kolom tabel
  const tableCols = table?.data?.length
    ? TABLE_COLS_SHOW.filter(c => c in table.data[0])
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900 mb-1">Monitoring</h1>
        <p className="text-sm text-slate-500">Ringkasan kualitas granulasi dan data batch selengkapnya</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Total Batch"    value={kpi.total_batch} sub="batch dianalisis"                          color="blue"   />
        <KPICard label="Batch Normal"   value={kpi.normal}      sub={`${(100 - kpi.defect_rate).toFixed(1)}% dari total`}  color="green"  />
        <KPICard label="Batch Defect"   value={kpi.defect}      sub={`${kpi.defect_rate}% defect rate`}         color="red"    />
        {kpi.avg_suhu  != null && <KPICard label="Avg Suhu"      value={`${kpi.avg_suhu}°C`}    sub={kpi.avg_suhu > 75 ? 'Di atas 75°C' : 'Normal, batas 75°C'}     color={kpi.avg_suhu > 75 ? 'red' : 'teal'}    />}
        {kpi.avg_ka    != null && <KPICard label="Avg Kadar Air" value={`${kpi.avg_ka}%`}        sub={kpi.avg_ka < 3.0 || kpi.avg_ka > 5.5 ? 'Di luar range' : 'Range 3.0-5.5%'} color={kpi.avg_ka < 3.0 || kpi.avg_ka > 5.5 ? 'red' : 'violet'} />}
        {kpi.avg_yield != null && <KPICard label="Avg Yield"     value={`${kpi.avg_yield}%`}     sub={kpi.avg_yield < 99 || kpi.avg_yield > 103.1 ? 'Di luar spek' : 'Target 99-103.1%'} color={kpi.avg_yield < 99 || kpi.avg_yield > 103.1 ? 'red' : 'amber'} />}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <div className="section-title">Tren Defect per Bulan</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={defect_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
              <XAxis dataKey="bulan_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="defect_rate" name="Defect Rate (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="total"       name="Total Batch"     stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title">Distribusi Status Batch</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                   labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => [v, 'Batch']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2, Normal vs Defect per Bulan */}
      {defect_trend.length > 0 && (
        <div className="card">
          <div className="section-title">Jumlah Normal vs Defect per Bulan</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={defect_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
              <XAxis dataKey="bulan_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="defect" name="Defect" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="total"  name="Total"  fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts row 3, Perbandingan Normal vs Defect */}
      {compare_metrics?.length > 0 && (
        <div>
          <h2 className="text-xl text-slate-800 mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
            Perbandingan Parameter: Normal vs Defect
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Rata-rata nilai setiap parameter pada batch Normal dibandingkan batch Defect.
            Perbedaan yang mencolok mengindikasikan faktor penyebab utama.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Suhu */}
            {suhuData.length > 0 && (
              <div className="card">
                <div className="section-title mb-1">Suhu</div>
                <p className="text-xs text-slate-400 mb-3">Batas normal ≤ 75°C. Suhu tinggi meningkatkan risiko defect.</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={suhuData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[60, 85]} tick={{ fontSize: 10 }} unit="°C" />
                    <YAxis type="category" dataKey="metric" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip content={<CompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x={75} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Batas 75°C', position: 'top', fontSize: 9, fill: '#f59e0b' }} />
                    <Bar dataKey="Normal" name="Normal" fill="#10b981" radius={[0,4,4,0]} barSize={16} />
                    <Bar dataKey="Defect" name="Defect" fill="#ef4444" radius={[0,4,4,0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Kadar Air */}
            {kaData.length > 0 && (
              <div className="card">
                <div className="section-title mb-1">Kadar Air</div>
                <p className="text-xs text-slate-400 mb-3">Range normal 3.0–5.5%. Jika di luar range maka akan berisiko defect.</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={kaData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="metric" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip content={<CompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x={3.0} stroke="#f59e0b" strokeDasharray="4 4" />
                    <ReferenceLine x={5.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Batas 3.0–5.5%', position: 'top', fontSize: 9, fill: '#f59e0b' }} />
                    <Bar dataKey="Normal" name="Normal" fill="#10b981" radius={[0,4,4,0]} barSize={16} />
                    <Bar dataKey="Defect" name="Defect" fill="#ef4444" radius={[0,4,4,0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Yield */}
            {yieldData.length > 0 && (
              <div className="card">
                <div className="section-title mb-1">% Yield</div>
                <p className="text-xs text-slate-400 mb-3">Target 99–103.1%. Yield rendah berarti kehilangan material.</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={yieldData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[85, 108]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="metric" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip content={<CompareTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x={99}    stroke="#f59e0b" strokeDasharray="4 4" />
                    <ReferenceLine x={103.1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '99–103.1%', position: 'top', fontSize: 9, fill: '#f59e0b' }} />
                    <Bar dataKey="Normal" name="Normal" fill="#10b981" radius={[0,4,4,0]} barSize={16} />
                    <Bar dataKey="Defect" name="Defect" fill="#ef4444" radius={[0,4,4,0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tabel Batch */}
      <div>
        <h2 className="text-xl text-slate-800 mb-1" style={{ fontFamily: 'Fraunces, serif' }}>Data Batch Selengkapnya</h2>
        <p className="text-sm text-slate-500 mb-4">Tabel seluruh data batch granulasi yang telah dianalisis</p>

        {/* Filters */}
        <div className="card flex flex-wrap gap-4 mb-4">
          {[
            { key: 'bulan',  label: 'Bulan',  options: opts.bulan_options  ?? [] },
            { key: 'status', label: 'Status', options: opts.status_options ?? [] },
          ].map(({ key, label, options }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
              <select
                value={filters[key]}
                onChange={e => setFilter(key, e.target.value)}
                className="border border-blue-100 rounded-lg px-3 py-1.5 text-sm text-slate-700
                           focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="flex items-end">
            <span className="text-sm text-slate-400">{table?.total ?? 0} baris ditemukan</span>
          </div>
        </div>

        <div className="card p-0 overflow-x-auto">
          {!table
            ? <Spinner text="Memuat tabel..." />
            : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    {tableCols.map(c => (
                      <th key={c}>{COL_LABEL[c] ?? c.replace(/_/g,' ').toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(table.data ?? []).map((row, i) => (
                    <tr key={i}>
                      {tableCols.map(c => (
                        <td key={c}>
                          {c === 'label_display'
                            ? <span className={row[c] === 'Defect' ? 'pill-defect' : 'pill-normal'}>{row[c]}</span>
                            : String(row[c] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-slate-400">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
              className="p-2 rounded-lg border border-blue-100 disabled:opacity-40 hover:bg-blue-50">
              <ChevronLeft size={16} />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p+1)}
              className="p-2 rounded-lg border border-blue-100 disabled:opacity-40 hover:bg-blue-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
