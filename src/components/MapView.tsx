import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre zeichnet die Karte mit einem Hintergrund-Helfer ("Worker").
// "?url" sorgt dafür, dass Vite die Datei mitliefert und uns ihre Adresse gibt.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import {
  DUBAI_BOUNDS,
  DUBAI_CENTER,
  MAP_COLOR_OVERRIDES,
  MAP_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  START_ZOOM,
  type PaintProperty,
} from '../config/map'
import './MapView.css'

setWorkerUrl(workerUrl)

// Zeigt die Vollbild-Karte von Dubai.
export function MapView() {
  // Das HTML-Element, in das MapLibre die Karte zeichnet
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DUBAI_CENTER,
      zoom: START_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: DUBAI_BOUNDS,
    })

    // Sobald der Kartenstil geladen ist: unsere eigenen Farben anwenden
    map.on('style.load', () => {
      for (const [layerId, paint] of Object.entries(MAP_COLOR_OVERRIDES)) {
        if (!map.getLayer(layerId)) continue // Ebene existiert nicht (mehr) – überspringen
        for (const [property, color] of Object.entries(paint)) {
          map.setPaintProperty(layerId, property as PaintProperty, color)
        }
      }
    })

    // Zoom-Knöpfe und Kompass (zum Zurückdrehen nach Norden)
    map.addControl(new NavigationControl(), 'bottom-right')

    // Aufräumen, wenn die Komponente verschwindet
    return () => map.remove()
  }, [])

  return <div ref={containerRef} className="map-view" />
}
