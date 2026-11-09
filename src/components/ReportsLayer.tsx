import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker, Popup, type Map as MapLibreMap } from 'maplibre-gl'
import { REPORT_ICONS, useReports, voteReport, type Report } from '../services/reports'
import { formatDuration } from '../utils/format'
import './Reports.css'

// Meldungen von Nutzern als kleine Symbole auf der Karte. Antippen: Details und "Noch da" / "Nicht mehr da".
export function ReportsLayer({ map, onNotice }: { map: MapLibreMap; onNotice: (key: string) => void }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const reports = useReports()
  const markers = useRef(new Map<string, Marker>())

  // aktuelle Texte für die Klick-Fenster, ohne alle Markierungen neu zu bauen
  const live = useRef({ t, language, onNotice })
  useEffect(() => {
    live.current = { t, language, onNotice }
  }, [t, language, onNotice])

  useEffect(() => {
    const current = markers.current
    const ids = new Set(reports.map((r) => r.id))
    // verschwundene Meldungen entfernen
    for (const [id, marker] of current) {
      if (!ids.has(id)) {
        marker.remove()
        current.delete(id)
      }
    }
    // neue hinzufügen
    for (const report of reports) {
      if (current.has(report.id)) continue
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `report-marker report-marker--${report.kind}`
      element.textContent = REPORT_ICONS[report.kind]
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        openDetails(report)
      })
      current.set(report.id, new Marker({ element }).setLngLat([report.lon, report.lat]).addTo(map))
    }

    function openDetails(report: Report) {
      const { t: tr, language: lang, onNotice: notice } = live.current
      const box = document.createElement('div')
      box.className = 'report-popup'
      const title = document.createElement('strong')
      title.textContent = `${REPORT_ICONS[report.kind]} ${tr(`reports.kinds.${report.kind}`)}`
      const info = document.createElement('span')
      // Alter der Meldung (beim Öffnen berechnet) und Bestätigungen
      const minutes = Math.max(1, Math.round((Date.now() - report.created) / 60_000))
      info.textContent = `${tr('reports.ago', { time: formatDuration(minutes * 60, lang) })} · ${tr('reports.confirmed', { count: report.up })}`
      const buttons = document.createElement('div')
      buttons.className = 'report-popup__buttons'
      const popup = new Popup({ closeButton: false, maxWidth: '260px', offset: 18 })
      for (const still of [true, false]) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = tr(still ? 'reports.still' : 'reports.gone')
        button.addEventListener('click', () => {
          popup.remove()
          voteReport(report.id, still)
            .then((counted) => notice(counted ? 'reports.thanks' : 'reports.already'))
            .catch(() => notice('reports.error'))
        })
        buttons.append(button)
      }
      box.append(title, info, buttons)
      popup.setLngLat([report.lon, report.lat]).setDOMContent(box).addTo(map)
    }
  }, [map, reports])

  // beim Verlassen alle Markierungen entfernen
  useEffect(() => {
    const current = markers.current
    return () => {
      current.forEach((marker) => marker.remove())
      current.clear()
    }
  }, [])

  return null
}
