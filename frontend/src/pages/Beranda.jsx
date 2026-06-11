import { ArrowRight, CheckCircle, BarChart2, Shield, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    title: 'Deteksi Anomali Otomatis',
    desc:  'Sistem AI mendeteksi batch yang berpotensi cacat secara otomatis menggunakan Isolation Forest dan Random Forest, tanpa perlu pengecekan manual satu per satu.',
  },
  {
    icon: BarChart2,
    title: 'Dashboard Analitik Real-Time',
    desc:  'Semua data granulasi tersaji dalam visualisasi yang mudah dipahami — tren defect, distribusi suhu, kadar air, dan yield dalam satu layar.',
  },
  {
    icon: Zap,
    title: 'Pipeline AI End-to-End',
    desc:  'Upload satu file Excel, sistem langsung memproses data, menjalankan model machine learning, dan menghasilkan laporan analisis lengkap dalam hitungan detik.',
  },
]

const HOW_TO = [
  {
    step: '01',
    title: 'Upload Data Produksi',
    desc:  'Klik tombol "Upload Dataset" di menu sebelah kiri, lalu pilih file Excel rekap granulasi (.xlsx atau .xls) dari komputer Anda.',
  },
  {
    step: '02',
    title: 'Tunggu Proses Analisis',
    desc:  'Sistem akan otomatis membersihkan data, menjalankan model AI, dan mengelompokkan batch berdasarkan karakteristiknya. Proses berlangsung beberapa detik.',
  },
  {
    step: '03',
    title: 'Baca Hasil di Dashboard',
    desc:  'Navigasi ke tab Overview, Monitoring, atau Analisis Defect untuk melihat hasil lengkap — mulai dari jumlah batch cacat hingga faktor penyebabnya.',
  },
  {
    step: '04',
    title: 'Prediksi Batch Baru',
    desc:  'Gunakan fitur Prediksi di tab Model AI untuk memasukkan parameter batch baru dan langsung mengetahui apakah batch tersebut berpotensi cacat.',
  },
]

export default function Beranda({ onNavigate }) {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold
                            px-3 py-1.5 rounded-full mb-6 border border-blue-100">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Capstone Project PJK-GM016 · Pijak x IBM SkillsBuild
            </div>

            <h1 className="text-5xl lg:text-6xl leading-tight text-slate-900 mb-6">
              Kontrol Kualitas<br />
              <span className="text-blue-600">Granulasi</span><br />
              Berbasis AI
            </h1>

            <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-lg">
              Sistem monitoring cerdas untuk proses granulasi farmasi. Deteksi batch cacat, 
              analisis penyebab, dan pantau seluruh proses produksi secara otomatis — 
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
                onClick={() => onNavigate('monitoring')}
                className="btn-outline"
              >
                Lihat Dashboard
              </button>
            </div>

            <div className="flex flex-wrap gap-5 mt-8">
              {['Data terverifikasi', 'Model Random Forest', 'Clustering K-Means'].map(t => (
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
                  { label: 'Kecepatan Analisis (per batch)', val: 100, note: '< 2 detik', color: 'bg-emerald-500' },
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

      {/* ── Fitur ── */}
      <section className="py-16 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-slate-900 mb-3">Apa yang Bisa Dilakukan Sistem Ini?</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Dirancang khusus untuk tim produksi farmasi yang ingin beralih dari pencatatan manual ke analisis berbasis data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                  {title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cara Pakai ── */}
      <section className="py-16 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-slate-900 mb-3">Cara Menggunakan Sistem</h2>
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
            <button onClick={() => onNavigate('prediksi')} className="btn-primary">
              Mulai Sekarang
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-8 border-t border-blue-50 text-center">
        <p className="text-xs text-slate-400">
          AI-Based Pharmaceutical Data Selection and Monitoring System · PJK-GM016
          <br />Pijak in collaboration with IBM SkillsBuild
        </p>
      </footer>
    </div>
  )
}
