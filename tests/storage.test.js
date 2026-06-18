const assert = require('assert');
const path = require('path');
const {
  slugify,
  normalizeIndicatorKey,
  indicatorFolderName,
  kecamatanFolderName,
  buildEvidenceRelativeDir,
  buildStoredFilename,
  safeResolveRelative,
  toPosixRelative
} = require('../utils/storage');

assert.strictEqual(slugify('Sumedang Selatan'), 'sumedang-selatan');
assert.strictEqual(kecamatanFolderName(18, 'Sumedang Selatan'), '18-sumedang-selatan');
assert.strictEqual(normalizeIndicatorKey('ind_2a_file'), 'ind_2a');
assert.strictEqual(normalizeIndicatorKey('file_14c'), 'ind_14c');
assert.strictEqual(indicatorFolderName('ind_14c'), 'indikator-14-c');

const relative = buildEvidenceRelativeDir({
  kecamatanId: 2,
  kecamatanName: 'Wado',
  instrument: 'A',
  indicatorKey: 'ind_2a'
});
assert.strictEqual(relative, 'kecamatan/2-wado/instrumen-a/indikator-2-a');

const storedName = buildStoredFilename('Laporan Monografi Kecamatan.xlsx');
assert.ok(storedName.endsWith('-laporan-monografi-kecamatan.xlsx'));
assert.ok(!storedName.includes(' '));

const safe = safeResolveRelative('kecamatan/2-wado/instrumen-a/indikator-1/test.pdf');
assert.strictEqual(toPosixRelative(safe), 'kecamatan/2-wado/instrumen-a/indikator-1/test.pdf');
assert.throws(() => safeResolveRelative('../rahasia.env'), /di luar folder uploads/);
assert.throws(() => normalizeIndicatorKey('indikator-bebas'), /tidak valid/);

console.log('✅ Semua pengujian struktur penyimpanan lulus.');
