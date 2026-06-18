'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, '..', 'database', 'sinergitas.db');

const db = new sqlite3.Database(databasePath, error => {
  if (error) {
    console.error('❌ Gagal membuka database SQLite:', error.message);
    process.exitCode = 1;
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) return reject(error);
      resolve({ changes: this.changes || 0, lastID: this.lastID || null });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) return reject(error);
      resolve(row || null);
    });
  });
}

async function migrate() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS evaluation_item_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kecamatan_id INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    indicator_key TEXT NOT NULL,
    standard_score REAL NOT NULL DEFAULT 0,
    awarded_score REAL NOT NULL DEFAULT 0,
    notes TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (kecamatan_id, instrument, indicator_key),
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES kecamatan(id)
  )`);
  await run(`CREATE INDEX IF NOT EXISTS idx_evaluation_item_scores_owner
    ON evaluation_item_scores(kecamatan_id, instrument)`);

  const table = await get(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    ['evaluation_item_scores']
  );
  if (!table) {
    throw new Error('Tabel evaluation_item_scores tetap tidak ditemukan setelah migrasi.');
  }

  const columns = await new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(evaluation_item_scores)', [], (error, rows) => {
      if (error) return reject(error);
      resolve(rows || []);
    });
  });
  const requiredColumns = [
    'id', 'kecamatan_id', 'instrument', 'indicator_key',
    'standard_score', 'awarded_score', 'notes', 'reviewed_by',
    'reviewed_at', 'created_at', 'updated_at'
  ];
  const found = new Set(columns.map(column => column.name));
  const missing = requiredColumns.filter(column => !found.has(column));
  if (missing.length) {
    throw new Error(`Struktur evaluation_item_scores belum lengkap. Kolom hilang: ${missing.join(', ')}`);
  }

  console.log(`✅ Migrasi nilai per pertanyaan selesai pada ${databasePath}`);
  console.log(`✅ Tabel evaluation_item_scores memiliki ${columns.length} kolom.`);
}

migrate()
  .catch(error => {
    console.error('❌ Migrasi evaluation_item_scores gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close(error => {
      if (error) {
        console.error('❌ Gagal menutup database:', error.message);
        process.exitCode = 1;
      }
    });
  });
