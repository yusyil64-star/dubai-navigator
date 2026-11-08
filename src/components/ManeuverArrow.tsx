import type { ManeuverIcon } from '../navigation/instructions'

// Drehwinkel des Grundpfeils (zeigt nach oben) für jede Richtung
const ROTATION: Partial<Record<ManeuverIcon, number>> = {
  straight: 0,
  'slight-right': 45,
  right: 90,
  'sharp-right': 135,
  'slight-left': -45,
  left: -90,
  'sharp-left': -135,
}

// Abbiegepfeil für das Navigations-Banner. Wird bei Arabisch bewusst NICHT gespiegelt:
// "links" bleibt auf der Straße links.
export function ManeuverArrow({ icon }: { icon: ManeuverIcon }) {
  return (
    <svg className="maneuver-arrow" viewBox="0 0 24 24" aria-hidden="true">
      {icon === 'arrive' && <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />}
      {icon === 'uturn' && <path d="M7 21V10a5 5 0 0 1 10 0v4h3l-4.5 5L11 14h3v-4a2 2 0 0 0-4 0v11z" />}
      {icon === 'roundabout' && (
        <>
          <circle cx="12" cy="13" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 1l5 5h-3.5v3h-3V6H7z" />
          <path d="M10.5 18h3v5h-3z" />
        </>
      )}
      {ROTATION[icon] !== undefined && (
        <path d="M12 2l7 8h-5v12h-4V10H5z" transform={`rotate(${ROTATION[icon]} 12 12)`} />
      )}
    </svg>
  )
}
