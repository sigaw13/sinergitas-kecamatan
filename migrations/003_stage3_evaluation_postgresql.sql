BEGIN;

CREATE TABLE IF NOT EXISTS evaluation_reviews (
  id SERIAL PRIMARY KEY,
  kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Dinilai',
  notes TEXT,
  reviewed_by INTEGER REFERENCES kecamatan(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kecamatan_id, instrument)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_reviews_kecamatan
  ON evaluation_reviews(kecamatan_id, instrument);

CREATE TABLE IF NOT EXISTS evaluation_results (
  id SERIAL PRIMARY KEY,
  kecamatan_id INTEGER NOT NULL UNIQUE REFERENCES kecamatan(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Belum Final',
  score_a REAL DEFAULT 0,
  score_b REAL DEFAULT 0,
  score_c REAL DEFAULT 0,
  score_d REAL DEFAULT 0,
  score_e REAL DEFAULT 0,
  score_f REAL DEFAULT 0,
  total_score REAL DEFAULT 0,
  max_score REAL DEFAULT 100,
  percentage REAL DEFAULT 0,
  category TEXT,
  score_snapshot TEXT,
  finalized_by INTEGER REFERENCES kecamatan(id),
  finalized_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_results_status
  ON evaluation_results(status, total_score DESC);

CREATE TABLE IF NOT EXISTS evaluation_history (
  id SERIAL PRIMARY KEY,
  kecamatan_id INTEGER NOT NULL REFERENCES kecamatan(id) ON DELETE CASCADE,
  instrument TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  actor_id INTEGER REFERENCES kecamatan(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_history_kecamatan
  ON evaluation_history(kecamatan_id, created_at DESC);

COMMIT;
