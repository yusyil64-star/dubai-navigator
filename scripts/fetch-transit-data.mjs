// Lädt den offiziellen Fahrplan (GTFS) der RTA und speichert daraus die Abfahrtszeiten von
// Metro und Tram verkleinert in public/data/transit/. Ausführen mit: npm run fetch-transit-data
//
// Quelle: RTA-Fahrplan (GTFS), offene Daten von Dubai Pulse, über die Mobility Database
// (mobilitydatabase.org/feeds/mdb-3359) als ZIP-Datei erreichbar. Es ist ein Planfahrplan,
// keine Echtzeit. Busse lassen wir weg (zu viele Daten für die App).
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { unzipSync, strFromU8 } from 'fflate'

const GTFS_URL = 'https://www.gitlab.com/Lach-anonym/dubai-gtfs/-/jobs/artifacts/main/raw/gtfs.zip?job=download-republish-gtfs'
const OUT_DIR = new URL('../public/data/transit/', import.meta.url)
const NOTE = 'Fahrplan: Roads and Transport Authority (RTA), Dubai Pulse Open Data'
const FILES = ['routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt', 'calendar.txt', 'translations.txt']
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

// Eine CSV-Zeile in Felder zerlegen (Felder können in "…" stehen)
function parseLine(line) {
  const fields = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted && c === '"' && line[i + 1] === '"') {
      field += '"' // "" steht für ein Anführungszeichen im Text
      i++
    } else if (c === '"') {
      quoted = !quoted
    } else if (c === ',' && !quoted) {
      fields.push(field.trim())
      field = ''
    } else {
      field += c
    }
  }
  fields.push(field.trim())
  return fields
}

// Ganze Datei als Liste von Objekten; mit keep(Felder, Spalten) lassen sich Zeilen früh aussortieren
function readTable(text, keep = () => true) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const header = parseLine(lines[0])
  const column = Object.fromEntries(header.map((name, i) => [name, i]))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    const fields = parseLine(lines[i])
    if (keep(fields, column)) rows.push(Object.fromEntries(header.map((name, j) => [name, fields[j]])))
  }
  return rows
}

// "centrepoint Metro Station 2" → "Centrepoint", "Dubai Marina1" → "Dubai Marina"
// (die Bahnsteige einer Station haben eigene Nummern und werden zusammengefasst)
const stationName = (name) =>
  name
    .replace(/\s*\d+$/, '')
    .replace(/\(Green Line\s*\)/i, '')
    .replace(/\s+(Metro|Tram)(\s+Bus)?\s+Station$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
// "محطة المترو_برجمان" bzw. "القصيص - محطة المترو" → nur der Name
const stationNameAr = (name) =>
  name
    .replace(/^\d+\s+/, '') // "1 محطة …" (Bahnsteig), aber "مبنى رقم 3" behalten
    .replace(/محطة\s*(ال)?(مترو|ترام)/g, '')
    .replace(/الخط الأخضر/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?<!رقم\s*)\s*\d+$/, '') // Bahnsteig-Nummer am Ende
    .replace(/رقم\s*(\d)/, 'رقم $1')
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m // nach Mitternacht kann die Stunde über 24 liegen (z. B. "24:30")
}
const LINES = { MRed1: 'red', MRed2: 'red', MGrn: 'green', T1: 'tram' }

console.log('Lade Fahrplan der RTA …')
const res = await fetch(GTFS_URL, { signal: AbortSignal.timeout(300000) })
if (!res.ok) throw new Error(`Download fehlgeschlagen: HTTP ${res.status}`)
const zip = unzipSync(new Uint8Array(await res.arrayBuffer()), { filter: (file) => FILES.includes(file.name) })
const text = (name) => strFromU8(zip[name])

// 1) Linien von Metro (Typ 1) und Tram (Typ 0)
const routes = new Map(
  readTable(text('routes.txt'))
    .filter((r) => (r.route_type === '0' || r.route_type === '1') && LINES[r.route_short_name])
    .map((r) => [r.route_id, { line: LINES[r.route_short_name], color: `#${r.route_color}` }]),
)
const trips = new Map(
  readTable(text('trips.txt'))
    .filter((t) => routes.has(t.route_id))
    .map((t) => [t.trip_id, { route: routes.get(t.route_id), service: t.service_id, stops: [] }]),
)
console.log(`${trips.size} Fahrten von Metro und Tram`)

