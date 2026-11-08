// Alle Texte der App in allen Sprachen.
// Neue Texte: in JEDER Sprache denselben Schlüssel ergänzen.
export const translations = {
  de: {
    translation: {
      search: {
        placeholder: 'Wohin möchtest du?',
        loading: 'Suche läuft …',
        noResults: 'Keine Orte in Dubai gefunden.',
        error: 'Suche gerade nicht möglich. Bitte Internetverbindung prüfen.',
      },
      place: {
        close: 'Schließen',
      },
      location: {
        denied: 'Standort nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.',
        unavailable: 'Standort konnte nicht ermittelt werden.',
        timeout: 'Standort-Abfrage hat zu lange gedauert. Bitte erneut versuchen.',
        outsideDubai: 'Du bist außerhalb von Dubai – dein Standort kann hier nicht angezeigt werden.',
      },
      language: {
        label: 'Sprache',
      },
    },
  },
  en: {
    translation: {
      search: {
        placeholder: 'Where to?',
        loading: 'Searching …',
        noResults: 'No places found in Dubai.',
        error: 'Search is not available right now. Please check your internet connection.',
      },
      place: {
        close: 'Close',
      },
      location: {
        denied: 'Location access denied. Please allow it in your browser settings.',
        unavailable: 'Your location could not be determined.',
        timeout: 'Location request took too long. Please try again.',
        outsideDubai: 'You are outside Dubai – your location cannot be shown here.',
      },
      language: {
        label: 'Language',
      },
    },
  },
  ar: {
    translation: {
      search: {
        placeholder: 'إلى أين تريد الذهاب؟',
        loading: 'جارٍ البحث …',
        noResults: 'لم يتم العثور على أماكن في دبي.',
        error: 'البحث غير متاح حاليًا. يرجى التحقق من اتصال الإنترنت.',
      },
      place: {
        close: 'إغلاق',
      },
      location: {
        denied: 'تم رفض الوصول إلى الموقع. يرجى السماح به في إعدادات المتصفح.',
        unavailable: 'تعذّر تحديد موقعك.',
        timeout: 'استغرق تحديد الموقع وقتًا طويلًا. يرجى المحاولة مرة أخرى.',
        outsideDubai: 'أنت خارج دبي – لا يمكن عرض موقعك هنا.',
      },
      language: {
        label: 'اللغة',
      },
    },
  },
}
