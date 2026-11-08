// Woher die Position während der Navigation kommt: echtes GPS oder eine Demo-Fahrt.
import type { LonLat } from '../services/routing'
import { cumulativeDistances, pointAlong } from './geo'

export type Fix = {
  position: LonLat
  accuracy: number // Genauigkeit in Metern
}

// Echtes GPS. Gibt eine Funktion zum Beenden zurück.
export function watchRealPosition(onFix: (fix: Fix) => void, onError: (code: number) => void) {
  if (!('geolocation' in navigator)) {
    onError(2)
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix({ position: [pos.coords.longitude, pos.coords.latitude], accuracy: pos.coords.accuracy }),
    (err) => onError(err.code),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

const DEMO_SPEED = 14 // Meter pro Sekunde ≈ 50 km/h
const DEMO_TICK_MS = 1000

// Demo-Fahrt: bewegt eine simulierte Position mit gleichmäßigem Tempo entlang der Route.
export function simulatePosition(coords: LonLat[], onFix: (fix: Fix) => void) {
  const cum = cumulativeDistances(coords)
  const total = cum[cum.length - 1]
  let along = 0
  const emit = () => onFix({ position: pointAlong(coords, cum, along).point, accuracy: 5 })
  emit()
  const timer = setInterval(() => {
    along = Math.min(total, along + (DEMO_SPEED * DEMO_TICK_MS) / 1000)
    emit()
    if (along >= total) clearInterval(timer)
  }, DEMO_TICK_MS)
  return () => clearInterval(timer)
}
