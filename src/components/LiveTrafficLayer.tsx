import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Popup, type GeoJSONSource, type Map as MapLibreMap, type MapLayerMouseEvent } from 'maplibre-gl'
import { routeLayerAnchor } from '../config/map'
import { TOMTOM_ATTRIBUTION, TOMTOM_KEY } from '../config/tomtom'
import { loadIncidents, type Incident } from '../services/incidents'
import { formatDuration } from '../utils/format'

const FLOW = 'traffic-flow'
const INCIDENTS = 'traffic-incidents'
const REFRESH_MS = 5 * 60_000 // Meldungen alle 5 Minuten neu laden (spart das Tageskontingent)
const ARABIC_SCRIPT = /[؀-ۿ]/

const KIND_COLORS: Record<Incident['kind'], string> = {
  accident: '#d32f2f',
  closed: '#7b1f1f',
  roadworks: '#e08a00',
  danger: '#c2185b',
  flooding: '#1e6fb8',
  brokenDown: '#6d4c41',
}

// Live-Verkehr von TomTom: Verkehrslage als farbige Straßen (grün → rot) und Meldungen als Punkte.
export function LiveTrafficLayer({ map, theme }: { map: MapLibreMap; theme: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'

  // Verkehrslage (Kartenkacheln, je nach Hell/Dunkel)
  useEffect(() => {
    if (!TOMTOM_KEY) return
    const style = theme === 'dark' ? 'relative0-dark' : 'relative0'
    map.addSource(FLOW, {
      type: 'raster',
      tiles: [`https://api.tomtom.com/traffic/map/4/tile/flow/${style}/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`],
      tileSize: 256,
      minzoom: 10, // weiter herausgezoomt keine Kacheln laden (spart das Tageskontingent)
      maxzoom: 18,
      attribution: TOMTOM_ATTRIBUTION,
    })
    // über den Straßen, aber unter Metro-Linien, Route und Beschriftungen
    const before = ['transit-lines', 'route-alternatives', 'route-casing'].find((id) => map.getLayer(id)) ?? routeLayerAnchor(map)
    map.addLayer({ id: FLOW, type: 'raster', source: FLOW, minzoom: 10, paint: { 'raster-opacity': 0.9 } }, before)
    return () => {
      if (map.getLayer(FLOW)) map.removeLayer(FLOW)
      if (map.getSource(FLOW)) map.removeSource(FLOW)
    }
  }, [map, theme])

  // Meldungen: Unfälle, Sperrungen, Baustellen …
  useEffect(() => {
    if (!TOMTOM_KEY) return
    map.addSource(INCIDENTS, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: TOMTOM_ATTRIBUTION })
    map.addLayer({
      id: `${INCIDENTS}-line`,
      type: 'line',
      source: INCIDENTS,
      filter: ['==', ['geometry-type'], 'LineString'],
      minzoom: 11,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 4,
        'line-dasharray': [1.5, 1],
        'line-opacity': 0.8,
      },
    })
    map.addLayer({
      id: INCIDENTS,
      type: 'circle',
      source: INCIDENTS,
      filter: ['==', ['geometry-type'], 'Point'],
      minzoom: 9,
      paint: {
        // Ring (weiß mit farbigem Rand) – so nicht mit den roten Blitzer-Punkten zu verwechseln
        'circle-color': '#ffffff',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 15, 7],
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 15, 4],
      },
    })

    const controller = new AbortController()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      loadIncidents(language, controller.signal)
        .then((incidents) => {
          map.getSource<GeoJSONSource>(INCIDENTS)?.setData({
            type: 'FeatureCollection',
            features: incidents.flatMap((incident) => {
              const properties = { ...incident, line: undefined, color: KIND_COLORS[incident.kind] }
              return [
                { type: 'Feature' as const, properties, geometry: { type: 'Point' as const, coordinates: incident.line[0] } },
                ...(incident.line.length > 1
                  ? [{ type: 'Feature' as const, properties, geometry: { type: 'LineString' as const, coordinates: incident.line } }]
                  : []),
              ]
            }),
          })
        })
        .catch(() => {}) // ohne Meldungen geht es auch (z. B. Tageskontingent aufgebraucht)
    }
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)

    // Antippen zeigt, was los ist
    const showDetails = (event: MapLayerMouseEvent) => {
      const p = event.features?.[0]?.properties
      if (!p) return
      const box = document.createElement('div')
      box.className = 'incident-popup'
      const title = document.createElement('strong')
      title.textContent = t(`incidents.${p.kind}`)
      box.append(title)
      const lines = [
        // TomTom-Beschreibung ohne Wiederholung des Titels ("Baustelle, Baustelle …")
        String(p.description).split(', ').filter((part) => part !== title.textContent).join(', '),
        // Straßennamen nur, wenn sie zur Sprache passen (in Dubai oft nur Arabisch)
        [p.from, p.to].filter((s: string) => s && (language === 'ar' || !ARABIC_SCRIPT.test(s))).join(' → '),
        p.delaySeconds ? t('incidents.delay', { time: formatDuration(Number(p.delaySeconds), language) }) : '',
      ]
      for (const text of lines.filter(Boolean)) {
        const line = document.createElement('span')
        line.textContent = text
        box.append(line)
      }
      new Popup({ closeButton: false, maxWidth: '260px' }).setLngLat(event.lngLat).setDOMContent(box).addTo(map)
    }
    const pointer = () => (map.getCanvas().style.cursor = 'pointer')
    const reset = () => (map.getCanvas().style.cursor = '')
    map.on('click', INCIDENTS, showDetails)
    map.on('mouseenter', INCIDENTS, pointer)
    map.on('mouseleave', INCIDENTS, reset)

    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      map.off('click', INCIDENTS, showDetails)
      map.off('mouseenter', INCIDENTS, pointer)
      map.off('mouseleave', INCIDENTS, reset)
      for (const id of [INCIDENTS, `${INCIDENTS}-line`]) if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(INCIDENTS)) map.removeSource(INCIDENTS)
    }
  }, [map, language, t])

  return null
}
