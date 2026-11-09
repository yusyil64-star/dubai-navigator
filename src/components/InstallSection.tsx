import { useTranslation } from 'react-i18next'
import { isInstalled, isIos, promptInstall, useInstallPrompt } from '../pwa'

// "App installieren": Knopf (Android/Chrome), Anleitung (iPhone) oder Hinweis, dass sie schon installiert ist.
export function InstallSection() {
  const { t } = useTranslation()
  const installPrompt = useInstallPrompt()

  return (
    <section>
      <h3>{t('install.title')}</h3>
      {isInstalled() ? (
        <p className="settings__note">✓ {t('install.done')}</p>
      ) : installPrompt ? (
        <button type="button" className="settings__sample" onClick={() => void promptInstall()}>
          ⬇ {t('install.button')}
        </button>
      ) : (
        <p className="settings__note">{t(isIos() ? 'install.ios' : 'install.other')}</p>
      )}
      <p className="settings__note">{t('install.updates')}</p>
    </section>
  )
}
