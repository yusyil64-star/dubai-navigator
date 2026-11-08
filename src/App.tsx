import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MapView } from './components/MapView'
import { Toast } from './components/Toast'
import './App.css'

function App() {
  // t('schlüssel') liefert den Text in der aktuellen Sprache
  const { t } = useTranslation()
  // Die fertige Karte (für Suche und Route in späteren Phasen)
  const [, setMap] = useState<MapLibreMap | null>(null)
  // Aktuelle Hinweis-Meldung (Übersetzungsschlüssel) oder null = keine
  const [notice, setNotice] = useState<string | null>(null)
  const closeNotice = useCallback(() => setNotice(null), [])

  return (
    <>
      <MapView onNotice={setNotice} onMapReady={setMap} />
      <BrandBadge />
      <LanguageSwitcher />
      {notice && <Toast message={t(notice)} onClose={closeNotice} />}
      <BottomSheet>
        {/* Platzhalter: Die Suche wird erst in einer späteren Phase gebaut */}
        <div className="search-placeholder" aria-disabled="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <span>{t('search.placeholder')}</span>
        </div>
        <p className="sheet-hint">{t('search.comingSoon')}</p>
      </BottomSheet>
    </>
  )
}

export default App
