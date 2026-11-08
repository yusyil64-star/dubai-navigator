import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MapView } from './components/MapView'
import { NavigationView } from './components/NavigationView'
import { PlaceCard } from './components/PlaceCard'
import { PlaceMarker } from './components/PlaceMarker'
import { RoutePanel } from './components/RoutePanel'
import { SearchBox } from './components/SearchBox'
import { Toast } from './components/Toast'
import type { Place } from './services/geocoding'
import type { LonLat, Route } from './services/routing'

function App() {
  // t('schlüssel') liefert den Text in der aktuellen Sprache
  const { t } = useTranslation()
  // Die fertige Karte (erst nach dem Laden vorhanden)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Aktuelle Hinweis-Meldung (Übersetzungsschlüssel) oder null = keine
  const [notice, setNotice] = useState<string | null>(null)
  const closeNotice = useCallback(() => setNotice(null), [])
  // Der gesuchte und ausgewählte Ort (Ziel)
  const [place, setPlace] = useState<Place | null>(null)
  // Ob gerade eine Route zum Ziel angezeigt wird
  const [routing, setRouting] = useState(false)
  // Eigener GPS-Standort, sobald bekannt
  const [userLocation, setUserLocation] = useState<LonLat | null>(null)
  // Laufende Navigation (simulate = Demo-Fahrt) oder null
  const [navigation, setNavigation] = useState<{ route: Route; simulate: boolean } | null>(null)

  function closePlace() {
    setPlace(null)
    setRouting(false)
  }

  // Inhalt des Bedienfelds: Suche → Ort → Route
  let sheetContent
  if (!place) {
    sheetContent = <SearchBox onSelect={setPlace} />
  } else if (routing && map) {
    sheetContent = (
      <RoutePanel
        map={map}
        destination={place}
        userLocation={userLocation}
        onClose={() => setRouting(false)}
        onNavigate={(route, simulate) => setNavigation({ route, simulate })}
      />
    )
  } else {
    sheetContent = <PlaceCard place={place} onClose={closePlace} onRoute={() => setRouting(true)} />
  }

  return (
    <>
      <MapView onNotice={setNotice} onMapReady={setMap} onLocation={setUserLocation} />
      {map && place && <PlaceMarker map={map} place={place} />}
      {map && navigation ? (
        <NavigationView
          map={map}
          route={navigation.route}
          simulate={navigation.simulate}
          onExit={() => setNavigation(null)}
          onNotice={setNotice}
        />
      ) : (
        <>
          <BrandBadge />
          <LanguageSwitcher />
          <BottomSheet>{sheetContent}</BottomSheet>
        </>
      )}
      {notice && <Toast message={t(notice)} onClose={closeNotice} />}
    </>
  )
}

export default App
