// Das "Gehirn" der Navigation: verarbeitet jede neue Position und ermittelt
// nächstes Manöver, Restweg, Ansagen, Neuberechnung und Ankunft.
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRoute, type LonLat, type Route, type RouteStep } from '../services/routing'
import { bearing, cumulativeDistances, projectOnLine } from './geo'
import { announcementText, instructionText, spokenDistance } from './instructions'
import {
  camerasOnRoute,
  loadSpeedCameras,
  loadSpeedLimits,
  speedLimitAt,
  type Camera,
  type CameraOnRoute,
  type SpeedLimitIndex,
} from './roadData'
import { simulatePosition, watchRealPosition, type Fix } from './positions'
import { speak, stopSpeaking } from './voice'

const ANNOUNCE_AT = [25, 150, 500] // Meter vor dem Manöver (kleinste zuerst)
const OFF_ROUTE_METERS = 40 // weiter weg von der Route = abgekommen
const OFF_ROUTE_FIXES = 3 // so viele Positionen hintereinander, bevor neu berechnet wird
const REROUTE_PAUSE_MS = 10000 // höchstens alle 10 s neu berechnen (Fair-Use des Routendienstes)
const ARRIVED_METERS = 25
const CAMERA_SHOW_METERS = 600 // Blitzer-Hinweis ab dieser Entfernung anzeigen
const CAMERA_SAY_METERS = 400 // … und einmal ansagen

export type NavProgress = {
  position: LonLat // Position, auf die Route "eingerastet", wenn nah genug
  heading: number // Fahrtrichtung in Grad
  along: number | null // Meter vom Routenstart (null = gerade neben der Route)
  speedMs: number // Geschwindigkeit in m/s (vom Gerät oder aus den letzten Positionen geschätzt)
  fixTime: number // Zeitpunkt dieser Position (performance.now), für die flüssige Bewegung
  nextStep: RouteStep | null
  distanceToNext: number
  remainingDistance: number
  remainingDuration: number
  arrivalTime: number // geschätzte Ankunft (Zeitstempel)
  speed: number | null // aktuelle Geschwindigkeit in km/h
  speedLimit: number | null // Tempolimit in km/h (falls in OpenStreetMap bekannt)
  camera: { distance: number; speed: number | null } | null // nächster Blitzer voraus
}

export type NavStatus = 'active' | 'rerouting' | 'arrived'

type Options = {
  simulate: boolean
  voiceEnabled: boolean
  cameraWarnings: boolean
  onLocationError: (code: number) => void
}

