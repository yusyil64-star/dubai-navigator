// Einrichtung der Mehrsprachigkeit (i18next).
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from './translations'

// Verfügbare Sprachen. "label" ist der Text im Sprachumschalter.
export const LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'عربي' },
] as const

const SUPPORTED: readonly string[] = LANGUAGES.map((l) => l.code)
const FALLBACK = 'en'
const STORAGE_KEY = 'dubai-navigator.language'

// Startsprache: zuletzt gewählte Sprache → sonst Browsersprache → sonst Englisch
function detectLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – einfach weitermachen
  }
  const browser = navigator.language.slice(0, 2)
  return SUPPORTED.includes(browser) ? browser : FALLBACK
}

// Bei jedem Sprachwechsel: Sprache und Schreibrichtung (Arabisch: rechts→links) der Seite setzen
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
})

void i18n.use(initReactI18next).init({
  resources: translations,
  lng: detectLanguage(),
  fallbackLng: FALLBACK,
  supportedLngs: SUPPORTED,
  initAsync: false, // Texte sind schon im Code – sofort bereit, kein Flackern
  interpolation: { escapeValue: false }, // React schützt bereits vor schädlichem HTML
})

// Sprache wechseln und für den nächsten Besuch merken
export function setLanguage(code: string) {
  void i18n.changeLanguage(code)
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Speicher nicht verfügbar – Sprache gilt dann nur bis zum Neuladen
  }
}
