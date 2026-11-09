import { useTranslation } from 'react-i18next'
import { instructionText, maneuverIcon } from '../navigation/instructions'
import type { Route } from '../services/routing'
import { formatDistance } from '../utils/format'
import { ManeuverArrow } from './ManeuverArrow'

// Alle Abbiegungen der Route nacheinander, jeweils mit der Strecke bis zur nächsten.
export function StepList({ route }: { route: Route }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  return (
    <ol className="step-list">
      {route.steps.map((step, i) => (
        <li key={i}>
          <ManeuverArrow icon={maneuverIcon(step)} />
          <span className="step-list__text">{instructionText(step, t, language)}</span>
          {step.distance > 0 && <span className="step-list__distance">{formatDistance(step.distance, language)}</span>}
        </li>
      ))}
    </ol>
  )
}
