'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const route = fs.readFileSync(path.join(root, 'routes', 'evaluation.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'views', 'dashboard.ejs'), 'utf8');
const ranking = fs.readFileSync(path.join(root, 'views', 'ranking.ejs'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'migrations', '003_stage3_evaluation_postgresql.sql'), 'utf8');
const itemScoreMigration = fs.readFileSync(path.join(root, 'migrations', '005_evaluation_item_scores_postgresql.sql'), 'utf8');
const detailView = fs.readFileSync(path.join(root, 'views', 'evaluation', 'detail.ejs'), 'utf8');

assert(route.includes("'Belum Dinilai'"), 'Status Belum Dinilai harus tersedia.');
assert(route.includes("'Perlu Perbaikan'"), 'Status Perlu Perbaikan harus tersedia.');
assert(route.includes("'Terverifikasi'"), 'Status Terverifikasi harus tersedia.');
assert(route.includes("router.post('/:id/finalize'"), 'Route finalisasi harus tersedia.');
assert(route.includes('progress.overall.percent < 100'), 'Finalisasi harus memeriksa progres 100%.');
assert(route.includes("review.status !== 'Terverifikasi'"), 'Finalisasi harus memeriksa seluruh instrumen terverifikasi.');
assert(dashboard.includes('/evaluation'), 'Dashboard admin harus memiliki tautan evaluasi.');
assert(dashboard.includes('Status Evaluasi Kinerja'), 'Dashboard kecamatan harus menampilkan status evaluasi.');
assert(ranking.includes('Peringkat Resmi'), 'Halaman peringkat harus diberi label resmi.');
assert(migration.includes('evaluation_reviews'), 'Migrasi evaluation_reviews harus tersedia.');
assert(migration.includes('evaluation_results'), 'Migrasi evaluation_results harus tersedia.');
assert(migration.includes('evaluation_history'), 'Migrasi evaluation_history harus tersedia.');
assert(itemScoreMigration.includes('evaluation_item_scores'), 'Migrasi nilai per pertanyaan harus tersedia.');
assert(route.includes('evaluation_item_scores'), 'Route evaluasi harus menyimpan nilai per pertanyaan.');
assert(route.includes('calculateReviewedScoring'), 'Finalisasi harus menggunakan hasil penilaian administrator.');
assert(route.includes('melebihi standar maksimum'), 'Backend harus menolak jumlah nilai instrumen yang melebihi standar.');
assert(detailView.includes('Jumlah Nilai Instrumen'), 'Halaman evaluasi harus menampilkan jumlah nilai per instrumen.');

console.log('✅ Semua pengujian alur evaluasi kinerja lulus.');
