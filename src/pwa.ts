// Web-App wie eine echte App: installieren ("Zum Home-Bildschirm") und automatische Updates.
import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let installEvent: InstallPromptEvent | null = null
let updateReady = false
let applyUpdate: (() => void) | null = null
let busy = false // läuft gerade eine Navigation/Fahrt? Dann nicht neu laden
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const UPDATE_CHECK_MS = 60 * 60_000 // jede Stunde nach einer neuen Version schauen (auch wenn die App lange offen ist)

export function setupPwa() {
  // Android/Chrome/Edge: der Browser bietet die Installation an – merken für den Knopf
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installEvent = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    notify()
  })

  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      // neue Version geladen: sofort übernehmen, außer mitten in einer Fahrt (dann danach)
      updateReady = true
      applyUpdate = () => void update(true)
      if (!busy) applyUpdate()
    },
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS)
    },
  })
}

// Während Navigation/Fahrmodus true setzen; danach wird ein wartendes Update übernommen
export function setBusy(value: boolean) {
  busy = value
  if (!busy && updateReady) applyUpdate?.()
}

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstallPrompt() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => installEvent,
  )
}

export async function promptInstall() {
  if (!installEvent) return
  await installEvent.prompt()
  installEvent = null
  notify()
}
