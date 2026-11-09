// Flüssige Bewegung während der Navigation: Pfeil und Karte werden in jedem Bild (bis zu 60-mal
// pro Sekunde) neu gesetzt, statt nur bei jeder GPS-Position (ca. 1-mal pro Sekunde) zu springen.
// Zwischen zwei Positionen fährt der Pfeil mit der aktuellen Geschwindigkeit die Straße entlang
// weiter (auch durch Kurven); kommt die nächste Position, gleitet er sanft dorthin.
import { useEffect, useMemo, useRef } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { LonLat, Route } from '../services/routing'
import { bearing, cumulativeDistances, distance, pointAlong } from './geo'
import type { NavProgress } from './useNavigation'

// Was die flüssige Bewegung braucht (Navigation oder Fahrmodus ohne Route)
export type SmoothInput = Pick<NavProgress, 'position' | 'heading' | 'along' | 'speedMs' | 'fixTime'>

const MAX_AHEAD_SECONDS = 1.5 // höchstens so lange ohne neue Position weiterfahren
const POSITION_SMOOTHING = 4 // je größer, desto schneller folgt der Pfeil der echten Position
const HEADING_SMOOTHING = 3
const LOOK_AHEAD = 20 // m – Richtung aus dem Straßenverlauf kurz voraus (ruhiger als ein Abschnitt)
const JUMP_METERS = 150 // größerer Unterschied (z. B. neue Route): springen statt gleiten
const FOLLOW_ZOOM = 17
const FOLLOW_PITCH = 45
const FOLLOW_PADDING = { top: 160, bottom: 180, left: 0, right: 0 }
const SETTLE_MS = 1200 // so lange gleiten Zoom und Neigung nach dem (Wieder-)Folgen ein

type Options = {
  map: MapLibreMap
  puck: Marker
  route: Route | null // ohne Route (Fahrmodus): nur der gemessenen Position folgen
  progress: SmoothInput | null
  following: boolean
}

export function useSmoothFollow({ map, puck, route, progress, following }: Options) {
  const cum = useMemo(() => (route ? cumulativeDistances(route.coordinates) : []), [route])
  // Aktuelle Werte für die Bildschleife, ohne sie neu zu starten
  const latest = useRef({ route, cum, progress, following })
  useEffect(() => {
    latest.current = { route, cum, progress, following }
  }, [route, cum, progress, following])

  // Beim (Wieder-)Folgen: Zoom und Neigung sanft einstellen
  const followSince = useRef(0)
  useEffect(() => {
    if (following) followSince.current = performance.now()
  }, [following])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let shownAlong: number | null = null
    let shownPoint: LonLat | null = null
    let shownHeading: number | null = null
    let shownRoute: Route | null = null
    let added = false

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - last) / 1000) // nach Pausen (Tab im Hintergrund) nicht springen
      last = now
      const { route: r, cum: c, progress: p, following: follow } = latest.current
      if (!p) return
      const blend = (rate: number) => 1 - Math.exp(-dt * rate)

      let point: LonLat
      let targetHeading = p.heading
      if (p.along !== null && r && r.coordinates.length > 1) {
        // Auf der Route: mit der aktuellen Geschwindigkeit weiterfahren, bis die nächste Position kommt
        const ahead = p.speedMs * Math.min(MAX_AHEAD_SECONDS, Math.max(0, (now - p.fixTime) / 1000))
        const target = Math.min(c[c.length - 1], p.along + ahead)
        if (shownAlong === null || shownRoute !== r || Math.abs(target - shownAlong) > JUMP_METERS) {
          shownAlong = target
        } else {
          shownAlong += (target - shownAlong) * blend(POSITION_SMOOTHING)
        }
        shownRoute = r
        point = pointAlong(r.coordinates, c, shownAlong).point
        const lookAhead = pointAlong(r.coordinates, c, shownAlong + LOOK_AHEAD).point
        if (distance(point, lookAhead) > 1) targetHeading = bearing(point, lookAhead)
      } else {
        // Ohne Route (oder daneben): in Fahrtrichtung weiterrechnen und dorthin gleiten
        shownAlong = null
        const ahead = p.speedMs * Math.min(MAX_AHEAD_SECONDS, Math.max(0, (now - p.fixTime) / 1000))
        const target = moveBy(p.position, p.heading, ahead)
        const from = shownPoint ?? target
        const k = distance(from, target) > JUMP_METERS ? 1 : blend(POSITION_SMOOTHING)
        point = [from[0] + (target[0] - from[0]) * k, from[1] + (target[1] - from[1]) * k]
      }
      shownPoint = point

      // Richtung auf dem kürzesten Weg drehen (z. B. 350° → 10° über Norden)
      if (shownHeading === null) shownHeading = targetHeading
      const turn = ((targetHeading - shownHeading + 540) % 360) - 180
      shownHeading = (shownHeading + turn * blend(HEADING_SMOOTHING) + 360) % 360

      puck.setLngLat(point).setRotation(shownHeading)
      if (!added) {
        puck.addTo(map)
        added = true
      }

      if (follow) {
        const settle = Math.min(1, (now - followSince.current) / SETTLE_MS)
        map.jumpTo({
          center: point,
          bearing: shownHeading,
          padding: FOLLOW_PADDING,
          // nur während des Einstellens Zoom und Neigung ändern, danach darf man selbst zoomen
          ...(settle < 1 && {
            zoom: map.getZoom() + (FOLLOW_ZOOM - map.getZoom()) * blend(5),
            pitch: map.getPitch() + (FOLLOW_PITCH - map.getPitch()) * blend(5),
          }),
        })
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [map, puck])
}

// Punkt "meters" Meter in Richtung "heading" (Grad) weiter – für kurze Strecken genau genug
function moveBy([lon, lat]: LonLat, heading: number, meters: number): LonLat {
  const rad = (heading * Math.PI) / 180
  return [
    lon + (Math.sin(rad) * meters) / (111320 * Math.cos((lat * Math.PI) / 180)),
    lat + (Math.cos(rad) * meters) / 110540,
  ]
}
