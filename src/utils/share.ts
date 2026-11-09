// Ort teilen: ein Link, der die App direkt mit diesem Ort öffnet (z. B. ?lat=25.19720&lon=55.27440&name=…).
// Kein Server nötig – alles steht im Link.
import { DUBAI_BOUNDS } from '../config/map'
import type { Place } from '../services/geocoding'

const MAX_NAME = 100

export function placeLink(place: Place) {
  const params = new URLSearchParams({ lat: place.lat.toFixed(5), lon: place.lon.toFixed(5), name: place.name })
  return `${location.origin}${import.meta.env.BASE_URL}?${params}`
}

// Ort aus einem geteilten Link lesen (nur gültige Punkte im Raum Dubai)
export function placeFromUrl(): Place | null {
  const params = new URLSearchParams(location.search)
  const lat = Number(params.get('lat'))
  const lon = Number(params.get('lon'))
  const [[west, south], [east, north]] = DUBAI_BOUNDS
  if (!params.has('lat') || !params.has('lon') || !(lon >= west && lon <= east && lat >= south && lat <= north)) {
    return null
  }
  const name = (params.get('name') ?? '').trim().slice(0, MAX_NAME) || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  return { id: `shared-${lon},${lat}`, name, detail: '', lon, lat }
}

// Über das Teilen-Menü des Handys, sonst Link in die Zwischenablage
export async function sharePlace(place: Place): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = placeLink(place)
  if (navigator.share) {
    try {
      await navigator.share({ title: place.name, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
