// Lädt Blitzer, Tempolimits und Salik-Mautbrücken für Dubai einmalig aus OpenStreetMap (Overpass)
// und speichert sie verkleinert in public/data/. Ausführen mit: npm run fetch-osm-data
//
// Warum vorab statt live? Öffentliche Overpass-Server sind oft überlastet und nur für wenig
// Nutzung gedacht. So belastet die App sie nicht und die Daten sind sofort (auch offline) da.
// Daten © OpenStreetMap-Mitwirkende, Lizenz ODbL (https://www.openstreetmap.org/copyright).
import { mkdir, writeFile } from 'node:fs/promises'

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const BBOX = '24.6,54.6,25.5,56.0' // Süd, West, Nord, Ost – Emirat Dubai mit Umgebung
const ROADS = 'motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|service|living_street'
const OUT_DIR = new URL('../public/data/', import.meta.url)
const NOTE = 'Daten © OpenStreetMap-Mitwirkende, ODbL – https://www.openstreetmap.org/copyright'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Fragt Overpass; bei Überlastung mit wachsender Pause erneut (so wie der Server es empfiehlt)
async function overpass(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const pause = 15000 * 2 ** (attempt - 1)
      console.log(`Warte ${pause / 1000} s und versuche es erneut …`)
      await sleep(pause)
    }
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: new URLSearchParams({ data: query }),
          headers: { 'User-Agent': 'DubaiNavigator/0.1 (github.com/yusyil64-star/dubai-navigator)' },
        })
        if (res.ok) {
          await sleep(5000) // kurze Pause vor der nächsten Abfrage (Fair-Use)
          return (await res.json()).elements
        }
        console.warn(`${url}: HTTP ${res.status}`)
      } catch (error) {
        console.warn(`${url}: ${error.message}`)
      }
    }
  }
  throw new Error('Kein Overpass-Server erreichbar – später erneut versuchen.')
}

const round = (n) => Math.round(n * 1e5) / 1e5 // 5 Nachkommastellen ≈ 1 m Genauigkeit

// Tempolimit-Text → km/h (z. B. "80", "60 mph"); unbekannte Formate → null
function parseSpeed(value) {
  const match = /^(\d+)\s*(mph)?$/.exec(value?.trim() ?? '')
  if (!match) return null
  return match[2] ? Math.round(Number(match[1]) * 1.609) : Number(match[1])
}

// Linie vereinfachen (Douglas-Peucker): entfernt Punkte, die weniger als ~3 m abweichen
function simplify(points, tolerance = 0.00003) {
  if (points.length <= 2) return points
  const [a, b] = [points[0], points[points.length - 1]]
  let maxDist = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1e-12
    const dist = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
    if (dist > maxDist) [maxDist, index] = [dist, i]
  }
  if (maxDist <= tolerance) return [a, b]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

async function save(name, data) {
  const text = JSON.stringify({ note: NOTE, created: new Date().toISOString().slice(0, 10), ...data })
  await writeFile(new URL(name, OUT_DIR), text)
  console.log(`${name}: ${(text.length / 1024).toFixed(0)} KB`)
}

await mkdir(OUT_DIR, { recursive: true })

// 1) Blitzer: [Längengrad, Breitengrad, Tempolimit oder 0]
const cameras = await overpass(`[out:json][timeout:90];node[highway=speed_camera](${BBOX});out;`)
await save('speed-cameras.json', {
  cameras: cameras.map((n) => [round(n.lon), round(n.lat), parseSpeed(n.tags?.maxspeed) ?? 0]),
})

// 2) Salik-Mautbrücken: [Längengrad, Breitengrad, Name]
const gates = await overpass(`[out:json][timeout:90];node[highway=toll_gantry](${BBOX});out;`)
await save('toll-gates.json', {
  gates: gates.map((n) => [round(n.lon), round(n.lat), n.tags?.['name:en'] ?? n.tags?.name ?? '']),
})

// 3) Tempolimits: nach km/h gruppiert, jede Straße als flache Liste [lon, lat, lon, lat, …]
const ways = await overpass(`[out:json][timeout:180];way[highway~"^(${ROADS})$"][maxspeed](${BBOX});out geom;`)
const limits = {}
for (const way of ways) {
  const speed = parseSpeed(way.tags.maxspeed)
  if (!speed || !way.geometry) continue
  const line = simplify(way.geometry.map((g) => [g.lon, g.lat])).flatMap(([lon, lat]) => [round(lon), round(lat)])
  ;(limits[speed] ??= []).push(line)
}
await save('speed-limits.json', { limits })

console.log(`Fertig: ${cameras.length} Blitzer, ${gates.length} Mautbrücken, ${ways.length} Straßen mit Tempolimit.`)
