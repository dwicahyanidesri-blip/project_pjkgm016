import { useState, useEffect, useRef } from 'react'
import { fetchOverview } from '../hooks/useApi'
import { EmptyState }    from '../components/UI'
import {
  TrendingUp, AlertTriangle, Lightbulb, BarChart2,
  Calendar, ListChecks, ChevronRight, RefreshCw, FileText,
} from 'lucide-react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ─────────────────────────────────────────────────────────────
// KARTU ANALISIS — 6 jenis laporan yang bisa di-generate
// ─────────────────────────────────────────────────────────────
const ANALYSIS_CARDS = [
  {
    id:    'summary',
    icon:  TrendingUp,
    color: 'blue',
    title: 'Kondisi Produksi Saat Ini',
    desc:  'Seberapa baik kualitas produksi secara keseluruhan? Mana yang perlu diperhatikan?',
  },
  {
    id:    'root_cause',
    icon:  AlertTriangle,
    color: 'red',
    title: 'Kenapa Batch Bisa Gagal?',
    desc:  'Faktor-faktor utama yang paling sering menyebabkan batch tidak memenuhi standar.',
  },
  {
    id:    'recommendation',
    icon:  Lightbulb,
    color: 'amber',
    title: 'Apa yang Harus Diperbaiki?',
    desc:  'Langkah-langkah konkret yang bisa segera dilakukan untuk mengurangi batch gagal.',
  },
  {
    id:    'line_comparison',
    icon:  BarChart2,
    color: 'purple',
    title: 'Line Mana yang Bermasalah?',
    desc:  'Perbandingan kualitas antar jalur produksi dan penyebab perbedaannya.',
  },
  {
    id:    'trend',
    icon:  Calendar,
    color: 'teal',
    title: 'Tren Kualitas dari Waktu ke Waktu',
    desc:  'Apakah kualitas produksi membaik, memburuk, atau stagnan bulan ke bulan?',
  },
  {
    id:    'priority',
    icon:  ListChecks,
    color: 'green',
    title: 'Mana yang Harus Ditangani Dulu?',
    desc:  'Urutan prioritas perbaikan berdasarkan dampak dan kemudahan pelaksanaannya.',
  },
]

const COLOR = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   ring: 'ring-blue-300',   badge: 'bg-blue-100 text-blue-700'   },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     ring: 'ring-red-300',     badge: 'bg-red-100 text-red-700'     },
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-300',   badge: 'bg-amber-100 text-amber-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600',ring: 'ring-purple-300', badge: 'bg-purple-100 text-purple-700'},
  teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-600',   ring: 'ring-teal-300',    badge: 'bg-teal-100 text-teal-700'   },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', ring: 'ring-green-300',   badge: 'bg-green-100 text-green-700' },
}

