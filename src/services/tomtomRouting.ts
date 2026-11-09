// Routen fürs Auto von TomTom: mit aktuellem Verkehr und auf Wunsch ohne Maut.
// Die Antwort wird in dasselbe Format wie die OSRM-Routen übersetzt, damit Navigation,
// Ansagen und Anzeige unverändert funktionieren.
import { TRAFFIC_PROXY } from '../config/tomtom'
import type { LonLat, Route, RouteStep } from './routing'

type Instruction = {
  routeOffsetInMeters: number
  travelTimeInSeconds: number
  pointIndex: number
  instructionType: string
  maneuver: string
  street?: string
  roadNumbers?: string[]
  roundaboutExitNumber?: number
  turnAngleInDecimalDegrees?: number
}

type TomTomRoute = {
  summary: { lengthInMeters: number; travelTimeInSeconds: number; trafficDelayInSeconds: number }
  legs: { points: { latitude: number; longitude: number }[] }[]
  guidance: { instructions: Instruction[] }
}

// TomTom-Manöver → Typ und Richtung wie bei OSRM (siehe navigation/instructions.ts)
const MANEUVERS: Record<string, { type: string; modifier?: string }> = {
  DEPART: { type: 'depart' },
  STRAIGHT: { type: 'continue', modifier: 'straight' },
  KEEP_LEFT: { type: 'fork', modifier: 'slight left' },
  KEEP_RIGHT: { type: 'fork', modifier: 'slight right' },
  BEAR_LEFT: { type: 'turn', modifier: 'slight left' },
  BEAR_RIGHT: { type: 'turn', modifier: 'slight right' },
  TURN_LEFT: { type: 'turn', modifier: 'left' },
  TURN_RIGHT: { type: 'turn', modifier: 'right' },
  SHARP_LEFT: { type: 'turn', modifier: 'sharp left' },
  SHARP_RIGHT: { type: 'turn', modifier: 'sharp right' },
  MAKE_UTURN: { type: 'turn', modifier: 'uturn' },
  TRY_MAKE_UTURN: { type: 'turn', modifier: 'uturn' },
  ENTER_MOTORWAY: { type: 'on ramp' },
  ENTER_FREEWAY: { type: 'on ramp' },
  ENTER_HIGHWAY: { type: 'on ramp' },
  ENTRANCE_RAMP: { type: 'on ramp' },
  TAKE_EXIT: { type: 'off ramp' },
  MOTORWAY_EXIT_LEFT: { type: 'off ramp', modifier: 'slight left' },
  MOTORWAY_EXIT_RIGHT: { type: 'off ramp', modifier: 'slight right' },
  SWITCH_PARALLEL_ROAD: { type: 'fork' },
  SWITCH_MAIN_ROAD: { type: 'fork' },
  ROUNDABOUT_CROSS: { type: 'roundabout' },
  ROUNDABOUT_RIGHT: { type: 'roundabout' },
  ROUNDABOUT_LEFT: { type: 'roundabout' },
  ROUNDABOUT_BACK: { type: 'roundabout' },
  TAKE_FERRY: { type: 'continue', modifier: 'straight' },
  WAYPOINT_LEFT: { type: 'arrive', modifier: 'left' },
  WAYPOINT_RIGHT: { type: 'arrive', modifier: 'right' },
  WAYPOINT_REACHED: { type: 'arrive' },
  ARRIVE: { type: 'arrive' },
  ARRIVE_LEFT: { type: 'arrive', modifier: 'left' },
  ARRIVE_RIGHT: { type: 'arrive', modifier: 'right' },
}

// Richtung aus dem Abbiegewinkel, wo das Manöver selbst keine nennt (z. B. Auffahrt)
function modifierFromAngle(angle = 0) {
  if (Math.abs(angle) < 20) return 'straight'
  const side = angle < 0 ? 'left' : 'right'
  return Math.abs(angle) < 60 ? `slight ${side}` : `${side}`
}

export type RouteOptions = { avoidTolls: boolean }

export async function getTomTomRoutes(
  waypoints: LonLat[],
  options: RouteOptions,
  signal: AbortSignal,
  alternatives = true,
): Promise<Route[]> {
  if (!TRAFFIC_PROXY) throw new Error('TomTom: kein Server')
  const points = waypoints.map(([lon, lat]) => `${lat.toFixed(6)},${lon.toFixed(6)}`).join(':')
  // Der Server fragt TomTom mit Verkehr und ohne eigene Texte (Ansagen erzeugt die App selbst)
  const params = new URLSearchParams()
  if (alternatives && waypoints.length === 2) params.set('alternatives', '1')
  if (options.avoidTolls) params.set('avoidTolls', '1')
  const response = await fetch(`${TRAFFIC_PROXY}/route/${points}?${params}`, { signal })
  if (!response.ok) throw new Error(`TomTom: ${response.status}`)
  const data: { routes?: TomTomRoute[] } = await response.json()
  if (!data.routes?.length) throw new Error('TomTom: keine Route')
  return data.routes.map((route) => toRoute(route, waypoints))
}

function toRoute(route: TomTomRoute, waypoints: LonLat[]): Route {
  // Alle Punkte der Teilstrecken hintereinander (die Punkt-Nummern der Anweisungen zählen so)
  const coordinates: LonLat[] = route.legs.flatMap((leg) => leg.points.map((p): LonLat => [p.longitude, p.latitude]))
  // Reine Hinweise ("weiter auf E11") sind keine Manöver – ihre Strecke zählt zum vorigen Schritt
  const instructions = route.guidance.instructions.filter((i) => i.instructionType !== 'DIRECTION_INFO' && MANEUVERS[i.maneuver])
  let legIndex = 0
  const steps: RouteStep[] = instructions.map((instruction, i) => {
    const next = instructions[i + 1]
    const maneuver = MANEUVERS[instruction.maneuver]
    const step: RouteStep = {
      type: maneuver.type,
      modifier: maneuver.modifier ?? (maneuver.type === 'depart' ? undefined : modifierFromAngle(instruction.turnAngleInDecimalDegrees)),
      exit: instruction.roundaboutExitNumber,
      name: instruction.street ?? '',
      ref: instruction.roadNumbers?.[0],
      distance: next ? next.routeOffsetInMeters - instruction.routeOffsetInMeters : 0,
      duration: next ? next.travelTimeInSeconds - instruction.travelTimeInSeconds : 0,
      startIndex: Math.min(instruction.pointIndex, coordinates.length - 1),
      legIndex,
      isFinal: !next,
    }
    if (instruction.maneuver.startsWith('WAYPOINT')) legIndex++ // danach beginnt die nächste Teilstrecke
    return step
  })
  return {
    distanceMeters: route.summary.lengthInMeters,
    durationSeconds: route.summary.travelTimeInSeconds,
    coordinates,
    steps,
    waypoints,
    profile: 'car',
    trafficDelaySeconds: route.summary.trafficDelayInSeconds,
    provider: 'tomtom',
  }
}
