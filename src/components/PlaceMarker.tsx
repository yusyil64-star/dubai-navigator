import { useEffect } from 'react'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { Place } from '../services/geocoding'

const FOCUS_ZOOM = 15

// Setzt eine Markierung auf den gewählten Ort und fliegt dorthin.
// Zeichnet selbst nichts in React – nur auf der Karte.
export function PlaceMarker({ map, place }: { map: MapLibreMap; place: Place }) {
  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-accent')
    const marker = new Marker({ color: color.trim() || undefined })
      .setLngLat([place.lon, place.lat])
      .addTo(map)
    map.flyTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM) })
    return () => {
      marker.remove()
    }
  }, [map, place])

  return null
}
