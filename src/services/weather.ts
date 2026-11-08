// Aktuelle Temperatur von Open-Meteo (kostenlos, ohne Konto, echte Messwerte/Modelldaten).
import type { LonLat } from './routing'

const CACHE_MS = 15 * 60 * 1000 // höchstens alle 15 Minuten neu abfragen
let cached: { at: number; temperature: number } | null = null

export async function currentTemperature(around: LonLat): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.temperature
  const params = new URLSearchParams({
    latitude: around[1].toFixed(2),
    longitude: around[0].toFixed(2),
    current: 'temperature_2m',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error(`Open-Meteo: ${response.status}`)
  const data = await response.json()
  const temperature = Number(data.current?.temperature_2m)
  if (!Number.isFinite(temperature)) throw new Error('Open-Meteo: keine Temperatur')
  cached = { at: Date.now(), temperature }
  return temperature
}
