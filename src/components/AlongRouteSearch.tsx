import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cumulativeDistances } from '../navigation/geo'
import { findAlongRoute, type Category, type PlaceAlongRoute } from '../services/categories'
import type { Place } from '../services/geocoding'
import type { Route } from '../services/routing'
import { formatDistance } from '../utils/format'

// Was man unterwegs typischerweise sucht
const ALONG_CATEGORIES: Category[] = ['fuel', 'charging', 'cafe', 'restaurant', 'supermarket', 'pharmacy', 'atm', 'mosque']

type AlongRouteSearchProps = {
  route: Route
  along: number // aktuelle Position auf der Route (Meter vom Start)
  onPick: (place: Place) => void
  onClose: () => void
}

// Unterwegs suchen: Orte einer Kategorie entlang der Route, die noch vor einem liegen.
export function AlongRouteSearch({ route, along, onPick, onClose }: AlongRouteSearchProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [category, setCategory] = useState<Category>('fuel')
  const [result, setResult] = useState<{ category: Category; places: PlaceAlongRoute[] } | null>(null)
  const cum = useMemo(() => cumulativeDistances(route.coordinates), [route])
  // Position nur beim Öffnen bzw. Kategoriewechsel verwenden, damit die Liste nicht dauernd springt
  const [startAlong] = useState(along)

  useEffect(() => {
    let cancelled = false
    findAlongRoute(category, route.coordinates, cum, startAlong, language, t(`categories.${category}`))
      .then((places) => !cancelled && setResult({ category, places }))
      .catch(() => !cancelled && setResult({ category, places: [] }))
    return () => {
      cancelled = true
    }
  }, [category, route, cum, startAlong, language, t])

  const places = result?.category === category ? result.places : null

  return (
    <div className="nav-search" role="dialog" aria-label={t('along.title')}>
      <div className="nav-search__header">
        <strong>{t('along.title')}</strong>
        <button type="button" className="place-card__close" onClick={onClose} aria-label={t('place.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="search-box__categories">
        {ALONG_CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={c === category} onClick={() => setCategory(c)}>
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>
      {!places && <p className="search-box__status">{t('search.loading')}</p>}
      {places?.length === 0 && <p className="search-box__status">{t('along.none')}</p>}
      {places && places.length > 0 && (
        <ul className="search-box__results">
          {places.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => onPick(place)}>
                <span className="search-box__name">{place.name}</span>
                <span className="search-box__detail">
                  {t('along.ahead', { distance: formatDistance(place.ahead, language) })}
                  {place.offset > 50 && ` · ${t('along.offset', { distance: formatDistance(place.offset, language) })}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="category-results__note">{t('along.note')}</p>
    </div>
  )
}
