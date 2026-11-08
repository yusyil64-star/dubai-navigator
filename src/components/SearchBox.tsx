import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchPlaces, type Place } from '../services/geocoding'
import './SearchBox.css'

const MIN_CHARS = 2
const DEBOUNCE_MS = 300 // erst suchen, wenn kurz nicht getippt wurde

type Status = 'idle' | 'loading' | 'done' | 'error'

// Suchfeld mit Vorschlagsliste. Meldet den gewählten Ort über onSelect.
export function SearchBox({ onSelect }: { onSelect: (place: Place) => void }) {
  const { t, i18n } = useTranslation()
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
