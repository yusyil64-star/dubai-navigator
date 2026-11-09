import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { RoadAlert } from '../navigation/alerts'
import { spokenDistance, spokenDuration } from '../navigation/instructions'
import { speak } from '../navigation/voice'
import { REPORT_ICONS } from '../services/reports'
import { useSettings } from '../settings'
import { formatDistance, formatDuration } from '../utils/format'

const TRAFFIC_ICONS = { jam: '🚗', accident: '💥', closed: '⛔', roadworks: '🚧', other: '⚠️' }
// Ab dieser Entfernung einmal ansagen (Stau früher, damit man reagieren kann)
const SAY_WITHIN = { jam: 2000, accident: 1000, closed: 1000, roadworks: 500, other: 500 }
const REPORT_SAY_WITHIN = 500

type AlertWarningProps = { alert: RoadAlert | null }

// Hinweis "Stau voraus · 1,2 km · +4 Min." bzw. "Polizei · 400 m" mit einmaliger Ansage (zählt als Warnung).
export function AlertWarning({ alert }: AlertWarningProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const { sound } = useSettings()
  const said = useRef(new Set<string>())

  const label = alert && (alert.source === 'report' ? t(`reports.kinds.${alert.kind}`) : t(`traffic.kinds.${alert.kind}`))

  useEffect(() => {
    if (!alert || !label || said.current.has(alert.id)) return
    if (alert.source === 'traffic' && alert.inside) return // im Stau nicht mehr ansagen
    const within = alert.source === 'report' ? REPORT_SAY_WITHIN : SAY_WITHIN[alert.kind]
    if (alert.distance > within) return
    said.current.add(alert.id)
    if (sound === 'off') return
    const distance = spokenDistance(alert.distance, t, language)
    let text: string
    if (alert.source === 'report') text = t('reports.ahead', { what: label, distance })
    else if (alert.kind === 'jam' && alert.delaySeconds >= 60) {
      text = t('traffic.jamAheadDelay', { distance, delay: spokenDuration(alert.delaySeconds, language) })
    } else text = t('traffic.ahead', { what: label, distance })
    speak(text, language)
  }, [alert, label, sound, t, language])

  if (!alert || !label) return null
  const icon = alert.source === 'report' ? REPORT_ICONS[alert.kind] : TRAFFIC_ICONS[alert.kind]
  const distance = formatDistance(alert.distance, language)
  const delay = alert.source === 'traffic' && alert.delaySeconds >= 60 ? ` · +${formatDuration(alert.delaySeconds, language)}` : ''
  return (
    <div className="nav-camera nav-report" role="alert">
      <span aria-hidden="true">{icon}</span>
      <span>
        {label} · {alert.source === 'traffic' && alert.inside ? t('traffic.remaining', { distance }) : distance}
        {delay}
      </span>
    </div>
  )
}
