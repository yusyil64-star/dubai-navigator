// Einstellungen der App, gespeichert im Browser (nur auf diesem Gerät).
import { useSyncExternalStore } from 'react'
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan'

export type Settings = {
  sound: 'all' | 'alerts' | 'off' // Ton: alle Ansagen, nur Warnungen (Blitzer, zu schnell) oder stumm
  speedCameras: boolean // Blitzer auf der Karte und Warnungen
  theme: 'auto' | 'sun' | 'light' | 'dark' // Nachtmodus: wie das Gerät, nach Sonnenstand in Dubai, fest
  voiceNames: Record<string, string> // gewählte Stimme je Sprache (fehlt = automatisch die beste)
  speedWarning: number | null // Warnton ab so vielen km/h über dem Limit (null = aus)
  mapView: '3d' | '2d' | 'north' // Kartenansicht beim Fahren: schräg, flach in Fahrtrichtung, Norden oben
  autoZoom: boolean // beim Fahren automatisch zoomen (Tempo, Abbiegungen)
  transitLayer: boolean // Metro- und Tram-Linien auf der Karte
  liveTraffic: boolean // Live-Verkehr von TomTom (nur mit Schlüssel)
}

const DEFAULTS: Settings = {
  sound: 'all',
  speedCameras: true,
  theme: 'auto',
  voiceNames: {},
  speedWarning: 5,
  mapView: '3d',
  autoZoom: true,
  transitLayer: false,
  liveTraffic: true,
}
const STORAGE_KEY = 'dubai-navigator.settings'

function load(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    // frühere Einstellung "Sprachansagen aus" übernehmen
    if (stored.voice === false && !stored.sound) stored.sound = 'off'
    delete stored.voice
    return { ...DEFAULTS, ...stored }
  } catch {
    return DEFAULTS
  }
}

let current = load()

// Aktuelle Einstellungen außerhalb von React (z. B. für die Sprachausgabe)
export const getSettings = () => current
const listeners = new Set<() => void>()

export function updateSettings(change: Partial<Settings>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Speicher nicht verfügbar – Einstellung gilt nur bis zum Neuladen
  }
  listeners.forEach((listener) => listener())
}

// React-Hook: liefert die aktuellen Einstellungen und zeichnet bei Änderungen neu
export function useSettings() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

// Tatsächliches Erscheinungsbild: bei "auto" wie das Gerät (heller oder dunkler Modus)
const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = useSettings()
  const systemDark = useSyncExternalStore(
    (listener) => {
      darkQuery?.addEventListener('change', listener)
      return () => darkQuery?.removeEventListener('change', listener)
    },
    () => darkQuery?.matches ?? false,
  )
  const night = useSyncExternalStore(
    (listener) => {
      const timer = setInterval(listener, 60_000) // jede Minute prüfen
      return () => clearInterval(timer)
    },
    isNightInDubai,
  )
  if (theme === 'auto') return systemDark ? 'dark' : 'light'
  if (theme === 'sun') return night ? 'dark' : 'light'
  return theme
}

// Ist es in Dubai gerade dunkel? (zwischen Sonnenuntergang und Sonnenaufgang, berechnet mit adhan)
const DUBAI = new Coordinates(25.2048, 55.2708)
function isNightInDubai() {
  const now = new Date()
  const times = new PrayerTimes(DUBAI, now, CalculationMethod.Dubai())
  return now < times.sunrise || now >= times.maghrib // Maghrib = Sonnenuntergang
}
