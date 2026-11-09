import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PARKED_ID, setParked, useSavedPlaces, type ParkedCar } from '../places'
import { CATEGORIES, type Category } from '../services/categories'
import { searchPlaces, type Place } from '../services/geocoding'
import type { LonLat } from '../services/routing'
import { formatClock } from '../utils/format'
import './SearchBox.css'

const MIN_CHARS = 2
const DEBOUNCE_MS = 300 // erst suchen, wenn kurz nicht getippt wurde

type Status = 'idle' | 'loading' | 'done' | 'error'

type SearchBoxProps = {
  onSelect: (place: Place) => void
  // Falls gesetzt: Kategorie-Knöpfe (Tankstelle, Apotheke, …) anzeigen
  onCategory?: (category: Category) => void
  // Falls gesetzt: "Parkplatz hier merken" mit diesem Standort anbieten
  userLocation?: LonLat | null
}

// Suchfeld mit Vorschlagsliste. Ohne Eingabe: Kategorien, Zuhause/Arbeit, Favoriten, Verlauf.
export function SearchBox({ onSelect, onCategory, userLocation }: SearchBoxProps) {
  const { t, i18n } = useTranslation()
  const saved = useSavedPlaces()
  const homeAndWork = [
    { place: saved.home, label: t('saved.home') },
    { place: saved.work, label: t('saved.work') },
  ].filter((entry): entry is { place: Place; label: string } => entry.place !== null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const text = query.trim()
    if (text.length < MIN_CHARS) return

    // Verzögert suchen; ältere, noch laufende Anfragen abbrechen
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('loading')
      try {
        const places = await searchPlaces(text, i18n.resolvedLanguage ?? 'en', controller.signal)
        setResults(places)
        setStatus('done')
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, i18n.resolvedLanguage])

  function handleChange(value: string) {
    setQuery(value)
    if (value.trim().length < MIN_CHARS) {
      setResults([])
      setStatus('idle')
    }
  }

  function select(place: Place) {
    onSelect(place)
    setQuery('')
    setResults([])
    setStatus('idle')
  }

  return (
    <div className="search-box">
      <div className="search-box__field">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      {status === 'loading' && <p className="search-box__status">{t('search.loading')}</p>}
      {status === 'error' && <p className="search-box__status">{t('search.error')}</p>}
      {status === 'done' && results.length === 0 && (
        <p className="search-box__status">{t('search.noResults')}</p>
      )}

      {query.trim().length < MIN_CHARS && (
        <>
          {onCategory && (
            <div className="search-box__categories" role="group" aria-label={t('categories.label')}>
              {CATEGORIES.map((category) => (
                <button key={category} type="button" onClick={() => onCategory(category)}>
                  {t(`categories.${category}`)}
                </button>
              ))}
            </div>
          )}
          {onCategory && (
            <ParkingEntry
              parked={saved.parked}
              userLocation={userLocation ?? null}
              language={i18n.resolvedLanguage ?? 'en'}
              onSelect={select}
            />
          )}
          <QuickList
            title={null}
            places={homeAndWork.map((entry) => entry.place)}
            labels={homeAndWork.map((entry) => entry.label)}
            onSelect={select}
          />
          <QuickList title={t('saved.favorites')} places={saved.favorites} onSelect={select} />
          <QuickList title={t('saved.recents')} places={saved.recents} onSelect={select} />
        </>
      )}

      {results.length > 0 && (
        <ul className="search-box__results">
          {results.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => select(place)}>
                <span className="search-box__name">{place.name}</span>
                {place.detail && <span className="search-box__detail">{place.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type QuickListProps = {
  title: string | null
  places: Place[]
  labels?: string[] // optionale Beschriftung je Ort, z. B. "Zuhause"
  onSelect: (place: Place) => void
}

// Kurze Liste gespeicherter Orte (Zuhause/Arbeit, Favoriten, zuletzt gesucht)
function QuickList({ title, places, labels, onSelect }: QuickListProps) {
  if (places.length === 0) return null
  return (
    <>
      {title && <h3 className="search-box__heading">{title}</h3>}
      <ul className="search-box__results">
        {places.map((place, i) => (
          <li key={`${place.id}-${i}`}>
            <button type="button" onClick={() => onSelect(place)}>
              <span className="search-box__name">{labels?.[i] ?? place.name}</span>
              <span className="search-box__detail">{labels?.[i] ? place.name : place.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

type ParkingEntryProps = {
  parked: ParkedCar | null
  userLocation: LonLat | null
  language: string
  onSelect: (place: Place) => void
}

// "Mein Auto" (wenn ein Parkplatz gemerkt ist) oder "Parkplatz hier merken" (wenn der Standort bekannt ist)
function ParkingEntry({ parked, userLocation, language, onSelect }: ParkingEntryProps) {
  const { t } = useTranslation()
  if (parked) {
    const place: Place = {
      id: PARKED_ID,
      name: t('parking.car'),
      detail: t('parking.since', { time: formatClock(new Date(parked.savedAt), language) }),
      lon: parked.lon,
      lat: parked.lat,
    }
    return (
      <ul className="search-box__results">
        <li className="search-box__parking">
          <button type="button" onClick={() => onSelect(place)}>
            <span className="search-box__name">{place.name}</span>
            <span className="search-box__detail">{place.detail}</span>
          </button>
          <button
            type="button"
            className="search-box__forget"
            onClick={() => setParked(null)}
            aria-label={t('parking.forget')}
          >
            ×
          </button>
        </li>
      </ul>
    )
  }
  if (!userLocation) return null
  return (
    <button type="button" className="search-box__park" onClick={() => setParked(userLocation)}>
      + {t('parking.saveHere')}
    </button>
  )
}
