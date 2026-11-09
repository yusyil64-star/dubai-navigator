// Live-Standort teilen: Während der Navigation wird die Position alle paar Sekunden an den eigenen
// kleinen Server geschickt; wer den Link hat, sieht sie (Seite mit ?follow=…). Beim Beenden oder bei der
// Ankunft wird das Teilen beendet, der Server löscht die Daten kurz danach.
import { TRAFFIC_PROXY } from '../config/tomtom'
import type { LonLat } from './routing'

export const canShareLive = Boolean(TRAFFIC_PROXY)

export type LivePosition = { position: LonLat; heading: number | null; eta: number | null }
export type FollowedShare = {
  destName: string
  destination: LonLat
  position: LonLat
  heading: number | null
  eta: number | null
  updated: number
  ended: boolean
}

// Das aktuelle Teilen dieses Geräts (überlebt z. B. eine neue Route mit Zwischenstopp)
let current: { id: string; token: string } | null = null

export const currentShareId = () => current?.id ?? null

export function followLink(id: string) {
  return `${location.origin}${import.meta.env.BASE_URL}?follow=${id}`
}

async function post(path: string, body: object) {
  if (!TRAFFIC_PROXY) throw new Error('kein Server')
  const response = await fetch(`${TRAFFIC_PROXY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Server: ${response.status}`)
  return response.json()
}

const roundHeading = (heading: number | null) => (heading === null ? null : ((Math.round(heading) % 360) + 360) % 360)

export async function startShare(destName: string, destination: LonLat, live: LivePosition) {
  if (current) return current.id
  const { id, token } = (await post('/shares', {
    destName: destName.slice(0, 100),
    destLon: destination[0],
    destLat: destination[1],
    lon: live.position[0],
    lat: live.position[1],
    heading: roundHeading(live.heading),
    eta: live.eta,
  })) as { id: string; token: string }
  current = { id, token }
  return id
}

export async function updateShare(live: LivePosition) {
  if (!current) return
  try {
    await post(`/shares/${current.id}`, {
      token: current.token,
      lon: live.position[0],
      lat: live.position[1],
      heading: roundHeading(live.heading),
      eta: live.eta,
    })
  } catch (error) {
    // Teilen wurde serverseitig beendet (z. B. abgelaufen): hier auch vergessen
    if (error instanceof Error && error.message.includes('404')) current = null
  }
}

export async function endShare() {
  if (!current) return
  const { id, token } = current
  current = null
  await post(`/shares/${id}`, { token, ended: true }).catch(() => {})
}

// Für die Seite des Empfängers: aktueller Stand (null = abgelaufen oder unbekannt)
export async function loadShare(id: string, signal: AbortSignal): Promise<FollowedShare | null> {
  if (!TRAFFIC_PROXY) return null
  const response = await fetch(`${TRAFFIC_PROXY}/shares/${id}`, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Server: ${response.status}`)
  return response.json()
}

// Link-Kennung aus der Adresse (?follow=…)
export function followIdFromUrl() {
  const id = new URLSearchParams(location.search).get('follow')
  return id && /^[A-Za-z0-9]{12}$/.test(id) ? id : null
}
