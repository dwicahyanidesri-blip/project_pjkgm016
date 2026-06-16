import { useEffect, useState, useCallback } from 'react'
import { fetchDefectAnalysis, fetchDefectBatches } from '../hooks/useApi'
import { Spinner, EmptyState, ErrorBox } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, BookOpen } from 'lucide-react'


// DATA GLOSSARY — istilah teknis granulasi
const GLOSSARY_SECTIONS = [
  {
    title: 'Tahapan Proses (CB1, CK1, CB2, CK2)',
    color: 'blue',
    items: [
      {
        term: 'CB1 (Campur Basah 1)',
        desc: 'Tahap pertama granulasi basah. Bahan baku serbuk dicampur dengan cairan pengikat (decoct) di dalam mesin diosna sehingga membentuk granul basah. Ini adalah langkah awal pembentukan granul.',
      },
      {
        term: 'CK1 (Campur Kering 1)',
        desc: 'Tahap pengeringan granul setelah CB1. Granul basah dimasukkan ke mesin pengering (fluid bed dryer) untuk dikurangi kadar airnya hingga mencapai target. Setelah kering, granul diayak agar ukurannya seragam.',
      },
      {
        term: 'CB2 (Campur Basah 2)',
        desc: 'Tahap kedua granulasi basah, dilakukan setelah CK1. Proses serupa dengan CB1 namun dapat menggunakan bahan atau lot yang berbeda. Tidak semua produk memiliki tahap CB2.',
      },
      {
        term: 'CK2 (Campur Kering 2)',
        desc: 'Tahap pengeringan kedua, dilakukan setelah CB2. Sama seperti CK1, granul basah hasil CB2 dikeringkan dan diayak kembali. Tahap ini hanya ada pada produk yang melewati proses CB2. Tujuannya memastikan kadar air granul final benar-benar sesuai standar sebelum masuk ke proses pencetakan tablet.',
      },
    ],
  },
  {
    title: 'Parameter Suhu',
    color: 'amber',
    items: [
      {
        term: 'Suhu Decoct (suhu_lot_X)',
        desc: 'Suhu cairan decoct (ekstrak tanaman yang sudah dimasak) saat dituang ke dalam mesin diosna dan diukur per lot (porsi). Suhu yang terlalu tinggi dapat merusak zat aktif, sedangkan suhu terlalu rendah dapat menyebabkan granul tidak mengikat dengan baik. Batas normal: ≤ 75°C.',
      },
      {
        term: 'Suhu Diosna (suhu_diosna_lot_X)',
        desc: 'Suhu cairan decoct sesaat sebelum masuk ke dalam bowl mesin diosna (mesin pengaduk granulasi). Berbeda dengan suhu decoct awal karena dapat turun selama proses pengangkutan. Suhu diosna dipantau per lot untuk memastikan konsistensi proses.',
      },
      {
        term: 'Suhu Rata-rata (suhu_rata)',
        desc: 'Rata-rata dari semua pengukuran suhu dalam satu batch (mencakup semua lot).',
      },
    ],
  },
  {
    title: 'Kadar Air (KA)',
    color: 'red',
    items: [
      {
        term: 'KA (Kadar Air)',
        desc: 'Persentase kandungan air dalam granul kering. Kadar air yang ideal biasanya 4–6.5%. Jika terlalu tinggi (>6.5%) akan membuat granul lengket dan mudah berjamur, jika terlalu rendah (<3%) akan membuat granul rapuh dan sulit dikempa menjadi tablet.',
      },
      {
        term: 'KA 1, KA 2, KA 3, dan KA 4',
        desc: 'Pengukuran kadar air dilakukan beberapa kali (biasanya 2–4 kali) pada titik pengambilan sampel yang berbeda dalam satu batch, untuk memastikan hasil pengukuran konsisten dan granul sudah kering merata. Semakin banyak titik ukur, semakin akurat penilaian keseragaman pengeringan.',
      },
      {
        term: 'Rata-rata KA (rata_ka)',
        desc: 'Rata-rata dari semua pengukuran KA dalam satu batch.',
      },
      {
        term: 'KA Setelah CK1 (ka_setelah_ck)',
        desc: 'Kadar air granul yang diukur setelah tahap pengeringan CK1 selesai dan merupakan titik kontrol kritis, jika kadar air belum mencapai target, proses pengeringan perlu dilanjutkan.',
      },
    ],
  },
  {
    title: 'Yield (%)',
    color: 'green',
    items: [
      {
        term: 'Yield / % Yield (pct_yield)',
        desc: 'Persentase hasil granul yang berhasil diproduksi dibandingkan dengan jumlah bahan baku yang dimasukkan. Rumus sederhana: (berat granul jadi ÷ berat bahan baku) × 100%. Yield 100% berarti tidak ada bahan yang terbuang. Yield di bawah normal menandakan banyak bahan hilang selama proses, seperti ada bahan yang menempel di mesin, terbuang saat pengayakan, dsb).',
      },
      {
        term: 'Teoritis Granul',
        desc: 'Berat granul yang seharusnya dihasilkan berdasarkan perhitungan formula (berat bahan baku × faktor koreksi). Nilai ini menjadi pembanding untuk menghitung % yield. Bila yield jauh di bawah teoritis, perlu investigasi kehilangan bahan.',
      },
      {
        term: 'Yield CB1, Yield CK1, dan Yield CB2',
        desc: 'Yield dihitung di setiap tahap proses secara terpisah. Yield CB1 mengukur kehilangan saat proses campur basah, yield CK1 mengukur kehilangan saat pengeringan dan pengayakan, yield CB2 untuk tahap campur basah kedua. Rentang normal: CB1 = 99.0–103.1%, CK1 = 99.1–102.9%, CB2 = 99.1–102.3%.',
      },
    ],
  },
  {
    title: 'Istilah Mesin dan Proses Lainnya',
    color: 'violet',
    items: [
      {
        term: 'Lot',
        desc: 'Satu porsi atau satu siklus proses dalam satu batch, dikarenakan kapasitas mesin terbatas maka satu batch dapat dibagi menjadi beberapa lot (lot 1, lot 2, dst.) yang diproses secara bergantian lalu digabung.',
      },
      {
        term: 'Mixer dan Chopper',
        desc: 'Kecepatan putar komponen mesin diosna. Mixer adalah pengaduk utama yang mencampur serbuk dengan cairan dan chopper adalah pisau kecil yang memecah gumpalan granul agar ukurannya lebih seragam. Kecepatannya diatur dalam RPM.',
      },
      {
        term: 'No. Ayakan (ALEX & Frewitt)',
        desc: 'Nomor mesh (ukuran lubang) ayakan yang digunakan setelah granulasi. Ayakan ALEX digunakan untuk pengayakan kasar, ayakan Frewitt untuk pengayakan halus. Semakin besar nomor mesh, semakin kecil lubangnya, semakin halus granul yang dihasilkan.',
      },
      {
        term: 'Decoct',
        desc: 'Cairan ekstrak tanaman yang diperoleh dengan cara merebus simplisia (bahan tanaman) dalam air. Decoct berfungsi sebagai cairan pengikat dalam proses granulasi basah untuk menyatukan partikel serbuk menjadi granul.',
      },
      {
        term: 'Shift',
        desc: 'Jadwal kerja produksi (misalnya shift pagi, siang, atau malam). Pola defect per shift membantu mendeteksi apakah waktu kerja atau pergantian operator berpengaruh terhadap kualitas produksi.',
      },
    ],
  },
]

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-400'   },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-400'  },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    badge: 'bg-red-100 text-red-800',       dot: 'bg-red-400'    },
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  badge: 'bg-green-100 text-green-800',   dot: 'bg-green-500'  },
  violet: { bg: 'bg-violet-50', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-400' },
}

