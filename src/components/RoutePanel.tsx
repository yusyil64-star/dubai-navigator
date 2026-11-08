import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Place } from '../services/geocoding'
import { getRoute, type LonLat, type Route } from '../services/routing'
import { RouteLine } from './RouteLine'
import { SearchBox } from './SearchBox'
import './RoutePanel.css'

// name = null bedeutet: eigener Standort (Text wird in der aktuellen Sprache angezeigt)
type Start = { name: string | null; lon: number; lat: number }

// Ergebnis einer Routenanfrage; "key" sagt, zu welchem Startpunkt es gehört
type Result = { key: string; route?: Route; failed?: boolean }

type RoutePanelProps = {
  map: MapLibreMap
  destination: Place
  userLocation: LonLat | null // GPS-Standort, falls bekannt
  onClose: () => void
}

// Route vom Startpunkt (GPS oder gesucht) zum Ziel: Linie auf der Karte + Entfernung/Fahrzeit.
export function RoutePanel({ map, destination, userLocation, onClose }: RoutePanelProps) {
  const { t, i18n } = useTranslation()
  const [start, setStart] = useState<Start | null>(() =>
    userLocation ? { name: null, lon: userLocation[0], lat: userLocation[1] } : null,
  )
  const [result, setResult] = useState<Result | null>(null)

  const key = start ? `${start.lon},${start.lat}` : null

  useEffect(() => {
    if (!start || !key) return
    const controller = new AbortController()
    getRoute([start.lon, start.lat], [destination.lon, destination.lat], controller.signal)
      .then((route) => setResult({ key, route }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, failed: true })
      })
    return () => controller.abort()
  }, [start, key, destination])

  // Nur das Ergebnis für den aktuellen Startpunkt zählt
  const current = result && result.key === key ? result : null
  const language = i18n.resolvedLanguage ?? 'en'

  return (
    <div className="route-panel">
      <div className="route-panel__header">
        <div className="route-panel__points">
          <p>
            <span className="route-panel__label">{t('route.from')}</span>
            {start ? (start.name ?? t('route.myLocation')) : t('route.chooseStart')}
          </p>
          <p>
            <span className="route-panel__label">{t('route.to')}</span>
            {destination.name}
          </p>
        </div>
        <button type="button" className="route-panel__close" onClick={onClose} aria-label={t('route.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {!start && (
        <>
          <p className="route-panel__hint">{t('route.needStart')}</p>
          <SearchBox onSelect={(place) => setStart(place)} />
        </>
      )}

      {start && !current && <p className="route-panel__hint">{t('route.loading')}</p>}
      {current?.failed && <p className="route-panel__hint">{t('route.error')}</p>}

      {current?.route && (
        <>
          <RouteLine map={map} coordinates={current.route.coordinates} />
          <p className="route-panel__summary">
            <strong>{formatDuration(current.route.durationSeconds, language)}</strong>
            <span>{formatDistance(current.route.distanceMeters, language)}</span>
          </p>
          <p className="route-panel__hint">{t('route.noTraffic')}</p>
        </>
      )}
    </div>
  )
}

// "16 Min." bzw. "1 Std. 5 Min." – in der jeweiligen Sprache
function formatDuration(seconds: number, language: string) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  const unit = (value: number, unit: 'hour' | 'minute') =>
    new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return unit(minutes, 'minute')
  return minutes === 0 ? unit(hours, 'hour') : `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`
}

// "15,5 km" bzw. "800 m"
function formatDistance(meters: number, language: string) {
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10
    return new Intl.NumberFormat(language, { style: 'unit', unit: 'meter' }).format(rounded)
  }
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  }).format(meters / 1000)
}
