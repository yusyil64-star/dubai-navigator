import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { instructionText, maneuverIcon } from '../navigation/instructions'
import { useNavigation } from '../navigation/useNavigation'
import type { Route } from '../services/routing'
import { formatClock, formatDistance, formatDuration } from '../utils/format'
import { ManeuverArrow } from './ManeuverArrow'
import { RouteLine } from './RouteLine'
import './NavigationView.css'

const VOICE_KEY = 'dubai-navigator.voice'
const LOCATION_ERRORS: Record<number, string> = { 1: 'location.denied', 3: 'location.timeout' }

function loadVoicePreference() {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off'
  } catch {
    return true
  }
}

type NavigationViewProps = {
  map: MapLibreMap
  route: Route
  simulate: boolean
  onExit: () => void
  onNotice: (key: string) => void
}

// Navigations-Ansicht: Banner mit nächstem Manöver, Restzeit, Karte folgt der Position.
export function NavigationView({ map, route: initialRoute, simulate, onExit, onNotice }: NavigationViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [voiceEnabled, setVoiceEnabled] = useState(loadVoicePreference)
  const [following, setFollowing] = useState(true)
  const { route, progress, status } = useNavigation(initialRoute, {
    simulate,
    voiceEnabled,
    onLocationError: (code) => onNotice(LOCATION_ERRORS[code] ?? 'location.unavailable'),
  })

  function toggleVoice() {
    setVoiceEnabled((on) => {
      try {
        localStorage.setItem(VOICE_KEY, on ? 'off' : 'on')
      } catch {
        // Speicher nicht verfügbar – Einstellung gilt nur bis zum Neuladen
      }
      return !on
    })
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

  useEffect(() => {
    if (!progress) return
    puck.setLngLat(progress.position).setRotation(progress.heading).addTo(map)
    if (following) {
      map.easeTo({
        center: progress.position,
        bearing: progress.heading,
        zoom: 17,
        pitch: 45,
        padding: { top: 160, bottom: 180, left: 0, right: 0 },
        duration: 1000,
        easing: (x) => x,
      })
    }
  }, [map, puck, progress, following])

  const next = progress?.nextStep
  let bannerText = next ? instructionText(next, t, language) : ''
  if (status === 'rerouting') bannerText = t('nav.rerouting')
  if (status === 'arrived') bannerText = t('nav.arrived')

  return (
    <>
      <RouteLine map={map} coordinates={route.coordinates} fit={false} />

      <div className="nav-banner" role="status">
        {status === 'active' && next && <ManeuverArrow icon={maneuverIcon(next)} />}
        {status === 'arrived' && <ManeuverArrow icon="arrive" />}
        <div className="nav-banner__text">
          {status === 'active' && progress && (
            <strong className="nav-banner__distance">{formatDistance(progress.distanceToNext, language)}</strong>
          )}
          <span>{bannerText || t('nav.waitingForGps')}</span>
        </div>
      </div>

      {!following && (
        <button type="button" className="nav-recenter" onClick={() => setFollowing(true)}>
          {t('nav.recenter')}
        </button>
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
          {simulate && <span className="nav-footer__badge">{t('nav.simulation')}</span>}
        </div>
        <button
          type="button"
          className="nav-footer__icon"
          onClick={toggleVoice}
          aria-pressed={voiceEnabled}
          aria-label={t(voiceEnabled ? 'nav.mute' : 'nav.unmute')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {voiceEnabled ? (
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
