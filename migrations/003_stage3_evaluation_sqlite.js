'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = path.join(__dirname, '..', 'database', 'sinergitas.db');
const db = new sqlite3.Database(databasePath);

const statements = [
  `CREATE TABLE IF NOT EXISTS evaluation_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Belum Dinilai',
    notes TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kecamatan_id, instrument),
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES kecamatan(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_reviews_kecamatan
    ON evaluation_reviews(kecamatan_id, instrument)`,
  `CREATE TABLE IF NOT EXISTS evaluation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL UNIQUE,
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
    finalized_by INTEGER,
    finalized_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (finalized_by) REFERENCES kecamatan(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_status
    ON evaluation_results(status, total_score DESC)`,
  `CREATE TABLE IF NOT EXISTS evaluation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL,
    instrument TEXT,
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    actor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES kecamatan(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_history_kecamatan
    ON evaluation_history(kecamatan_id, created_at DESC)`
];

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  for (const statement of statements) {
    db.run(statement, error => {
      if (error) console.error('Migration error:', error.message);
    });
  }
});

db.close(error => {
  if (error) {
    console.error('Gagal menutup database:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log('✅ Migrasi Tahap 3 evaluasi kinerja selesai.');
});
