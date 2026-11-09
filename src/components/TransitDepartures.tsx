import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nextDepartures, stationsAt, type NextDepartures, type Station } from '../services/transit'
import type { Place } from '../services/geocoding'
import { formatClock, formatDuration } from '../utils/format'
import './TransitDepartures.css'

const REFRESH_MS = 30_000

type Boards = {
  stations: { station: Station; departures: NextDepartures[] }[]
  validFrom: string
  loadedAt: number
}

// Nächste Abfahrten von Metro und Tram, wenn am gewählten Ort Stationen sind (Planfahrplan).
export function TransitDepartures({ place }: { place: Place }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [boards, setBoards] = useState<Boards | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { stations, validFrom } = await stationsAt([place.lon, place.lat])
      const now = new Date()
      const withDepartures = await Promise.all(
        stations.map(async (station) => ({ station, departures: await nextDepartures(station, now) })),
      )
      if (!cancelled) setBoards({ stations: withDepartures, validFrom, loadedAt: now.getTime() })
    }
    const refresh = () => load().catch(() => !cancelled && setBoards(null)) // ohne Fahrplan: nichts anzeigen
    refresh()
    const timer = setInterval(refresh, REFRESH_MS) // Minuten aktuell halten
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [place.lon, place.lat])

  if (!boards || boards.stations.length === 0) return null
  const arabic = language === 'ar'
  const [year, month] = [Number(boards.validFrom.slice(0, 4)), Number(boards.validFrom.slice(4, 6))]
  const validFrom = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1))

  // unter einer Stunde "5 Min.", sonst die Uhrzeit
  const when = (minutes: number) =>
    minutes === 0
      ? t('transit.now')
      : minutes < 60
        ? formatDuration(minutes * 60, language)
        : formatClock(new Date(boards.loadedAt + minutes * 60_000), language)

  return (
    <section className="transit">
      {boards.stations.map(({ station, departures }) => (
        <div key={station.id} className="transit__station">
          <h3 className="transit__title">
            {t('transit.title', { station: arabic ? station.nameAr || station.name : station.name })}
          </h3>
          {departures.length === 0 && <p className="transit__empty">{t('transit.none')}</p>}
          <ul className="transit__list">
            {departures.map((d) => (
              <li key={`${d.line}-${d.to}`} className="transit__row">
                <span className="transit__line" style={{ background: d.color }}>
                  {t(`transit.lines.${d.line}`)}
                </span>
                <span className="transit__to">{t('transit.towards', { place: arabic ? d.toAr || d.to : d.to })}</span>
                <span className="transit__times">{d.minutes.map(when).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="transit__note">{t('transit.note', { date: validFrom })}</p>
    </section>
  )
}
