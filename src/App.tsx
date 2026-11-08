import { useTranslation } from 'react-i18next'
import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MapView } from './components/MapView'
import './App.css'

function App() {
  // t('schlüssel') liefert den Text in der aktuellen Sprache
  const { t } = useTranslation()

  return (
    <>
      <MapView />
      <BrandBadge />
      <LanguageSwitcher />
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
