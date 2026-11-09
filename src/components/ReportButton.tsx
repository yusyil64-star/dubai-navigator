import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { REPORT_ICONS, REPORT_KINDS, sendReport, type ReportKind } from '../services/reports'
import type { LonLat } from '../services/routing'
import './Reports.css'

type ReportButtonProps = {
  position: LonLat | null // aktuelle Position (gemeldet wird genau hier)
  heading: number | null
  onNotice: (key: string) => void
}

// Großer Knopf während der Fahrt: Unfall, Polizei, Gefahr … mit zwei Fingertipps melden (wie bei Waze).
export function ReportButton({ position, heading, onNotice }: ReportButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  async function report(kind: ReportKind) {
    if (!position) return
    setSending(true)
    try {
      await sendReport(kind, position, heading)
      onNotice('reports.thanks')
      setOpen(false)
    } catch (error) {
      onNotice(error instanceof Error && error.message === 'too-many' ? 'reports.tooMany' : 'reports.error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="report-button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('reports.button')}
        disabled={!position}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10v4h3l7 4V6L6 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
        </svg>
      </button>
      {open && (
        <div className="report-sheet" role="dialog" aria-label={t('reports.title')}>
          <strong>{t('reports.title')}</strong>
          <div className="report-sheet__grid">
            {REPORT_KINDS.map((kind) => (
              <button key={kind} type="button" disabled={sending} onClick={() => report(kind)}>
                <span aria-hidden="true">{REPORT_ICONS[kind]}</span>
                {t(`reports.kinds.${kind}`)}
              </button>
            ))}
          </div>
          <p>{t('reports.note')}</p>
        </div>
      )}
    </>
  )
}
