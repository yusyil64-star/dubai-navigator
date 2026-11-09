// Rechnen mit Koordinaten auf der Erde: Entfernungen, Richtungen, Position auf einer Route.
import type { LonLat } from '../services/routing'

const EARTH_RADIUS = 6371000 // Meter
const toRad = (deg: number) => (deg * Math.PI) / 180

// Entfernung zwischen zwei Punkten in Metern
export function distance(a: LonLat, b: LonLat) {
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h))
}

// Himmelsrichtung von a nach b in Grad (0 = Norden, 90 = Osten)
export function bearing(a: LonLat, b: LonLat) {
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]))
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Für jeden Punkt der Route: zurückgelegte Meter vom Start bis zu diesem Punkt
export function cumulativeDistances(coords: LonLat[]) {
  const result = [0]
  for (let i = 1; i < coords.length; i++) result.push(result[i - 1] + distance(coords[i - 1], coords[i]))
  return result
}

export type Projection = {
  along: number // Meter vom Routenstart bis zum nächstgelegenen Punkt auf der Route
  offset: number // Abstand der Position zur Route in Metern
  index: number // Nummer des Routenabschnitts
  point: LonLat // nächstgelegener Punkt auf der Route
}

// Findet den nächstgelegenen Punkt auf der Route.
// "hint" = zuletzt gefundener Abschnitt; gesucht wird zuerst in dessen Nähe (schneller, und
// verhindert Sprünge, wenn die Route an derselben Stelle zweimal vorbeiführt).
export function projectOnLine(p: LonLat, coords: LonLat[], cum: number[], hint = 0): Projection {
  const near = scan(p, coords, cum, Math.max(0, hint - 5), Math.min(coords.length - 1, hint + 300))
  return near.offset < 100 ? near : scan(p, coords, cum, 0, coords.length - 1)
}

function scan(p: LonLat, coords: LonLat[], cum: number[], from: number, to: number): Projection {
  // Kleine Flächen wie eine Stadt darf man als flach betrachten (Meter in x/y)
  const mx = 111320 * Math.cos(toRad(p[1]))
  const my = 110540
  let best: Projection = { along: 0, offset: Infinity, index: 0, point: coords[0] }
  for (let i = from; i < to; i++) {
    const [ax, ay] = [(coords[i][0] - p[0]) * mx, (coords[i][1] - p[1]) * my]
    const [bx, by] = [(coords[i + 1][0] - p[0]) * mx, (coords[i + 1][1] - p[1]) * my]
    const [dx, dy] = [bx - ax, by - ay]
    const lengthSq = dx * dx + dy * dy
    const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq))
    const [x, y] = [ax + t * dx, ay + t * dy]
    const offset = Math.hypot(x, y)
    if (offset < best.offset) {
      best = {
        along: cum[i] + t * (cum[i + 1] - cum[i]),
        offset,
        index: i,
        point: [p[0] + x / mx, p[1] + y / my],
      }
    }
  }
  return best
}

// Punkt und Fahrtrichtung nach "along" Metern auf der Route (Demo-Fahrt, flüssige Bewegung).
// Binäre Suche, weil das bis zu 60-mal pro Sekunde aufgerufen wird.
export function pointAlong(coords: LonLat[], cum: number[], along: number) {
  let low = 0
  let high = Math.max(0, cum.length - 2)
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (cum[mid] < along) low = mid
    else high = mid - 1
  }
  const i = low
  const segment = cum[i + 1] - cum[i]
  const t = segment === 0 ? 0 : Math.min(1, Math.max(0, (along - cum[i]) / segment))
  const point: LonLat = [
    coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
    coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
  ]
  return { point, heading: bearing(coords[i], coords[i + 1]) }
}
