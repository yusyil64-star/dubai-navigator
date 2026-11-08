import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MapView } from './components/MapView'
import { PlaceCard } from './components/PlaceCard'
import { PlaceMarker } from './components/PlaceMarker'
import { SearchBox } from './components/SearchBox'
import { Toast } from './components/Toast'
import type { Place } from './services/geocoding'

function App() {
  // t('schlüssel') liefert den Text in der aktuellen Sprache
  const { t } = useTranslation()
  // Die fertige Karte (erst nach dem Laden vorhanden)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Aktuelle Hinweis-Meldung (Übersetzungsschlüssel) oder null = keine
  const [notice, setNotice] = useState<string | null>(null)
  const closeNotice = useCallback(() => setNotice(null), [])
  // Der gesuchte und ausgewählte Ort
  const [place, setPlace] = useState<Place | null>(null)

  return (
    <>
      <MapView onNotice={setNotice} onMapReady={setMap} />
      {map && place && <PlaceMarker map={map} place={place} />}
      <BrandBadge />
      <LanguageSwitcher />
      {notice && <Toast message={t(notice)} onClose={closeNotice} />}
      <BottomSheet>
        {place ? (
          <PlaceCard place={place} onClose={() => setPlace(null)} />
        ) : (
          <SearchBox onSelect={setPlace} />
        )}
      </BottomSheet>
    </>
  )
}

export default App
