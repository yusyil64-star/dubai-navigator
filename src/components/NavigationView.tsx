import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { instructionText, maneuverIcon } from '../navigation/instructions'
import { useNavigation } from '../navigation/useNavigation'
import { useSmoothFollow } from '../navigation/useSmoothFollow'
import { setParked } from '../places'
import type { Place } from '../services/geocoding'
import { getRoute, type Route } from '../services/routing'
import { updateSettings, useSettings } from '../settings'
import { formatClock, formatDistance, formatDuration } from '../utils/format'
import { placeLink, share } from '../utils/share'
import { AlongRouteSearch } from './AlongRouteSearch'
import { LaneGuide } from './LaneGuide'
import { ManeuverArrow } from './ManeuverArrow'
import { RouteLine } from './RouteLine'
import { SpeedDisplay } from './SpeedDisplay'
import './NavigationView.css'

const LOCATION_ERRORS: Record<number, string> = { 1: 'location.denied', 3: 'location.timeout' }

type NavigationViewProps = {
  map: MapLibreMap
  route: Route
  simulate: boolean
  onExit: () => void
  onNotice: (key: string) => void
  destination: Place | null // für "Ankunftszeit teilen"
  onReroute: (route: Route) => void // neue Route (z. B. mit Zwischenstopp unterwegs)
}

