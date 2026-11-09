// Macht aus einem Routen-Schritt eine Anweisung ("Rechts abbiegen auf D71") und ein Pfeil-Symbol.
import type { TFunction } from 'i18next'
import type { RouteStep } from '../services/routing'

export type ManeuverIcon =
  | 'straight'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'uturn'
  | 'roundabout'
  | 'arrive'

const ARABIC_SCRIPT = /[؀-ۿ]/
// Deutsche Anweisungen, die mit einem Nomen beginnen (bleiben im Satz großgeschrieben)
const GERMAN_NOUN_START = /^(Ausfahrt|Auffahrt|Kreisverkehr|Ziel|Zwischenstopp)/

// Richtung aus dem OSRM-"modifier" (z. B. "slight left") → Schlüssel
const DIRECTIONS: Record<string, Exclude<ManeuverIcon, 'roundabout' | 'arrive'>> = {
  left: 'left',
  right: 'right',
  'slight left': 'slight-left',
  'slight right': 'slight-right',
  'sharp left': 'sharp-left',
  'sharp right': 'sharp-right',
  straight: 'straight',
  uturn: 'uturn',
}

export function maneuverIcon(step: RouteStep): ManeuverIcon {
  if (step.type === 'arrive') return 'arrive'
  if (['roundabout', 'rotary', 'roundabout turn'].includes(step.type)) return 'roundabout'
  return DIRECTIONS[step.modifier ?? 'straight'] ?? 'straight'
}

// Straßenbezeichnung für die Anzeige: bei Deutsch/Englisch keine arabischen Namen,
// stattdessen die Straßennummer (z. B. "E11"), falls vorhanden
export function roadLabel(step: RouteStep, language: string) {
  const name = step.name && (language === 'ar' || !ARABIC_SCRIPT.test(step.name)) ? step.name : ''
  return name || step.ref || ''
}

// Die Straßen, auf denen die Route am längsten verläuft (z. B. "E11, D71") – zum Unterscheiden von Routen
export function mainRoads(steps: RouteStep[], language: string, count = 2) {
  const lengths = new Map<string, number>()
  for (const step of steps) {
    const label = step.ref?.split(';')[0] || roadLabel(step, language) // Nummer ist kürzer als der Name
    if (label) lengths.set(label, (lengths.get(label) ?? 0) + step.distance)
  }
  return [...lengths.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([label]) => label)
}

// Anweisung ohne Entfernung, z. B. "Rechts abbiegen auf D71"
export function instructionText(step: RouteStep, t: TFunction, language: string) {
  let text: string
  const direction = DIRECTIONS[step.modifier ?? 'straight'] ?? 'straight'
  const keepSide = step.modifier?.includes('left') ? 'left' : step.modifier?.includes('right') ? 'right' : null

  switch (step.type) {
    case 'arrive': {
      const side = arrivalSide(step)
      if (step.isFinal && side) return t(`nav.arriveSide.${side}`)
      return t(step.isFinal ? 'nav.arrive' : 'nav.waypoint')
    }
    case 'depart':
      text = t('nav.depart')
      break
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      text = t('nav.roundabout', { exit: step.exit ?? 1 })
      break
    case 'exit roundabout':
    case 'exit rotary':
      text = t('nav.exitRoundabout')
      break
    case 'merge':
      text = t('nav.merge')
      break
    case 'on ramp':
      text = t('nav.onRamp')
      break
    case 'off ramp':
      text = t('nav.offRamp')
      break
    case 'fork':
      text = keepSide ? t(`nav.keep.${keepSide}`) : t('nav.direction.straight')
      break
    default:
      // turn, new name, continue, end of road, …
      text = t(`nav.direction.${direction}`)
  }

  const road = roadLabel(step, language)
  return road ? t('nav.onto', { instruction: text, road }) : text
}

// Auf welcher Straßenseite das Ziel liegt (laut Routendienst), sonst null
function arrivalSide(step: RouteStep): 'left' | 'right' | null {
  if (step.modifier?.includes('left')) return 'left'
  if (step.modifier?.includes('right')) return 'right'
  return null
}

// Gesprochene Entfernung, gerundet: "300 Metern", "1,5 Kilometern"
export function spokenDistance(meters: number, t: TFunction, language: string) {
  if (meters < 1000) {
    return t('nav.meters', { count: Math.max(50, Math.round(meters / 50) * 50) })
  }
  const km = new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.round(meters / 500) / 2)
  return t('nav.kilometers', { count: km })
}

// Gesprochene Dauer, ausgeschrieben: "4 Minuten" (statt "4 Min.")
export function spokenDuration(seconds: number, language: string) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  const unit = (value: number, unit: 'hour' | 'minute') =>
    new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
  if (minutes < 60) return unit(minutes, 'minute')
  const rest = minutes % 60
  return rest === 0 ? unit(Math.floor(minutes / 60), 'hour') : `${unit(Math.floor(minutes / 60), 'hour')} ${unit(rest, 'minute')}`
}

// Ansage mit Entfernung, z. B. "In 300 Metern rechts abbiegen auf D71"
export function announcementText(step: RouteStep, meters: number, t: TFunction, language: string) {
  const distanceText = spokenDistance(meters, t, language)
  if (step.type === 'arrive') {
    const side = arrivalSide(step)
    if (step.isFinal && side) return t(`nav.arriveInSide.${side}`, { distance: distanceText })
    return t(step.isFinal ? 'nav.arriveIn' : 'nav.waypointIn', { distance: distanceText })
  }
  let instruction = instructionText(step, t, language)
  // Im Satz klein weiterschreiben: "In 300 Metern rechts abbiegen" (gilt nicht für Arabisch).
  // Deutsche Nomen bleiben groß: "In 2 Kilometern Ausfahrt nehmen".
  const germanNoun = language === 'de' && GERMAN_NOUN_START.test(instruction)
  if (language !== 'ar' && !germanNoun) instruction = instruction.charAt(0).toLowerCase() + instruction.slice(1)
  return t('nav.inDistance', { distance: distanceText, instruction })
}
