// Alle Texte der App in allen Sprachen.
// Neue Texte: in JEDER Sprache denselben Schlüssel ergänzen.
export const translations = {
  de: {
    translation: {
      search: {
        placeholder: 'Wohin möchtest du?',
        comingSoon: 'Die Suche folgt in einer späteren Phase.',
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
        comingSoon: 'Search is coming in a later phase.',
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
        comingSoon: 'ستتوفر ميزة البحث في مرحلة لاحقة.',
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
