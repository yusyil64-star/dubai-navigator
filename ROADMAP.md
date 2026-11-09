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

## Schritt 3 – Blitzer und Tempolimit ✅

- ✅ Feste Blitzer aus OpenStreetMap (659 Stück, einmal geladen, in der App gespeichert)
- ✅ Warnung vor Blitzern während der Navigation (Anzeige + Ansage)
- ✅ Tempolimit anzeigen, wo in OpenStreetMap vorhanden, plus eigene Geschwindigkeit (rot bei zu schnell)
- Daten aktualisieren: npm run fetch-osm-data
- Hinweis: In Deutschland ist das Nutzen von Blitzer-Warnern während der Fahrt verboten.

## Schritt 4 – Persönliches und Einstellungen ✅

- ✅ Zuhause, Arbeit, Favoriten (nur auf diesem Gerät gespeichert)
- ✅ Zuletzt gesuchte Orte
- ✅ Nachtmodus (dunkle Karte, automatisch nach Geräte-Einstellung oder fest)
- ✅ Einstellungen: Sprache, Erscheinungsbild, Sprachansage, Blitzer, Daten löschen, Datenschutz, Datenquellen
- ✅ Orte nach Kategorie: Tankstelle, E-Ladestation, Parkplatz, Apotheke, Krankenhaus, Geldautomat, Supermarkt, Moschee, Restaurant, Café, Metro & Tram (vorab aus OpenStreetMap)

## Schritt 5 – Dubai-Extras

- ✅ Salik-Mautstellen auf der Route und geschätzte Kosten (Tarif ab 1. 6. 2026 laut The National, Gulf News, Khaleej Times)
- ✅ Moscheen in der Nähe und Gebetszeiten (berechnet mit adhan, Methode „Dubai“)
- ✅ Ramadan-Modus: Iftar-Zeit wird im Ramadan automatisch angezeigt (islamischer Kalender des Browsers)
- ✅ Hitze-Hinweis für Fuß- und Fahrradwege (aktuelle Temperatur von Open-Meteo)
- ✅ Metro- und Tram-Stationen als Kategorie
- ✅ Abfahrten Metro/Tram – nächste Abfahrten je Linie und Richtung im Ortsfeld (Planfahrplan der RTA, Stand Aug. 2025, keine Echtzeit; aktualisieren mit `npm run fetch-transit-data`)
- ⬜ Verbindungssuche mit Umsteigen (A → B mit Metro/Tram/Bus) – braucht einen Routenplaner für Fahrpläne
- Hinweis: Route ohne Maut ist mit dem kostenlosen Routendienst nicht möglich (siehe Schritt 6)

## Schritt 5b – Weitere Funktionen ohne Server

- ✅ Alternativrouten: bis zu 3 Routen zur Auswahl (Zeit, Strecke, „über E11“), andere grau auf der Karte, Salik je Route – der Routendienst liefert sie nur ohne Zwischenstopps und nicht für jede Strecke
- ✅ Spurempfehlung im Navigations-Banner: passende Fahrspuren hell, andere gedämpft – nur an Abzweigungen, an denen die Spuren in OpenStreetMap erfasst sind
- ✅ „Wo habe ich geparkt?“ – Parkplatz merken (über die Suche oder nach der Ankunft mit dem Auto), als „Mein Auto“ wiederfinden und hinführen lassen
- ✅ Ort teilen: Link über das Teilen-Menü des Handys (sonst kopiert); der Link öffnet die App direkt bei diesem Ort
- ⬜ Parkzonen: keine offene Quelle mit Koordinaten gefunden (Portal blockiert automatischen Zugriff) – zurückgestellt

## Schritt 7 – Noch mehr wie Waze und Google Maps

- ✅ Flüssige Bewegung: Pfeil und Karte bewegen sich mit bis zu 60 Bildern pro Sekunde entlang der Straße
- ✅ Bessere Stimme: automatisch die natürlichste Stimme des Geräts, eigene Auswahl und Probe in den Einstellungen
- ✅ Lange auf die Karte drücken (oder Rechtsklick): Punkt als Ort wählen, mit Adresse in der Nähe
- ✅ Fahrmodus ohne Ziel: Karte folgt, Tempo, Tempolimit, Blitzer voraus (Anzeige + Ansage)
- ✅ Warnton bei zu schnell (aus / ab Limit / +5 / +10 km/h)
- ✅ Wegbeschreibung: Liste aller Abbiegungen der Route
- ✅ Ziel liegt links/rechts (Ansage und Anzeige bei der Ankunft)
- ✅ Ankunftszeit teilen während der Navigation („Ich bin voraussichtlich um 14:32 bei …“, ohne Live-Verfolgung)
- ✅ Unterwegs suchen während der Navigation: Tankstelle, Café usw. entlang der Route, als Zwischenstopp einfügen
- ✅ Sprachsuche: Ziel einsprechen (Mikrofon im Suchfeld; Chrome nutzt dafür Google, Safari Apple – steht im Datenschutz-Hinweis)
- ✅ Auto-Zoom (je nach Tempo, vor Abbiegungen heran) und Kartenansicht 3D / 2D / Norden oben (Einstellungen)
- ✅ Routenplanung bleibt nach einer (Demo-)Fahrt erhalten (Start und Zwischenstopps)
- Nicht möglich mit dem kostenlosen Routendienst: Autobahn/Maut/Fähre meiden (getestet: wird abgelehnt)

## Schritt 6 – Große Ausbaustufen

- 💰 Live-Verkehr und Staus (Datenanbieter wie TomTom oder HERE)
- 💰 Meldungen von Nutzern (Unfall, Polizei, Gefahr) – eigener Server + Datenbank
- 💰 Ankunftszeit teilen, Konten, Synchronisieren zwischen Geräten
- 💰 Eigener Such- und Routendienst (Pflicht bei vielen Nutzern; Route ohne Maut möglich)
- 📱 Echte Handy-App (App Store / Play Store), Navigation im Hintergrund, Offline-Karten
- 🔨 Datenschutzhinweis: Kurzfassung in den Einstellungen vorhanden; vor einer echten Veröffentlichung rechtlich prüfen lassen

## Bekannte Grenzen der kostenlosen Dienste

- Photon (Suche) und OSRM/FOSSGIS (Routen): Fair-Use, nur für wenig Nutzung
- OSRM/FOSSGIS kann keine Tempolimits liefern und keine Route ohne Maut berechnen
- Öffentliche Overpass-Server sind oft überlastet → Daten vorab laden statt live abfragen
- Fahrzeiten ohne Live-Verkehr
