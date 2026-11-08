// Zentrale Karten-Einstellungen. Hier ändern, nicht verstreut im Code.

// Kartenstil: OpenFreeMap "Positron" – hell, schlicht, kostenlos, ohne API-Schlüssel.
// Hinweis: externer Dienst, benötigt Internetverbindung.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

// Startposition: Downtown Dubai (Burj Khalifa). Format: [Längengrad, Breitengrad]
export const DUBAI_CENTER: [number, number] = [55.2744, 25.1972]

export const START_ZOOM = 12
export const MIN_ZOOM = 9
export const MAX_ZOOM = 19

// Grober Rahmen um das Emirat Dubai – die Karte lässt sich nicht weit davon wegbewegen.
// Format: [[West, Süd], [Ost, Nord]]
export const DUBAI_BOUNDS: [[number, number], [number, number]] = [
  [54.6, 24.6],
  [56.0, 25.5],
]
