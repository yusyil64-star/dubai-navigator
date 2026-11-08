import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan'
import type { LonLat } from '../services/routing'
import './PrayerTimesCard.css'

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

// Heutiges Datum in Dubai (unabhängig von der Zeitzone des Handys)
function dubaiToday(now: Date) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(now).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Ist gerade Ramadan? (9. Monat im islamischen Umm-al-Qura-Kalender, im Browser eingebaut)
function isRamadan(now: Date) {
  const month = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: 'Asia/Dubai' })
    .formatToParts(now)
    .find((p) => p.type === 'month')?.value
  return month === '9'
}

function calculate(around: LonLat) {
  const now = new Date()
  const times = new PrayerTimes(
    new Coordinates(around[1], around[0]),
    dubaiToday(now),
    CalculationMethod.Dubai(), // in Dubai übliche Berechnungsmethode
  )
  return { times, next: times.nextPrayer(now), ramadan: isRamadan(now) }
}

// Gebetszeiten für heute (berechnet, nicht amtlich) – mit Iftar-Hinweis im Ramadan.
export function PrayerTimesCard({ around }: { around: LonLat }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [{ times, next, ramadan }] = useState(() => calculate(around))
  const clock = (date: Date) =>
    new Intl.DateTimeFormat(language, { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }).format(date)

  return (
    <div className="prayer-times">
      {ramadan && <p className="prayer-times__ramadan">{t('prayer.iftar', { time: clock(times.maghrib) })}</p>}
      <ul>
        {PRAYERS.map((prayer) => (
          <li key={prayer} className={next === prayer ? 'prayer-times__next' : undefined}>
            <span>{t(`prayer.${prayer}`)}</span>
            <strong>{clock(times[prayer])}</strong>
          </li>
        ))}
      </ul>
      <p className="prayer-times__note">{t('prayer.note')}</p>
    </div>
  )
}
