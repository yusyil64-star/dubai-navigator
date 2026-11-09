import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { playAlert } from '../navigation/voice'
import { useSettings } from '../settings'

type SpeedDisplayProps = { speed: number | null; limit: number | null } // beides in km/h

// Tempolimit-Schild und eigene Geschwindigkeit (rot bei zu schnell). Mit Warnton, wenn man
// das Limit um mehr als die eingestellte Toleranz überschreitet – einmal, bis man wieder langsamer ist.
export function SpeedDisplay({ speed, limit }: SpeedDisplayProps) {
  const { t } = useTranslation()
  const { speedWarning, sound } = useSettings()
  const tooFast = speed !== null && limit !== null && speed > limit
  const warn = speedWarning !== null && sound !== 'off' && speed !== null && limit !== null && speed > limit + speedWarning

  const warned = useRef(false)
  useEffect(() => {
    if (warn && !warned.current) playAlert()
    warned.current = warn
  }, [warn])

  if (!limit && speed === null) return null
  return (
    <div className="nav-speed">
      {limit && (
        <div className="nav-speed__limit" aria-label={t('nav.speedLimit', { speed: limit })}>
          {limit}
        </div>
      )}
      {speed !== null && (
        <div className={tooFast ? 'nav-speed__current nav-speed__current--over' : 'nav-speed__current'}>
          <strong>{speed}</strong>
          <span>km/h</span>
        </div>
      )}
    </div>
  )
}
