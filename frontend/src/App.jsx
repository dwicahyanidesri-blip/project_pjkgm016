// src/App.jsx
import { useState } from 'react'
import Navbar         from './components/Navbar'
import Footer         from './components/Footer'
import UploadGate     from './components/UploadGate'
import Beranda        from './pages/Beranda'
import Prediksi       from './pages/Prediksi'
import Monitoring     from './pages/Monitoring'
import AnalisisDefect from './pages/AnalisisDefect'
import AIAnalyst      from './pages/AIAnalyst'   // ← ganti dari AIChatbot

// Halaman landing — tampilan penuh tanpa wrapper dashboard
const LANDING_PAGES = {
  'beranda': Beranda,
}

// Halaman dashboard — muncul setelah data berhasil diupload
const PROTECTED = ['monitoring', 'defect-analysis', 'ai-analyst']

const PAGE_NAMES = {
  'monitoring':      'Monitoring',
  'defect-analysis': 'Analisis Defect',
  'ai-analyst':      'AI Analyst',
}

const PAGES = {
  'monitoring':      Monitoring,
  'defect-analysis': AnalisisDefect,
  'ai-analyst':      AIAnalyst,
}

export default function App() {
  const [activePage, setActivePage] = useState('beranda')
  const [activeSection, setActiveSection] = useState('beranda')
  const [hasData,    setHasData]    = useState(false)
  const [appMode,    setAppMode]    = useState('landing') // 'landing' | 'app'

  const handleDataLoaded = () => {
    setHasData(true)
    setAppMode('app')
  }

  const handleNavigate = (page) => {
    if (page === 'beranda') setActiveSection('beranda')
    setActivePage(page)
  }

  const handleBackToHome = () => {
    setAppMode('landing')
    setActiveSection('beranda')
    setActivePage('beranda')
  }

  const handleViewMonitoring = () => {
    if (hasData) setAppMode('app')
    setActivePage('monitoring')
  }

  const handleNavigateSection = (sectionId) => {
    const scrollToSection = () => {
      const el = document.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
    setActiveSection(sectionId)
    setAppMode('landing')
    if (activePage !== 'beranda') {
      setActivePage('beranda')
      // tunggu render halaman beranda selesai sebelum scroll
      requestAnimationFrame(() => requestAnimationFrame(scrollToSection))
    } else {
      scrollToSection()
    }
  }

  const renderPage = () => {
    // ── Halaman landing (Beranda, Fitur, Tentang) ──
    const LandingComponent = LANDING_PAGES[activePage]
    if (LandingComponent) {
      if (activePage === 'beranda') {
        return (
          <LandingComponent
            onNavigate={setActivePage}
            onViewMonitoring={handleViewMonitoring}
            onSectionChange={setActiveSection}
            onNavigateSection={handleNavigateSection}
          />
        )
      }
      return <LandingComponent onNavigate={setActivePage} />
    }

    // ── Halaman prediksi ──
    if (activePage === 'prediksi') {
      return <Prediksi onDataLoaded={handleDataLoaded} onNavigate={setActivePage} />
    }

    // ── Halaman dashboard (butuh data) ──
    if (PROTECTED.includes(activePage) && !hasData) {
      return (
        <div className="pt-16">
          <UploadGate onNavigate={setActivePage} pageName={PAGE_NAMES[activePage] ?? activePage} />
        </div>
      )
    }
    const PageComponent = PAGES[activePage]
    if (!PageComponent) return <Beranda onNavigate={setActivePage} />
    return (
      <div className="pt-16 min-h-screen bg-slate-50 flex flex-col">
        <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
          <PageComponent hasData={hasData} onNavigate={setActivePage} />
        </div>
        <Footer onNavigateSection={handleNavigateSection} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        activePage={activePage}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onNavigateSection={handleNavigateSection}
        appMode={appMode}
        onBackToHome={handleBackToHome}
      />
      <main>{renderPage()}</main>
    </div>
  )
}
