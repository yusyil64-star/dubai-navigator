// Salik-Mautkosten für eine Route schätzen.
// Tarif seit 1. 6. 2026 (inkl. 5 % MwSt.), laut The National, Gulf News, Khaleej Times:
//   Hauptverkehrszeit Mo–Sa 6–10 und 16–20 Uhr: 6,30 AED · übrige Zeit und sonntags: 4,20 AED
//   täglich 1–6 Uhr: kostenlos. Feiertage und Ramadan haben abweichende Zeiten → "ohne Gewähr".
// Mautbrücken-Standorte: OpenStreetMap (highway=toll_gantry), vorab geladen.
import { cumulativeDistances, projectOnLine } from '../navigation/geo'
import type { TollGate } from '../navigation/roadData'
import type { LonLat } from './routing'

export const SALIK_PEAK = 6.3
export const SALIK_OFF_PEAK = 4.2

// Brücken, die als EIN Tor zählen: die zwei Fahrbahnen derselben Brücke, sowie Al Safa Nord/Süd
// und Al Mamzar Nord/Süd (werden innerhalb einer Stunde nur einmal berechnet)
const GATE_GROUPS: [RegExp, string][] = [
  [/maktoum/i, 'Al Maktoum Bridge'],
  [/garhoud/i, 'Al Garhoud Bridge'],
  [/airport/i, 'Airport Tunnel'],
  [/business bay/i, 'Business Bay Crossing'],
  [/barsha/i, 'Al Barsha'],
  [/jebel ali/i, 'Jebel Ali'],
  [/mamzar/i, 'Al Mamzar'],
  [/safa/i, 'Al Safa'],
]

const groupOf = (gate: TollGate) => GATE_GROUPS.find(([pattern]) => pattern.test(gate.name))?.[1] ?? gate.name

export type TollPeriod = 'peak' | 'offPeak' | 'free'

// Tarifzeit nach Uhrzeit in Dubai (unabhängig von der Zeitzone des Handys)
export function salikPeriod(date: Date): TollPeriod {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  if (hour >= 1 && hour < 6) return 'free'
  if (weekday === 'Sun') return 'offPeak'
  const peak = (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20)
  return peak ? 'peak' : 'offPeak'
}

export type SalikEstimate = { gates: string[]; period: TollPeriod; cost: number }

// Welche Salik-Tore liegen auf der Route, und was kostet das voraussichtlich?
export function estimateSalik(coords: LonLat[], gates: TollGate[], date: Date): SalikEstimate {
  const cum = cumulativeDistances(coords)
  const crossed = new Set<string>()
  for (const gate of gates) {
    if (projectOnLine(gate.position, coords, cum).offset < 25) crossed.add(groupOf(gate))
  }
  const period = salikPeriod(date)
  const price = period === 'peak' ? SALIK_PEAK : period === 'offPeak' ? SALIK_OFF_PEAK : 0
  return { gates: [...crossed], period, cost: Math.round(crossed.size * price * 100) / 100 }
}
