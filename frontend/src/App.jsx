import { useState } from 'react'
import Navbar         from './components/Navbar'
import UploadGate     from './components/UploadGate'
import Beranda        from './pages/Beranda'
import Prediksi       from './pages/Prediksi'
import Monitoring     from './pages/Monitoring'
import AnalisisDefect from './pages/AnalisisDefect'
import AIAnalyst      from './pages/AIAnalyst'   // ← ganti dari AIChatbot

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
  const [hasData,    setHasData]    = useState(false)

  const handleDataLoaded = () => setHasData(true)

  const renderPage = () => {
    if (activePage === 'beranda') {
      return <Beranda onNavigate={setActivePage} />
    }
    if (activePage === 'prediksi') {
      return <Prediksi onDataLoaded={handleDataLoaded} onNavigate={setActivePage} />
    }
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
      <div className="pt-16 min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <PageComponent hasData={hasData} onNavigate={setActivePage} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        onDataLoaded={handleDataLoaded}
        hasData={hasData}
      />
      <main>{renderPage()}</main>
    </div>
  )
}
