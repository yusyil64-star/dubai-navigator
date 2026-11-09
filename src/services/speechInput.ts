// Spracheingabe über die im Browser eingebaute Spracherkennung (Web Speech API).
// Hinweis Datenschutz: Chrome schickt die Aufnahme an Google, Safari an Apple – nur während man spricht.

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

const RECOGNITION_LANGUAGES: Record<string, string> = { de: 'de-DE', en: 'en-US', ar: 'ar-AE' }

function recognitionClass(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null
}

export const speechInputSupported = () => typeof window !== 'undefined' && recognitionClass() !== null

// Zuhören; onText bekommt den erkannten Text (auch schon während man spricht).
// onEnd(error) wird am Ende aufgerufen, error z. B. "not-allowed" (Mikrofon verweigert). Gibt "Abbrechen" zurück.
export function listen(language: string, onText: (text: string) => void, onEnd: (error?: string) => void) {
  const Recognition = recognitionClass()
  if (!Recognition) {
    onEnd('not-supported')
    return () => {}
  }
  const recognition = new Recognition()
  recognition.lang = RECOGNITION_LANGUAGES[language] ?? 'en-US'
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  let error: string | undefined
  recognition.onresult = (event) => {
    const text = Array.from(event.results, (result) => result[0].transcript).join('')
    onText(text.trim())
  }
  recognition.onerror = (event) => {
    error = event.error
  }
  recognition.onend = () => onEnd(error)
  recognition.start()
  return () => recognition.abort()
}
