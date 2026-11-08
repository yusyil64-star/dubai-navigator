// Ortssuche über Photon (komoot) – kostenlos, ohne Konto, Daten von OpenStreetMap.
// Fair-Use: nicht bei jedem Tastendruck abfragen (siehe Verzögerung im Suchfeld).
import { DUBAI_BOUNDS } from '../config/map'

const PHOTON_URL = 'https://photon.komoot.io/api/'
const MAX_RESULTS = 6

export type Place = {
  id: string
  name: string
  detail: string // z. B. Straße, Stadtteil
  lon: number
  lat: number
}

// Photon kennt kein Arabisch als Sprache – "default" liefert die örtlichen (oft arabischen) Namen
const PHOTON_LANGUAGES: Record<string, string> = { de: 'de', en: 'en', ar: 'default' }

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

export async function searchPlaces(query: string, language: string, signal: AbortSignal) {
  const [[west, south], [east, north]] = DUBAI_BOUNDS
  const params = new URLSearchParams({
    q: query,
    limit: String(MAX_RESULTS),
    lang: PHOTON_LANGUAGES[language] ?? 'en',
    bbox: [west, south, east, north].join(','), // nur Treffer in Dubai
  })

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`Photon: ${response.status}`)
  const data: { features: PhotonFeature[] } = await response.json()

  return data.features.map((feature): Place => {
    const p = feature.properties
    const [lon, lat] = feature.geometry.coordinates
    const name = p.name ?? [p.street, p.housenumber].filter(Boolean).join(' ')
    // Zusatzinfo ohne Wiederholungen und ohne den Namen selbst
    const detail = [...new Set([p.street, p.district, p.city])]
      .filter((part) => part && part !== name)
      .join(', ')
    return { id: `${p.osm_type}${p.osm_id}`, name: name || '–', detail, lon, lat }
  })
}
