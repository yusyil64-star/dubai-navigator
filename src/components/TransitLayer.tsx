import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { routeLayerAnchor } from '../config/map'

const BASE = `${import.meta.env.BASE_URL}data/transit/`
const LINES = 'transit-lines'
const STATIONS = 'transit-stations'

// Metro- und Tram-Linien in ihren Farben plus Stationen (Daten: RTA-Fahrplan, siehe fetch-transit-data).
export function TransitLayer({ map }: { map: MapLibreMap }) {
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`${BASE}lines.json`).then((r) => r.json()),
      fetch(`${BASE}stations.json`).then((r) => r.json() as Promise<{ stations: [string, string, string, number, number][] }>),
    ])
      .then(([lines, { stations }]) => {
        if (cancelled || map.getSource(LINES)) return
        const anchor = routeLayerAnchor(map) // über den Straßen, unter den Namen und der Route
        map.addSource(LINES, { type: 'geojson', data: lines })
        map.addLayer(
          {
            id: LINES,
            type: 'line',
            source: LINES,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 5],
              'line-opacity': 0.85,
            },
          },
          map.getLayer('route-alternatives') ? 'route-alternatives' : map.getLayer('route-casing') ? 'route-casing' : anchor,
        )
        map.addSource(STATIONS, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: stations.map(([id, name, , lon, lat]) => ({
              type: 'Feature',
              properties: { id, name },
              geometry: { type: 'Point', coordinates: [lon, lat] },
            })),
          },
        })
        map.addLayer({
          id: STATIONS,
          type: 'circle',
          source: STATIONS,
          minzoom: 11,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 15, 5],
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3a3a3a',
            'circle-stroke-width': 1.5,
          },
        })
      })
      .catch(() => {}) // ohne Daten keine Linien – die Karte funktioniert trotzdem
    return () => {
      cancelled = true
      for (const id of [STATIONS, LINES]) {
        if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      }
    }
  }, [map])

  return null
}
