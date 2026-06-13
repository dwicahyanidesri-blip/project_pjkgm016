// src/components/Navbar.jsx
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS_LANDING = [
  { id: 'beranda',  label: 'Beranda' },
  { id: 'fitur',    label: 'Fitur' },
  { id: 'tutorial', label: 'Tutorial' },
]

const NAV_ITEMS_APP = [
  { id: 'monitoring',      label: 'Monitoring' },
  { id: 'defect-analysis', label: 'Analisis Defect' },
  { id: 'ai-analyst',      label: 'AI Analyst' },
]

export default function Navbar({ activePage, activeSection, onNavigate, onNavigateSection, appMode, onBackToHome }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isApp = appMode === 'app'
  const navItems = isApp ? NAV_ITEMS_APP : NAV_ITEMS_LANDING
  const activeId = (!isApp && activePage === 'beranda') ? activeSection : activePage

  const handleNavClick = (id) => {
    if (!isApp && (id === 'fitur' || id === 'tutorial' || id === 'beranda')) {
      onNavigateSection(id)
    } else {
      onNavigate(id)
    }
  }

  return (
    <nav className="navbar">
      <div className="max-w-7xl mx-auto px-6 h-16 items-center grid grid-cols-1 lg:grid-cols-3">

        {/* Logo */}
        <button
          onClick={() => onNavigate(isApp ? 'monitoring' : 'beranda')}
          className="flex items-center gap-2.5 shrink-0 justify-self-start"
        >
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-white">
            <img src="/images/logo.png" alt="AI Pharma" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-none">AI Pharma</div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5">PJK-GM016</div>
          </div>
        </button>

        {/* Nav tabs — desktop */}
        <div className="hidden lg:flex items-center gap-1 justify-self-center">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={clsx('nav-tab', activeId === id && 'active')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 justify-self-end">
          {isApp && (
            <button
              onClick={onBackToHome}
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-blue-600
                         bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full
                         px-4 py-1.5 transition-colors"
            >
              Kembali ke Beranda
            </button>
          )}

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
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { handleNavClick(id); setMenuOpen(false) }}
              className={clsx(
                'block w-full text-left px-3 py-2.5 text-sm rounded-lg mt-1',
                activeId === id
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
          {isApp && (
            <button
              onClick={() => { onBackToHome(); setMenuOpen(false) }}
              className="block w-full text-left px-3 py-2.5 text-sm rounded-lg mt-1 text-blue-600
                         bg-blue-50 font-semibold"
            >
              Kembali ke Beranda
            </button>
          )}
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
