'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

const root = path.join(__dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sieselon-schema-'));
const databasePath = path.join(tempDir, 'sinergitas.db');

function getDatabaseRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(databasePath);
    db.all(sql, params, (error, rows) => {
      db.close();
      if (error) return reject(error);
      resolve(rows || []);
    });
  });
}

async function main() {
  const startupScript = `
    const db = require(${JSON.stringify(path.join(root, 'database', 'database.js'))});
    Promise.resolve(db.ready)
      .then(() => db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='evaluation_item_scores'",
        [],
        (error, row) => {
          if (error || !row) {
            console.error(error || new Error('table missing'));
            process.exit(1);
          }
          console.log('schema-ready');
          process.exit(0);
        }
      ))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  `;

  const startup = spawnSync(process.execPath, ['-e', startupScript], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: '', SQLITE_DB_PATH: databasePath },
    encoding: 'utf8',
    timeout: 30000
  });
  assert.strictEqual(startup.status, 0, `Inisialisasi database gagal.\n${startup.stdout}\n${startup.stderr}`);
  assert.ok(startup.stdout.includes('schema-ready'), 'db.ready harus selesai setelah evaluation_item_scores tersedia.');

  const tables = await getDatabaseRows(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (?, ?, ?, ?)`,
    ['evaluation_item_scores', 'evaluation_reviews', 'evaluation_results', 'evaluation_history']
  );
  assert.strictEqual(tables.length, 4, 'Seluruh tabel evaluasi wajib dibuat otomatis.');

  const columns = await getDatabaseRows('PRAGMA table_info(evaluation_item_scores)');
  const columnNames = new Set(columns.map(column => column.name));
  for (const required of ['kecamatan_id', 'instrument', 'indicator_key', 'standard_score', 'awarded_score']) {
    assert.ok(columnNames.has(required), `Kolom ${required} wajib tersedia.`);
  }


  const aspectBColumns = new Set((await getDatabaseRows('PRAGMA table_info(aspect_b)')).map(column => column.name));
  for (const required of ['ind_3_pilihan', 'ind_27_pilihan', 'ind_41_pilihan', 'ind_5_jumlah', 'ind_43a_jumlah', 'ind_43b_jumlah', 'ind_43c_komentar', 'ind_43d_jumlah']) {
    assert.ok(aspectBColumns.has(required), `Kolom aspect_b.${required} wajib tersedia.`);
  }

  const aspectDColumns = new Set((await getDatabaseRows('PRAGMA table_info(aspect_d)')).map(column => column.name));
  for (const required of ['ind_2_jumlah', 'ind_3_pilihan', 'ind_4_detail']) {
    assert.ok(aspectDColumns.has(required), `Kolom aspect_d.${required} wajib tersedia.`);
  }

  const repair = spawnSync(process.execPath, ['migrations/005_evaluation_item_scores_sqlite.js'], {
    cwd: root,
    env: { ...process.env, SQLITE_DB_PATH: databasePath },
    encoding: 'utf8',
    timeout: 30000
  });
  assert.strictEqual(repair.status, 0, `Migrasi manual harus aman dijalankan berulang.\n${repair.stdout}\n${repair.stderr}`);
  assert.ok(repair.stdout.includes('Migrasi nilai per pertanyaan selesai'), 'Migrasi manual harus memberi konfirmasi keberhasilan.');

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Pengujian inisialisasi dan perbaikan schema database lulus.');
}

main().catch(error => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.error(error);
  process.exit(1);
});
