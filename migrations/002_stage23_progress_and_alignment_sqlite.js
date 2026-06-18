'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '..', 'database', 'sinergitas.db');
const db = new sqlite3.Database(dbPath);

const columns = [
  ['aspect_b', 'ind_28a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_28b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_29a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_29b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_30a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_30b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_30_klasifikasi', 'TEXT'],
  ['aspect_b', 'ind_31a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_31b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_32a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_32b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_34a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_34b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_35a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_35b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_36a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_36b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_37a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_37b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_38_persen', 'REAL DEFAULT 0'],
  ['aspect_b', 'ind_39a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_39b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_b', 'ind_40a_jumlah', 'INTEGER DEFAULT 0'], ['aspect_b', 'ind_40b_jumlah', 'INTEGER DEFAULT 0'],
  ['aspect_d', 'ind_2_detail', 'TEXT']
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, err => (err ? reject(err) : resolve())));
}

async function main() {
  await run(`CREATE TABLE IF NOT EXISTS assessment_progress (
    kecamatan_id INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    filled_fields TEXT NOT NULL DEFAULT '[]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kecamatan_id, instrument),
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
  )`);

  for (const [table, column, definition] of columns) {
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Added ${table}.${column}`);
    } catch (error) {
      if (!String(error.message).toLowerCase().includes('duplicate column name')) throw error;
    }
  }
  await run("UPDATE config SET value = '2026-12-31', updated_at = CURRENT_TIMESTAMP WHERE key = 'deadline' AND value = '2025-12-31'");
  console.log('✅ Migrasi Tahap 2.3 selesai.');
}

main().catch(error => {
  console.error('❌ Migrasi Tahap 2.3 gagal:', error);
  process.exitCode = 1;
}).finally(() => db.close());
