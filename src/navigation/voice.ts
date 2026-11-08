// Sprachausgabe über die im Browser eingebaute Stimme (Web Speech API) – kostenlos, ohne Server.

const VOICE_LANGUAGES: Record<string, string> = { de: 'de-DE', en: 'en-US', ar: 'ar-AE' }

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, language: string) {
  if (!supported() || !text) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = VOICE_LANGUAGES[language] ?? 'en-US'
  // Passende Stimme wählen, falls das Gerät eine hat
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(language))
  if (voice) utterance.voice = voice
  speechSynthesis.cancel() // ältere Ansage abbrechen, die neue ist wichtiger
  speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel()
}

// iPhones erlauben Sprachausgabe erst nach einem Fingertipp. Diese Funktion beim Antippen
// von "Navigation starten" aufrufen, dann funktionieren spätere Ansagen.
export function unlockSpeech() {
  if (!supported()) return
  const silent = new SpeechSynthesisUtterance(' ')
  silent.volume = 0
  speechSynthesis.speak(silent)
}
