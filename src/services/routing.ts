// Routenberechnung über den OSRM-Dienst des FOSSGIS e.V. (wie auf openstreetmap.org).
// Nutzungsregeln: max. 1 Anfrage pro Sekunde, keine intensive Nutzung.
// Für eine echte Veröffentlichung mit vielen Nutzern: eigener/kostenpflichtiger Dienst nötig.
// Hinweis: keine Live-Verkehrsdaten – Fahrzeiten sind Schätzungen.

const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'

export type LonLat = [number, number]

export type Route = {
  distanceMeters: number
  durationSeconds: number
  coordinates: LonLat[] // Verlauf der Route als Linie
}

export async function getRoute(from: LonLat, to: LonLat, signal: AbortSignal): Promise<Route> {
  const points = `${from.join(',')};${to.join(',')}`
  const response = await fetch(`${OSRM_URL}${points}?overview=full&geometries=geojson`, { signal })
  if (!response.ok) throw new Error(`OSRM: ${response.status}`)
  const data = await response.json()
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route) throw new Error(`OSRM: ${data.code}`)
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    coordinates: route.geometry.coordinates,
  }
}
