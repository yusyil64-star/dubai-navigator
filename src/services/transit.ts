// Abfahrten von Metro und Tram aus dem Planfahrplan der RTA (vorab geladen mit
// scripts/fetch-transit-data.mjs). Keine Echtzeit: Verspätungen kennt die App nicht.
import { distance } from '../navigation/geo'
import type { LonLat } from './routing'

const BASE = `${import.meta.env.BASE_URL}data/transit/`
const MAX_DISTANCE = 250 // m – so weit darf der gewählte Ort von der Station entfernt sein
const MAX_AHEAD = 12 * 60 // min – weiter voraus nichts zeigen (sonst wäre unklar, an welchem Tag)

export type Line = 'red' | 'green' | 'tram'

export type Station = { id: string; name: string; nameAr: string; position: LonLat }

type StationIndex = {
  validFrom: string // JJJJMMTT
  services: Record<string, string> // Fahrplan → Wochentage Mo … So, z. B. "1111000"
  stations: Station[]
}

type Departures = {
  line: Line
  color: string
  to: string
  toAr: string
  times: Record<string, number[]> // Fahrplan → Minuten nach Mitternacht (auch über 1440)
}

export type NextDepartures = Omit<Departures, 'times'> & { minutes: number[] } // Minuten ab jetzt

let index: Promise<StationIndex> | null = null

function loadIndex(): Promise<StationIndex> {
  index ??= fetch(`${BASE}stations.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`stations: ${r.status}`)
      return r.json() as Promise<{
        validFrom: string
        services: Record<string, string>
        stations: [string, string, string, number, number][]
      }>
    })
    .then((data) => ({
      validFrom: data.validFrom,
      services: data.services,
      stations: data.stations.map(([id, name, nameAr, lon, lat]) => ({ id, name, nameAr, position: [lon, lat] })),
    }))
  index.catch(() => (index = null)) // bei Fehler später erneut versuchen
  return index
}

// Stationen am gewählten Ort, die nächste zuerst (an Umsteigepunkten z. B. Metro und Tram)
export async function stationsAt(position: LonLat): Promise<{ stations: Station[]; validFrom: string }> {
  const { stations, validFrom } = await loadIndex()
  const nearby = stations
    .map((station) => ({ station, distance: distance(position, station.position) }))
    .filter((s) => s.distance < MAX_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .map((s) => s.station)
  return { stations: nearby, validFrom }
}

// Wochentag (0 = Montag) und Minuten seit Mitternacht in Dubai
function dubaiTime(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'))
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

// Die nächsten Abfahrten je Linie und Richtung, nach Fahrplan (heute und Nachtfahrten von gestern)
export async function nextDepartures(station: Station, now: Date, count = 3): Promise<NextDepartures[]> {
  const { services } = await loadIndex()
  const res = await fetch(`${BASE}${station.id}.json`)
  if (!res.ok) throw new Error(`${station.id}: ${res.status}`)
  const { departures } = (await res.json()) as { departures: Departures[] }

  const { weekday, minutes: nowMinutes } = dubaiTime(now)
  const runsOn = (service: string, day: number) => services[service]?.[(day + 7) % 7] === '1'
  return departures
    .map(({ times, ...rest }) => {
      const upcoming: number[] = []
      for (const [service, list] of Object.entries(times)) {
        // heutiger Fahrplan; Fahrten nach Mitternacht vom gestrigen (z. B. 24:30 → 0:30)
        if (runsOn(service, weekday)) upcoming.push(...list.map((m) => m - nowMinutes))
        if (runsOn(service, weekday - 1)) upcoming.push(...list.map((m) => m - 1440 - nowMinutes))
        // falls heute nichts mehr fährt: die ersten Fahrten von morgen
        if (runsOn(service, weekday + 1)) upcoming.push(...list.map((m) => m + 1440 - nowMinutes))
      }
      const minutes = upcoming
        .filter((m) => m >= 0 && m < MAX_AHEAD)
        .sort((a, b) => a - b)
        .slice(0, count)
      return { ...rest, minutes }
    })
    .filter((d) => d.minutes.length > 0)
    .sort((a, b) => LINE_ORDER.indexOf(a.line) - LINE_ORDER.indexOf(b.line) || a.to.localeCompare(b.to))
}

const LINE_ORDER: Line[] = ['red', 'green', 'tram'] // feste Reihenfolge, damit die Liste nicht springt
