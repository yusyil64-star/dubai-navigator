import { useEffect } from 'react'
import { LngLatBounds, Marker, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { routeLayerAnchor } from '../config/map'
import type { LonLat } from '../services/routing'

const SOURCE_ID = 'route'
const ROUTE_COLOR = '#2b7a8c' // ruhiges Golf-Türkis, gut sichtbar auf der hellen Karte

// Abstand der Route zum Bildschirmrand, damit Bedienfeld und Kopfzeile sie nicht verdecken
function fitPadding() {
  if (window.innerWidth < 768) return { top: 90, bottom: 260, left: 40, right: 40 }
  const rtl = document.documentElement.dir === 'rtl' // Bedienfeld rechts statt links
  return { top: 90, bottom: 60, left: rtl ? 80 : 450, right: rtl ? 450 : 80 }
}

// Zeichnet die Route als Linie (mit weißem Rand) und einen Punkt am Start.
// fit = ganze Route ins Bild holen (während der Navigation aus, dort folgt die Karte der Position).
type RouteLineProps = { map: MapLibreMap; coordinates: LonLat[]; fit?: boolean; stops?: LonLat[] }

export function RouteLine({ map, coordinates, fit = true, stops = [] }: RouteLineProps) {
  // Zwischenstopps als nummerierte Punkte (Text-Schlüssel, damit nur bei echten Änderungen neu gezeichnet wird)
  const stopsKey = JSON.stringify(stops)
  useEffect(() => {
    const markers = (JSON.parse(stopsKey) as LonLat[]).map((point, i) => {
      const element = document.createElement('div')
      element.className = 'route-stop-dot'
      element.textContent = String(i + 1)
      return new Marker({ element }).setLngLat(point).addTo(map)
    })
    return () => markers.forEach((m) => m.remove())
  }, [map, stopsKey])

  useEffect(() => {
    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    }

    const source = map.getSource<GeoJSONSource>(SOURCE_ID)
    if (source) {
      source.setData(data)
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data })
      // Unter den Beschriftungen einfügen, damit Straßennamen lesbar bleiben
      const firstLabel = routeLayerAnchor(map)
      const line = { 'line-join': 'round', 'line-cap': 'round' } as const
      map.addLayer(
        { id: 'route-casing', type: 'line', source: SOURCE_ID, layout: line, paint: { 'line-color': '#ffffff', 'line-width': 10 } },
        firstLabel,
      )
      map.addLayer(
        { id: 'route-line', type: 'line', source: SOURCE_ID, layout: line, paint: { 'line-color': ROUTE_COLOR, 'line-width': 6 } },
        firstLabel,
      )
    }

    // Startpunkt als kleiner Kreis
    const startDot = document.createElement('div')
    startDot.className = 'route-start-dot'
    const startMarker = new Marker({ element: startDot }).setLngLat(coordinates[0]).addTo(map)

    // Ganze Route ins Bild holen
    if (fit) {
      const bounds = coordinates.reduce(
        (b, point) => b.extend(point),
        new LngLatBounds(coordinates[0], coordinates[0]),
      )
      map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 16 })
    }

    return () => {
      startMarker.remove()
      if (map.getLayer('route-line')) map.removeLayer('route-line')
      if (map.getLayer('route-casing')) map.removeLayer('route-casing')
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, coordinates, fit])

  return null
}
