// Wann soll es losgehen? Jetzt, zu einer Uhrzeit ("Abfahrt um") oder so, dass man pünktlich ankommt.
export type Timing = { mode: 'now' } | { mode: 'depart' | 'arrive'; at: number } // at = Zeitstempel (ms)

// Abfahrtszeitpunkt (z. B. für die Salik-Berechnung); null = jetzt
export function departureOf(timing: Timing, durationSeconds: number): number | null {
  if (timing.mode === 'now') return null
  return timing.mode === 'depart' ? timing.at : timing.at - durationSeconds * 1000
}
