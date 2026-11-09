// Orte nach Kategorie (Tankstelle, Apotheke, …). Die Daten wurden vorab aus OpenStreetMap
// geladen (scripts/fetch-osm-data.mjs) – Stand siehe "created" in den Dateien.
// Daten © OpenStreetMap-Mitwirkende, ODbL.
import { distance, projectOnLine } from '../navigation/geo'
import type { Place } from './geocoding'
import type { LonLat } from './routing'

export const CATEGORIES = [
  'fuel',
  'charging',
  'parking',
  'pharmacy',
  'hospital',
  'atm',
  'supermarket',
  'mosque',
  'restaurant',
  'cafe',
  'metro',
] as const

export type Category = (typeof CATEGORIES)[number]

type Poi = { position: LonLat; latinName: string; arabicName: string }

const cache = new Map<Category, Promise<Poi[]>>()

function loadCategory(category: Category): Promise<Poi[]> {
  if (!cache.has(category)) {
    const request = fetch(`${import.meta.env.BASE_URL}data/pois-${category}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`${category}: ${r.status}`)
        return r.json() as Promise<{ pois: [number, number, string, string][] }>
      })
      .then((data) =>
        data.pois.map(([lon, lat, latinName, arabicName]) => ({ position: [lon, lat] as LonLat, latinName, arabicName })),
      )
    request.catch(() => cache.delete(category)) // bei Fehler später erneut versuchen
    cache.set(category, request)
  }
  return cache.get(category)!
}

export type NearbyPlace = Place & { distance: number }

// Die nächstgelegenen Orte einer Kategorie. Ohne Namen wird der Kategoriename verwendet.
export async function findNearby(
  category: Category,
  around: LonLat,
  language: string,
  fallbackName: string,
  limit = 15,
): Promise<NearbyPlace[]> {
  const pois = await loadCategory(category)
  return pois
    .map((poi) => {
      const name = language === 'ar' ? poi.arabicName || poi.latinName : poi.latinName
      return {
        // Kennung aus den Koordinaten: bleibt gleich, auch wenn die Daten neu geladen werden
        id: `poi-${category}-${poi.position.join(',')}`,
        name: name || fallbackName,
        detail: '',
        lon: poi.position[0],
        lat: poi.position[1],
        distance: distance(around, poi.position),
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit * 3) // Vorrat, falls unten Doppelte wegfallen
    .reduce<NearbyPlace[]>((kept, place) => {
      // Gleichnamige Orte dicht beieinander (z. B. zwei Bahnsteige einer Station) nur einmal zeigen
      const duplicate = kept.some(
        (k) => k.name === place.name && distance([k.lon, k.lat], [place.lon, place.lat]) < 150,
      )
      return duplicate ? kept : [...kept, place]
    }, [])
    .slice(0, limit)
}

export type PlaceAlongRoute = Place & { ahead: number; offset: number } // Meter voraus / Abstand zur Route

const CORRIDOR = 300 // m – so weit darf ein Ort neben der Route liegen

// Orte einer Kategorie entlang der Route, die noch vor einem liegen (für "unterwegs suchen")
export async function findAlongRoute(
  category: Category,
  coords: LonLat[],
  cum: number[],
  fromAlong: number,
  language: string,
  fallbackName: string,
  limit = 8,
): Promise<PlaceAlongRoute[]> {
  const pois = await loadCategory(category)
  // Grober Rahmen um die Route (schnelles Aussortieren), etwas größer als der Korridor
  const margin = 0.004
  const lons = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const [west, east] = [Math.min(...lons) - margin, Math.max(...lons) + margin]
  const [south, north] = [Math.min(...lats) - margin, Math.max(...lats) + margin]

  const found: PlaceAlongRoute[] = []
  for (const poi of pois) {
    const [lon, lat] = poi.position
    if (lon < west || lon > east || lat < south || lat > north) continue
    const proj = projectOnLine(poi.position, coords, cum)
    if (proj.offset > CORRIDOR || proj.along < fromAlong + 100) continue // zu weit weg oder schon vorbei
    const name = language === 'ar' ? poi.arabicName || poi.latinName : poi.latinName
    found.push({
      id: `poi-${category}-${poi.position.join(',')}`,
      name: name || fallbackName,
      detail: '',
      lon,
      lat,
      ahead: proj.along - fromAlong,
      offset: proj.offset,
    })
  }
  return found.sort((a, b) => a.ahead - b.ahead).slice(0, limit)
}
