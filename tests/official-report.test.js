'use strict';

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const route = fs.readFileSync(path.join(root, 'routes', 'official-report.js'), 'utf8');
const exportRoute = fs.readFileSync(path.join(root, 'routes', 'export.js'), 'utf8');
const listView = fs.readFileSync(path.join(root, 'views', 'official-report', 'index.ejs'), 'utf8');
const detailView = fs.readFileSync(path.join(root, 'views', 'official-report', 'detail.ejs'), 'utf8');

assert(app.includes("app.use('/official-report'"), 'Route laporan resmi belum didaftarkan.');
assert(route.includes("WHERE er.status = ?"), 'Laporan resmi harus hanya mengambil hasil berstatus Final.');
assert(route.includes('canAccessKecamatan'), 'Otorisasi laporan individual belum diterapkan.');
assert(exportRoute.includes('/official.csv'), 'Ekspor hasil resmi belum tersedia.');
assert(exportRoute.includes("['Final']"), 'Ekspor harus dibatasi pada hasil final.');
assert(listView.includes('Tidak ada unsur atau bobot tambahan'), 'Keterangan batas lingkup penilaian belum tersedia.');
assert(detailView.includes('Instrumen A–F'), 'Laporan individual harus menegaskan sumber skor Instrumen A–F.');
assert(!route.includes('137.5'), 'Laporan resmi tidak boleh memakai skor maksimum lama 137.5.');
assert(!exportRoute.includes('137.5'), 'Ekspor tidak boleh memakai skor maksimum lama 137.5.');

console.log('✅ Semua pengujian laporan hasil resmi lulus.');
