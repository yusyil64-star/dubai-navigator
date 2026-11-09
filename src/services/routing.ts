// Routenberechnung über den OSRM-Dienst des FOSSGIS e.V. (wie auf openstreetmap.org).
// Nutzungsregeln: max. 1 Anfrage pro Sekunde, keine intensive Nutzung.
// Für eine echte Veröffentlichung mit vielen Nutzern: eigener/kostenpflichtiger Dienst nötig.
// Hinweis: keine Live-Verkehrsdaten – Fahrzeiten sind Schätzungen.

const OSRM_BASE = 'https://routing.openstreetmap.de/'

export type LonLat = [number, number]

export type Profile = 'car' | 'bike' | 'foot'

const PROFILE_PATHS: Record<Profile, string> = {
  car: 'routed-car/route/v1/driving/',
  bike: 'routed-bike/route/v1/driving/',
  foot: 'routed-foot/route/v1/driving/',
}

// Ein Abschnitt der Route, der mit einem Manöver beginnt (z. B. "rechts abbiegen")
export type RouteStep = {
  type: string // z. B. "turn", "roundabout", "arrive"
  modifier?: string // z. B. "left", "slight right"
  exit?: number // Ausfahrt im Kreisverkehr
  name: string // Straßenname (oft nur Arabisch)
  ref?: string // Straßennummer, z. B. "E11"
  distance: number
  duration: number
  startIndex: number // Index in Route.coordinates, an dem das Manöver liegt
  legIndex: number // Teilstrecke (bei Zwischenstopps mehrere)
  isFinal: boolean // letztes Manöver der ganzen Route
}

export type Route = {
  distanceMeters: number
  durationSeconds: number
  coordinates: LonLat[] // Verlauf der Route als Linie
  steps: RouteStep[]
  waypoints: LonLat[] // Start, Zwischenstopps, Ziel
  profile: Profile
}

type OsrmStep = {
  maneuver: { type: string; modifier?: string; exit?: number }
  name: string
  ref?: string
  distance: number
  duration: number
  geometry: { coordinates: LonLat[] }
}

type OsrmRoute = { distance: number; duration: number; legs: { steps: OsrmStep[] }[] }

// Die schnellste Route (z. B. für die Neuberechnung unterwegs)
export async function getRoute(waypoints: LonLat[], profile: Profile, signal: AbortSignal): Promise<Route> {
  return (await getRoutes(waypoints, profile, signal, false))[0]
}

// Bis zu drei Routen, die schnellste zuerst. OSRM liefert Alternativen nur ohne Zwischenstopps.
export async function getRoutes(
  waypoints: LonLat[],
  profile: Profile,
  signal: AbortSignal,
  alternatives = true,
): Promise<Route[]> {
  const points = waypoints.map((p) => p.join(',')).join(';')
  const extra = alternatives && waypoints.length === 2 ? '&alternatives=2' : ''
  const url = `${OSRM_BASE}${PROFILE_PATHS[profile]}${points}?steps=true&overview=false&geometries=geojson${extra}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`OSRM: ${response.status}`)
  const data = await response.json()
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(`OSRM: ${data.code}`)
  return (data.routes as OsrmRoute[]).map((route) => toRoute(route, waypoints, profile))
}

function toRoute(route: OsrmRoute, waypoints: LonLat[], profile: Profile): Route {
  // Die Linie aus den Linien der einzelnen Schritte zusammensetzen – so ist für jedes
  // Manöver bekannt, an welcher Stelle der Linie es liegt.
  const coordinates: LonLat[] = []
  const steps: RouteStep[] = []
  const legs = route.legs
  legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, stepIndex) => {
      const startIndex = Math.max(0, coordinates.length - 1)
      step.geometry.coordinates.forEach((point, k) => {
        if (k > 0 || coordinates.length === 0) coordinates.push(point)
      })
      steps.push({
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        exit: step.maneuver.exit,
        name: step.name,
        ref: step.ref,
        distance: step.distance,
        duration: step.duration,
        startIndex,
        legIndex,
        isFinal: legIndex === legs.length - 1 && stepIndex === leg.steps.length - 1,
      })
    })
  })

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    coordinates,
    steps,
    waypoints,
    profile,
  }
}
