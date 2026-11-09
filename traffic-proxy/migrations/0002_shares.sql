-- Live-Standort teilen: solange jemand navigiert und teilt, steht hier seine aktuelle Position.
-- Wer den Link (id) kennt, kann mitlesen; schreiben darf nur, wer das geheime token hat.
-- Beim Beenden oder nach Ablauf wird die Zeile gelöscht.
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  dest_name TEXT NOT NULL,
  dest_lon REAL NOT NULL,
  dest_lat REAL NOT NULL,
  lon REAL NOT NULL,
  lat REAL NOT NULL,
  heading REAL,
  eta INTEGER,               -- geschätzte Ankunft (ms)
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  expires INTEGER NOT NULL,  -- ohne neue Position verschwindet das Teilen danach
  ended INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX shares_expires ON shares (expires);
