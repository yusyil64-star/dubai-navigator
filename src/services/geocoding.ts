// Ortssuche über Photon (komoot) – kostenlos, ohne Konto, Daten von OpenStreetMap.
// Fair-Use: nicht bei jedem Tastendruck abfragen (siehe Verzögerung im Suchfeld).
import { DUBAI_BOUNDS } from '../config/map'

const PHOTON_URL = 'https://photon.komoot.io/api/'
const MAX_RESULTS = 6
const REQUEST_RESULTS = 10 // mehr anfragen, weil unpassende Treffer aussortiert werden

export type Place = {
  id: string
  name: string
  detail: string // z. B. Straße, Stadtteil
  lon: number
  lat: number
}

// Welche Namen Photon liefern soll:
// - Deutsch → englische Namen: deutsche Namen gibt es in Dubai fast nie (sonst käme der arabische Name)
// - Arabisch → "default" = örtliche (meist arabische) Namen; Photon kennt Arabisch nicht direkt
const PHOTON_LANGUAGES: Record<string, string> = { de: 'en', en: 'en', ar: 'default' }

// Arabische Schrift erkennen (Unicode-Bereich U+0600 bis U+06FF).
// Für Deutsch/Englisch werden arabische Namen ausgeblendet.
const ARABIC_SCRIPT = /[؀-ۿ]/

type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

export async function searchPlaces(query: string, language: string, signal: AbortSignal) {
  const [[west, south], [east, north]] = DUBAI_BOUNDS
  const params = new URLSearchParams({
    q: query,
    limit: String(REQUEST_RESULTS),
    lang: PHOTON_LANGUAGES[language] ?? 'en',
    bbox: [west, south, east, north].join(','), // nur Treffer in Dubai
  })

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`Photon: ${response.status}`)
  const data: { features: PhotonFeature[] } = await response.json()

  const latinOnly = language !== 'ar'

  const places = data.features.filter(isUsefulDestination).map((feature): Place => {
    const p = feature.properties
    const [lon, lat] = feature.geometry.coordinates
    const name = p.name ?? [p.street, p.housenumber].filter(Boolean).join(' ')
    // Zusatzinfo ohne Wiederholungen, ohne den Namen selbst (und bei DE/EN ohne arabische Teile)
    const detail = [...new Set([p.street, p.district, p.city])]
      .filter((part): part is string => !!part && part !== name)
      .filter((part) => !(latinOnly && ARABIC_SCRIPT.test(part)))
      .join(', ')
    return { id: `${p.osm_type}${p.osm_id}`, name: name || '–', detail, lon, lat }
  })

  // Doppelte Treffer (gleicher Name + gleiche Zusatzinfo) nur einmal zeigen
  const seen = new Set<string>()
  return places
    .filter((place) => !(latinOnly && ARABIC_SCRIPT.test(place.name)))
    .filter((place) => {
      const key = `${place.name}|${place.detail}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_RESULTS)
}

// Verwaltungsgrenzen, Emirate, Länder usw. sind keine sinnvollen Ziele zum Hinfahren
// (z. B. gibt es "Dubai" als Stadt, als Emirat und als Grenze – nur die Stadt bleibt).
const NOT_A_DESTINATION = new Set(['state', 'country', 'region', 'province'])

function isUsefulDestination(feature: PhotonFeature) {
  const { osm_key, osm_value } = feature.properties
  if (osm_key === 'boundary') return false
  return !(osm_key === 'place' && osm_value && NOT_A_DESTINATION.has(osm_value))
}
