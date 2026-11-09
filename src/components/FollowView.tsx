import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LngLatBounds, Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { sheetOffset, sheetPadding } from '../config/map'
import { loadShare, type FollowedShare } from '../services/liveShare'
import { formatClock, formatDuration } from '../utils/format'
import './FollowView.css'

const REFRESH_MS = 10_000

type FollowViewProps = { map: MapLibreMap; id: string; onClose: () => void }

// Seite für den Empfänger eines Live-Standort-Links: Wo ist die Person gerade, wann kommt sie an?
export function FollowView({ map, id, onClose }: FollowViewProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [share, setShare] = useState<FollowedShare | 'gone' | null>(null)
  const [now, setNow] = useState(0) // Zeitpunkt des letzten Abrufs (für "vor 1 Min.")

  // Alle 10 Sekunden den neuesten Stand holen
  useEffect(() => {
    const controller = new AbortController()
    const refresh = () => {
      loadShare(id, controller.signal)
        .then((result) => {
          setShare(result ?? 'gone')
          setNow(Date.now())
        })
        .catch(() => {}) // kurz keine Verbindung: alten Stand behalten
    }
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [id])

  // Markierungen: Person (Pfeil) und Ziel
  const person = useRef<Marker | null>(null)
  const target = useRef<Marker | null>(null)
  const fitted = useRef(false)
  useEffect(() => {
    if (!share || share === 'gone') return
    if (!person.current) {
      const element = document.createElement('div')
      element.className = 'follow-person'
      element.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l7 19-7-4-7 4z"/></svg>'
      person.current = new Marker({ element, rotationAlignment: 'map' }).setLngLat(share.position).addTo(map)
      target.current = new Marker({ color: '#b08d57' }).setLngLat(share.destination).addTo(map)
    }
    // sanft zur neuen Position gleiten (statt alle 10 Sekunden zu springen)
    const marker = person.current
    const from = marker.getLngLat()
    const [toLon, toLat] = share.position
    const start = performance.now()
    let frame = 0
    const step = (time: number) => {
      const k = Math.min(1, (time - start) / 1500)
      marker.setLngLat([from.lng + (toLon - from.lng) * k, from.lat + (toLat - from.lat) * k])
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    marker.setRotation(share.heading ?? 0)
    // beim ersten Mal Person und Ziel ins Bild holen; danach mitgehen, wenn die Person aus dem Bild fährt
    if (!fitted.current) {
      fitted.current = true
      map.fitBounds(new LngLatBounds(share.position, share.position).extend(share.destination), {
        padding: sheetPadding(),
        maxZoom: 15,
      })
    } else {
      const point = map.project(share.position)
      const padding = sheetPadding()
      const canvas = map.getCanvas()
      const visible =
        point.x > padding.left &&
        point.x < canvas.clientWidth - padding.right &&
        point.y > padding.top &&
        point.y < canvas.clientHeight - padding.bottom
      if (!visible) map.easeTo({ center: share.position, offset: sheetOffset(), duration: 1200 })
    }
    return () => cancelAnimationFrame(frame)
  }, [map, share])

  useEffect(
    () => () => {
      person.current?.remove()
      target.current?.remove()
    },
    [],
  )

  return (
    <div className="follow">
      <div className="place-card">
        <div className="place-card__text">
          <h2 className="place-card__name">{t('follow.title')}</h2>
          {share && share !== 'gone' && <p className="place-card__detail">{t('follow.to', { place: share.destName })}</p>}
        </div>
        <button type="button" className="place-card__close" onClick={onClose} aria-label={t('place.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {share === null && <p className="follow__status">{t('search.loading')}</p>}
      {share === 'gone' && <p className="follow__status">{t('follow.gone')}</p>}
      {share && share !== 'gone' && (
        <>
          {share.ended ? (
            <p className="follow__eta">{t('follow.ended')}</p>
          ) : (
            share.eta && (
              <p className="follow__eta">
                <strong>{t('follow.arrival', { time: formatClock(new Date(share.eta), language) })}</strong>
                {share.eta > now && <span> · {t('follow.remaining', { time: formatDuration((share.eta - now) / 1000, language) })}</span>}
              </p>
            )
          )}
          <p className="follow__status">
            {t('follow.updated', { time: formatDuration(Math.max(60, (now - share.updated) / 1000), language) })}
          </p>
        </>
      )}
    </div>
  )
}
