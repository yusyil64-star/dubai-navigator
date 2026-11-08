import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../i18n'
import './LanguageSwitcher.css'

// Sprachumschalter oben (DE / EN / عربي).
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
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
  )
}
