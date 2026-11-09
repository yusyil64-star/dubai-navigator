// Sprachausgabe über die im Browser eingebaute Stimme (Web Speech API) – kostenlos, ohne Server.
// Welche Stimmen es gibt, hängt vom Gerät ab. Die App nimmt automatisch die natürlichste
// (z. B. "Natural"/"Neural" unter Windows/Edge, Google-Stimmen unter Android, "Premium"/"Erweitert"
// auf dem iPhone); in den Einstellungen kann man selbst eine wählen.
import { getSettings } from '../settings'

const VOICE_LANGUAGES: Record<string, string> = { de: 'de-DE', en: 'en-US', ar: 'ar-AE' }

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// Die Stimmenliste lädt der Browser oft erst verzögert
let voices: SpeechSynthesisVoice[] = []
const voiceListeners = new Set<() => void>()
if (supported()) {
  const refresh = () => {
    voices = speechSynthesis.getVoices()
    voiceListeners.forEach((listener) => listener())
  }
  refresh()
  speechSynthesis.addEventListener?.('voiceschanged', refresh)
}

export function onVoicesChanged(listener: () => void) {
  voiceListeners.add(listener)
  return () => voiceListeners.delete(listener)
}

const sameLanguage = (voice: SpeechSynthesisVoice, language: string) =>
  voice.lang.replace('_', '-').toLowerCase().startsWith(language)

// Wie natürlich eine Stimme vermutlich klingt (nach Namen, die Hersteller für gute Stimmen verwenden)
function quality(voice: SpeechSynthesisVoice, language: string) {
  let score = 0
  if (/natural|neural|online/i.test(voice.name)) score += 6 // Windows/Edge: neuronale Stimmen
  if (/premium|enhanced|erweitert|siri/i.test(voice.name)) score += 5 // Apple: bessere Stimmen
  if (/google/i.test(voice.name)) score += 4 // Chrome/Android
  if (voice.lang.replace('_', '-') === VOICE_LANGUAGES[language]) score += 2 // passende Region
  if (/compact|espeak/i.test(voice.name)) score -= 4 // sehr künstlich klingend
  return score
}

// Alle Stimmen einer Sprache, die beste zuerst
export function voicesFor(language: string) {
  return voices
    .filter((v) => sameLanguage(v, language))
    .sort((a, b) => quality(b, language) - quality(a, language) || a.name.localeCompare(b.name))
}

function chooseVoice(language: string) {
  const chosen = getSettings().voiceNames[language]
  const list = voicesFor(language)
  return list.find((v) => v.name === chosen) ?? list[0]
}

export function speak(text: string, language: string) {
  if (!supported() || !text) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = VOICE_LANGUAGES[language] ?? 'en-US'
  const voice = chooseVoice(language)
  if (voice) utterance.voice = voice
  utterance.rate = 1.05 // minimal zügiger: klingt flüssiger und weniger abgehackt
  // Ältere Ansage abbrechen, die neue ist wichtiger
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel()
  // Chrome bleibt manchmal im Pause-Zustand hängen – vorsichtshalber fortsetzen
  speechSynthesis.resume()
  speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel()
}

let audio: AudioContext | null = null // für den Warnton (siehe playAlert)

// iPhones erlauben Sprachausgabe erst nach einem Fingertipp. Diese Funktion beim Antippen
// von "Navigation starten" aufrufen, dann funktionieren spätere Ansagen.
export function unlockSpeech() {
  if (supported()) {
    const silent = new SpeechSynthesisUtterance(' ')
    silent.volume = 0
    speechSynthesis.speak(silent)
  }
  // Warnton ebenfalls freischalten (auch das verlangt ein Fingertipp)
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    // kein Ton möglich
  }
}

// Kurzer Warnton (z. B. zu schnell) – erzeugt im Browser, keine Audiodatei nötig
export function playAlert() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    const now = audio.currentTime
    // zwei kurze, sanfte Töne
    for (const [start, frequency] of [
      [0, 880],
      [0.18, 1175],
    ]) {
      const tone = audio.createOscillator()
      const volume = audio.createGain()
      tone.frequency.value = frequency
      volume.gain.setValueAtTime(0.0001, now + start)
      volume.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02)
      volume.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.15)
      tone.connect(volume).connect(audio.destination)
      tone.start(now + start)
      tone.stop(now + start + 0.16)
    }
  } catch {
    // Ton nicht möglich – die rote Anzeige warnt trotzdem
  }
}
