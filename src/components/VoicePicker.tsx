import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { onVoicesChanged, speak, voicesFor } from '../navigation/voice'
import { updateSettings, useSettings } from '../settings'

// Liste der Stimmen kommt vom Browser; bei Änderungen neu zeichnen
let version = 0
const subscribe = (listener: () => void) =>
  onVoicesChanged(() => {
    version++
    listener()
  })

// Stimme für die Ansagen wählen und Probe hören
export function VoicePicker() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const settings = useSettings()
  useSyncExternalStore(subscribe, () => version)
  const voices = voicesFor(language)
  const chosen = settings.voiceNames[language] ?? ''

  if (voices.length === 0) return <p className="settings__note">{t('settings.noVoices')}</p>

  return (
    <div className="settings__voice">
      <label className="settings__select">
        <span>{t('settings.voiceChoice')}</span>
        <select
          value={chosen}
          onChange={(e) => updateSettings({ voiceNames: { ...settings.voiceNames, [language]: e.target.value } })}
        >
          <option value="">{t('settings.voiceAuto', { name: voices[0].name })}</option>
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="settings__sample" onClick={() => speak(t('settings.voiceSample'), language)}>
        ▶ {t('settings.voiceTest')}
      </button>
      <p className="settings__note">{t('settings.voiceNote')}</p>
    </div>
  )
}
