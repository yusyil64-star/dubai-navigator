import { useTranslation } from 'react-i18next'
import { formatClock } from '../utils/format'
import type { Timing } from '../utils/timing'

// Abfahrt planen: jetzt, "Abfahrt um" oder "Ankunft um" (Fahrzeit ohne Verkehr)
type DepartureTimeProps = {
  timing: Timing
  onChange: (timing: Timing) => void
  durationSeconds: number // Fahrzeit der gewählten Route (ohne Verkehr)
}

// Nächster Zeitpunkt zu dieser Uhrzeit (heute, sonst morgen)
function nextOccurrence(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  if (date.getTime() < Date.now() - 60_000) date.setDate(date.getDate() + 1)
  return date.getTime()
}

const toClockValue = (time: number) => {
  const date = new Date(time)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function DepartureTime({ timing, onChange, durationSeconds }: DepartureTimeProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const modes: Timing['mode'][] = ['now', 'depart', 'arrive']

  function selectMode(mode: Timing['mode']) {
    if (mode === 'now') onChange({ mode })
    // Vorschlag: in einer Stunde, auf 5 Minuten gerundet
    else onChange({ mode, at: timing.mode === 'now' ? Math.ceil((Date.now() + 3_600_000) / 300_000) * 300_000 : timing.at })
  }

  return (
    <div className="departure">
      <div className="departure__modes" role="radiogroup" aria-label={t('timing.label')}>
        {modes.map((mode) => (
          <button key={mode} type="button" role="radio" aria-checked={timing.mode === mode} onClick={() => selectMode(mode)}>
            {t(`timing.${mode}`)}
          </button>
        ))}
      </div>
      {timing.mode !== 'now' && (
        <div className="departure__row">
          <input
            type="time"
            value={toClockValue(timing.at)}
            onChange={(e) => e.target.value && onChange({ mode: timing.mode, at: nextOccurrence(e.target.value) })}
            aria-label={t(`timing.${timing.mode}`)}
          />
          <span>
            {timing.mode === 'depart'
              ? t('timing.arrival', { time: formatClock(new Date(timing.at + durationSeconds * 1000), language) })
              : t('timing.leaveAt', { time: formatClock(new Date(timing.at - durationSeconds * 1000), language) })}
          </span>
        </div>
      )}
    </div>
  )
}

