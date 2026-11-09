import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PARKED_ID, removeRecent, setParked, useSavedPlaces, type ParkedCar } from '../places'
import { CATEGORIES, type Category } from '../services/categories'
import { searchPlaces, type Place } from '../services/geocoding'
import { listen, speechInputSupported } from '../services/speechInput'
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
  // Falls gesetzt: Knopf "Fahrmodus" (ohne Ziel) anzeigen
  onDrive?: () => void
}

// Suchfeld mit Vorschlagsliste. Ohne Eingabe: Kategorien, Zuhause/Arbeit, Favoriten, Verlauf.
export function SearchBox({ onSelect, onCategory, userLocation, onDrive }: SearchBoxProps) {
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

  // Sprachsuche: Gesprochenes landet im Suchfeld (und wird wie getippt gesucht)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopListening = useRef<(() => void) | null>(null)
  useEffect(() => () => stopListening.current?.(), [])
  function toggleListening() {
    if (listening) {
      stopListening.current?.()
      return
    }
    setMicError(null)
    setListening(true)
    stopListening.current = listen(i18n.resolvedLanguage ?? 'en', handleChange, (error) => {
      setListening(false)
      stopListening.current = null
      if (error === 'not-allowed' || error === 'service-not-allowed') setMicError('search.micDenied')
      else if (error && error !== 'aborted' && error !== 'no-speech') setMicError('search.micError')
    })
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
        {speechInputSupported() && (
          <button
            type="button"
            className={listening ? 'search-box__mic is-listening' : 'search-box__mic'}
            onClick={toggleListening}
            aria-pressed={listening}
            aria-label={t(listening ? 'search.micStop' : 'search.mic')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
          </button>
        )}
      </div>
      {listening && <p className="search-box__status">{t('search.listening')}</p>}
      {micError && <p className="search-box__status">{t(micError)}</p>}

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
          {onDrive && (
            <button type="button" className="search-box__drive" onClick={onDrive}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 11l2-5h10l2 5v6h-2v2h-3v-2H10v2H7v-2H5zM7.5 15a1.5 1.5 0 1 0 0-.01M16.5 15a1.5 1.5 0 1 0 0-.01M7 11h10l-1.3-3H8.3z" />
              </svg>
              {t('drive.start')}
            </button>
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
          <QuickList title={t('saved.recents')} places={saved.recents} onSelect={select} onRemove={removeRecent} />
          {onCategory && <p className="search-box__status">{t('pin.hint')}</p>}
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
  onRemove?: (place: Place) => void // falls gesetzt: ×-Knopf je Eintrag
}

// Kurze Liste gespeicherter Orte (Zuhause/Arbeit, Favoriten, zuletzt gesucht)
function QuickList({ title, places, labels, onSelect, onRemove }: QuickListProps) {
  const { t } = useTranslation()
  if (places.length === 0) return null
  return (
    <>
      {title && <h3 className="search-box__heading">{title}</h3>}
      <ul className="search-box__results">
        {places.map((place, i) => (
          <li key={`${place.id}-${i}`} className={onRemove ? 'search-box__removable' : undefined}>
            <button type="button" onClick={() => onSelect(place)}>
              <span className="search-box__name">{labels?.[i] ?? place.name}</span>
              <span className="search-box__detail">{labels?.[i] ? place.name : place.detail}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                className="search-box__forget"
                onClick={() => onRemove(place)}
                aria-label={t('saved.remove', { name: place.name })}
              >
                ×
              </button>
            )}
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
        <li className="search-box__removable">
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
