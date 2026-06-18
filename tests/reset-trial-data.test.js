'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const route = read('routes/admin.js');
const view = read('views/admin/settings.ejs');

assert(
  route.includes("router.post('/admin/settings/reset-trial-data', ensureAdmin"),
  'Reset data uji coba hanya boleh tersedia untuk superadmin.'
);
assert(
  route.includes("confirmation !== 'HAPUS DATA UJI COBA'"),
  'Reset wajib menggunakan konfirmasi tertulis.'
);

for (const table of [
  'aspect_a',
  'aspect_b',
  'aspect_c',
  'aspect_d',
  'aspect_e',
  'aspect_f',
  'assessment_files',
  'assessment_progress',
  'evaluation_reviews',
  'evaluation_item_scores',
  'evaluation_results',
  'evaluation_history'
]) {
  assert(route.includes(`'${table}'`), `Tabel data uji coba ${table} wajib dibersihkan.`);
}

for (const preserved of [
  "'kecamatan'",
  "'admin_kecamatan_assignments'",
  "'config'",
  "'workbook_baselines'"
]) {
  assert(
    !route.includes(`DELETE FROM ${preserved.replaceAll("'", '')}`),
    `${preserved} tidak boleh dihapus saat reset data uji coba.`
  );
}

assert(view.includes('Hapus Seluruh Data Uji Coba'), 'Tombol reset wajib tersedia di Pengaturan Admin.');
assert(view.includes('confirmTrialReset'), 'Reset wajib memakai konfirmasi ganda pada tampilan.');

console.log('✅ Pengujian reset data uji coba lulus.');
