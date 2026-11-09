// Live-Verkehr von TomTom (Verkehrslage, Meldungen, Routen mit Verkehr).
// Die App spricht nicht direkt mit TomTom, sondern mit einem kleinen eigenen Server
// (Ordner traffic-proxy, Cloudflare Worker). Nur dort liegt der TomTom-Schlüssel – so steht er
// nicht in der öffentlichen App. Ohne Server-Adresse läuft die App wie bisher, nur ohne Live-Verkehr.
export const TRAFFIC_PROXY: string | undefined = import.meta.env.VITE_TRAFFIC_PROXY?.replace(/\/$/, '') || undefined

export const hasLiveTraffic = Boolean(TRAFFIC_PROXY)

export const TOMTOM_ATTRIBUTION = '© <a href="https://www.tomtom.com" target="_blank" rel="noopener">TomTom</a>'

// Sprache der Texte von TomTom (z. B. "Stockender Verkehr")
export const TOMTOM_LANGUAGES: Record<string, string> = { de: 'de-DE', en: 'en-GB', ar: 'ar' }
