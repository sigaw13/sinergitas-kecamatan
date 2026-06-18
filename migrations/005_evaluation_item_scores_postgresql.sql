BEGIN;

CREATE TABLE IF NOT EXISTS evaluation_item_scores (
  id SERIAL PRIMARY KEY,
  kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  indicator_key TEXT NOT NULL,
  standard_score REAL NOT NULL DEFAULT 0,
  awarded_score REAL NOT NULL DEFAULT 0,
  notes TEXT,
  reviewed_by INTEGER REFERENCES kecamatan(id),
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kecamatan_id, instrument, indicator_key)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_item_scores_owner
  ON evaluation_item_scores(kecamatan_id, instrument);

COMMIT;
