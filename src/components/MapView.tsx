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
  MAP_COLOR_OVERRIDES_DARK,
  MAP_STYLE_URL,
  MAP_STYLE_URL_DARK,
  MAX_ZOOM,
  MIN_ZOOM,
  routeLayerAnchorIn,
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

// Eigene Ebenen der App, die beim Wechsel Hell/Dunkel erhalten bleiben sollen
const APP_SOURCES = ['route', 'route-alternatives', 'speed-cameras', 'category-places']

type Theme = 'light' | 'dark'
const STYLES: Record<Theme, string> = { light: MAP_STYLE_URL, dark: MAP_STYLE_URL_DARK }
const OVERRIDES = { light: MAP_COLOR_OVERRIDES, dark: MAP_COLOR_OVERRIDES_DARK }

type MapViewProps = {
  // Hell oder dunkel (Nachtmodus)
  theme: Theme
  // Meldet einen Hinweis (Übersetzungsschlüssel), z. B. wenn der Standort nicht erlaubt ist
  onNotice: (key: string) => void
  // Gibt die fertige Karte nach außen, damit andere Teile (Suche, Route) sie nutzen können
  onMapReady: (map: MapLibreMap) => void
  // Meldet den eigenen GPS-Standort [Längengrad, Breitengrad], sobald er bekannt ist
  onLocation: (position: [number, number]) => void
}

// Zeigt die Vollbild-Karte von Dubai.
export function MapView({ theme, onNotice, onMapReady, onLocation }: MapViewProps) {
  // Das HTML-Element, in das MapLibre die Karte zeichnet
  const containerRef = useRef<HTMLDivElement>(null)
  // Immer die aktuellen Funktionen verwenden, ohne die Karte neu zu erstellen
  const callbacks = useRef({ onNotice, onMapReady, onLocation })
  const mapRef = useRef<MapLibreMap | null>(null)
  const themeRef = useRef(theme) // Thema, mit dem die Karte erstellt wurde bzw. zuletzt gewechselt hat
  useEffect(() => {
    callbacks.current = { onNotice, onMapReady, onLocation }
  })

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLES[themeRef.current],
      center: DUBAI_CENTER,
      zoom: START_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: DUBAI_BOUNDS,
    })

    // Sobald der Kartenstil geladen ist: unsere eigenen Farben anwenden
    map.on('style.load', () => {
      for (const [layerId, paint] of Object.entries(OVERRIDES[themeRef.current])) {
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
    mapRef.current = map

    // Aufräumen, wenn die Komponente verschwindet
    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  // Hell/Dunkel gewechselt: neuen Kartenstil laden und die eigenen Ebenen mitnehmen
  useEffect(() => {
    const map = mapRef.current
    if (!map || themeRef.current === theme) return
    themeRef.current = theme
    map.setStyle(STYLES[theme], {
      transformStyle: (previous, next) => {
        if (!previous) return next
        const sources = { ...next.sources }
        for (const id of APP_SOURCES) if (previous.sources[id]) sources[id] = previous.sources[id]
        const appLayers = previous.layers.filter((l) => 'source' in l && APP_SOURCES.includes(l.source))
        // Routen wieder über den Straßen, aber unter den Straßennamen einfügen; Punkte ganz oben
        const isRoute = (l: (typeof appLayers)[number]) => 'source' in l && l.source.startsWith('route')
        const anchor = routeLayerAnchorIn(next.layers)
        const at = anchor ? next.layers.findIndex((l) => l.id === anchor) : next.layers.length
        const layers = [...next.layers]
        layers.splice(at, 0, ...appLayers.filter(isRoute))
        return { ...next, sources, layers: [...layers, ...appLayers.filter((l) => !isRoute(l))] }
      },
    })
  }, [theme])

  return <div ref={containerRef} className="map-view" />
}
