import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { unlockSpeech } from '../navigation/voice'
import type { Place } from '../services/geocoding'
import { mainRoads } from '../navigation/instructions'
import { getRoutes, type LonLat, type Profile, type Route } from '../services/routing'
import { formatDistance, formatDuration } from '../utils/format'
import { AlternativeRoutes } from './AlternativeRoutes'
import { RouteExtras } from './RouteExtras'
import { RouteLine } from './RouteLine'
import { SearchBox } from './SearchBox'
import { StepList } from './StepList'
import './RoutePanel.css'

// name = null bedeutet: eigener Standort (Text wird in der aktuellen Sprache angezeigt)
type Start = { name: string | null; lon: number; lat: number }

// Ergebnis einer Routenanfrage; "key" sagt, zu welcher Anfrage es gehört
type Result = { key: string; routes?: Route[]; failed?: boolean }

const PROFILES: Profile[] = ['car', 'bike', 'foot']
const MAX_STOPS = 3

type RoutePanelProps = {
  map: MapLibreMap
  destination: Place
  userLocation: LonLat | null // GPS-Standort, falls bekannt
  onClose: () => void
  // Navigation mit dieser Route starten (simulate = Demo-Fahrt)
  onNavigate: (route: Route, simulate: boolean) => void
}

// Route vom Startpunkt (GPS oder gesucht) über Zwischenstopps zum Ziel.
export function RoutePanel({ map, destination, userLocation, onClose, onNavigate }: RoutePanelProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [start, setStart] = useState<Start | null>(() =>
    userLocation ? { name: null, lon: userLocation[0], lat: userLocation[1] } : null,
  )
  const [stops, setStops] = useState<Place[]>([])
  const [addingStop, setAddingStop] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [profile, setProfile] = useState<Profile>('car')
  const [result, setResult] = useState<Result | null>(null)
  const [selection, setSelection] = useState<{ key: string; index: number } | null>(null)

  // Alle Punkte der Route als Text – ändert sich nur, wenn sich wirklich ein Punkt ändert
  const pointsKey = start
    ? JSON.stringify([
        [start.lon, start.lat],
        ...stops.map((s) => [s.lon, s.lat]),
        [destination.lon, destination.lat],
      ])
    : null
  const key = pointsKey ? `${profile}|${pointsKey}` : null

  useEffect(() => {
    if (!key || !pointsKey) return
    const controller = new AbortController()
    getRoutes(JSON.parse(pointsKey) as LonLat[], profile, controller.signal)
      .then((routes) => setResult({ key, routes }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, failed: true })
      })
    return () => controller.abort()
  }, [key, pointsKey, profile])

  // Nur das Ergebnis für die aktuelle Anfrage zählt
  const current = result && result.key === key ? result : null
  const routes = current?.routes ?? []
  // gewählte Route (nach jeder neuen Anfrage wieder die schnellste)
  const selected = selection && selection.key === key ? selection.index : 0
  const route = routes[selected] as Route | undefined
  const selectRoute = (index: number) => {
    if (key) setSelection({ key, index })
  }
  const fastest = routes.reduce((best, r, i) => (r.durationSeconds < routes[best].durationSeconds ? i : best), 0)

  // Straßen, die eine Route von den anderen unterscheiden (z. B. "über E11")
  const roads = routes.map((r) => mainRoads(r.steps, language, 4))
  const viaText = (i: number) => {
    const own = roads[i].filter((road) => !roads.every((list) => list.includes(road)))
    return (own.length > 0 ? own : roads[i]).slice(0, 2).join(', ')
  }

  function startNavigation(simulate: boolean) {
    if (!route) return
    unlockSpeech() // nötig für Sprachansagen auf dem iPhone
    onNavigate(route, simulate)
  }

  function addStop(place: Place) {
    setStops((list) => [...list, place])
    setAddingStop(false)
  }

  return (
    <div className="route-panel">
      <div className="route-panel__header">
        <ol className="route-panel__points">
          <li>
            <span className="route-panel__label">{t('route.from')}</span>
            {start ? (start.name ?? t('route.myLocation')) : t('route.chooseStart')}
          </li>
          {stops.map((stop, i) => (
            <li key={`${stop.id}-${i}`}>
              <span className="route-panel__label">{t('route.stop', { number: i + 1 })}</span>
              <span className="route-panel__stop-name">{stop.name}</span>
              <button
                type="button"
                className="route-panel__remove"
                onClick={() => setStops((list) => list.filter((_, k) => k !== i))}
                aria-label={t('route.removeStop', { name: stop.name })}
              >
                ×
              </button>
            </li>
          ))}
          <li>
            <span className="route-panel__label">{t('route.to')}</span>
            {destination.name}
          </li>
        </ol>
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

      {start && (
        <>
          <div className="route-panel__profiles" role="group" aria-label={t('route.profile')}>
            {PROFILES.map((p) => (
              <button key={p} type="button" aria-pressed={profile === p} onClick={() => setProfile(p)}>
                {t(`route.profiles.${p}`)}
              </button>
            ))}
          </div>

          {addingStop ? (
            <div className="route-panel__add-stop">
              <SearchBox onSelect={addStop} />
              <button type="button" className="route-panel__link" onClick={() => setAddingStop(false)}>
                {t('route.cancel')}
              </button>
            </div>
          ) : (
            stops.length < MAX_STOPS && (
              <button type="button" className="route-panel__link" onClick={() => setAddingStop(true)}>
                + {t('route.addStop')}
              </button>
            )
          )}
        </>
      )}

      {start && !current && <p className="route-panel__hint">{t('route.loading')}</p>}
      {current?.failed && <p className="route-panel__hint">{t('route.error')}</p>}

      {route && (
        <>
          {routes.length > 1 && (
            <AlternativeRoutes map={map} routes={routes} selected={selected} onSelect={selectRoute} />
          )}
          <RouteLine map={map} coordinates={route.coordinates} stops={route.waypoints.slice(1, -1)} />
          {routes.length > 1 ? (
            <div className="route-panel__options" role="radiogroup" aria-label={t('route.options')}>
              {routes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={i === selected}
                  className="route-panel__option"
                  onClick={() => selectRoute(i)}
                >
                  <span className="route-panel__option-main">
                    <strong>{formatDuration(r.durationSeconds, language)}</strong>
                    <span>{formatDistance(r.distanceMeters, language)}</span>
                  </span>
                  <span className="route-panel__option-detail">
                    {i === fastest
                      ? t('route.fastest')
                      : t('route.slower', {
                          time: formatDuration(r.durationSeconds - routes[fastest].durationSeconds, language),
                        })}
                    {viaText(i) && ` · ${t('route.via', { roads: viaText(i) })}`}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="route-panel__summary">
              <strong>{formatDuration(route.durationSeconds, language)}</strong>
              <span>{formatDistance(route.distanceMeters, language)}</span>
            </p>
          )}
          <p className="route-panel__hint">{t(`route.note.${profile}`)}</p>
          <RouteExtras route={route} />
          <button type="button" className="route-panel__link" onClick={() => setShowSteps((open) => !open)}>
            {showSteps ? t('route.hideSteps') : t('route.showSteps', { count: route.steps.length })}
          </button>
          {showSteps && <StepList route={route} />}
          <div className="route-panel__actions">
            {/* Echte Navigation nur, wenn vom eigenen Standort aus gestartet wird */}
            {start?.name === null && (
              <button type="button" className="route-panel__start" onClick={() => startNavigation(false)}>
                {t('nav.start')}
              </button>
            )}
            <button type="button" className="route-panel__demo" onClick={() => startNavigation(true)}>
              {t('nav.demo')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
