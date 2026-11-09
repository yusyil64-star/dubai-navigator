// Live-Standort teilen: Wer navigiert, schickt alle paar Sekunden seine Position; wer den Link hat, sieht sie.
//
//   POST /shares                 neues Teilen { destName, destLon, destLat, lon, lat, heading, eta } → { id, token }
//   POST /shares/<id>            Position aktualisieren { token, lon, lat, heading, eta } oder beenden { token, ended: true }
//   GET  /shares/<id>            aktueller Stand für den Link (ohne token)

const MINUTE = 60_000
const IDLE = 15 * MINUTE // ohne neue Position so lange sichtbar, dann weg
const MAX_DURATION = 6 * 60 * MINUTE // ein Teilen läuft höchstens 6 Stunden
const ENDED_VISIBLE = 10 * MINUTE // nach dem Beenden noch kurz "angekommen" zeigen, dann löschen
const MAX_PER_HOUR = 6 // neue Teilen-Links pro Absender und Stunde
const BOUNDS = { west: 54.6, east: 56.0, south: 24.6, north: 25.5 }

const json = (data, cors, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function handleShares(request, url, env, cors) {
  const parts = url.pathname.split('/').filter(Boolean) // ["shares"] oder ["shares", id]
  const now = Date.now()
  const id = parts[1]
  if (id !== undefined && !/^[A-Za-z0-9]{12}$/.test(id)) return json({ error: 'not found' }, cors, 404)

  if (request.method === 'GET' && id) {
    const share = await env.DB.prepare(
      'SELECT dest_name, dest_lon, dest_lat, lon, lat, heading, eta, updated, ended FROM shares WHERE id = ? AND expires > ?',
    )
      .bind(id, now)
      .first()
    if (!share) return json({ error: 'gone' }, cors, 404)
    return json(
      {
        destName: share.dest_name,
        destination: [share.dest_lon, share.dest_lat],
        position: [share.lon, share.lat],
        heading: share.heading,
        eta: share.eta,
        updated: share.updated,
        ended: share.ended === 1,
      },
      cors,
    )
  }

  if (request.method !== 'POST') return json({ error: 'method' }, cors, 405)
  const body = await readBody(request)
  if (!body) return json({ error: 'invalid' }, cors, 400)

  if (!id) return createShare(body, request, env, cors, now)
  return updateShare(id, body, env, cors, now)
}

async function createShare(body, request, env, cors, now) {
  const { destName, destLon, destLat, lon, lat, heading, eta } = body
  if (typeof destName !== 'string' || destName.length > 100 || !inDubai(destLon, destLat) || !inDubai(lon, lat) || !validExtras(heading, eta)) {
    return json({ error: 'invalid' }, cors, 400)
  }
  // Missbrauchsschutz (gleiche Zähler-Tabelle wie bei den Meldungen, eigener Schlüssel)
  const sender = `share:${await senderId(request)}`
  const hour = Math.floor(now / (60 * MINUTE))
  const row = await env.DB.prepare(
    'INSERT INTO rate (sender, hour, count) VALUES (?, ?, 1) ON CONFLICT (sender, hour) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(sender, hour)
    .first()
  if (row.count > MAX_PER_HOUR) return json({ error: 'too many' }, cors, 429)

  const id = randomString(12)
  const token = randomString(32)
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO shares (id, token, dest_name, dest_lon, dest_lat, lon, lat, heading, eta, created, updated, expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, token, destName.trim() || '–', round(destLon), round(destLat), round(lon), round(lat), heading ?? null, eta ?? null, now, now, now + IDLE),
    // Aufräumen: abgelaufene Teilen-Links löschen
    env.DB.prepare('DELETE FROM shares WHERE expires < ?').bind(now),
  ])
  return json({ id, token }, cors, 201)
}

async function updateShare(id, body, env, cors, now) {
  const share = await env.DB.prepare('SELECT token, created, ended FROM shares WHERE id = ? AND expires > ?').bind(id, now).first()
  if (!share || share.ended === 1) return json({ error: 'gone' }, cors, 404)
  if (typeof body.token !== 'string' || body.token !== share.token) return json({ error: 'forbidden' }, cors, 403)

  if (body.ended === true) {
    // Beenden: noch kurz "angekommen/beendet" zeigen, danach ist die Zeile weg
    await env.DB.prepare('UPDATE shares SET ended = 1, updated = ?, expires = ? WHERE id = ?').bind(now, now + ENDED_VISIBLE, id).run()
    return json({ ok: true }, cors)
  }
  const { lon, lat, heading, eta } = body
  if (!inDubai(lon, lat) || !validExtras(heading, eta)) return json({ error: 'invalid' }, cors, 400)
  const expires = Math.min(now + IDLE, share.created + MAX_DURATION)
  await env.DB.prepare('UPDATE shares SET lon = ?, lat = ?, heading = ?, eta = ?, updated = ?, expires = ? WHERE id = ?')
    .bind(round(lon), round(lat), heading ?? null, eta ?? null, now, expires, id)
    .run()
  return json({ ok: true }, cors)
}

async function readBody(request) {
  const text = await request.text()
  if (text.length > 600) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const inDubai = (lon, lat) =>
  typeof lon === 'number' && typeof lat === 'number' && lon >= BOUNDS.west && lon <= BOUNDS.east && lat >= BOUNDS.south && lat <= BOUNDS.north
const validExtras = (heading, eta) =>
  (heading === null || heading === undefined || (typeof heading === 'number' && heading >= 0 && heading < 360)) &&
  (eta === null || eta === undefined || (typeof eta === 'number' && eta > 0))
const round = (n) => Math.round(n * 1e5) / 1e5

function randomString(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

async function senderId(request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${day}`))
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}
