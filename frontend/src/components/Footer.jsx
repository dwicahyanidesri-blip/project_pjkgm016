export default function Footer({ onNavigateSection }) {
  return (
    <footer className="bg-blue-700 text-blue-50 px-8 pt-14 pb-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white">
              <img src="/images/logo.png" alt="AI Pharma" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-white">AI Pharma</span>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed max-w-xs">
            Sistem kontrol kualitas granulasi berbasis AI untuk deteksi batch cacat,
            analisis penyebab, dan pemantauan produksi farmasi secara otomatis.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Navigasi</h4>
          <ul className="space-y-2 text-sm text-blue-100">
            <li><button onClick={() => onNavigateSection?.('beranda')} className="hover:text-white transition-colors">Beranda</button></li>
            <li><button onClick={() => onNavigateSection?.('fitur')} className="hover:text-white transition-colors">Fitur</button></li>
            <li><button onClick={() => onNavigateSection?.('tutorial')} className="hover:text-white transition-colors">Tutorial</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Tentang Proyek</h4>
          <p className="text-sm text-blue-100 leading-relaxed mb-4">
            Capstone Project PJK-GM016
          </p>
          <h4 className="text-sm font-semibold text-white mb-3">Diselenggarakan dan Didukung oleh</h4>
          <p className="text-sm text-blue-100 leading-relaxed mb-4">
            Dicoding Pijak in collaboration with IBM SkillsBuild
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-blue-500/40 mt-10 pt-6 text-center">
        <p className="text-xs text-blue-200">
          © 2026 AI Pharma · AI-Based Pharmaceutical Data Selection and Monitoring System
        </p>
      </div>
    </footer>
  )
}
