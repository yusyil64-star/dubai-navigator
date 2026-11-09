import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { bearing, distance } from '../navigation/geo'
import { spokenDistance } from '../navigation/instructions'
import { watchRealPosition } from '../navigation/positions'
import { loadSpeedCameras, loadSpeedLimits, speedLimitAt, type Camera, type SpeedLimitIndex } from '../navigation/roadData'
import { useSmoothFollow, type SmoothInput } from '../navigation/useSmoothFollow'
import { speak, stopSpeaking } from '../navigation/voice'
import { useSettings } from '../settings'
import { formatDistance } from '../utils/format'
import { SpeedDisplay } from './SpeedDisplay'
import './NavigationView.css'

const LOCATION_ERRORS: Record<number, string> = { 1: 'location.denied', 3: 'location.timeout' }
const CAMERA_SHOW_METERS = 500
const CAMERA_SAY_METERS = 350
const CAMERA_ANGLE = 30 // Grad – Blitzer muss ungefähr in Fahrtrichtung liegen
const MIN_MOVE_FOR_HEADING = 5 // m – erst ab dieser Strecke die Fahrtrichtung neu bestimmen

type DriveState = SmoothInput & {
  speed: number | null // km/h
  limit: number | null
  camera: { distance: number; speed: number | null } | null
}

type DriveViewProps = { map: MapLibreMap; onExit: () => void; onNotice: (key: string) => void }

// Fahrmodus ohne Ziel (wie bei Waze): Karte folgt, Tempo, Tempolimit und Blitzer voraus.
export function DriveView({ map, onExit, onNotice }: DriveViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const settings = useSettings()
  const [state, setState] = useState<DriveState | null>(null)
  const [following, setFollowing] = useState(true)

  // Aktuelle Werte für den GPS-Rückruf, ohne ihn neu anzumelden
  const live = useRef({ t, language, settings, onNotice })
  useEffect(() => {
    live.current = { t, language, settings, onNotice }
  }, [t, language, settings, onNotice])

  useEffect(() => {
    document.documentElement.classList.add('is-navigating')
    return () => document.documentElement.classList.remove('is-navigating')
  }, [])

  useEffect(() => {
    const stopFollowing = () => setFollowing(false)
    map.on('dragstart', stopFollowing)
    return () => {
      map.off('dragstart', stopFollowing)
      map.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    }
  }, [map])

  useEffect(() => {
    let cameras: Camera[] = []
    let limits: SpeedLimitIndex | null = null
    loadSpeedCameras().then((c) => (cameras = c)).catch(() => {})
    loadSpeedLimits().then((l) => (limits = l)).catch(() => {})
    let last: { position: [number, number]; heading: number } | null = null
    const said = new Set<Camera>()

    const stop = watchRealPosition(
      (fix) => {
        // Fahrtrichtung aus der Bewegung (das Gerät liefert sie nicht immer)
        let heading = last?.heading ?? 0
        if (last && distance(last.position, fix.position) >= MIN_MOVE_FOR_HEADING) {
          heading = bearing(last.position, fix.position)
        }
        if (!last || distance(last.position, fix.position) >= MIN_MOVE_FOR_HEADING) {
          last = { position: fix.position, heading }
        }

        // Nächster Blitzer ungefähr in Fahrtrichtung
        const { settings: s, t: tr, language: lang } = live.current
        let nearest: { camera: Camera; distance: number } | null = null
        if (s.speedCameras) {
          for (const c of cameras) {
            const d = distance(fix.position, c.position)
            if (d > CAMERA_SHOW_METERS || (nearest && d >= nearest.distance)) continue
            const angle = Math.abs(((bearing(fix.position, c.position) - heading + 540) % 360) - 180)
            if (angle <= CAMERA_ANGLE) nearest = { camera: c, distance: d }
          }
          // jeden Blitzer nur einmal ansagen
          if (nearest && nearest.distance <= CAMERA_SAY_METERS && !said.has(nearest.camera)) {
            said.add(nearest.camera)
            if (s.sound !== 'off') speak(tr('nav.cameraAhead', { distance: spokenDistance(nearest.distance, tr, lang) }), lang)
          }
        }
        const camera = nearest && { distance: nearest.distance, speed: nearest.camera.speed }

        setState({
          position: fix.position,
          heading,
          along: null,
          speedMs: fix.speed ?? 0,
          fixTime: performance.now(),
          speed: fix.speed === null ? null : Math.round(fix.speed * 3.6),
          limit: limits ? speedLimitAt(limits, fix.position, heading) : null,
          camera,
        })
      },
      (code) => live.current.onNotice(LOCATION_ERRORS[code] ?? 'location.unavailable'),
    )
    return () => {
      stop()
      stopSpeaking()
    }
  }, [])

  // Bildschirm anlassen
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release()
  }, [])

  const [puck] = useState(() => {
    const element = document.createElement('div')
    element.className = 'nav-puck'
    element.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l7 19-7-4-7 4z"/></svg>'
    return new Marker({ element, rotationAlignment: 'map', pitchAlignment: 'map' })
  })
  useEffect(() => () => void puck.remove(), [puck])
  useSmoothFollow({ map, puck, route: null, progress: state, following })

  return (
    <>
      {state?.camera && (
        <div className="nav-camera nav-camera--top" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h11l3-2v10l-3-2H4zM7 13v5h3v-5" />
          </svg>
          <span>
            {t('nav.camera')} · {formatDistance(state.camera.distance, language)}
            {state.camera.speed && ` · ${state.camera.speed} km/h`}
          </span>
        </div>
      )}

      {state && <SpeedDisplay speed={state.speed} limit={state.limit} />}

      {!following && (
        <button type="button" className="nav-recenter" onClick={() => setFollowing(true)}>
          {t('nav.recenter')}
        </button>
      )}

      <div className="nav-footer">
        <div className="nav-footer__info">
          <strong>{t('drive.title')}</strong>
          <span>{state ? t('drive.note') : t('nav.waitingForGps')}</span>
        </div>
        <button type="button" className="nav-footer__exit" onClick={onExit}>
          {t('nav.exit')}
        </button>
      </div>
    </>
  )
}