function GlossarySection({ section }) {
  const [open, setOpen] = useState(false)
  const c = COLOR_MAP[section.color] ?? COLOR_MAP.blue

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 ${c.bg} hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className="text-sm font-semibold text-slate-800">{section.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
            {section.items.length} istilah
          </span>
        </div>
        {open
          ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="divide-y divide-slate-50">
          {section.items.map((item, i) => (
            <div key={i} className="px-5 py-4 bg-white">
              <div className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg mb-2 ${c.badge}`}>
                {item.term}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GlossaryPanel() {
  return (
    <div id="panduan-istilah" className="card mt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen size={16} className="text-slate-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800" style={{ fontFamily: 'Fraunces, serif' }}>
            Panduan Istilah Teknis
          </h2>
          <p className="text-xs text-slate-400">
            Klik setiap kategori untuk membaca penjelasan istilah yang muncul di analisis defect
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-xl mb-5 text-xs text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-600">Cara membaca laporan ini:</span>{' '}
        Setiap batch granulasi melewati serangkaian tahap proses (CB1 → CK1 → CB2 → CK2) dengan
        parameter yang diukur di setiap tahap. Batch dinyatakan <span className="text-red-600 font-medium">Defect</span> apabila
        satu atau lebih parameter menyimpang dari batas normal yang ditetapkan. Penjelasan
        di bawah membantu Anda memahami arti setiap istilah dan mengapa ia penting.
      </div>

      <div className="space-y-3">
        {GLOSSARY_SECTIONS.map((section, i) => (
          <GlossarySection key={i} section={section} />
        ))}
      </div>
    </div>
  )
}


// Komponen BatchDefectCard
function BatchDefectCard({ batch }) {
  const [open, setOpen] = useState(false)

  const reasons = batch.defect_reasons && batch.defect_reasons !== '-'
    ? batch.defect_reasons.split('|').map(r => r.trim()).filter(Boolean)
    : []

  const meta = [
    batch.material_desc,
    batch.cb1_bulan,
  ].filter(Boolean)

  return (
    <div className="border border-red-100 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="text-sm font-bold text-slate-800">Batch #{batch.row_no}</div>
          <div className="text-xs text-slate-400 hidden sm:flex gap-2">
            {meta.map((m, i) => (
              <span key={i} className="after:content-['·'] after:mx-1.5 last:after:hidden">{m}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5 font-semibold">
            {reasons.length} pelanggaran
          </span>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-red-50">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-3">
            Penyebab Defect
          </div>
          {reasons.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {reasons.map((r, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700
                             border border-red-100 rounded-lg px-3 py-1.5 font-medium">
                  <AlertTriangle size={11} />
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Detail penyebab tidak tersedia untuk batch ini.</p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Material', val: batch.material_desc ?? '-' },
              { label: 'Bulan',    val: batch.cb1_bulan ?? '-' },
              { label: 'Shift',    val: batch.cb1_shift ?? '-' },
            ].filter(({ val }) => val && val !== '-' && val !== 'undefined').map(({ label, val }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-slate-700">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// Main export
export default function AnalisisDefect({ hasData }) {
  const [analysis,      setAnalysis]      = useState(null)
  const [batches,       setBatches]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [batchLoading,  setBatchLoading]  = useState(false)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    if (!hasData) return
    setLoading(true)
    fetchDefectAnalysis()
      .then(res => setAnalysis(res.data))
      .catch(e  => setError(e.response?.data?.detail || 'Gagal memuat data analisis defect'))
      .finally(() => setLoading(false))
  }, [hasData])

  const loadBatches = useCallback(() => {
    if (!hasData) return
    setBatchLoading(true)
    fetchDefectBatches()
      .then(r => setBatches(r.data.batches ?? []))
      .catch(() => setBatches([]))
      .finally(() => setBatchLoading(false))
  }, [hasData])

  useEffect(() => {
    if (!hasData) return
    loadBatches()
    const t1 = setTimeout(loadBatches, 2000)
    const t2 = setTimeout(loadBatches, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [hasData, loadBatches])

  if (!hasData) return <EmptyState />
  if (loading)  return <Spinner />
  if (error)    return <ErrorBox message={error} />
  if (!analysis) return null

  const reasons = Object.entries(analysis.reason_counts ?? {})
    .map(([name, value]) => ({ name, value }))
    .slice(0, 15)

  const lineData = Object.entries(analysis.defect_per_line ?? {})
    .map(([line, rate]) => ({ line, rate }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900 mb-1">Analisis Defect</h1>
        <p className="text-sm text-slate-500">
          Total batch defect: <span className="font-bold text-red-600">{analysis.total_defect}</span> batch
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {reasons.length > 0 && (
          <div className="card">
            <div className="section-title">Penyebab Defect Terbanyak</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={reasons} layout="vertical"
                        margin={{ left: 180, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={175} />
                <Tooltip />
                <Bar dataKey="value" name="Jumlah" radius={[0,4,4,0]}>
                  {reasons.map((_, i) => (
                    <Cell key={i} fill={`hsl(0, ${85 - i*3}%, ${55 + i*2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {lineData.length > 0 && (
          <div className="card">
            <div className="section-title">Defect Rate per Line (%)</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
                <XAxis dataKey="line" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={v => [`${v}%`, 'Defect Rate']} />
                <Bar dataKey="rate" name="Defect Rate (%)" radius={[4,4,0,0]}>
                  {lineData.map((entry, i) => (
                    <Cell key={i} fill={entry.rate > 20 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detail per Batch */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl text-slate-800" style={{ fontFamily: 'Fraunces, serif' }}>
            Detail Penyebab Defect per Batch
          </h2>
          <button
            onClick={() => document.getElementById('panduan-istilah')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 text-xs text-white
                       bg-blue-500 hover:bg-blue-600 rounded-lg px-3 py-1.5 transition-colors shadow-sm"
          >
            <BookOpen size={12} />
            Bingung istilahnya? Lihat panduan
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Klik pada setiap batch untuk melihat seluruh faktor penyebab defect secara rinci.
        </p>

        {batchLoading && batches.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-sm text-slate-400">Memuat detail batch...</div>
          </div>
        ) : batches.length > 0 ? (
          <div className="space-y-2">
            {batches.map((batch, i) => (
              <BatchDefectCard key={i} batch={batch} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-10">
            <div className="text-sm text-slate-400 mb-3">Detail per batch belum tersedia.</div>
            <button
              onClick={loadBatches}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
            >
              <RefreshCw size={11} />
              Coba muat ulang
            </button>
          </div>
        )}
      </div>

      {/* Panduan Istilah Teknis (Glossary) */}
      <GlossaryPanel />
    </div>
  )
}
