-- Meldungen von Nutzern (wie bei Waze). Gespeichert wird nur, was die Meldung braucht:
-- Art, Ort, Fahrtrichtung, Zeit und Bestätigungen. Keine Namen, keine Konten.
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,          -- accident, police, camera, hazard, jam, roadworks, closed
  lon REAL NOT NULL,
  lat REAL NOT NULL,
  heading REAL,                -- Fahrtrichtung beim Melden (Grad), für "liegt vor mir?"
  created INTEGER NOT NULL,    -- Zeitstempel (ms)
  expires INTEGER NOT NULL,    -- danach verschwindet die Meldung
  up INTEGER NOT NULL DEFAULT 0,   -- "Noch da"
  down INTEGER NOT NULL DEFAULT 0  -- "Nicht mehr da"
);
CREATE INDEX reports_expires ON reports (expires);

-- Wer schon abgestimmt hat (zufällige Geräte-Kennung, kein Name)
CREATE TABLE votes (
  report_id TEXT NOT NULL,
  voter TEXT NOT NULL,
  PRIMARY KEY (report_id, voter)
);

-- Schutz vor Missbrauch: wie viele Meldungen pro Absender und Stunde
-- (sender = Prüfsumme aus IP-Adresse und Datum, die IP selbst wird nicht gespeichert)
CREATE TABLE rate (
  sender TEXT NOT NULL,
  hour INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (sender, hour)
);
