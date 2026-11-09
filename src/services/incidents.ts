// Aktuelle Verkehrsmeldungen von TomTom: Unfälle, Sperrungen, Baustellen, Gefahren.
// Staus selbst zeigt die farbige Verkehrslage (LiveTrafficLayer), deshalb hier nicht.
import { TOMTOM_KEY, TOMTOM_LANGUAGES } from '../config/tomtom'
import type { LonLat } from './routing'

// Kategorien von TomTom, die wir zeigen (Nummern laut TomTom-Dokumentation)
export const INCIDENT_CATEGORIES = {
  1: 'accident',
  3: 'danger',
  8: 'closed',
  9: 'roadworks',
  11: 'flooding',
  14: 'brokenDown',
} as const

export type IncidentKind = (typeof INCIDENT_CATEGORIES)[keyof typeof INCIDENT_CATEGORIES]

export type Incident = {
  kind: IncidentKind
  description: string // Text von TomTom, z. B. "Gesperrt"
  from: string
  to: string
  delaySeconds: number | null
  line: LonLat[]
}

// Fläche um Dubai (TomTom erlaubt höchstens 10.000 km² pro Abfrage)
const BBOX = '54.9,24.75,55.65,25.35'
const FIELDS = '{incidents{geometry{type,coordinates},properties{iconCategory,events{description},from,to,delay}}}'

type TomTomIncident = {
  geometry: { type: string; coordinates: LonLat[] | LonLat }
  properties: {
    iconCategory: number
    events?: { description: string }[]
    from?: string
    to?: string
    delay?: number | null
  }
}

export async function loadIncidents(language: string, signal: AbortSignal): Promise<Incident[]> {
  if (!TOMTOM_KEY) return []
  const params = new URLSearchParams({
    bbox: BBOX,
    fields: FIELDS,
    language: TOMTOM_LANGUAGES[language] ?? 'en-GB',
    categoryFilter: Object.keys(INCIDENT_CATEGORIES).join(','),
    timeValidityFilter: 'present',
    key: TOMTOM_KEY,
  })
  const response = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`, { signal })
  if (!response.ok) throw new Error(`TomTom: ${response.status}`)
  const data: { incidents: TomTomIncident[] } = await response.json()
  return data.incidents.flatMap((incident): Incident[] => {
    const kind = INCIDENT_CATEGORIES[incident.properties.iconCategory as keyof typeof INCIDENT_CATEGORIES]
    if (!kind) return []
    const { geometry, properties } = incident
    const line = geometry.type === 'Point' ? [geometry.coordinates as LonLat] : (geometry.coordinates as LonLat[])
    return [
      {
        kind,
        description: properties.events?.map((e) => e.description).join(', ') ?? '',
        from: properties.from ?? '',
        to: properties.to ?? '',
        delaySeconds: properties.delay ?? null,
        line,
      },
    ]
  })
}
