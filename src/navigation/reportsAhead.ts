// Welche Meldung von Nutzern liegt vor einem? (für Warnung und Ansage während der Fahrt)
import type { Report } from '../services/reports'
import type { LonLat } from '../services/routing'
import { bearing, distance, projectOnLine } from './geo'

const MAX_AHEAD = 800 // m – weiter voraus wird nicht gewarnt
const NEAR_ROUTE = 40 // m – so nah muss die Meldung an der Route liegen
const SAME_DIRECTION = 60 // Grad – Meldung gilt für die eigene Fahrtrichtung (falls bekannt)
const AHEAD_ANGLE = 30 // Grad – ohne Route: Meldung muss ungefähr geradeaus liegen

const sameDirection = (report: Report, heading: number) =>
  report.heading === null || Math.abs(((report.heading - heading + 540) % 360) - 180) <= SAME_DIRECTION

export type ReportAhead = { report: Report; distance: number }

// Mit Route: Meldungen auf der Route vor der aktuellen Position
export function reportAheadOnRoute(
  reports: Report[],
  coords: LonLat[],
  cum: number[],
  along: number,
  position: LonLat,
): ReportAhead | null {
  let best: ReportAhead | null = null
  for (const report of reports) {
    const point: LonLat = [report.lon, report.lat]
    if (distance(position, point) > MAX_AHEAD + 200) continue // schnell aussortieren
    const proj = projectOnLine(point, coords, cum)
    const ahead = proj.along - along
    if (proj.offset > NEAR_ROUTE || ahead < 0 || ahead > MAX_AHEAD) continue
    const next = coords[Math.min(proj.index + 1, coords.length - 1)]
    if (!sameDirection(report, bearing(coords[proj.index], next))) continue
    if (!best || ahead < best.distance) best = { report, distance: ahead }
  }
  return best
}

// Ohne Route (Fahrmodus): Meldungen ungefähr geradeaus in Fahrtrichtung
export function reportAheadByHeading(reports: Report[], position: LonLat, heading: number): ReportAhead | null {
  let best: ReportAhead | null = null
  for (const report of reports) {
    const point: LonLat = [report.lon, report.lat]
    const d = distance(position, point)
    if (d > MAX_AHEAD || (best && d >= best.distance)) continue
    const angle = Math.abs(((bearing(position, point) - heading + 540) % 360) - 180)
    if (angle <= AHEAD_ANGLE && sameDirection(report, heading)) best = { report, distance: d }
  }
  return best
}
