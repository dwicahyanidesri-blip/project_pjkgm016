import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle, Menu, X } from 'lucide-react'
import { uploadDataset } from '../hooks/useApi'
import clsx from 'clsx'

const NAV_ITEMS = [
  { id: 'beranda',         label: 'Beranda' },
  { id: 'monitoring',      label: 'Monitoring' },
  { id: 'defect-analysis', label: 'Analisis Defect' },
  { id: 'ai-analyst',      label: 'AI Analyst' },
]

export default function Navbar({ activePage, onNavigate, onDataLoaded, hasData }) {
  const fileRef    = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded,  setUploaded]  = useState(null)
  const [menuOpen,  setMenuOpen]  = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadDataset(file)
      setUploaded({ rows: res.data.rows })
      onDataLoaded(res.data)
    } catch {
      // error handled in Prediksi page
    } finally {
      setUploading(false)
    }
  }

  return (
    <nav className="navbar">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button
          onClick={() => onNavigate('beranda')}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-none">AI Pharma</div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">PJK-GM016</div>
          </div>
        </button>

        {/* Nav tabs — desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={clsx('nav-tab', activePage === id && 'active')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Upload quick button */}
          {uploaded && !uploading
            ? (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50
                              border border-emerald-100 rounded-full px-3 py-1.5">
                <CheckCircle size={12} />
                {uploaded.rows} batch dimuat
              </div>
            )
            : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-blue-600
                           bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full
                           px-3 py-1.5 transition-colors"
              >
                {uploading
                  ? <><Loader2 size={12} className="animate-spin" /> Memproses...</>
                  : <><Upload size={12} /> Upload Dataset</>}
              </button>
            )
          }
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

          {/* Prediksi CTA */}
          <button
            onClick={() => onNavigate('prediksi')}
            className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-white
                       bg-blue-600 hover:bg-blue-700 rounded-full px-4 py-1.5 transition-colors"
          >
            Lakukan Prediksi
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden px-4 pb-4 border-t border-blue-50 bg-white">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setMenuOpen(false) }}
              className={clsx(
                'block w-full text-left px-3 py-2.5 text-sm rounded-lg mt-1',
                activePage === id
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { onNavigate('prediksi'); setMenuOpen(false) }}
            className="btn-primary w-full justify-center mt-3 text-xs"
          >
            Lakukan Prediksi
          </button>
        </div>
      )}
    </nav>
  )
}
