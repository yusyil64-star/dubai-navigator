import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadTollGates } from '../navigation/roadData'
import type { Route } from '../services/routing'
import { estimateSalik, type SalikEstimate } from '../services/salik'
import { currentTemperature } from '../services/weather'

const HOT_CELSIUS = 38 // ab hier zu Fuß/mit dem Fahrrad warnen

// Zusatzinfos zur Route: Salik-Maut (Auto) bzw. Hitze-Hinweis (zu Fuß / Fahrrad).
// departAt = geplante Abfahrt (Zeitstempel), sonst jetzt
export function RouteExtras({ route, departAt = null }: { route: Route; departAt?: number | null }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [salik, setSalik] = useState<SalikEstimate | null>(null)
  const [temperature, setTemperature] = useState<number | null>(null)

  useEffect(() => {
    if (route.profile !== 'car') return
    let cancelled = false
    loadTollGates()
      .then((gates) => !cancelled && setSalik(estimateSalik(route.coordinates, gates, new Date(departAt ?? Date.now()))))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [route.profile, route.coordinates, departAt])

  useEffect(() => {
    if (route.profile === 'car') return
    let cancelled = false
    currentTemperature(route.waypoints[0])
      .then((c) => !cancelled && setTemperature(c))
      .catch(() => {}) // ohne Wetterdaten einfach kein Hinweis
    return () => {
      cancelled = true
    }
  }, [route.profile, route.waypoints])

  if (route.profile === 'car') {
    if (!salik) return null
    if (salik.gates.length === 0) return <p className="route-extras">{t('salik.none')}</p>
    const money = new Intl.NumberFormat(language, { style: 'currency', currency: 'AED' }).format(salik.cost)
    return (
      <div className="route-extras">
        <p>
          <strong>{t('salik.title', { count: salik.gates.length })}</strong> ·{' '}
          {salik.period === 'free' ? t(departAt ? 'salik.freeThen' : 'salik.freeNow') : t(`salik.${salik.period}`, { cost: money })}
        </p>
        <p className="route-extras__small">{salik.gates.join(', ')}</p>
        <p className="route-extras__small">{t('salik.note')}</p>
      </div>
    )
  }

  if (temperature === null) return null
  const rounded = Math.round(temperature)
  return (
    <p className={temperature >= HOT_CELSIUS ? 'route-extras route-extras--hot' : 'route-extras'}>
      {temperature >= HOT_CELSIUS ? t('heat.warning', { temperature: rounded }) : t('heat.current', { temperature: rounded })}
    </p>
  )
}
