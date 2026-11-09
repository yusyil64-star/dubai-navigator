// Einstellungen der App, gespeichert im Browser (nur auf diesem Gerät).
import { useSyncExternalStore } from 'react'

export type Settings = {
  voice: boolean // Sprachansagen
  speedCameras: boolean // Blitzer auf der Karte und Warnungen
  theme: 'auto' | 'light' | 'dark' // Nachtmodus
  voiceNames: Record<string, string> // gewählte Stimme je Sprache (fehlt = automatisch die beste)
  speedWarning: number | null // Warnton ab so vielen km/h über dem Limit (null = aus)
  mapView: '3d' | '2d' | 'north' // Kartenansicht beim Fahren: schräg, flach in Fahrtrichtung, Norden oben
  autoZoom: boolean // beim Fahren automatisch zoomen (Tempo, Abbiegungen)
}

const DEFAULTS: Settings = { voice: true, speedCameras: true, theme: 'auto', voiceNames: {}, speedWarning: 5, mapView: '3d', autoZoom: true }
const STORAGE_KEY = 'dubai-navigator.settings'

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
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
  if (theme === 'auto') return systemDark ? 'dark' : 'light'
  return theme
}
