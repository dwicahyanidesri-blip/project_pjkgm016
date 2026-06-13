import { useEffect } from 'react'
import { ArrowRight, CheckCircle, BarChart2, Search, FileText } from 'lucide-react'
import Footer from '../components/Footer'

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Monitoring',
    desc:  'Pantau ringkasan mengenai kualitas granulasi mulai dari total batch, tingkat defect, rata-rata suhu, kadar air, dan yield, lengkap dengan tren dan distribusi status batch.',
    image: '/images/preview-monitoring.png',
  },
  {
    icon: Search,
    title: 'Analisis Defect',
    desc:  'Telusuri setiap batch yang terdeteksi defect beserta parameter yang menyimpang, dilengkapi panduan istilah teknis agar mudah dipahami oleh seluruh tim Quality of Control.',
    image: '/images/preview-defect.png',
  },
  {
    icon: FileText,
    title: 'AI Analyst',
    desc:  'Dapatkan laporan cerdas otomatis dari AI, mulai dari kondisi produksi, penyebab kerusakan, line yang bermasalah, hingga rekomendasi prioritas perbaikan.',
    image: '/images/preview-analyst.png',
  },
]

const HOW_TO = [
  {
    step: '01',
    title: 'Upload Data Produksi',
    desc:  'Klik tombol "Upload Dataset" di bagian "Lakukan Prediksi", lalu pilih file dataset rekap granulasi (.xlsx, .xls, atau csv).',
  },
  {
    step: '02',
    title: 'Tunggu Proses Analisis',
    desc:  'Sistem akan otomatis membersihkan data, menjalankan model AI, dan mengelompokkan batch berdasarkan karakteristiknya. Proses ini berlangsung beberapa detik.',
  },
  {
    step: '03',
    title: 'Lihat Hasil di Dashboard',
    desc:  'Navigasi ke tab Monitoring, Analisis Defect, atau AI Analyst untuk melihat hasil keseluruhan secara lengkap mulai dari jumlah batch defect hingga faktor penyebabnya.',
  },
  {
    step: '04',
    title: 'Prediksi Batch Baru',
    desc:  'Gunakan fitur "Input Parameter Manual" di bagian "Lakukan Prediksi" untuk memasukkan parameter batch baru dan langsung mengetahui apakah batch tersebut berpotensi defect.',
  },
]

export default function Beranda({ onNavigate, onViewMonitoring, onSectionChange, onNavigateSection }) {
  useEffect(() => {
    if (!onSectionChange) return
    const ids = ['beranda', 'fitur', 'tutorial']
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        // pilih section paling atas yang sedang terlihat
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          onSectionChange(visible[0].target.id)
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    )

    sections.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [onSectionChange])

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section id="beranda" className="pt-28 pb-20 px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold
                            px-3 py-1.5 rounded-full mb-6 border border-blue-100">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
               AI-Based Pharmaceutical Data Selection and Monitoring System
            </div>

            <h1 className="text-5xl lg:text-6xl leading-tight text-slate-900 mb-6">
              Kontrol Kualitas<br />
              <span className="text-blue-600">Granulasi</span><br />
              Berbasis AI
            </h1>

            <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-lg">
              Sistem monitoring cerdas untuk proses granulasi farmasi. Sistem dapat mendeteksi batch yang cacat, 
              menganalisis penyebab kerusakan, dan memantau seluruh proses produksi secara otomatis
              tanpa perlu pengecekan manual baris per baris.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('prediksi')}
                className="btn-primary"
              >
                Lakukan Prediksi
                <ArrowRight size={16} />
              </button>
              <button
                onClick={onViewMonitoring}
                className="btn-outline"
              >
                Lihat Hasil Monitoring
              </button>
            </div>

            <div className="flex flex-wrap gap-5 mt-8">
              {['Mudah', 'Praktis', 'Efisien', 'Akurat', 'Sistematis'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                  <CheckCircle size={14} className="text-blue-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — ilustrasi statistik */}
          <div className="animate-fade-up delay-200">
            <div className="card-blue rounded-3xl p-8 relative">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
                Kemampuan Sistem
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Akurasi Deteksi Defect', val: 94, color: 'bg-blue-500' },
                  { label: 'Kecepatan Analisis (per batch)', val: 100, note: '< 10 detik', color: 'bg-emerald-500' },
                  { label: 'Parameter yang Dianalisis', val: 80, note: '40+ parameter', color: 'bg-violet-500' },
                  { label: 'Reduksi Cek Manual', val: 90, note: '~90%', color: 'bg-sky-500' },
                ].map(({ label, val, note, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 font-medium">{label}</span>
                      <span className="text-slate-400 text-xs">{note ?? `${val}%`}</span>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-blue-100 grid grid-cols-3 gap-4 text-center">
                {[
                  { n: '3', label: 'Model AI' },
                  { n: '46+', label: 'Batch Dianalisis' },
                  { n: '6', label: 'Modul Dashboard' },
                ].map(({ n, label }) => (
                  <div key={label}>
                    <div className="text-2xl font-bold text-blue-700" style={{ fontFamily: 'Fraunces, serif' }}>{n}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="py-16 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-slate-900 mb-3">Fitur Utama AI Pharma</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Dirancang khusus untuk tim Quality of Control yang ingin beralih dari pencatatan manual ke analisis berbasis data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, image }) => (
              <div key={title} className="card !p-0 hover:shadow-[0_0_60px_15px_rgba(59,130,246,0.35)] transition-shadow duration-300">
                <img
                  src={image}
                  alt={`Preview ${title}`}
                  className="w-full aspect-[4/3] object-cover object-top rounded-t-2xl border-b border-blue-50"
                />
                <div className="relative p-6 bg-white rounded-b-2xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600
                                  bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 mb-3">
                    Fitur
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                    {title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara Pakai */}
      <section id="tutorial" className="py-16 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-slate-900 mb-3">Tutorial Menggunakan AI Pharma</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Empat langkah sederhana untuk mulai memantau kualitas granulasi produksi Anda.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_TO.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-bold text-blue-100 mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
                  {step}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn-primary"
            >
              Mulai Sekarang
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <Footer onNavigateSection={onNavigateSection} />
    </div>
  )
}
