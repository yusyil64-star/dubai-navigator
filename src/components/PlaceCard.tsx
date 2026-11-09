import { useTranslation } from 'react-i18next'
import { toggleFavorite, toggleHome, toggleWork, useSavedPlaces } from '../places'
import type { Place } from '../services/geocoding'
import { sharePlace } from '../utils/share'
import { TransitDepartures } from './TransitDepartures'
import './PlaceCard.css'

type PlaceCardProps = {
  place: Place
  onClose: () => void
  onRoute: () => void
  onNotice: (key: string) => void // kurze Meldung, z. B. "Link kopiert"
}

// Zeigt den gewählten Ort im Bedienfeld an: Merken (Favorit/Zuhause/Arbeit) und Route.
export function PlaceCard({ place, onClose, onRoute, onNotice }: PlaceCardProps) {
  const { t } = useTranslation()
  const saved = useSavedPlaces()
  const favorite = saved.favorites.some((p) => p.id === place.id)

  return (
    <>
      <div className="place-card">
        <div className="place-card__text">
          <h2 className="place-card__name">{place.name}</h2>
          {place.detail && <p className="place-card__detail">{place.detail}</p>}
        </div>
        <button type="button" className="place-card__close" onClick={onClose} aria-label={t('place.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="place-card__save">
        <button type="button" aria-pressed={favorite} onClick={() => toggleFavorite(place)}>
          {favorite ? '★' : '☆'} {t('saved.favorite')}
        </button>
        <button type="button" aria-pressed={saved.home?.id === place.id} onClick={() => toggleHome(place)}>
          {t('saved.home')}
        </button>
        <button type="button" aria-pressed={saved.work?.id === place.id} onClick={() => toggleWork(place)}>
          {t('saved.work')}
        </button>
        <button
          type="button"
          onClick={async () => {
            const result = await sharePlace(place)
            if (result === 'copied' || result === 'failed') onNotice(`share.${result}`)
          }}
        >
          {t('share.button')}
        </button>
      </div>

      <button type="button" className="place-card__route" onClick={onRoute}>
        {t('route.button')}
      </button>

      <TransitDepartures place={place} />
    </>
  )
}
