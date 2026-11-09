import { useEffect, useRef } from 'react'
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { routeLayerAnchor } from '../config/map'
import type { Route } from '../services/routing'

const SOURCE_ID = 'route-alternatives'
const LAYER_ID = 'route-alternatives'
const TAP_TOLERANCE = 14 // px um den Tippunkt

type AlternativeRoutesProps = {
  map: MapLibreMap
  routes: Route[]
  selected: number
  onSelect: (index: number) => void
}

// Die nicht gewählten Routen als graue Linien unter der gewählten. Antippen wählt sie aus.
export function AlternativeRoutes({ map, routes, selected, onSelect }: AlternativeRoutesProps) {
  // aktuelle Auswahl-Funktion, ohne den Klick-Handler neu anzumelden
  const select = useRef(onSelect)
  useEffect(() => {
    select.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const data = {
      type: 'FeatureCollection' as const,
      features: routes
        .map((route, index) => ({
          type: 'Feature' as const,
          properties: { index },
          geometry: { type: 'LineString' as const, coordinates: route.coordinates },
        }))
        .filter((feature) => feature.properties.index !== selected),
    }
    const source = map.getSource<GeoJSONSource>(SOURCE_ID)
    if (source) source.setData(data)
    else {
      map.addSource(SOURCE_ID, { type: 'geojson', data })
      // unter der gewählten Route, sonst unter den Beschriftungen
      const before = map.getLayer('route-casing')
        ? 'route-casing'
        : routeLayerAnchor(map)
      map.addLayer(
        {
          id: LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#9aa3a8', 'line-width': 6, 'line-opacity': 0.85 },
        },
        before,
      )
    }
  }, [map, routes, selected])

  useEffect(() => {
    // Großzügiger Tippbereich um die Linie, damit sie auch mit dem Finger leicht zu treffen ist
    const onClick = (event: MapMouseEvent) => {
      if (!map.getLayer(LAYER_ID)) return
      const { x, y } = event.point
      const [feature] = map.queryRenderedFeatures(
        [
          [x - TAP_TOLERANCE, y - TAP_TOLERANCE],
          [x + TAP_TOLERANCE, y + TAP_TOLERANCE],
        ],
        { layers: [LAYER_ID] },
      )
      const index = feature?.properties?.index
      if (typeof index === 'number') select.current(index)
    }
    const pointer = () => (map.getCanvas().style.cursor = 'pointer')
    const reset = () => (map.getCanvas().style.cursor = '')
    map.on('click', onClick)
    map.on('mouseenter', LAYER_ID, pointer)
    map.on('mouseleave', LAYER_ID, reset)
    return () => {
      map.off('click', onClick)
      map.off('mouseenter', LAYER_ID, pointer)
      map.off('mouseleave', LAYER_ID, reset)
      reset()
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  return null
}
