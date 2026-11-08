import { useEffect } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { loadSpeedCameras } from '../navigation/roadData'

const SOURCE_ID = 'speed-cameras'
const LAYER_ID = 'speed-cameras'

// Zeigt feste Blitzer aus OpenStreetMap als rote Punkte (ab mittlerer Zoomstufe).
export function SpeedCameraLayer({ map }: { map: MapLibreMap }) {
  useEffect(() => {
    let cancelled = false
    loadSpeedCameras()
      .then((cameras) => {
        if (cancelled || map.getSource(SOURCE_ID)) return
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: cameras.map((c) => ({
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: c.position },
            })),
          },
        })
        map.addLayer({
          id: LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          minzoom: 11,
          paint: {
            'circle-color': '#d32f2f',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        })
      })
      .catch(() => {}) // ohne Blitzer-Daten funktioniert die Karte trotzdem
    return () => {
      cancelled = true
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  return null
}
