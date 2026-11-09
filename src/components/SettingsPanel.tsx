import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasLiveTraffic } from '../config/tomtom'
import { LANGUAGES, setLanguage } from '../i18n'
import { clearPersonalData } from '../places'
import { updateSettings, useSettings, type Settings } from '../settings'
import { VoicePicker } from './VoicePicker'
import './SettingsPanel.css'

// Einstellungen: Sprache, Ansagen, Blitzer, Erscheinungsbild, persönliche Daten, Datenquellen.
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const settings = useSettings()
  const [confirmClear, setConfirmClear] = useState(false)
  const [cleared, setCleared] = useState(false)

  const themes: Settings['theme'][] = ['auto', 'sun', 'light', 'dark']
  const SPEED_WARNINGS: Settings['speedWarning'][] = [null, 0, 5, 10]
  const MAP_VIEWS: Settings['mapView'][] = ['3d', '2d', 'north']
  const SOUNDS: Settings['sound'][] = ['all', 'alerts', 'off']

  return (
    <div className="settings">
      <div className="settings__header">
        <h2>{t('settings.title')}</h2>
        <button type="button" className="place-card__close" onClick={onClose} aria-label={t('place.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <section>
        <h3>{t('language.label')}</h3>
        <div className="settings__choice">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={i18n.resolvedLanguage === code}
              onClick={() => setLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>{t('settings.theme')}</h3>
        <div className="settings__choice">
          {themes.map((theme) => (
            <button
              key={theme}
              type="button"
              aria-pressed={settings.theme === theme}
              onClick={() => updateSettings({ theme })}
            >
              {t(`settings.themes.${theme}`)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>{t('settings.voice')}</h3>
        <div className="settings__choice">
          {SOUNDS.map((sound) => (
            <button
              key={sound}
              type="button"
              aria-pressed={settings.sound === sound}
              onClick={() => updateSettings({ sound })}
            >
              {t(`settings.sounds.${sound}`)}
            </button>
          ))}
        </div>
        {settings.sound !== 'off' && <VoicePicker />}
        <label className="settings__toggle">
          <span>{t('settings.speedCameras')}</span>
          <input
            type="checkbox"
            checked={settings.speedCameras}
            onChange={(e) => updateSettings({ speedCameras: e.target.checked })}
          />
        </label>
        <p className="settings__note">{t('settings.speedCamerasNote')}</p>
      </section>

      <section>
        <h3>{t('settings.mapView')}</h3>
        <div className="settings__choice">
          {MAP_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={settings.mapView === view}
              onClick={() => updateSettings({ mapView: view })}
            >
              {t(`settings.mapViews.${view}`)}
            </button>
          ))}
        </div>
        {hasLiveTraffic && (
          <label className="settings__toggle">
            <span>{t('settings.liveTraffic')}</span>
            <input
              type="checkbox"
              checked={settings.liveTraffic}
              onChange={(e) => updateSettings({ liveTraffic: e.target.checked })}
            />
          </label>
        )}
        <label className="settings__toggle">
          <span>{t('settings.transitLayer')}</span>
          <input
            type="checkbox"
            checked={settings.transitLayer}
            onChange={(e) => updateSettings({ transitLayer: e.target.checked })}
          />
        </label>
        <label className="settings__toggle">
          <span>{t('settings.autoZoom')}</span>
          <input
            type="checkbox"
            checked={settings.autoZoom}
            onChange={(e) => updateSettings({ autoZoom: e.target.checked })}
          />
        </label>
      </section>

      <section>
        <h3>{t('settings.speedWarning')}</h3>
        <div className="settings__choice">
          {SPEED_WARNINGS.map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={settings.speedWarning === value}
              onClick={() => updateSettings({ speedWarning: value })}
            >
              {value === null ? t('settings.off') : value === 0 ? t('settings.atLimit') : `+${value}`}
            </button>
          ))}
        </div>
        <p className="settings__note">{t('settings.speedWarningNote')}</p>
      </section>

      <section>
        <h3>{t('settings.personal')}</h3>
        <p className="settings__note">{t('settings.personalNote')}</p>
        {cleared ? (
          <p className="settings__note">{t('settings.cleared')}</p>
        ) : (
          <button
            type="button"
            className={confirmClear ? 'settings__danger settings__danger--confirm' : 'settings__danger'}
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true)
              clearPersonalData()
              setCleared(true)
            }}
          >
            {t(confirmClear ? 'settings.clearConfirm' : 'settings.clear')}
          </button>
        )}
      </section>

      <section>
        <h3>{t('settings.privacy')}</h3>
        <p className="settings__note">{t('settings.privacyText')}</p>
        <h3>{t('settings.sources')}</h3>
        <p className="settings__note">{t('settings.sourcesText')}</p>
      </section>
    </div>
  )
}
