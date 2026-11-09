// Meldungen von Nutzern (wie bei Waze): Unfall, Polizei, Gefahr, Stau, Baustelle, Sperrung.
// Gespeichert auf dem eigenen kleinen Server (traffic-proxy, Datenbank bei Cloudflare). Ohne Konto:
// Abstimmungen laufen über eine zufällige Kennung dieses Geräts.
import { useSyncExternalStore } from 'react'
import { TRAFFIC_PROXY } from '../config/tomtom'
import type { LonLat } from './routing'

export const REPORT_KINDS = ['accident', 'police', 'hazard', 'jam', 'roadworks', 'closed'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]

export const REPORT_ICONS: Record<ReportKind, string> = {
  accident: '💥',
  police: '👮',
  hazard: '⚠️',
  jam: '🚗',
  roadworks: '🚧',
  closed: '⛔',
}

export type Report = {
  id: string
  kind: ReportKind
  lon: number
  lat: number
  heading: number | null // Fahrtrichtung beim Melden
  created: number
  up: number
  down: number
}

const REFRESH_MS = 60_000
export const hasReports = Boolean(TRAFFIC_PROXY)

// Zufällige Kennung dieses Geräts (nur zum Abstimmen, kein Name, kein Konto)
function voterId() {
  const key = 'dubai-navigator.voter'
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// Gemeinsamer Speicher für Karte und Warnungen; lädt nur, solange jemand zuschaut
let reports: Report[] = []
const listeners = new Set<() => void>()
let timer = 0

async function refresh() {
  if (!TRAFFIC_PROXY || document.visibilityState !== 'visible') return
  try {
    const response = await fetch(`${TRAFFIC_PROXY}/reports`)
    if (!response.ok) return
    reports = ((await response.json()) as { reports: Report[] }).reports
    listeners.forEach((listener) => listener())
  } catch {
    // ohne Verbindung bleiben die letzten Meldungen stehen
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    void refresh()
    timer = window.setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }
}

const NONE: Report[] = []
const noSubscription = () => () => {}

// Aktuelle Meldungen (enabled = false: keine Abfragen, leere Liste)
export function useReports(enabled = true) {
  return useSyncExternalStore(enabled ? subscribe : noSubscription, () => (enabled ? reports : NONE))
}

async function post(path: string, body: object) {
  if (!TRAFFIC_PROXY) throw new Error('kein Server')
  const response = await fetch(`${TRAFFIC_PROXY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, voter: voterId() }),
  })
  if (response.status === 429) throw new Error('too-many')
  if (!response.ok) throw new Error(`Server: ${response.status}`)
  void refresh() // Karte gleich aktualisieren
  return (await response.json()) as { already?: boolean }
}

export const sendReport = (kind: ReportKind, [lon, lat]: LonLat, heading: number | null) =>
  post('/reports', { kind, lon, lat, heading: heading === null ? null : ((Math.round(heading) % 360) + 360) % 360 })

// true = gezählt, false = dieses Gerät hatte schon abgestimmt
export const voteReport = async (id: string, still: boolean) => !(await post(`/reports/${id}/vote`, { still })).already
