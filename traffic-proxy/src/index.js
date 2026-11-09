// Kleiner Server (Cloudflare Worker) für die App: Live-Verkehr von TomTom und Meldungen von Nutzern.
// Zweck: Der TomTom-Schlüssel bleibt hier geheim und steht nicht in der öffentlichen App.
// Außerdem werden Antworten kurz zwischengespeichert, damit sich alle Nutzer das Tageskontingent teilen.
//
// Wege:
//   /tile/<stil>/<z>/<x>/<y>.png   Verkehrslage als Kartenkachel (stil: relative0 oder relative0-dark)
//   /incidents?language=de-DE      Verkehrsmeldungen in Dubai
//   /route/<punkte>?avoidTolls=1&alternatives=1   Autoroute mit Verkehr (punkte: lat,lon:lat,lon:…)
//   /reports …                     Meldungen von Nutzern (siehe reports.js)

import { handleReports } from './reports.js'

const TOMTOM = 'https://api.tomtom.com'
const DUBAI_BBOX = '54.9,24.75,55.65,25.35' // höchstens 10.000 km² laut TomTom
const INCIDENT_FIELDS = '{incidents{geometry{type,coordinates},properties{iconCategory,events{description},from,to,delay}}}'
const INCIDENT_CATEGORIES = '1,3,8,9,11,14' // Unfall, Gefahr, Sperrung, Baustelle, Überflutung, Panne
const LANGUAGES = new Set(['de-DE', 'en-GB', 'ar'])
const TILE_STYLES = new Set(['relative0', 'relative0-dark'])

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    // Nur die eigene App darf den Server benutzen (Browser schicken immer "Origin" mit)
    const cors = allowed.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          Vary: 'Origin',
        }
      : null
    if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} })
    if (!cors) return new Response('Forbidden', { status: 403 })

    const url = new URL(request.url)
    // Meldungen von Nutzern (eigene Datenbank, siehe reports.js)
    if (url.pathname.startsWith('/reports')) return handleReports(request, url, env, cors)
    if (request.method !== 'GET') return new Response('Forbidden', { status: 403, headers: cors })

    const target = buildTarget(url, env.TOMTOM_KEY)
    if (!target) return new Response('Not found', { status: 404, headers: cors })

    // Zwischenspeicher: gleiche Anfrage innerhalb kurzer Zeit = keine neue Abfrage bei TomTom
    const cache = caches.default
    const cacheKey = new Request(url.toString())
    let response = await cache.match(cacheKey)
    if (!response) {
      const upstream = await fetch(target.url)
      response = new Response(upstream.body, upstream)
      response.headers.set('Cache-Control', `public, max-age=${target.cacheSeconds}`)
      response.headers.delete('Set-Cookie')
      if (upstream.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()))
    }
    const result = new Response(response.body, response)
    for (const [name, value] of Object.entries(cors)) result.headers.set(name, value)
    return result
  },
}

// Übersetzt den Weg der App in die TomTom-Adresse (nur erlaubte, geprüfte Werte)
function buildTarget(url, key) {
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts[0] === 'tile' && parts.length === 5) {
    const [, style, z, x, yPng] = parts
    const y = yPng.replace(/\.png$/, '')
    if (!TILE_STYLES.has(style) || ![z, x, y].every((n) => /^\d{1,7}$/.test(n)) || Number(z) < 10 || Number(z) > 18) {
      return null
    }
    return { url: `${TOMTOM}/traffic/map/4/tile/flow/${style}/${z}/${x}/${y}.png?key=${key}`, cacheSeconds: 120 }
  }

  if (parts[0] === 'incidents' && parts.length === 1) {
    const language = url.searchParams.get('language')
    if (!LANGUAGES.has(language)) return null
    const params = new URLSearchParams({
      bbox: DUBAI_BBOX,
      fields: INCIDENT_FIELDS,
      language,
      categoryFilter: INCIDENT_CATEGORIES,
      timeValidityFilter: 'present',
      key,
    })
    return { url: `${TOMTOM}/traffic/services/5/incidentDetails?${params}`, cacheSeconds: 180 }
  }

  if (parts[0] === 'route' && parts.length === 2) {
    const points = parts[1]
    // 2 bis 5 Punkte "lat,lon" (Start, bis zu 3 Zwischenstopps, Ziel)
    if (!/^(-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?)(:-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?){1,4}$/.test(points)) return null
    const params = new URLSearchParams({
      key,
      traffic: 'true',
      travelMode: 'car',
      routeType: 'fastest',
      instructionsType: 'coded',
    })
    if (url.searchParams.get('alternatives') === '1') params.set('maxAlternatives', '2')
    if (url.searchParams.get('avoidTolls') === '1') params.set('avoid', 'tollRoads')
    return { url: `${TOMTOM}/routing/1/calculateRoute/${points}/json?${params}`, cacheSeconds: 60 }
  }

  return null
}
