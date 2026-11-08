import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { MapView } from './components/MapView'
import './App.css'

function App() {
  return (
    <>
      <MapView />
      <BrandBadge />
      <BottomSheet>
        {/* Platzhalter: Die Suche wird erst in einer späteren Phase gebaut */}
        <div className="search-placeholder" aria-disabled="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <span>Wohin möchtest du?</span>
        </div>
        <p className="sheet-hint">Die Suche folgt in einer späteren Phase.</p>
      </BottomSheet>
    </>
  )
}

export default App
