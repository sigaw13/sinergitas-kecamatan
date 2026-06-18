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

async function tableExists(tableName) {
  const rows = await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [tableName]);
  return rows.length > 0;
}

async function addColumn(tableName, columnName, definition) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  if (columns.some(column => column.name === columnName)) return false;
  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  return true;
}

async function migrateLegacyChoice(parentKey, choiceColumn, caseSql) {
  await run(`UPDATE aspect_b
    SET ${choiceColumn} = CASE ${caseSql} ELSE ${choiceColumn} END
    WHERE TRIM(COALESCE(${choiceColumn}, '')) = ''
      AND EXISTS (
        SELECT 1 FROM assessment_files
        WHERE assessment_files.kecamatan_id = aspect_b.kecamatan_id
          AND UPPER(assessment_files.instrument) = 'B'
          AND assessment_files.indicator_key = ?
      )`, [parentKey]);

  await run(`UPDATE assessment_files
    SET indicator_key = ? || (
      SELECT ${choiceColumn} FROM aspect_b
      WHERE aspect_b.kecamatan_id = assessment_files.kecamatan_id
    )
    WHERE UPPER(instrument) = 'B'
      AND indicator_key = ?
      AND (
        SELECT ${choiceColumn} FROM aspect_b
        WHERE aspect_b.kecamatan_id = assessment_files.kecamatan_id
      ) IN ('a', 'b', 'c', 'd')
      AND NOT EXISTS (
        SELECT 1 FROM assessment_files AS existing
        WHERE existing.kecamatan_id = assessment_files.kecamatan_id
          AND UPPER(existing.instrument) = 'B'
          AND existing.indicator_key = ? || (
            SELECT ${choiceColumn} FROM aspect_b
            WHERE aspect_b.kecamatan_id = assessment_files.kecamatan_id
          )
      )`, [parentKey, parentKey, parentKey]);
}

async function migrate() {
  if (!(await tableExists('aspect_b'))) throw new Error('Tabel aspect_b tidak ditemukan.');
  await addColumn('aspect_b', 'ind_3_pilihan', 'TEXT');
  await addColumn('aspect_b', 'ind_27_pilihan', 'TEXT');
  await addColumn('aspect_b', 'ind_41_pilihan', 'TEXT');
  if (await tableExists('aspect_d')) await addColumn('aspect_d', 'ind_3_pilihan', 'TEXT');

  if (await tableExists('assessment_files')) {
    await migrateLegacyChoice('ind_3', 'ind_3_pilihan', `
      WHEN ind_3_jumlah >= 1 AND ind_3_jumlah < 5 THEN 'a'
      WHEN ind_3_jumlah BETWEEN 6 AND 11 THEN 'b'
      WHEN ind_3_jumlah BETWEEN 12 AND 35 THEN 'c'
      WHEN ind_3_jumlah BETWEEN 36 AND 48 THEN 'd'`);
    await migrateLegacyChoice('ind_27', 'ind_27_pilihan', `
      WHEN ind_27_jumlah BETWEEN 1 AND 4 THEN 'b'
      WHEN ind_27_jumlah BETWEEN 5 AND 8 THEN 'c'
      WHEN ind_27_jumlah >= 9 THEN 'd'`);
    await migrateLegacyChoice('ind_41', 'ind_41_pilihan', `
      WHEN UPPER(TRIM(COALESCE(ind_41_nilai, ''))) IN ('A', 'AA', 'A-AA') THEN 'a'
      WHEN UPPER(TRIM(COALESCE(ind_41_nilai, ''))) IN ('B', 'BB', 'B-BB') THEN 'b'
      WHEN UPPER(TRIM(COALESCE(ind_41_nilai, ''))) IN ('C', 'CC', 'C-CC') THEN 'c'
      WHEN UPPER(TRIM(COALESCE(ind_41_nilai, ''))) IN ('D', 'DD', 'D-DD') THEN 'd'`);
  }

    if (await tableExists('aspect_d')) {
      await run(`UPDATE aspect_d
        SET ind_3_pilihan = CASE
          WHEN ind_3_jumlah BETWEEN 1 AND 5 THEN 'a'
          WHEN ind_3_jumlah BETWEEN 6 AND 10 THEN 'b'
          WHEN ind_3_jumlah BETWEEN 11 AND 15 THEN 'c'
          WHEN ind_3_jumlah > 15 THEN 'd'
          ELSE ind_3_pilihan
        END
        WHERE TRIM(COALESCE(ind_3_pilihan, '')) = ''
          AND EXISTS (
            SELECT 1 FROM assessment_files
            WHERE assessment_files.kecamatan_id = aspect_d.kecamatan_id
              AND UPPER(assessment_files.instrument) = 'D'
              AND assessment_files.indicator_key = 'ind_3'
          )`);
      await run(`UPDATE assessment_files
        SET indicator_key = 'ind_3' || (
          SELECT ind_3_pilihan FROM aspect_d
          WHERE aspect_d.kecamatan_id = assessment_files.kecamatan_id
        )
        WHERE UPPER(instrument) = 'D'
          AND indicator_key = 'ind_3'
          AND (SELECT ind_3_pilihan FROM aspect_d WHERE aspect_d.kecamatan_id = assessment_files.kecamatan_id) IN ('a','b','c','d')
          AND NOT EXISTS (
            SELECT 1 FROM assessment_files AS existing
            WHERE existing.kecamatan_id = assessment_files.kecamatan_id
              AND UPPER(existing.instrument) = 'D'
              AND existing.indicator_key = 'ind_3' || (
                SELECT ind_3_pilihan FROM aspect_d
                WHERE aspect_d.kecamatan_id = assessment_files.kecamatan_id
              )
          )`);
    }

  console.log(`Migrasi pilihan dan upload v1.7.8.2 selesai pada ${databasePath}`);
}

migrate()
  .catch(error => {
    console.error('Migrasi v1.7.8.2 gagal', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
