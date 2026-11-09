// TomTom (Live-Verkehr, Staus, Routen mit Verkehr). Der Schlüssel kommt aus .env.local bzw. beim
// Veröffentlichen aus den geheimen Einstellungen des GitHub-Projekts. Ohne Schlüssel läuft die App
// wie bisher, nur ohne Live-Verkehr. Kostenloses Kontingent: 2.500 Abfragen und 50.000 Kartenkacheln pro Tag.
export const TOMTOM_KEY: string | undefined = import.meta.env.VITE_TOMTOM_KEY || undefined

export const hasLiveTraffic = Boolean(TOMTOM_KEY)

export const TOMTOM_ATTRIBUTION = '© <a href="https://www.tomtom.com" target="_blank" rel="noopener">TomTom</a>'

// Sprache der Texte von TomTom (z. B. "Stockender Verkehr")
export const TOMTOM_LANGUAGES: Record<string, string> = { de: 'de-DE', en: 'en-GB', ar: 'ar' }
