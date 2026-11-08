# Dubai Navigator – Roadmap

Ziel: alle wichtigen Funktionen von Waze und Google Maps – plus eigene Ideen speziell für Dubai.
Das Design ist eigenständig (keine Kopie). Es werden **keine Live-Daten erfunden**: Was echte Daten
braucht, wird erst gebaut, wenn eine echte Datenquelle vorhanden ist.

Legende: ✅ fertig · 🔨 in Arbeit · ⬜ geplant · 💰 braucht Geld/Konto/Server · 📱 braucht echte Handy-App

## Fertig

- ✅ Phase 1 – Grundgerüst, Vollbild-Karte von Dubai (MapLibre, OpenFreeMap)
- ✅ Phase 2 – Design-System, Namensschild, Bedienfeld
- ✅ Phase 3 – Mehrsprachigkeit: Deutsch, Englisch, Arabisch (rechts nach links)
- ✅ Phase 4 – Installierbare Web-App (PWA), Offline-Start der Oberfläche
- ✅ Veröffentlichung auf GitHub Pages (automatisch bei jedem Hochladen)
- ✅ Phase 5 – Eigener Standort (GPS) mit verständlichen Meldungen
- ✅ Phase 6 – Ortssuche (Photon), sprachabhängige Namen
- ✅ Phase 7 – Route berechnen und anzeigen (Auto, OSRM des FOSSGIS e.V.)

## Schritt 1 – Echte Navigation ✅

- ✅ Abbiege-Anweisungen (Pfeil, Entfernung, Straße) in drei Sprachen
- ✅ Sprachansagen („In 300 m rechts abbiegen“) über die Sprachausgabe des Browsers
- ✅ Karte folgt der Position während der Fahrt
- ✅ Restzeit, Restentfernung, Ankunftszeit
- ✅ Neuberechnung beim Verlassen der Route
- ✅ „Ziel erreicht“
- ✅ Bildschirm bleibt während der Navigation an
- ✅ Demo-Fahrt (Simulation) zum Ausprobieren ohne vor Ort zu sein

## Schritt 2 – Mehr Routen-Möglichkeiten ✅

- ✅ Zwischenstopps hinzufügen und entfernen
- ✅ Zu Fuß und mit dem Fahrrad

## Schritt 3 – Blitzer und Tempolimit

- ⬜ Feste Blitzer aus OpenStreetMap (einmal geladen, in der App gespeichert)
- ⬜ Warnung vor Blitzern während der Navigation (abschaltbar)
- ⬜ Tempolimit anzeigen, wo in OpenStreetMap vorhanden
- Hinweis: In Deutschland ist das Nutzen von Blitzer-Warnern während der Fahrt verboten.

## Schritt 4 – Persönliches und Einstellungen

- ⬜ Zuhause, Arbeit, Favoriten
- ⬜ Zuletzt gesuchte Orte
- ⬜ Nachtmodus (dunkle Karte)
- ⬜ Einstellungen: Sprache, Sprachansage, Blitzer, Nachtmodus, Fortbewegungsart
- ⬜ Orte nach Kategorie (Tankstelle, Parkplatz, Restaurant, Apotheke …)

## Schritt 5 – Dubai-Extras

- ⬜ Salik-Mautstellen auf der Route und geschätzte Kosten (nur mit geprüfter Tarif-Quelle)
- ⬜ Moscheen in der Nähe und Gebetszeiten (berechnet)
- ⬜ Parkzonen (nur falls offene RTA-Daten verfügbar)
- ⬜ Metro und Tram (nur falls offene Fahrplandaten verfügbar)
- ⬜ Hitze-Hinweis für Fußwege
- ⬜ Ramadan-Modus

## Schritt 6 – Große Ausbaustufen

- 💰 Live-Verkehr und Staus (Datenanbieter wie TomTom oder HERE)
- 💰 Meldungen von Nutzern (Unfall, Polizei, Gefahr) – eigener Server + Datenbank
- 💰 Ankunftszeit teilen, Konten, Synchronisieren zwischen Geräten
- 💰 Eigener Such- und Routendienst (Pflicht bei vielen Nutzern; Route ohne Maut möglich)
- 📱 Echte Handy-App (App Store / Play Store), Navigation im Hintergrund, Offline-Karten
- ⬜ Datenschutzhinweis (vor einer echten Veröffentlichung Pflicht)

## Bekannte Grenzen der kostenlosen Dienste

- Photon (Suche) und OSRM/FOSSGIS (Routen): Fair-Use, nur für wenig Nutzung
- OSRM/FOSSGIS kann keine Tempolimits liefern und keine Route ohne Maut berechnen
- Öffentliche Overpass-Server sind oft überlastet → Daten vorab laden statt live abfragen
- Fahrzeiten ohne Live-Verkehr