// Navigations-Ansicht: Banner mit nächstem Manöver, Restzeit, Karte folgt der Position.
export function NavigationView({
  map,
  route: initialRoute,
  simulate,
  onExit,
  onNotice,
  destination,
  onReroute,
}: NavigationViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const settings = useSettings()
  const [following, setFollowing] = useState(true)
  const [parkedHere, setParkedHere] = useState(false)
  const [searching, setSearching] = useState(false)
  const { route, progress, status } = useNavigation(initialRoute, {
    simulate,
    voiceEnabled: settings.voice,
    cameraWarnings: settings.speedCameras,
    onLocationError: (code) => onNotice(LOCATION_ERRORS[code] ?? 'location.unavailable'),
  })

  const toggleVoice = () => updateSettings({ voice: !settings.voice })

  // Unterwegs gefundenen Ort als nächsten Zwischenstopp einfügen
  async function addStop(place: Place) {
    setSearching(false)
    if (!progress) return
    const legIndex = progress.nextStep?.legIndex ?? route.waypoints.length - 2
    const remaining = route.waypoints.slice(legIndex + 1)
    try {
      const signal = AbortSignal.timeout(15000)
      onReroute(await getRoute([progress.position, [place.lon, place.lat], ...remaining], route.profile, signal))
    } catch {
      onNotice('route.error')
    }
  }

  // Ankunftszeit teilen, z. B. per WhatsApp: "Ich bin um 14:32 bei Dubai Mall." (ohne Live-Verfolgung)
  async function shareArrival() {
    if (!progress || !destination) return
    const time = formatClock(new Date(progress.arrivalTime), language)
    const result = await share({
      text: t('share.eta', { time, place: destination.name }),
      url: placeLink(destination),
    })
    if (result === 'copied' || result === 'failed') onNotice(`share.${result}`)
  }

  // Während der Navigation die normalen Kartenknöpfe ausblenden
  useEffect(() => {
    document.documentElement.classList.add('is-navigating')
    return () => document.documentElement.classList.remove('is-navigating')
  }, [])

  // Verschiebt man die Karte mit dem Finger, hört sie auf zu folgen
  useEffect(() => {
    const stopFollowing = () => setFollowing(false)
    map.on('dragstart', stopFollowing)
    return () => {
      map.off('dragstart', stopFollowing)
      // Beim Beenden: Karte wieder gerade und nach Norden ausrichten
      map.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    }
  }, [map])

  // Positionspfeil auf der Karte
  const [puck] = useState(() => {
    const element = document.createElement('div')
    element.className = 'nav-puck'
    element.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l7 19-7-4-7 4z"/></svg>'
    return new Marker({ element, rotationAlignment: 'map', pitchAlignment: 'map' })
  })
  useEffect(() => () => void puck.remove(), [puck])

  // Pfeil und Karte flüssig mitbewegen (in jedem Bild, nicht nur bei jeder GPS-Position)
  useSmoothFollow({ map, puck, route, progress, following })

  const next = progress?.nextStep
  let bannerText = next ? instructionText(next, t, language) : ''
  if (status === 'rerouting') bannerText = t('nav.rerouting')
  if (status === 'arrived') bannerText = t('nav.arrived')

  return (
    <>
      <RouteLine map={map} coordinates={route.coordinates} fit={false} stops={route.waypoints.slice(1, -1)} />

      <div className="nav-banner" role="status">
        {status === 'active' && next && <ManeuverArrow icon={maneuverIcon(next)} />}
        {status === 'arrived' && <ManeuverArrow icon="arrive" />}
        <div className="nav-banner__text">
          {status === 'active' && progress && (
            <strong className="nav-banner__distance">{formatDistance(progress.distanceToNext, language)}</strong>
          )}
          <span>{bannerText || t('nav.waitingForGps')}</span>
          {status === 'active' && next?.lanes && <LaneGuide lanes={next.lanes} modifier={next.modifier} />}
        </div>
      </div>

      {status === 'active' && progress?.camera && (
        <div className="nav-camera" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h11l3-2v10l-3-2H4zM7 13v5h3v-5" />
          </svg>
          <span>
            {t('nav.camera')} · {formatDistance(progress.camera.distance, language)}
            {progress.camera.speed && ` · ${progress.camera.speed} km/h`}
          </span>
        </div>
      )}

      {progress && status !== 'arrived' && <SpeedDisplay speed={progress.speed} limit={progress.speedLimit} />}

      {!following && (
        <button type="button" className="nav-recenter" onClick={() => setFollowing(true)}>
          {t('nav.recenter')}
        </button>
      )}

      {searching && progress?.along != null && (
        <AlongRouteSearch route={route} along={progress.along} onPick={addStop} onClose={() => setSearching(false)} />
      )}

      <div className="nav-footer">
        <div className="nav-footer__info">
          {progress && status !== 'arrived' && (
            <>
              <strong>{formatDuration(progress.remainingDuration, language)}</strong>
              <span>
                {formatDistance(progress.remainingDistance, language)}
                {` · ${t('nav.arrival', { time: formatClock(new Date(progress.arrivalTime), language) })}`}
              </span>
            </>
          )}
          {/* Mit dem Auto angekommen: Parkplatz merken anbieten */}
          {status === 'arrived' && route.profile === 'car' && progress && (
            <button
              type="button"
              className="nav-footer__park"
              disabled={parkedHere}
              onClick={() => {
                setParked(progress.position)
                setParkedHere(true)
              }}
            >
              {parkedHere ? `✓ ${t('parking.saved')}` : t('parking.saveHere')}
            </button>
          )}
          {simulate && <span className="nav-footer__badge">{t('nav.simulation')}</span>}
        </div>
        {status === 'active' && progress?.along != null && (
          <button
            type="button"
            className="nav-footer__icon"
            onClick={() => setSearching((open) => !open)}
            aria-pressed={searching}
            aria-label={t('along.title')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6" className="stroke" />
              <path d="M16 16l4 4" className="stroke" />
            </svg>
          </button>
        )}
        {destination && status !== 'arrived' && (
          <button type="button" className="nav-footer__icon" onClick={shareArrival} aria-label={t('share.etaButton')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 5l6 6-6 6M20 11H10a6 6 0 0 0-6 6v2" className="stroke" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="nav-footer__icon"
          onClick={toggleVoice}
          aria-pressed={settings.voice}
          aria-label={t(settings.voice ? 'nav.mute' : 'nav.unmute')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {settings.voice ? (
              <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" className="stroke" />
            ) : (
              <path d="M16 9l5 6M21 9l-5 6" className="stroke" />
            )}
          </svg>
        </button>
        <button type="button" className="nav-footer__exit" onClick={onExit}>
          {t('nav.exit')}
        </button>
      </div>
    </>
  )
}
