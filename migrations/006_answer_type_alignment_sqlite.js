'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, '..', 'database', 'sinergitas.db');

const db = new sqlite3.Database(databasePath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) return reject(error);
      resolve({ changes: this.changes || 0 });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows || []);
    });
  });
}

async function addColumn(tableName, columnName, definition) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  if (columns.some(column => column.name === columnName)) return false;
  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  return true;
}

async function migrate() {
  const columns = [
    ['aspect_b', 'ind_3_komentar', 'TEXT'],
    ['aspect_b', 'ind_5_jumlah', 'INTEGER DEFAULT 0'],
    ['aspect_b', 'ind_43a_jumlah', 'INTEGER DEFAULT 0'],
    ['aspect_b', 'ind_43b_jumlah', 'INTEGER DEFAULT 0'],
    ['aspect_b', 'ind_43c_komentar', 'TEXT'],
    ['aspect_b', 'ind_43d_jumlah', 'INTEGER DEFAULT 0'],
    ['aspect_d', 'ind_2_jumlah', 'INTEGER DEFAULT 0'],
    ['aspect_d', 'ind_4_detail', 'TEXT']
  ];

  let added = 0;
  for (const [tableName, columnName, definition] of columns) {
    if (await addColumn(tableName, columnName, definition)) added += 1;
  }

  await run(`UPDATE aspect_d
    SET ind_2_jumlah = MAX(COALESCE(ind_2a_jumlah, 0), COALESCE(ind_2b_jumlah, 0))
    WHERE COALESCE(ind_2_jumlah, 0) = 0`);

  console.log(`✅ Migrasi penyelarasan tipe jawaban selesai pada ${databasePath}`);
  console.log(`✅ ${added} kolom baru ditambahkan. Kolom lama tetap dipertahankan.`);
}

migrate()
  .catch(error => {
    console.error('❌ Migrasi penyelarasan tipe jawaban gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
