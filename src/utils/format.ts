// Zahlen, Zeiten und Entfernungen in der jeweiligen Sprache formatieren (Intl ist im Browser eingebaut).

// "16 Min." bzw. "1 Std. 5 Min."
export function formatDuration(seconds: number, language: string) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60))
  const unit = (value: number, unit: 'hour' | 'minute') =>
    new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return unit(minutes, 'minute')
  return minutes === 0 ? unit(hours, 'hour') : `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`
}

// "15,5 km" bzw. "800 m"
export function formatDistance(meters: number, language: string) {
  const rounded = meters < 100 ? Math.round(meters / 5) * 5 : Math.round(meters / 10) * 10
  // erst nach dem Runden entscheiden: 995 m → "1 km" statt "1.000 m"
  if (rounded < 1000) {
    return new Intl.NumberFormat(language, { style: 'unit', unit: 'meter' }).format(rounded)
  }
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  }).format(meters / 1000)
}

// Uhrzeit, z. B. Ankunft "14:32"
export function formatClock(date: Date, language: string) {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date)
}
