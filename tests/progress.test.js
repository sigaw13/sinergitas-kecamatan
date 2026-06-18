'use strict';

const assert = require('assert');
const {
  INSTRUMENTS,
  inferMeaningfulLegacyFields,
  sanitizeLegacyRow,
  resolveRequiredEvidenceKeys,
  calculateInstrumentProgress,
  calculateOverallProgress
} = require('../utils/progress');

const emptyB = calculateInstrumentProgress({
  instrument: 'b',
  row: Object.fromEntries(INSTRUMENTS.b.fields.map(field => [field, 0])),
  filledFields: null,
  evidenceKeys: new Set()
});
assert.strictEqual(emptyB.dataFilled, 0, 'Nilai bawaan nol tidak boleh dihitung sebagai isian');
assert.strictEqual(emptyB.percent, 0, 'Formulir tanpa jejak pengisian harus memiliki progres 0%');

const filled = new Set(['ind_1_jumlah', 'ind_2_jumlah', 'ind_42_status']);
const evidence = new Set(['ind_1', 'ind_2']);
const partialB = calculateInstrumentProgress({
  instrument: 'b',
  filledFields: JSON.stringify([...filled]),
  evidenceKeys: evidence
});
assert.strictEqual(partialB.dataFilled, 3);
assert.strictEqual(partialB.evidenceFilled, 2);
assert.strictEqual(partialB.completed, 5);
assert.strictEqual(partialB.total, INSTRUMENTS.b.fields.length + resolveRequiredEvidenceKeys('b', {}).length);


const dChoiceProgress = calculateInstrumentProgress({
  instrument: 'd',
  row: { ind_3_pilihan: 'c' },
  filledFields: new Set(['ind_3_pilihan']),
  evidenceKeys: new Set(['ind_3c'])
});
assert.strictEqual(dChoiceProgress.evidenceTotal, 6, 'Pilihan D.3 hanya mewajibkan satu dari empat upload pilihan.');
assert.strictEqual(dChoiceProgress.evidenceFilled, 1, 'Upload pada pilihan D.3 yang aktif harus dihitung.');

const legacyFields = inferMeaningfulLegacyFields({
  ind_1_jumlah: 0,
  ind_2_jumlah: 4,
  ind_42_status: 'tidak',
  ind_43a_status: 'ada'
}, ['ind_1_jumlah', 'ind_2_jumlah', 'ind_42_status', 'ind_43a_status']);
assert.deepStrictEqual([...legacyFields].sort(), ['ind_2_jumlah', 'ind_43a_status']);
const sanitized = sanitizeLegacyRow({ ind_1_jumlah: 0, ind_2_jumlah: 4 }, ['ind_1_jumlah', 'ind_2_jumlah'], legacyFields);
assert.strictEqual(sanitized.ind_1_jumlah, null, 'Nilai bawaan lama harus ditampilkan sebagai kosong');
assert.strictEqual(sanitized.ind_2_jumlah, 4, 'Nilai lama yang bermakna harus dipertahankan');

const fullA = calculateInstrumentProgress({
  instrument: 'a',
  filledFields: new Set(INSTRUMENTS.a.fields),
  evidenceKeys: new Set(INSTRUMENTS.a.evidenceKeys)
});
assert.strictEqual(fullA.percent, 100, 'Instrumen lengkap harus memiliki progres 100%');
assert.strictEqual(fullA.dataPercent, 100);
assert.strictEqual(fullA.evidencePercent, 100);

const overall = calculateOverallProgress([emptyB, fullA]);
const expected = Math.round((fullA.completed / (fullA.total + emptyB.total)) * 100);
assert.strictEqual(overall.percent, expected, 'Progres total harus berbobot berdasarkan jumlah unsur');

console.log('✅ Semua pengujian progres lulus.');
