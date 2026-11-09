import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { spokenDistance } from '../navigation/instructions'
import type { ReportAhead } from '../navigation/reportsAhead'
import { speak } from '../navigation/voice'
import { REPORT_ICONS } from '../services/reports'
import { useSettings } from '../settings'
import { formatDistance } from '../utils/format'

const SAY_METERS = 500 // ab hier einmal ansagen

type ReportWarningProps = {
  ahead: ReportAhead | null
  className: string // Lage auf dem Bildschirm (unter dem Banner bzw. ganz oben)
}

// Hinweis "Unfall gemeldet · 400 m" während der Fahrt, mit einmaliger Ansage (zählt als Warnung).
export function ReportWarning({ ahead, className }: ReportWarningProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const { sound } = useSettings()
  const said = useRef(new Set<string>())

  useEffect(() => {
    if (!ahead || ahead.distance > SAY_METERS || said.current.has(ahead.report.id)) return
    said.current.add(ahead.report.id)
    if (sound !== 'off') {
      const what = t(`reports.kinds.${ahead.report.kind}`)
      speak(t('reports.ahead', { what, distance: spokenDistance(ahead.distance, t, language) }), language)
    }
  }, [ahead, sound, t, language])

  if (!ahead) return null
  return (
    <div className={`nav-camera nav-report ${className}`} role="alert">
      <span aria-hidden="true">{REPORT_ICONS[ahead.report.kind]}</span>
      <span>
        {t(`reports.kinds.${ahead.report.kind}`)} · {formatDistance(ahead.distance, language)}
      </span>
    </div>
  )
}
