import type { ManeuverIcon } from '../navigation/instructions'
import type { Lane } from '../services/routing'
import { ManeuverArrow } from './ManeuverArrow'

const ICONS: Record<string, ManeuverIcon> = {
  straight: 'straight',
  none: 'straight', // Spur ohne Markierung
  left: 'left',
  right: 'right',
  'slight left': 'slight-left',
  'slight right': 'slight-right',
  'sharp left': 'sharp-left',
  'sharp right': 'sharp-right',
  uturn: 'uturn',
}

// Fahrspuren am nächsten Manöver: passende Spuren hell, die anderen gedämpft.
// Immer von links nach rechts – auch auf Arabisch, denn es geht um die echte Straße.
export function LaneGuide({ lanes, modifier }: { lanes: Lane[]; modifier?: string }) {
  return (
    <div className="lane-guide" dir="ltr" aria-hidden="true">
      {lanes.map((lane, i) => {
        // bei Spuren mit mehreren Richtungen die zeigen, die zur Route passt
        const indication =
          (lane.valid && lane.indications.find((d) => d === modifier)) ||
          lane.indications.find((d) => d !== 'none') ||
          'none'
        return (
          <span key={i} className={lane.valid ? 'lane-guide__lane is-valid' : 'lane-guide__lane'}>
            <ManeuverArrow icon={ICONS[indication] ?? 'straight'} />
          </span>
        )
      })}
    </div>
  )
}
