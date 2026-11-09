// Warnungen während der Fahrt: was liegt vor einem? (Meldungen anderer Fahrer, Stau/Unfall/Baustelle von TomTom)
import type { Report } from '../services/reports'
import type { TrafficSection } from '../services/routing'
import type { ReportAhead } from './reportsAhead'

export type RoadAlert =
  | { source: 'report'; id: string; kind: Report['kind']; distance: number }
  | { source: 'traffic'; id: string; kind: TrafficSection['kind']; distance: number; inside: boolean; delaySeconds: number }

const TRAFFIC_AHEAD = { jam: 3000, accident: 2000, closed: 2000, roadworks: 1000, other: 1000 } // m – ab hier zeigen

export const reportAlert = (ahead: ReportAhead | null): RoadAlert | null =>
  ahead && { source: 'report', id: `report-${ahead.report.id}`, kind: ahead.report.kind, distance: ahead.distance }

// Nächstes Verkehrsereignis auf der Route voraus (oder das, in dem man gerade steckt)
export function trafficAlert(sections: TrafficSection[] | undefined, cum: number[], along: number): RoadAlert | null {
  let best: RoadAlert | null = null
  let bestRank = Infinity // im Ereignis = zuerst, sonst das nächste voraus
  for (const section of sections ?? []) {
    const start = cum[Math.min(section.startIndex, cum.length - 1)]
    const end = cum[Math.min(section.endIndex, cum.length - 1)]
    if (end < along) continue // schon vorbei
    const inside = start <= along
    const distance = inside ? end - along : start - along
    if (!inside && distance > TRAFFIC_AHEAD[section.kind]) continue
    const rank = inside ? -1 : distance
    if (rank >= bestRank) continue
    bestRank = rank
    best = { source: 'traffic', id: `traffic-${section.id}`, kind: section.kind, distance, inside, delaySeconds: section.delaySeconds }
  }
  return best
}

// Die wichtigere/nähere von zwei Warnungen
export function nearestAlert(...alerts: (RoadAlert | null)[]): RoadAlert | null {
  return alerts.filter((a): a is RoadAlert => a !== null).sort((a, b) => a.distance - b.distance)[0] ?? null
}