export function useNavigation(
  initialRoute: Route,
  { simulate, voiceEnabled, cameraWarnings, onLocationError }: Options,
) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [route, setRoute] = useState(initialRoute)
  const [progress, setProgress] = useState<NavProgress | null>(null)
  const [status, setStatus] = useState<NavStatus>('active')

  // Immer die aktuellen Einstellungen verwenden (z. B. Ton aus, Sprache gewechselt)
  const settings = useRef({ voiceEnabled, cameraWarnings, language, t, onLocationError })
  useEffect(() => {
    settings.current = { voiceEnabled, cameraWarnings, language, t, onLocationError }
    if (!voiceEnabled) stopSpeaking()
  })

  useEffect(() => {
    // Arbeitsdaten dieser Navigation (müssen nicht neu gezeichnet werden)
    const nav = {
      route: initialRoute,
      cum: cumulativeDistances(initialRoute.coordinates),
      hint: 0,
      offRouteCount: 0,
      lastReroute: 0,
      rerouting: false,
      arrived: false,
      started: false,
      announced: new Map<number, number>(), // Schritt → kleinste bereits angesagte Stufe
      allCameras: [] as Camera[],
      cameras: [] as CameraOnRoute[], // Blitzer an der aktuellen Route
      camerasSaid: new Set<number>(),
      limits: null as SpeedLimitIndex | null,
      lastFix: null as { along: number; time: number } | null, // für die geschätzte Geschwindigkeit
    }

    // Blitzer und Tempolimits gibt es nur fürs Auto
    if (initialRoute.profile === 'car') {
      loadSpeedCameras()
        .then((cameras) => {
          nav.allCameras = cameras
          nav.cameras = camerasOnRoute(cameras, nav.route.coordinates, nav.cum)
        })
        .catch(() => {})
      loadSpeedLimits()
        .then((index) => (nav.limits = index))
        .catch(() => {})
    }
    const controller = new AbortController()

    const say = (text: string) => {
      if (settings.current.voiceEnabled) speak(text, settings.current.language)
    }

    function reroute(from: LonLat, legIndex: number) {
      nav.rerouting = true
      nav.lastReroute = Date.now()
      setStatus('rerouting')
      const remaining = nav.route.waypoints.slice(legIndex + 1)
      getRoute([from, ...remaining], nav.route.profile, controller.signal)
        .then((newRoute) => {
          nav.route = newRoute
          nav.cum = cumulativeDistances(newRoute.coordinates)
          nav.lastFix = null // neue Route = neue Zählung der Meter
          nav.hint = 0
          nav.announced = new Map()
          nav.started = false
          nav.cameras = camerasOnRoute(nav.allCameras, newRoute.coordinates, nav.cum)
          nav.camerasSaid = new Set()
          setRoute(newRoute)
        })
        .catch(() => {}) // nächster Versuch nach der Pause
        .finally(() => {
          nav.rerouting = false
          nav.offRouteCount = 0
          if (!nav.arrived && !controller.signal.aborted) setStatus('active')
        })
    }

    function announce(step: RouteStep, distanceToNext: number, stage: number) {
      const { t: tr, language: lang } = settings.current
      say(
        stage === ANNOUNCE_AT[0] ? instructionText(step, tr, lang) : announcementText(step, distanceToNext, tr, lang),
      )
    }

    function handleFix(fix: Fix) {
      if (nav.arrived) return
      const { route: r, cum } = nav
      const proj = projectOnLine(fix.position, r.coordinates, cum, nav.hint)
      nav.hint = proj.index
      const total = cum[cum.length - 1]
      const remainingDistance = Math.max(0, total - proj.along)

      // Aktueller Schritt = letzter Schritt, dessen Manöver schon hinter uns liegt
      let stepIndex = 0
      r.steps.forEach((step, i) => {
        if (cum[step.startIndex] <= proj.along + 1) stepIndex = i
      })
      const nextStep = r.steps[stepIndex + 1] ?? null
      const distanceToNext = nextStep ? Math.max(0, cum[nextStep.startIndex] - proj.along) : remainingDistance

      // Von der Route abgekommen? (nicht bei der Demo-Fahrt)
      const onRoute = proj.offset <= OFF_ROUTE_METERS + Math.min(fix.accuracy, 50)
      if (!simulate) {
        nav.offRouteCount = onRoute ? 0 : nav.offRouteCount + 1
        if (
          nav.offRouteCount >= OFF_ROUTE_FIXES &&
          !nav.rerouting &&
          Date.now() - nav.lastReroute > REROUTE_PAUSE_MS
        ) {
          reroute(fix.position, r.steps[stepIndex]?.legIndex ?? 0)
        }
      }

      const nextIndex = Math.min(proj.index + 1, r.coordinates.length - 1)
      const remainingDuration = total > 0 ? (r.durationSeconds * remainingDistance) / total : 0
      const heading = bearing(r.coordinates[proj.index], r.coordinates[nextIndex])
      const position = onRoute ? proj.point : fix.position

      // Geschwindigkeit: vom Gerät, sonst aus dem Weg seit der letzten Position
      const now = performance.now()
      const estimated = nav.lastFix ? (proj.along - nav.lastFix.along) / ((now - nav.lastFix.time) / 1000) : 0
      const speedMs = fix.speed ?? (Number.isFinite(estimated) ? Math.max(0, Math.min(estimated, 60)) : 0)
      nav.lastFix = { along: proj.along, time: now }

      // Nächster Blitzer voraus (falls eingeschaltet)
      const cameraAhead = settings.current.cameraWarnings
        ? nav.cameras.find((c) => c.along > proj.along - 5 && c.along - proj.along <= CAMERA_SHOW_METERS)
        : undefined
      const camera = cameraAhead
        ? { distance: Math.max(0, cameraAhead.along - proj.along), speed: cameraAhead.speed }
        : null
      // Jeden Blitzer nur einmal ansagen
      if (cameraAhead && camera && camera.distance <= CAMERA_SAY_METERS && !nav.camerasSaid.has(cameraAhead.along)) {
        nav.camerasSaid.add(cameraAhead.along)
        const { t: tr, language: lang } = settings.current
        say(tr('nav.cameraAhead', { distance: spokenDistance(camera.distance, tr, lang) }))
      }

      setProgress({
        position,
        heading,
        along: onRoute ? proj.along : null,
        speedMs,
        fixTime: now,
        speed: fix.speed === null ? null : Math.round(fix.speed * 3.6),
        speedLimit: nav.limits ? speedLimitAt(nav.limits, position, heading) : null,
        camera,
        nextStep,
        distanceToNext,
        remainingDistance,
        remainingDuration,
        arrivalTime: Date.now() + remainingDuration * 1000,
      })

      // Angekommen?
      if (remainingDistance <= ARRIVED_METERS) {
        nav.arrived = true
        setStatus('arrived')
        say(settings.current.t('nav.arrive'))
        return
      }

      // Ansagen: beim Start sofort, danach bei 500 m, 150 m und kurz vor dem Manöver
      if (!nextStep) return
      const key = stepIndex + 1
      const stage = ANNOUNCE_AT.find((s) => distanceToNext <= s)
      if (!nav.started) {
        nav.started = true
        nav.announced.set(key, stage ?? Infinity)
        announce(nextStep, distanceToNext, stage ?? Infinity)
        return
      }
      if (stage !== undefined && stage < (nav.announced.get(key) ?? Infinity)) {
        nav.announced.set(key, stage)
        announce(nextStep, distanceToNext, stage)
      }
    }

    const stop = simulate
      ? simulatePosition(initialRoute.coordinates, handleFix)
      : watchRealPosition(handleFix, (code) => settings.current.onLocationError(code))

    return () => {
      stop()
      controller.abort()
      stopSpeaking()
    }
  }, [initialRoute, simulate])

  // Bildschirm während der Navigation anlassen (wo der Browser es unterstützt)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = () => {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
      }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [])

  return { route, progress, status }
}
