import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { findNearby, type Category, type NearbyPlace } from '../services/categories'
import type { Place } from '../services/geocoding'
import type { LonLat } from '../services/routing'
import { formatDistance } from '../utils/format'
import { PrayerTimesCard } from './PrayerTimesCard'
import './CategoryResults.css'

const SOURCE_ID = 'category-places'

type CategoryResultsProps = {
  map: MapLibreMap
  category: Category
  around: LonLat // in der Nähe von diesem Punkt suchen
  onSelect: (place: Place) => void
  onClose: () => void
}

// Liste der nächstgelegenen Orte einer Kategorie, zusätzlich als Punkte auf der Karte.
export function CategoryResults({ map, category, around, onSelect, onClose }: CategoryResultsProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const label = t(`categories.${category}`)
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    findNearby(category, around, language, label)
      .then((result) => !cancelled && setPlaces(result))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [category, around, language, label])

  // Treffer als Punkte auf der Karte
  useEffect(() => {
    if (!places) return
    const data = {
      type: 'FeatureCollection' as const,
      features: places.map((p) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      })),
    }
    const source = map.getSource<GeoJSONSource>(SOURCE_ID)
    if (source) source.setData(data)
    else {
      map.addSource(SOURCE_ID, { type: 'geojson', data })
      map.addLayer({
        id: SOURCE_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-color': '#b08d57',
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
    }
    return () => {
      if (map.getLayer(SOURCE_ID)) map.removeLayer(SOURCE_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, places])

  return (
    <div className="category-results">
      <div className="category-results__header">
        <h2>{label}</h2>
        <button type="button" className="place-card__close" onClick={onClose} aria-label={t('place.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {category === 'mosque' && <PrayerTimesCard around={around} />}
      {!places && !failed && <p className="search-box__status">{t('search.loading')}</p>}
      {failed && <p className="search-box__status">{t('search.error')}</p>}
      {places && (
        <ul className="search-box__results">
          {places.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => onSelect(place)}>
                <span className="search-box__name">{place.name}</span>
                <span className="search-box__detail">{formatDistance(place.distance, language)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="category-results__note">{t('categories.note')}</p>
    </div>
  )
}
