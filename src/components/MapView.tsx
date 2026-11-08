import { useEffect, useRef } from 'react'
import {
  GeolocateControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
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

// Fehlercodes der Standort-Abfrage des Browsers → Übersetzungsschlüssel der Meldung
const LOCATION_ERRORS: Record<number, string> = {
  1: 'location.denied', // Erlaubnis verweigert
  2: 'location.unavailable', // Position nicht ermittelbar
  3: 'location.timeout', // Zeitüberschreitung
}

type MapViewProps = {
  // Meldet einen Hinweis (Übersetzungsschlüssel), z. B. wenn der Standort nicht erlaubt ist
  onNotice: (key: string) => void
  // Gibt die fertige Karte nach außen, damit andere Teile (Suche, Route) sie nutzen können
  onMapReady: (map: MapLibreMap) => void
  // Meldet den eigenen GPS-Standort [Längengrad, Breitengrad], sobald er bekannt ist
  onLocation: (position: [number, number]) => void
}

// Zeigt die Vollbild-Karte von Dubai.
export function MapView({ onNotice, onMapReady, onLocation }: MapViewProps) {
  // Das HTML-Element, in das MapLibre die Karte zeichnet
  const containerRef = useRef<HTMLDivElement>(null)
  // Immer die aktuellen Funktionen verwenden, ohne die Karte neu zu erstellen
  const callbacks = useRef({ onNotice, onMapReady, onLocation })
  useEffect(() => {
    callbacks.current = { onNotice, onMapReady, onLocation }
  })

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

    // Standort-Knopf: zeigt die eigene Position als Punkt und folgt ihr
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    })
    geolocate.on('error', (e) => {
      callbacks.current.onNotice(LOCATION_ERRORS[e.code] ?? 'location.unavailable')
    })
    geolocate.on('geolocate', (e) => {
      callbacks.current.onLocation([e.coords.longitude, e.coords.latitude])
    })
    geolocate.on('outofmaxbounds', () => {
      callbacks.current.onNotice('location.outsideDubai')
    })

    map.addControl(geolocate, 'bottom-right')
    // Zoom-Knöpfe und Kompass (zum Zurückdrehen nach Norden)
    map.addControl(new NavigationControl(), 'bottom-right')

    map.once('load', () => callbacks.current.onMapReady(map))

    // Aufräumen, wenn die Komponente verschwindet
    return () => map.remove()
  }, [])

  return <div ref={containerRef} className="map-view" />
}
