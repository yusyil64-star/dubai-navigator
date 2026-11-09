// "Schnellere Route gefunden" wie bei Waze: Während der Navigation mit Live-Verkehr wird alle paar
// Minuten neu gerechnet. Ist ein anderer Weg deutlich schneller, wird er angeboten.
import { useEffect, useRef, useState } from 'react'
import { getRoute, type Route } from '../services/routing'
import { distance } from './geo'
import type { NavProgress, NavStatus } from './useNavigation'

const CHECK_EVERY_MS = 5 * 60_000
const MIN_SAVING_SECONDS = 180 // erst ab 3 Minuten Ersparnis anbieten
const SAME_PATH_SHARE = 0.85 // so viel des neuen Wegs auf dem alten = derselbe Weg

export type FasterRoute = { route: Route; savingSeconds: number }

export function useFasterRoute(route: Route, progress: NavProgress | null, status: NavStatus, enabled: boolean) {
  const [offer, setOffer] = useState<FasterRoute | null>(null)
  const latest = useRef({ route, progress, status })
  useEffect(() => {
    latest.current = { route, progress, status }
  }, [route, progress, status])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const check = async () => {
      const { route: r, progress: p, status: s } = latest.current
      if (!p || s !== 'active' || p.along === null) return
      const legIndex = p.nextStep?.legIndex ?? r.waypoints.length - 2
      try {
        const fresh = await getRoute([p.position, ...r.waypoints.slice(legIndex + 1)], r.profile, controller.signal)
        if (fresh.provider !== 'tomtom') return // ohne Live-Verkehr nichts zu vergleichen
        const saving = p.remainingDuration - fresh.durationSeconds
        if (saving >= MIN_SAVING_SECONDS && !samePath(fresh, r)) setOffer({ route: fresh, savingSeconds: saving })
      } catch {
        // kein Netz oder Tageskontingent verbraucht: einfach weiterfahren
      }
    }
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [enabled])

  return { offer, dismiss: () => setOffer(null) }
}

// Führt der neue Weg größtenteils über die alte Route? (Stichproben alle ~20 Punkte)
function samePath(fresh: Route, old: Route) {
  const samples = fresh.coordinates.filter((_, i) => i % 20 === 0)
  const onOld = samples.filter((p) => old.coordinates.some((q) => distance(p, q) < 40)).length
  return onOld / Math.max(1, samples.length) >= SAME_PATH_SHARE
}