// 2) Haltezeiten nur dieser Fahrten
for (const s of readTable(text('stop_times.txt'), (f, c) => trips.has(f[c.trip_id]))) {
  trips.get(s.trip_id).stops.push([Number(s.stop_sequence), s.stop_id, toMinutes(s.departure_time)])
}

// 3) Haltestellen → Stationen (mehrere Bahnsteige gehören zu einer Station)
const usedStops = new Set([...trips.values()].flatMap((t) => t.stops.map((s) => s[1])))
const arabic = new Map(
  readTable(text('translations.txt'), (f, c) => f[c.table_name] === 'stops' && f[c.language] === 'ar').map((t) => [
    t.record_id,
    t.translation,
  ]),
)
const stopStation = new Map()
const stations = new Map()
for (const stop of readTable(text('stops.txt')).filter((s) => usedStops.has(s.stop_id))) {
  const name = stationName(stop.stop_name)
  const id = slug(name)
  if (!stations.has(id)) stations.set(id, { id, name, nameAr: '', points: [], departures: new Map() })
  const station = stations.get(id)
  station.points.push([Number(stop.stop_lon), Number(stop.stop_lat)])
  station.nameAr ||= stationNameAr(arabic.get(stop.stop_id) ?? '')
  stopStation.set(stop.stop_id, station)
}

// 4) Abfahrten je Station, Linie und Richtung (= Endstation der Fahrt), getrennt nach Fahrplantag
for (const trip of trips.values()) {
  const stops = trip.stops.sort((a, b) => a[0] - b[0])
  const end = stopStation.get(stops.at(-1)[1])
  for (const [, stopId, minutes] of stops.slice(0, -1)) {
    const station = stopStation.get(stopId)
    if (station === end) continue
    const key = `${trip.route.line}|${end.id}`
    if (!station.departures.has(key)) {
      station.departures.set(key, { line: trip.route.line, color: trip.route.color, to: end.name, toAr: end.nameAr, times: {} })
    }
    ;(station.departures.get(key).times[trip.service] ??= []).push(minutes)
  }
}

// 5) Fahrplantage: an welchen Wochentagen gilt welcher Fahrplan (Mo … So als "1111000")
const calendar = readTable(text('calendar.txt')).filter((c) =>
  [...trips.values()].some((t) => t.service === c.service_id),
)
const services = Object.fromEntries(calendar.map((c) => [c.service_id, WEEKDAYS.map((d) => c[d]).join('')]))
const validFrom = calendar.map((c) => c.start_date).sort()[0]
const validUntil = calendar.map((c) => c.end_date).sort().at(-1)

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })
const round = (n) => Math.round(n * 1e5) / 1e5
const average = (values) => values.reduce((a, b) => a + b, 0) / values.length
const list = [...stations.values()].map((s) => [
  s.id,
  s.name,
  s.nameAr,
  round(average(s.points.map((p) => p[0]))),
  round(average(s.points.map((p) => p[1]))),
])
await writeFile(
  new URL('stations.json', OUT_DIR),
  JSON.stringify({ note: NOTE, created: new Date().toISOString().slice(0, 10), validFrom, validUntil, services, stations: list }),
)
let bytes = 0
for (const station of stations.values()) {
  const departures = [...station.departures.values()].map((d) => ({
    ...d,
    times: Object.fromEntries(Object.entries(d.times).map(([service, times]) => [service, times.sort((a, b) => a - b)])),
  }))
  const json = JSON.stringify({ departures })
  bytes += json.length
  await writeFile(new URL(`${station.id}.json`, OUT_DIR), json)
}
console.log(`Fertig: ${stations.size} Stationen, ${(bytes / 1024).toFixed(0)} KB, Fahrplan gültig ${validFrom}–${validUntil}.`)
