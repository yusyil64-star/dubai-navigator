import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BottomSheet } from './components/BottomSheet'
import { BrandBadge } from './components/BrandBadge'
import { CategoryResults } from './components/CategoryResults'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { MapView } from './components/MapView'
import { NavigationView } from './components/NavigationView'
import { PlaceCard } from './components/PlaceCard'
import { PlaceMarker } from './components/PlaceMarker'
import { RoutePanel } from './components/RoutePanel'
import { SearchBox } from './components/SearchBox'
import { SettingsPanel } from './components/SettingsPanel'
import { SpeedCameraLayer } from './components/SpeedCameraLayer'
import { Toast } from './components/Toast'
import { addRecent } from './places'
import type { Category } from './services/categories'
import type { Place } from './services/geocoding'
import type { LonLat, Route } from './services/routing'
import { useResolvedTheme, useSettings } from './settings'

const THEME_COLORS = { light: '#f4f1ea', dark: '#1a1917' }

function App() {
  // t('schlüssel') liefert den Text in der aktuellen Sprache
  const { t } = useTranslation()
  const settings = useSettings()
  const theme = useResolvedTheme()
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
  // Geöffnete Kategorie (z. B. Tankstellen) und der Punkt, um den herum gesucht wird
  const [category, setCategory] = useState<{ category: Category; around: LonLat } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Hell/Dunkel für die ganze Seite setzen (Farben in index.css) und die Farbe der Browserleiste
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  function selectPlace(selected: Place) {
    addRecent(selected)
    setPlace(selected)
    setCategory(null)
  }

  function closePlace() {
    setPlace(null)
    setRouting(false)
  }

  function openCategory(selected: Category) {
    // In der Nähe des eigenen Standorts suchen, sonst um die Kartenmitte
    const center = map?.getCenter()
    const around: LonLat = userLocation ?? (center ? [center.lng, center.lat] : [55.2744, 25.1972])
    setCategory({ category: selected, around })
  }

  // Inhalt des Bedienfelds: Route → Ort → Kategorie → Suche
  // (Die Einstellungen legen sich darüber, damit z. B. eine geplante Route erhalten bleibt.)
  let sheetContent
  if (place && routing && map) {
    sheetContent = (
      <RoutePanel
        map={map}
        destination={place}
        userLocation={userLocation}
        onClose={() => setRouting(false)}
        onNavigate={(route, simulate) => setNavigation({ route, simulate })}
      />
    )
  } else if (place) {
    sheetContent = <PlaceCard place={place} onClose={closePlace} onRoute={() => setRouting(true)} />
  } else if (category && map) {
    sheetContent = (
      <CategoryResults
        map={map}
        category={category.category}
        around={category.around}
        onSelect={selectPlace}
        onClose={() => setCategory(null)}
      />
    )
  } else {
    sheetContent = <SearchBox onSelect={selectPlace} onCategory={openCategory} />
  }

  return (
    <>
      <MapView theme={theme} onNotice={setNotice} onMapReady={setMap} onLocation={setUserLocation} />
      {map && place && <PlaceMarker map={map} place={place} />}
      {map && settings.speedCameras && <SpeedCameraLayer map={map} />}
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
          <button
            type="button"
            className="settings-button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label={t('settings.title')}
            aria-expanded={settingsOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
          <BottomSheet>{sheetContent}</BottomSheet>
          {settingsOpen && (
            <BottomSheet>
              <SettingsPanel onClose={() => setSettingsOpen(false)} />
            </BottomSheet>
          )}
        </>
      )}
      {notice && <Toast message={t(notice)} onClose={closeNotice} />}
    </>
  )
}

export default App
