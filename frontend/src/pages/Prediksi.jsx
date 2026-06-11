import { useState, useRef } from 'react'
import { Upload, ClipboardList, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { uploadDataset, predictSingle } from '../hooks/useApi'

// Field manual input — parameter utama granulasi
const MANUAL_FIELDS = [
  { key: 'cb1_suhu_rata',   label: 'Suhu Rata-rata CB1 (°C)',    default: 72.0, min: 50, max: 100, step: 0.1 },
  { key: 'cb2_suhu_rata',   label: 'Suhu Rata-rata CB2 (°C)',    default: 72.0, min: 50, max: 100, step: 0.1 },
  { key: 'cb1_rata_ka',     label: 'Kadar Air CB1 (%)',           default: 5.0,  min: 0,  max: 20,  step: 0.1 },
  { key: 'cb2_rata_ka',     label: 'Kadar Air CB2 (%)',           default: 5.0,  min: 0,  max: 20,  step: 0.1 },
  { key: 'ck1_ka_setelah_ck', label: 'Kadar Air Setelah CK1 (%)', default: 5.0, min: 0,  max: 20,  step: 0.1 },
  { key: 'cb1_pct_yield',   label: 'Yield CB1 (%)',               default: 100.0,min: 80, max: 110, step: 0.1 },
  { key: 'cb2_pct_yield',   label: 'Yield CB2 (%)',               default: 100.0,min: 80, max: 110, step: 0.1 },
  { key: 'ck1_pct_yield',   label: 'Yield CK1 (%)',               default: 100.0,min: 80, max: 110, step: 0.1 },
]

function UploadPanel({ onDataLoaded, onNavigate }) {
  const fileRef  = useRef(null)
  const [status, setStatus] = useState(null)   // null | 'loading' | 'success' | 'error'
  const [msg,    setMsg]    = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    try {
      const res = await uploadDataset(file)
      setStatus('success')
      setMsg(`${res.data.rows} batch berhasil diproses dari ${file.name}`)
      onDataLoaded(res.data)
      setTimeout(() => { if (onNavigate) onNavigate('monitoring') }, 1500)
    } catch (err) {
      setStatus('error')
      setMsg(err.response?.data?.detail || 'Upload gagal, coba lagi.')
    }
  }

  return (
    <div className="card h-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
        Upload File Dataset
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Upload file Excel rekap granulasi (.xlsx atau .xls). Sistem akan otomatis memproses 
        seluruh data dan menjalankan analisis AI untuk semua batch sekaligus.
      </p>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-blue-200 rounded-2xl p-10 text-center
                   cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
      >
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload size={24} className="text-blue-500" />
        </div>
        <div className="text-sm font-semibold text-slate-700 mb-1">Klik untuk pilih file</div>
        <div className="text-xs text-slate-400">Format: .xlsx, .xls, .csv — Maks. 200MB</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {status === 'loading' && (
        <div className="mt-4 flex items-center gap-3 text-sm text-blue-600 bg-blue-50 rounded-xl p-3">
          <Loader2 size={16} className="animate-spin" />
          Memproses data dan menjalankan pipeline AI...
        </div>
      )}
      {status === 'success' && (
        <div className="mt-4 flex items-start gap-3 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {msg}
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 flex items-start gap-3 text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {msg}
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Yang terjadi setelah upload:</div>
        <ol className="space-y-1.5">
          {[
            'Data dibersihkan dan divalidasi otomatis',
            'Model Random Forest dan Isolation Forest memprediksi setiap batch',
            'K-Means mengelompokkan batch berdasarkan karakteristik',
            'Hasil tersedia di semua tab dashboard',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function ManualPanel({ onResult }) {
  const [vals,   setVals]   = useState(() =>
    Object.fromEntries(MANUAL_FIELDS.map(f => [f.key, f.default]))
  )
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)
  const [noBatch, setNoBatch] = useState('')
  const [operator, setOperator] = useState('')

  const adjust = (key, delta, step) =>
    setVals(v => ({ ...v, [key]: Math.round((parseFloat(v[key]) + delta * step) * 10) / 10 }))

  const handlePredict = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await predictSingle(vals)
      setResult(res.data)
      onResult?.(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediksi gagal. Pastikan model sudah tersedia.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card h-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
        Input Parameter Manual
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Masukkan parameter proses granulasi secara manual untuk memprediksi kualitas satu batch secara langsung.
      </p>

      {/* Info batch */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Nomor Batch
          </label>
          <input
            value={noBatch}
            onChange={e => setNoBatch(e.target.value)}
            placeholder="Contoh: B-101"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Operator
          </label>
          <input
            value={operator}
            onChange={e => setOperator(e.target.value)}
            placeholder="Nama operator"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
      </div>

      {/* Parameter grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {MANUAL_FIELDS.map(({ key, label, step, min, max }) => (
          <div key={key}>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjust(key, -1, step)}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold
                           flex items-center justify-center transition-colors text-lg leading-none"
              >
                -
              </button>
              <input
                type="number"
                value={vals[key]}
                min={min} max={max} step={step}
                onChange={e => setVals(v => ({ ...v, [key]: parseFloat(e.target.value) || 0 }))}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <button
                onClick={() => adjust(key, 1, step)}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold
                           flex items-center justify-center transition-colors text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handlePredict} disabled={loading} className="btn-primary w-full justify-center">
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Memproses Prediksi...</>
          : <><ArrowRight size={15} /> Jalankan Prediksi</>}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && !error && (
        <div className={`mt-4 rounded-2xl p-5 border ${
          result.prediction === 1
            ? 'bg-red-50 border-red-100'
            : 'bg-emerald-50 border-emerald-100'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Hasil Prediksi</span>
            <span className={result.prediction === 1 ? 'pill-defect' : 'pill-normal'}>
              {result.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Probabilitas Defect</div>
              <div className="font-bold text-slate-800">
                {(result.probability * 100).toFixed(1)}%
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${result.prediction === 1 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${result.probability * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Tingkat Risiko</div>
              <div className="font-bold text-slate-800">{result.risk_level}</div>
            </div>
          </div>

          {/* Alasan defect */}
          {result.reasons && result.reasons.length > 0 && (
            <div className="border-t border-red-100 pt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Penyebab Defect
              </div>
              <div className="flex flex-wrap gap-2">
                {result.reasons.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 rounded-lg px-2.5 py-1">
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 7.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                    </svg>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.prediction === 0 && (!result.reasons || result.reasons.length === 0) && (
            <div className="border-t border-emerald-100 pt-3 text-xs text-emerald-600">
              Semua parameter dalam batas normal. Tidak ada pelanggaran terdeteksi.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Prediksi({ onDataLoaded, onNavigate }) {
  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl text-slate-900 mb-2">Prediksi Kualitas Batch</h1>
          <p className="text-slate-500">
            Pilih salah satu cara di bawah — upload file dataset untuk analisis massal,
            atau masukkan parameter manual untuk prediksi satu batch secara langsung.
          </p>
        </div>

        {/* Two panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UploadPanel onDataLoaded={onDataLoaded} onNavigate={onNavigate} />
          <ManualPanel />
        </div>
      </div>
    </div>
  )
}
