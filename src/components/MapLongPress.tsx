import { useEffect, useRef } from 'react'
import type { LngLat, Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from 'maplibre-gl'

const HOLD_MS = 550 // so lange gedrückt halten
const MOVE_TOLERANCE = 10 // px – mehr Bewegung = Karte verschieben, kein langes Drücken

type MapLongPressProps = { map: MapLibreMap; onPick: (lngLat: LngLat) => void }

// Lange auf die Karte drücken (Handy) oder Rechtsklick (PC) wählt diesen Punkt als Ort.
export function MapLongPress({ map, onPick }: MapLongPressProps) {
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  }, [onPick])

  useEffect(() => {
    let timer = 0
    let start: { x: number; y: number } | null = null
    let lastTouchPick = 0
    const cancel = () => {
      clearTimeout(timer)
      start = null
    }
    const onTouchStart = (event: MapTouchEvent) => {
      cancel()
      if (event.originalEvent.touches.length !== 1) return // zwei Finger = zoomen
      start = event.point
      const lngLat = event.lngLat
      timer = window.setTimeout(() => {
        start = null
        lastTouchPick = Date.now()
        navigator.vibrate?.(20) // kurze Rückmeldung, wo unterstützt
        pick.current(lngLat)
      }, HOLD_MS)
    }
    const onTouchMove = (event: MapTouchEvent) => {
      if (start && Math.hypot(event.point.x - start.x, event.point.y - start.y) > MOVE_TOLERANCE) cancel()
    }
    const onContextMenu = (event: MapMouseEvent) => {
      // auf dem Handy erledigt das der Timer (manche Handys melden zusätzlich einen Rechtsklick)
      if ((event.originalEvent as PointerEvent).pointerType === 'touch' || Date.now() - lastTouchPick < 1500) return
      pick.current(event.lngLat)
    }
    map.on('touchstart', onTouchStart)
    map.on('touchmove', onTouchMove)
    map.on('touchend', cancel)
    map.on('touchcancel', cancel)
    map.on('movestart', cancel)
    map.on('contextmenu', onContextMenu)
    return () => {
      cancel()
      map.off('touchstart', onTouchStart)
      map.off('touchmove', onTouchMove)
      map.off('touchend', cancel)
      map.off('touchcancel', cancel)
      map.off('movestart', cancel)
      map.off('contextmenu', onContextMenu)
    }
  }, [map])

  return null
}
