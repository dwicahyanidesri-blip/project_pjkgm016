import { Database, ArrowRight } from 'lucide-react'

export default function UploadGate({ onNavigate, pageName }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-20">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
          <Database size={32} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          Dataset Belum Diunggah
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Halaman <strong>{pageName}</strong> membutuhkan data produksi granulasi.
          Silakan upload file Excel terlebih dahulu agar sistem dapat menganalisis data Anda.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onNavigate('prediksi')}
            className="btn-primary justify-center"
          >
            Upload Dataset Sekarang
            <ArrowRight size={15} />
          </button>
          <button
            onClick={() => onNavigate('beranda')}
            className="btn-outline justify-center"
          >
            Pelajari Cara Menggunakan
          </button>
        </div>
      </div>
    </div>
  )
}