// ─────────────────────────────────────────────────────────────
// KOMPONEN: Kartu hasil laporan
// ─────────────────────────────────────────────────────────────
function ResultPanel({ result, card, onClose, onRegenerate, loading }) {
  const c = COLOR[card.color]
  const Icon = card.icon

  // Format teks
  const paragraphs = result.split('\n').filter(l => l.trim())

  return (
    <div className={`rounded-2xl border border-slate-100 overflow-hidden shadow-sm`}>
      {/* Header hasil */}
      <div className={`${c.bg} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.icon}`}>
            <Icon size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{card.title}</div>
            <div className="text-xs text-slate-400">{result.length > 0 ? `${result.split(' ').length} kata · berbasis ${result.dataRows ?? ''} batch` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={loading}
            title="Buat ulang laporan"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all text-base leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Isi laporan */}
      <div className="px-5 py-5 bg-white space-y-2">
        {paragraphs.map((para, i) => {
          const isNumbered = /^\d+\./.test(para.trim())
          const isBullet   = /^[-•*]/.test(para.trim())
          const isHeading  = /^#{1,3}\s/.test(para.trim()) || (para.trim().endsWith(':') && para.trim().length < 60)
          const clean      = para.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '').trim()

          if (isHeading) return (
            <div key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-3 pb-1 first:pt-0">
              {clean}
            </div>
          )
          if (isNumbered || isBullet) return (
            <div key={i} className="flex gap-2.5 text-sm text-slate-700 leading-relaxed">
              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${c.badge}`}>
                {isNumbered ? para.trim()[0] : '·'}
              </span>
              <span>{clean.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '')}</span>
            </div>
          )
          return (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{clean}</p>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AIAnalyst({ hasData }) {
  const [kpi,       setKpi]       = useState(null)
  const [results,   setResults]   = useState({})   // { analysis_type: string }
  const [loadingId, setLoadingId] = useState(null)
  const [errors,    setErrors]    = useState({})
  const resultRefs = useRef({})

  useEffect(() => {
    if (!hasData) return
    fetchOverview()
      .then(r => setKpi(r.data.kpi))
      .catch(() => {})
  }, [hasData])

  const generate = async (analysisId) => {
    setLoadingId(analysisId)
    setErrors(e => ({ ...e, [analysisId]: null }))

    try {
      const res = await api.post('/analyze', { analysis_type: analysisId })
      setResults(r => ({ ...r, [analysisId]: res.data.result }))
      // Scroll ke hasil setelah selesai
      setTimeout(() => {
        resultRefs.current[analysisId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'Gagal membuat laporan. Coba lagi.'
      setErrors(e => ({ ...e, [analysisId]: msg }))
    } finally {
      setLoadingId(null)
    }
  }

  const dismiss = (id) => setResults(r => { const n = {...r}; delete n[id]; return n })

  if (!hasData) return <EmptyState />

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl text-slate-900">Laporan Cerdas</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Pilih topik laporan di bawah dan sistem akan langsung menganalisis data produksi yang diupload
          lalu memberikan penjelasan beserta rekomendasi mengenai dataset granulasi tersebut.
        </p>
      </div>

      {/* KPI ringkas */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Batch',   val: kpi.total_batch,         unit: 'batch', grad: 'from-blue-500 to-blue-700' },
            { label: 'Batch Gagal',   val: kpi.defect,              unit: 'batch', grad: 'from-red-500 to-red-700' },
            { label: 'Tingkat Gagal', val: `${kpi.defect_rate}%`,   unit: '',      grad: 'from-amber-500 to-orange-600' },
            { label: 'Batch Normal',  val: kpi.normal,              unit: 'batch', grad: 'from-emerald-500 to-emerald-700' },
          ].map(({ label, val, unit, grad }) => (
            <div key={label} className={`rounded-2xl px-4 py-3 text-white bg-gradient-to-br ${grad}`}>
              <div className="text-xs uppercase tracking-widest opacity-80 font-semibold mb-1">{label}</div>
              <div className="text-xl font-bold">
                {val} <span className="text-xs font-normal opacity-75">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kartu analisis */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Buat laporan untuk
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ANALYSIS_CARDS.map(card => {
            const Icon     = card.icon
            const c        = COLOR[card.color]
            const isLoading = loadingId === card.id
            const hasResult = !!results[card.id]
            const hasError  = !!errors[card.id]

            return (
              <div key={card.id} className="flex flex-col gap-3">
                {/* Kartu tombol */}
                <button
                  onClick={() => generate(card.id)}
                  disabled={!!loadingId}
                  className={`text-left p-4 rounded-2xl border transition-all group
                    ${isLoading
                      ? `${c.bg} border-transparent ring-2 ${c.ring}`
                      : hasResult
                        ? 'bg-white border-slate-100 hover:border-slate-200'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isLoading ? c.icon : `bg-slate-100 text-slate-400 group-hover:${c.icon.split(' ')[0]} group-hover:${c.icon.split(' ')[1]}`
                    }`}>
                      {isLoading
                        ? <RefreshCw size={15} className="animate-spin" />
                        : <Icon size={15} />}
                    </div>
                    {hasResult && !isLoading && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
                        ✓ Selesai
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-slate-800 mb-1">{card.title}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{card.desc}</div>
                  </div>
                  {!isLoading && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                      <ChevronRight size={12} />
                      <span>{hasResult ? 'Buat ulang laporan' : 'Buat laporan ini'}</span>
                    </div>
                  )}
                  {isLoading && (
                    <div className="mt-3 text-xs text-slate-500">Sedang menganalisis data...</div>
                  )}
                </button>

                {/* Error di bawah kartu */}
                {hasError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600">{errors[card.id]}</p>
                  </div>
                )}

                {/* Hasil laporan tepat di bawah kartu yang di-klik */}
                {hasResult && (
                  <div ref={el => { resultRefs.current[card.id] = el }}>
                    <ResultPanel
                      result={results[card.id]}
                      card={card}
                      onClose={() => dismiss(card.id)}
                      onRegenerate={() => generate(card.id)}
                      loading={isLoading}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
