'use strict';

const assert = require('assert');
const {
  INSTRUMENT_STANDARDS,
  TOTAL_MAX_SCORE,
  validateStandards
} = require('../utils/standards');

assert.strictEqual(validateStandards(), true, 'Validasi standar nilai gagal.');
assert.deepStrictEqual(
  Object.fromEntries(Object.entries(INSTRUMENT_STANDARDS).map(([code, item]) => [code, item.maxScore])),
  { A: 30, B: 30, C: 5, D: 20, E: 5, F: 10 },
  'Maksimum instrumen harus sama dengan workbook resmi 2026.'
);
assert.strictEqual(TOTAL_MAX_SCORE, 100, 'Jumlah nilai maksimum A sampai F harus 100.');

const expectedA = {
  ind_1: 2,
  ind_2a: 1, ind_2b: 0.5, ind_2c: 0.5,
  ind_3: 2.5, ind_4: 2,
  ind_5a: 1, ind_5b: 1,
  ind_6: 2.5, ind_7: 2.5, ind_8: 1.5,
  ind_9a: 0.25, ind_9b: 0.5, ind_9c: 0.25, ind_9d: 0.25, ind_9e: 0.25,
  ind_10a: 0.5, ind_10b: 0.5, ind_10c: 0.5, ind_10d: 0.5,
  ind_10e: 0.5, ind_10f: 0.5, ind_10g: 0.5,
  ind_11: 1.5,
  ind_12a: 0.5, ind_12b: 0.5,
  ind_13: 1,
  ind_14a: 0.5, ind_14b: 0.5, ind_14c: 0.5,
  ind_15: 1.5, ind_16: 1.5
};
assert.deepStrictEqual(INSTRUMENT_STANDARDS.A.evidenceWeights, expectedA, 'Bobot Instrumen A berbeda dari workbook.');

const questionsB = require('../data/evaluation-questions.json').B.questions;
for (const question of questionsB) {
  const completionAlias = INSTRUMENT_STANDARDS.B.completionAliases
    && INSTRUMENT_STANDARDS.B.completionAliases[question.key];
  const calculatedMaximum = completionAlias || question.answerType === 'single_choice_with_evidence'
    ? Number(INSTRUMENT_STANDARDS.B.evidenceWeights[question.key] || 0)
    : question.evidence.reduce(
      (sum, item) => sum + Number(INSTRUMENT_STANDARDS.B.evidenceWeights[item.key] || 0),
      0
    );
  assert.ok(
    Math.abs(calculatedMaximum - Number(question.maxScore)) < 0.000001,
    `Bobot pertanyaan B.${question.number} berbeda dari workbook.`
  );
}
assert.ok(
  Math.abs(Object.values(INSTRUMENT_STANDARDS.B.evidenceWeights).reduce((sum, value) => sum + Number(value), 0) - 30) < 0.000001,
  'Jumlah bobot Instrumen B harus 30.'
);
assert.deepStrictEqual(Object.values(INSTRUMENT_STANDARDS.C.evidenceWeights), [1,1,0.5,0.5,1,1], 'Bobot Instrumen C berbeda dari workbook.');
assert.deepStrictEqual(Object.values(INSTRUMENT_STANDARDS.D.evidenceWeights), [5,7,3,5], 'Bobot Instrumen D berbeda dari workbook.');
assert.deepStrictEqual(Object.values(INSTRUMENT_STANDARDS.E.evidenceWeights), [1,1,1,1,1], 'Bobot Instrumen E berbeda dari workbook.');
assert.deepStrictEqual(Object.values(INSTRUMENT_STANDARDS.F.evidenceWeights), Array(40).fill(0.25), 'Bobot Instrumen F berbeda dari workbook.');

console.log('✅ Seluruh standar nilai A sampai F sama dengan workbook resmi 2026.');
