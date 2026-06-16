import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle, BarChart2, Search, FileText, Zap, Droplets, Layers, Target } from 'lucide-react'
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleTiltMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ x: (0.5 - py) * 10, y: (px - 0.5) * 10 })
  }

  const handleTiltLeave = () => setTilt({ x: 0, y: 0 })

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

          {/* Right */}
          <div className="animate-fade-up delay-200 relative [perspective:1400px]">
            {/* Dekorasi blur di belakang foto */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-200/50 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-12 -left-10 w-52 h-52 bg-blue-100/60 rounded-full blur-3xl -z-10" />

            <div
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
              className="group relative rounded-3xl overflow-hidden border border-blue-100
                         shadow-xl shadow-blue-100/70 transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            >
              <img
                src="/images/hero-produksi.jpg"
                alt="Proses produksi granulasi di ruang bersih farmasi"
                className="w-full h-[420px] lg:h-[480px] object-cover transition-transform duration-700 ease-out
                           group-hover:scale-110"
              />
              {/* gradient overlay agar teks tetap terbaca */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/10 to-transparent" />

              {/* Badge kecepatan analisis */}
              <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg
                               flex items-center gap-3 animate-float">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Zap size={18} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-none">&lt; 10 detik</div>
                  <div className="text-[11px] text-slate-400">Analisis per batch</div>
                </div>
              </div>

              {/* Badge akurasi */}
              <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg
                               flex items-center gap-3 animate-float float-delay">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <BarChart2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily: 'Fraunces, serif' }}>94%</div>
                  <div className="text-[11px] text-slate-500">Akurasi Deteksi Defect</div>
                </div>
              </div>

              {/* Konten bawah */}
              <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6 text-white">
                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">
                  Kemampuan Sistem
                </div>
                <h3 className="text-lg lg:text-xl font-semibold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Granulasi Farmasi yang Dipantau AI Pharma
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: '3', label: 'Model Machine Learning' },
                    { n: '46+', label: 'Batch Dianalisis' },
                    { n: '3', label: 'Tampilan Dashboard' },
                  ].map(({ n, label }) => (
                    <div
                      key={label}
                      className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2.5 text-center
                                 border border-white/15 transition-colors duration-200 hover:bg-white/20"
                    >
                      <div className="text-xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>{n}</div>
                      <div className="text-[11px] text-blue-100 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="py-16 px-8 bg-blue-50">
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
