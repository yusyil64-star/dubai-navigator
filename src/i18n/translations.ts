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
      route: {
        button: 'Route hierher',
        from: 'Von',
        to: 'Nach',
        myLocation: 'Mein Standort',
        chooseStart: 'Startpunkt wählen',
        needStart: 'Dein Standort ist nicht bekannt. Suche einen Startpunkt:',
        loading: 'Route wird berechnet …',
        error: 'Route konnte nicht berechnet werden. Bitte später erneut versuchen.',
        noTraffic: 'Mit dem Auto · Fahrzeit ohne aktuelle Verkehrslage',
        close: 'Route beenden',
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
      route: {
        button: 'Directions',
        from: 'From',
        to: 'To',
        myLocation: 'My location',
        chooseStart: 'Choose a starting point',
        needStart: 'Your location is unknown. Search for a starting point:',
        loading: 'Calculating route …',
        error: 'The route could not be calculated. Please try again later.',
        noTraffic: 'By car · travel time without live traffic',
        close: 'End route',
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
      route: {
        button: 'الاتجاهات',
        from: 'من',
        to: 'إلى',
        myLocation: 'موقعي',
        chooseStart: 'اختر نقطة البداية',
        needStart: 'موقعك غير معروف. ابحث عن نقطة البداية:',
        loading: 'جارٍ حساب المسار …',
        error: 'تعذّر حساب المسار. يرجى المحاولة لاحقًا.',
        noTraffic: 'بالسيارة · مدة الرحلة بدون حركة المرور الحالية',
        close: 'إنهاء المسار',
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
