// Vorab geladene Straßendaten aus OpenStreetMap (siehe scripts/fetch-osm-data.mjs):
// Blitzer, Tempolimits, Salik-Mautbrücken. Daten © OpenStreetMap-Mitwirkende, ODbL.
import type { LonLat } from '../services/routing'
import { bearing, distance, projectOnLine } from './geo'

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

// Jede Datei nur einmal laden, auch wenn mehrere Stellen sie brauchen
const cache = new Map<string, Promise<unknown>>()
function loadJson<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    const request = fetch(dataUrl(file)).then((r) => {
      if (!r.ok) throw new Error(`${file}: ${r.status}`)
      return r.json()
    })
    request.catch(() => cache.delete(file)) // bei Fehler später erneut versuchen
    cache.set(file, request)
  }
  return cache.get(file) as Promise<T>
}

// ---------- Blitzer ----------

export type Camera = { position: LonLat; speed: number | null }

export async function loadSpeedCameras(): Promise<Camera[]> {
  const data = await loadJson<{ cameras: [number, number, number][] }>('speed-cameras.json')
  return data.cameras.map(([lon, lat, speed]) => ({ position: [lon, lat], speed: speed || null }))
}

export type CameraOnRoute = { along: number; speed: number | null }

// Blitzer, die direkt an der Route liegen, sortiert nach Entfernung vom Start
export function camerasOnRoute(cameras: Camera[], coords: LonLat[], cum: number[]): CameraOnRoute[] {
  const lons = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const [minLon, maxLon, minLat, maxLat] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
  const pad = 0.001 // ≈ 100 m
  return cameras
    .filter(
      ({ position: [lon, lat] }) =>
        lon > minLon - pad && lon < maxLon + pad && lat > minLat - pad && lat < maxLat + pad,
    )
    .map((camera) => ({ camera, projection: projectOnLine(camera.position, coords, cum) }))
    .filter(({ projection }) => projection.offset < 30)
    .map(({ camera, projection }) => ({ along: projection.along, speed: camera.speed }))
    .sort((a, b) => a.along - b.along)
    .reduce<CameraOnRoute[]>((merged, camera) => {
      // Doppelt eingetragene Blitzer (weniger als 50 m auseinander) nur einmal warnen
      const last = merged[merged.length - 1]
      if (last && camera.along - last.along < 50) last.speed ??= camera.speed
      else merged.push(camera)
      return merged
    }, [])
}

// ---------- Tempolimits ----------

type Segment = { a: LonLat; b: LonLat; speed: number }
export type SpeedLimitIndex = Map<string, Segment[]>

const CELL = 0.005 // Rasterzelle ≈ 500 m – damit nur Straßen in der Nähe geprüft werden
const cellKey = (lon: number, lat: number) => `${Math.floor(lon / CELL)}:${Math.floor(lat / CELL)}`

export async function loadSpeedLimits(): Promise<SpeedLimitIndex> {
  const data = await loadJson<{ limits: Record<string, number[][]> }>('speed-limits.json')
  const index: SpeedLimitIndex = new Map()
  for (const [speed, lines] of Object.entries(data.limits)) {
    for (const flat of lines) {
      for (let i = 0; i + 3 < flat.length; i += 2) {
        const segment: Segment = { a: [flat[i], flat[i + 1]], b: [flat[i + 2], flat[i + 3]], speed: Number(speed) }
        // In alle Rasterzellen eintragen, die der Abschnitt berührt
        for (let x = Math.floor(Math.min(flat[i], flat[i + 2]) / CELL); x <= Math.floor(Math.max(flat[i], flat[i + 2]) / CELL); x++) {
          for (let y = Math.floor(Math.min(flat[i + 1], flat[i + 3]) / CELL); y <= Math.floor(Math.max(flat[i + 1], flat[i + 3]) / CELL); y++) {
            const key = `${x}:${y}`
            if (!index.has(key)) index.set(key, [])
            index.get(key)!.push(segment)
          }
        }
      }
    }
  }
  return index
}

// Tempolimit an einer Position. "heading" verhindert, dass eine kreuzende Straße erkannt wird.
export function speedLimitAt(index: SpeedLimitIndex, point: LonLat, heading: number): number | null {
  const [cx, cy] = cellKey(point[0], point[1]).split(':').map(Number)
  let best: { dist: number; speed: number } | null = null
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (const seg of index.get(`${cx + dx}:${cy + dy}`) ?? []) {
        // Richtung vergleichen (Gegenrichtung zählt auch: Straßen haben beide Richtungen)
        const diff = Math.abs(((bearing(seg.a, seg.b) - heading + 540) % 360) - 180)
        if (Math.min(diff, 180 - diff) > 35) continue
        const dist = projectOnLine(point, [seg.a, seg.b], [0, distance(seg.a, seg.b)]).offset
        if (dist < 25 && (!best || dist < best.dist)) best = { dist, speed: seg.speed }
      }
    }
  }
  return best?.speed ?? null
}

// ---------- Salik-Mautbrücken (für Schritt 5) ----------

export type TollGate = { position: LonLat; name: string }

export async function loadTollGates(): Promise<TollGate[]> {
  const data = await loadJson<{ gates: [number, number, string][] }>('toll-gates.json')
  return data.gates.map(([lon, lat, name]) => ({ position: [lon, lat], name }))
}
