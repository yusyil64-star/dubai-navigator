import { useTranslation } from 'react-i18next'
import type { Place } from '../services/geocoding'
import './PlaceCard.css'

// Zeigt den gewählten Ort im Bedienfeld an.
export function PlaceCard({ place, onClose }: { place: Place; onClose: () => void }) {
  const { t } = useTranslation()

  return (
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
  )
}
