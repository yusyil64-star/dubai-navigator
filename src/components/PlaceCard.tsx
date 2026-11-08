import { useTranslation } from 'react-i18next'
import type { Place } from '../services/geocoding'
import './PlaceCard.css'

type PlaceCardProps = { place: Place; onClose: () => void; onRoute: () => void }

// Zeigt den gewählten Ort im Bedienfeld an, mit Knopf für die Route.
export function PlaceCard({ place, onClose, onRoute }: PlaceCardProps) {
  const { t } = useTranslation()

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
      <button type="button" className="place-card__route" onClick={onRoute}>
        {t('route.button')}
      </button>
    </>
  )
}
