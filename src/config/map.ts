// Zentrale Karten-Einstellungen. Hier ändern, nicht verstreut im Code.
import type { Map as MapLibreMap } from 'maplibre-gl'

// Kartenstil: OpenFreeMap "Positron" – hell, schlicht, kostenlos, ohne API-Schlüssel.
// Hinweis: externer Dienst, benötigt Internetverbindung.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
// Nachtmodus: dunkle Variante desselben Kartenstils
export const MAP_STYLE_URL_DARK = 'https://tiles.openfreemap.org/styles/dark'

// Startposition: Downtown Dubai (Burj Khalifa). Format: [Längengrad, Breitengrad]
export const DUBAI_CENTER: [number, number] = [55.2744, 25.1972]

export const START_ZOOM = 12
export const MIN_ZOOM = 9
export const MAX_ZOOM = 19

// Alle gültigen Namen von Farb-/Darstellungs-Eigenschaften (z. B. 'fill-color') – schützt vor Tippfehlern
export type PaintProperty = Parameters<MapLibreMap['setPaintProperty']>[1]

// Eigene Kartenfarben (warmer, heller "Wüsten"-Look). Überschreibt Farben des Positron-Stils.
// Schlüssel = Name der Kartenebene, Wert = Farb-Eigenschaften dieser Ebene.
export const MAP_COLOR_OVERRIDES: Record<string, Partial<Record<PaintProperty, string>>> = {
  background: { 'background-color': '#f4f1ea' },
  landuse_residential: { 'fill-color': '#efebe3' },
  building: { 'fill-color': '#e9e4d9', 'fill-outline-color': '#ddd5c6' },
  park: { 'fill-color': '#e2e9d8' },
  landcover_wood: { 'fill-color': '#dbe4d1' },
  water: { 'fill-color': '#cddde2' },
  waterway: { 'line-color': '#cddde2' },
  water_name_point_label: { 'text-color': '#5b7d8a' },
  water_name_line_label: { 'text-color': '#5b7d8a' },
}

// Eigene Farben für den Nachtmodus (warmes Dunkel statt reinem Schwarz)
export const MAP_COLOR_OVERRIDES_DARK: Record<string, Partial<Record<PaintProperty, string>>> = {
  background: { 'background-color': '#1a1917' },
  water: { 'fill-color': '#1d2a30' },
  park: { 'fill-color': '#1f241c' },
  building: { 'fill-color': '#25231f' },
}

// Grober Rahmen um das Emirat Dubai – die Karte lässt sich nicht weit davon wegbewegen.
// Format: [[West, Süd], [Ost, Nord]]
export const DUBAI_BOUNDS: [[number, number], [number, number]] = [
  [54.6, 24.6],
  [56.0, 25.5],
]
