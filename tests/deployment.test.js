'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const appSource = read('app.js');
assert.ok(appSource.includes("app.get('/health'"), 'Endpoint /health wajib tersedia.');
assert.ok(appSource.includes("app.set('trust proxy', 1)"), 'Trust proxy produksi wajib aktif.');
assert.ok(appSource.includes('if (db.ready) await db.ready'), 'Server wajib menunggu database siap.');
assert.ok(appSource.includes('synchronizeAllScores(db)'), 'Server wajib menyelaraskan skor dengan workbook saat mulai.');

const databaseSource = read('database/database.js');
for (const table of [
  'assessment_progress',
  'assessment_files',
  'evaluation_reviews',
  'evaluation_item_scores',
  'evaluation_results',
  'evaluation_history'
]) {
  assert.ok(
    databaseSource.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
    `Inisialisasi otomatis tabel ${table} wajib tersedia.`
  );
}
assert.ok(databaseSource.includes('verifyRequiredSqliteTables'), 'SQLite wajib memverifikasi tabel sebelum server dibuka.');
assert.ok(databaseSource.includes("dialect: 'sqlite'"), 'Database wrapper wajib mengenali dialect SQLite.');

for (const field of ['relative_path', 'ind_28a_jumlah', 'ind_40b_jumlah', 'ind_2_detail']) {
  assert.ok(databaseSource.includes(field), `Migrasi otomatis field ${field} wajib tersedia.`);
}

const assessmentSource = read('routes/assessment.js');
for (const code of ['a', 'b', 'c', 'd', 'e', 'f']) {
  assert.ok(
    assessmentSource.includes(`['/instrument-${code}', '/aspect-${code}']`),
    `Route Instrumen ${code.toUpperCase()} dan kompatibilitas route lama wajib tersedia.`
  );
}

const userFacingFiles = [
  'views/dashboard.ejs',
  'views/assessment/scoring-result.ejs',
  'views/evaluation/detail.ejs'
];
for (const file of userFacingFiles) {
  assert.ok(!/\bAspek\b/.test(read(file)), `${file} masih menampilkan istilah Aspek.`);
}

const gitignore = read('.gitignore');
for (const ignored of ['node_modules/', '.env', 'database/*.db', 'uploads/*']) {
  assert.ok(gitignore.includes(ignored), `${ignored} wajib ada di .gitignore.`);
}

console.log('✅ Semua pengujian stabilisasi deployment lulus.');
