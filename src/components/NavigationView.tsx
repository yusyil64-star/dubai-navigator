import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { instructionText, maneuverIcon } from '../navigation/instructions'
import { cumulativeDistances } from '../navigation/geo'
import { reportAheadOnRoute } from '../navigation/reportsAhead'
import { useNavigation } from '../navigation/useNavigation'
import { useSmoothFollow } from '../navigation/useSmoothFollow'
import { setParked } from '../places'
import type { Place } from '../services/geocoding'
import { hasReports, useReports } from '../services/reports'
import { getRoute, type LonLat, type Route } from '../services/routing'
import { updateSettings, useSettings } from '../settings'
import { formatClock, formatDistance, formatDuration } from '../utils/format'
import { placeLink, share } from '../utils/share'
import { canShareLive, currentShareId, endShare, followLink, startShare, updateShare } from '../services/liveShare'
import { AlongRouteSearch } from './AlongRouteSearch'
import { LaneGuide } from './LaneGuide'
import { ManeuverArrow } from './ManeuverArrow'
import { ReportButton } from './ReportButton'
import { ReportWarning } from './ReportWarning'
import { RouteLine } from './RouteLine'
import { SpeedDisplay } from './SpeedDisplay'
import './NavigationView.css'

const LOCATION_ERRORS: Record<number, string> = { 1: 'location.denied', 3: 'location.timeout' }
const LIVE_SHARE_MS = 10_000 // so oft die Position beim Live-Teilen schicken
const PARKING_HINT_METERS = 1500 // ab dieser Restentfernung "Parkplätze in der Nähe" anbieten

type NavigationViewProps = {
  map: MapLibreMap
  route: Route
  simulate: boolean
  onExit: () => void
  onNotice: (key: string) => void
  destination: Place | null // für "Ankunftszeit teilen"
  onReroute: (route: Route) => void // neue Route (z. B. mit Zwischenstopp unterwegs)
  onFindParking: (around: LonLat) => void // Parkplätze beim Ziel zeigen (beendet die Navigation)
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
  onFindParking,
}: NavigationViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const settings = useSettings()
  const [following, setFollowing] = useState(true)
  const [parkedHere, setParkedHere] = useState(false)
  const [searching, setSearching] = useState(false)

  const { route, progress, status } = useNavigation(initialRoute, {
    simulate,
    sound: settings.sound,
    cameraWarnings: settings.speedCameras,
    onLocationError: (code) => onNotice(LOCATION_ERRORS[code] ?? 'location.unavailable'),
  })

  // Fahrtenübersicht: Startzeit merken, bei der Ankunft Dauer festhalten
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  const [tripSeconds, setTripSeconds] = useState<number | null>(null)
  useEffect(() => {
    if (status === 'arrived') setTripSeconds((Date.now() - startedAt.current) / 1000)
  }, [status])

  // Ton umschalten wie bei Waze: alle Ansagen → nur Warnungen → stumm → …
  const nextSound = { all: 'alerts', alerts: 'off', off: 'all' } as const
  // Meldungen anderer Nutzer auf der Route voraus
  const reports = useReports(hasReports && settings.communityReports)
  const cum = useMemo(() => cumulativeDistances(route.coordinates), [route])
  const reportAhead =
    status === 'active' && progress?.along != null
      ? reportAheadOnRoute(reports, route.coordinates, cum, progress.along, progress.position)
      : null

  const toggleVoice = () => updateSettings({ sound: nextSound[settings.sound] })

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
    let result
    try {
      if (!canShareLive) throw new Error('kein Server')
      // Live-Standort: Link zeigt die Fahrt in Echtzeit
      const id = await startShare(destination.name, route.waypoints[route.waypoints.length - 1], {
        position: progress.position,
        heading: progress.heading,
        eta: progress.arrivalTime,
      })
      setSharingLive(true)
      result = await share({ text: t('share.live', { time, place: destination.name }), url: followLink(id) })
    } catch {
      // ohne Server: nur Ankunftszeit und Ziel teilen
      result = await share({ text: t('share.eta', { time, place: destination.name }), url: placeLink(destination) })
    }
    if (result === 'copied' || result === 'failed') onNotice(`share.${result}`)
  }

  function stopSharing() {
    void endShare()
    setSharingLive(false)
  }

  // Live-Standort: alle 10 Sekunden die aktuelle Position schicken; bei der Ankunft beenden
  const [sharingLive, setSharingLive] = useState(() => currentShareId() !== null)
  const latestProgress = useRef(progress)
  useEffect(() => {
    latestProgress.current = progress
  }, [progress])
  useEffect(() => {
    if (!sharingLive) return
    const timer = setInterval(() => {
      const p = latestProgress.current
      if (p) void updateShare({ position: p.position, heading: p.heading, eta: p.arrivalTime })
    }, LIVE_SHARE_MS)
    return () => clearInterval(timer)
  }, [sharingLive])
  useEffect(() => {
    if (status === 'arrived' && sharingLive) {
      const p = latestProgress.current
      // letzte Position (am Ziel) noch schicken, dann beenden
      if (p) void updateShare({ position: p.position, heading: p.heading, eta: Date.now() }).then(endShare)
      else void endShare()
      setSharingLive(false)
    }
  }, [status, sharingLive])

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

      <ReportWarning ahead={reportAhead} className={progress?.camera ? 'nav-report--below' : ''} />
      {hasReports && status !== 'arrived' && (
        <ReportButton position={progress?.position ?? null} heading={progress?.heading ?? null} onNotice={onNotice} />
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
          {status === 'arrived' && tripSeconds !== null && (
            <>
              <strong>{t('nav.tripDone')}</strong>
              <span>
                {t('nav.tripSummary', {
                  distance: formatDistance(route.distanceMeters, language),
                  duration: formatDuration(tripSeconds, language),
                })}
              </span>
            </>
          )}
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
          {/* Kurz vor dem Ziel (oder dort): Parkplätze in der Nähe zeigen, wie bei Waze */}
          {route.profile === 'car' && progress && (status === 'arrived' || progress.remainingDistance < PARKING_HINT_METERS) && (
            <button type="button" className="nav-footer__park" onClick={() => onFindParking(route.waypoints[route.waypoints.length - 1])}>
              {t('parking.nearby')}
            </button>
          )}
          {sharingLive && (
            <button type="button" className="nav-footer__live" onClick={stopSharing}>
              <span aria-hidden="true">●</span> {t('share.liveOn')} ✕
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
          aria-label={t('nav.sound', { mode: t(`settings.sounds.${settings.sound}`) })}
          title={t(`settings.sounds.${settings.sound}`)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {settings.sound === 'all' && <path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" className="stroke" />}
            {settings.sound === 'alerts' && <path d="M18 7v6M18 16.5v.5" className="stroke" />}
            {settings.sound === 'off' && <path d="M16 9l5 6M21 9l-5 6" className="stroke" />}
          </svg>
        </button>
        <button type="button" className="nav-footer__exit" onClick={onExit}>
          {t('nav.exit')}
        </button>
      </div>
    </>
  )
}
