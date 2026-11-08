// Persönliche Orte: Zuhause, Arbeit, Favoriten, zuletzt gesucht.
// Gespeichert nur im Browser dieses Geräts (kein Konto, kein Server).
import { useSyncExternalStore } from 'react'
import type { Place } from './services/geocoding'

export type SavedPlaces = {
  home: Place | null
  work: Place | null
  favorites: Place[]
  recents: Place[]
}

const EMPTY: SavedPlaces = { home: null, work: null, favorites: [], recents: [] }
const STORAGE_KEY = 'dubai-navigator.places'
const MAX_RECENTS = 8

function load(): SavedPlaces {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return EMPTY
  }
}

let current = load()
const listeners = new Set<() => void>()

function update(change: Partial<SavedPlaces>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Speicher nicht verfügbar – gilt nur bis zum Neuladen
  }
  listeners.forEach((listener) => listener())
}

const samePlace = (a: Place | null, b: Place) => a?.id === b.id

export const isFavorite = (place: Place) => current.favorites.some((p) => samePlace(p, place))

export function toggleFavorite(place: Place) {
  update({
    favorites: isFavorite(place)
      ? current.favorites.filter((p) => !samePlace(p, place))
      : [...current.favorites, place],
  })
}

// Zuhause/Arbeit setzen; ist der Ort schon gesetzt, wird er wieder entfernt
export function toggleHome(place: Place) {
  update({ home: samePlace(current.home, place) ? null : place })
}

export function toggleWork(place: Place) {
  update({ work: samePlace(current.work, place) ? null : place })
}

export function addRecent(place: Place) {
  update({ recents: [place, ...current.recents.filter((p) => !samePlace(p, place))].slice(0, MAX_RECENTS) })
}

export function clearPersonalData() {
  update(EMPTY)
}

export function useSavedPlaces() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
