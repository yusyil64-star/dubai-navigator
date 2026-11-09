// Meldungen von Nutzern (wie bei Waze): Unfall, Polizei, mobiles Radar, Gefahr, Stau, Baustelle, Sperrung.
// Keine Konten: Abstimmungen laufen über eine zufällige Geräte-Kennung, Missbrauchsschutz über eine
// Prüfsumme aus IP-Adresse und Tag (die IP-Adresse selbst wird nicht gespeichert).
//
//   GET  /reports                  aktuelle Meldungen
//   POST /reports                  neue Meldung { kind, lon, lat, heading, voter }
//   POST /reports/<id>/vote        { voter, still: true/false }  ("Noch da" / "Nicht mehr da")

const MINUTE = 60_000
// Wie lange eine Meldung ohne Bestätigung sichtbar bleibt
const LIFETIME = {
  accident: 60 * MINUTE,
  police: 60 * MINUTE,
  camera: 60 * MINUTE, // mobiles Radar
  hazard: 60 * MINUTE,
  jam: 30 * MINUTE,
  roadworks: 6 * 60 * MINUTE,
  closed: 3 * 60 * MINUTE,
}
const BOUNDS = { west: 54.6, east: 56.0, south: 24.6, north: 25.5 } // Raum Dubai
const MAX_PER_HOUR = 10 // Meldungen pro Absender und Stunde
const SAME_PLACE_METERS = 150 // gleiche Art so nah = dieselbe Meldung (zählt als Bestätigung)

const json = (data, cors, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function handleReports(request, url, env, cors) {
  const parts = url.pathname.split('/').filter(Boolean) // ["reports"] oder ["reports", id, "vote"]
  const now = Date.now()

  if (request.method === 'GET' && parts.length === 1) {
    const { results } = await env.DB.prepare(
      'SELECT id, kind, lon, lat, heading, created, up, down FROM reports WHERE expires > ? ORDER BY created DESC LIMIT 500',
    )
      .bind(now)
      .all()
    return json({ reports: results }, cors)
  }

  if (request.method !== 'POST') return json({ error: 'method' }, cors, 405)
  const body = await readBody(request)
  if (!body || !validVoter(body.voter)) return json({ error: 'invalid' }, cors, 400)

  if (parts.length === 1) return createReport(body, request, env, cors, now)
  if (parts.length === 3 && parts[2] === 'vote' && /^[a-z0-9-]{8,40}$/.test(parts[1])) {
    return vote(parts[1], body, env, cors, now)
  }
  return json({ error: 'not found' }, cors, 404)
}

async function createReport(body, request, env, cors, now) {
  const { kind, lon, lat, heading } = body
  if (!LIFETIME[kind] || !inDubai(lon, lat) || !(heading === null || (typeof heading === 'number' && heading >= 0 && heading < 360))) {
    return json({ error: 'invalid' }, cors, 400)
  }

  // Missbrauchsschutz: höchstens MAX_PER_HOUR Meldungen pro Absender und Stunde
  const sender = await senderId(request)
  const hour = Math.floor(now / (60 * MINUTE))
  const row = await env.DB.prepare(
    'INSERT INTO rate (sender, hour, count) VALUES (?, ?, 1) ON CONFLICT (sender, hour) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(sender, hour)
    .first()
  if (row.count > MAX_PER_HOUR) return json({ error: 'too many' }, cors, 429)

  // Gibt es diese Meldung schon in der Nähe? Dann zählt sie als Bestätigung.
  const { results: nearby } = await env.DB.prepare(
    'SELECT id, lon, lat FROM reports WHERE kind = ? AND expires > ? AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?',
  )
    .bind(kind, now, lon - 0.003, lon + 0.003, lat - 0.003, lat + 0.003)
    .all()
  const same = nearby.find((r) => distance([r.lon, r.lat], [lon, lat]) < SAME_PLACE_METERS)
  if (same) return vote(same.id, { voter: body.voter, still: true }, env, cors, now)

  const id = crypto.randomUUID()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO reports (id, kind, lon, lat, heading, created, expires, up, down) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)').bind(
      id,
      kind,
      round(lon),
      round(lat),
      heading === null ? null : Math.round(heading),
      now,
      now + LIFETIME[kind],
    ),
    env.DB.prepare('INSERT INTO votes (report_id, voter) VALUES (?, ?)').bind(id, body.voter),
    // Aufräumen: alte Meldungen, Stimmen und Zähler löschen
    env.DB.prepare('DELETE FROM votes WHERE report_id IN (SELECT id FROM reports WHERE expires < ?)').bind(now - 24 * 60 * MINUTE),
    env.DB.prepare('DELETE FROM reports WHERE expires < ?').bind(now - 24 * 60 * MINUTE),
    env.DB.prepare('DELETE FROM rate WHERE hour < ?').bind(hour - 2),
  ])
  return json({ id }, cors, 201)
}

async function vote(id, body, env, cors, now) {
  const report = await env.DB.prepare('SELECT kind, up, down, expires FROM reports WHERE id = ?').bind(id).first()
  if (!report || report.expires <= now) return json({ error: 'gone' }, cors, 404)
  const inserted = await env.DB.prepare('INSERT OR IGNORE INTO votes (report_id, voter) VALUES (?, ?)').bind(id, body.voter).run()
  if (inserted.meta.changes === 0) return json({ id, already: true }, cors) // schon abgestimmt

  let { up, down, expires } = report
  if (body.still) {
    up++
    expires = Math.max(expires, now + LIFETIME[report.kind] / 2) // "Noch da" verlängert die Meldung
  } else {
    down++
    if (down >= up + 1) expires = now // mehr "Nicht mehr da" als Bestätigungen: Meldung verschwindet
  }
  await env.DB.prepare('UPDATE reports SET up = ?, down = ?, expires = ? WHERE id = ?').bind(up, down, expires, id).run()
  return json({ id, up, down }, cors)
}

async function readBody(request) {
  const text = await request.text()
  if (text.length > 500) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const validVoter = (voter) => typeof voter === 'string' && /^[a-z0-9-]{8,40}$/.test(voter)
const inDubai = (lon, lat) =>
  typeof lon === 'number' && typeof lat === 'number' && lon >= BOUNDS.west && lon <= BOUNDS.east && lat >= BOUNDS.south && lat <= BOUNDS.north
const round = (n) => Math.round(n * 1e5) / 1e5

// Prüfsumme aus IP-Adresse und Datum: reicht zum Zählen, die IP selbst wird nicht gespeichert
async function senderId(request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${day}`))
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function distance(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const h =
    Math.sin(toRad(b[1] - a[1]) / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(toRad(b[0] - a[0]) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}
