'use strict';

const assert = require('assert');
const ScoringSystem = require('../utils/scoring');
const { INSTRUMENT_STANDARDS, TOTAL_MAX_SCORE } = require('../utils/standards');

const calculators = {
  A: ScoringSystem.calculateAspectA,
  B: ScoringSystem.calculateAspectB,
  C: ScoringSystem.calculateAspectC,
  D: ScoringSystem.calculateAspectD,
  E: ScoringSystem.calculateAspectE,
  F: ScoringSystem.calculateAspectF
};

const expectedMax = { A: 30, B: 30, C: 5, D: 20, E: 5, F: 10 };

for (const [instrument, calculate] of Object.entries(calculators)) {
  const empty = calculate({}, []);
  assert.strictEqual(empty.totalScore, 0, `Instrumen ${instrument}: tanpa bukti aktif harus bernilai 0`);
  assert.strictEqual(empty.maxScore, expectedMax[instrument], `Instrumen ${instrument}: skor maksimum tidak sesuai workbook`);

  const allEvidence = Object.keys(INSTRUMENT_STANDARDS[instrument].evidenceWeights);
  const maximum = instrument === 'B'
    ? calculate({ ind_3_pilihan: 'd', ind_27_pilihan: 'd', ind_41_pilihan: 'a' }, allEvidence.filter(key => !['ind_3','ind_27','ind_41'].includes(key)).concat('ind_3d','ind_27d','ind_41a'))
    : instrument === 'D'
      ? calculate({ ind_3_pilihan: 'd' }, allEvidence.filter(key => key !== 'ind_3').concat('ind_3d'))
      : calculate({}, allEvidence);
  assert.strictEqual(maximum.totalScore, expectedMax[instrument], `Instrumen ${instrument}: seluruh bukti harus mencapai skor maksimum`);
  assert.strictEqual(maximum.percentage, 100, `Instrumen ${instrument}: seluruh bukti harus mencapai 100%`);
}

const dataWithoutEvidence = ScoringSystem.calculateAspectA({
  ind_1_status: 'ada',
  ind_3_status: 'ada',
  ind_11_status: 'Sangat Baik'
}, []);
assert.strictEqual(dataWithoutEvidence.totalScore, 0, 'Isian data tanpa bukti aktif tidak boleh menghasilkan skor');

const partialA = ScoringSystem.calculateAspectA({}, ['ind_1', 'ind_2a', 'ind_9b']);
assert.strictEqual(partialA.totalScore, 3.5, 'Bobot parsial Instrumen A harus mengikuti workbook');

const legacyA = ScoringSystem.calculateAspectA({}, ['ind_2']);
assert.strictEqual(legacyA.totalScore, 2, 'Bukti lama indikator induk A harus dipetakan ke seluruh subindikator terkait');

const maximumAspects = Object.fromEntries(Object.entries(calculators).map(([code, calculate]) => {
  const evidence = Object.keys(INSTRUMENT_STANDARDS[code].evidenceWeights);
  return [code, code === 'B'
    ? calculate({ ind_3_pilihan: 'd', ind_27_pilihan: 'd', ind_41_pilihan: 'a' }, evidence.filter(key => !['ind_3','ind_27','ind_41'].includes(key)).concat('ind_3d','ind_27d','ind_41a'))
    : code === 'D'
      ? calculate({ ind_3_pilihan: 'd' }, evidence.filter(key => key !== 'ind_3').concat('ind_3d'))
      : calculate({}, evidence)];
}));

const q3b = ScoringSystem.calculateAspectB({ ind_3_pilihan: 'b' }, ['ind_3b']);
assert.strictEqual(q3b.details.ind_3.score, 0.5, 'Pilihan b Pertanyaan 3 harus bernilai 0,50 jika bukti b tersedia.');
const q3WrongEvidence = ScoringSystem.calculateAspectB({ ind_3_pilihan: 'b' }, ['ind_3c']);
assert.strictEqual(q3WrongEvidence.details.ind_3.score, 0, 'Bukti pilihan lain tidak boleh menghasilkan nilai.');
const q3WithoutEvidence = ScoringSystem.calculateAspectB({ ind_3_pilihan: 'c' }, []);
assert.strictEqual(q3WithoutEvidence.details.ind_3.score, 0, 'Pilihan tanpa bukti tidak boleh menghasilkan nilai.');
const q3Legacy = ScoringSystem.calculateAspectB({ ind_3_jumlah: 15 }, ['ind_3']);
assert.strictEqual(q3Legacy.details.ind_3.score, 0.75, 'Data lama 15 kali harus tetap terbaca sebagai pilihan c bernilai 0,75.');
const q27c = ScoringSystem.calculateAspectB({ ind_27_pilihan: 'c' }, ['ind_27c']);
assert.strictEqual(q27c.details.ind_27.score, 0.75, 'Pilihan c Pertanyaan 27 harus bernilai 0,75 jika bukti c tersedia.');
const q41a = ScoringSystem.calculateAspectB({ ind_41_pilihan: 'a' }, ['ind_41a']);
assert.strictEqual(q41a.details.ind_41.score, 1, 'Pilihan a Pertanyaan 41 harus bernilai 1,00 jika bukti a tersedia.');
const q41WrongEvidence = ScoringSystem.calculateAspectB({ ind_41_pilihan: 'a' }, ['ind_41d']);
assert.strictEqual(q41WrongEvidence.details.ind_41.score, 0, 'Bukti SAKIP pada pilihan lain tidak boleh menghasilkan nilai.');
const d3c = ScoringSystem.calculateAspectD({ ind_3_pilihan: 'c' }, ['ind_3c']);
assert.strictEqual(d3c.details.ind_3.score, 2.5, 'Pilihan c Instrumen D Pertanyaan 3 harus bernilai 2,50.');
const d3WrongEvidence = ScoringSystem.calculateAspectD({ ind_3_pilihan: 'c' }, ['ind_3d']);
assert.strictEqual(d3WrongEvidence.details.ind_3.score, 0, 'Bukti pilihan D.3 yang tidak aktif tidak boleh menghasilkan nilai.');
const total = ScoringSystem.calculateTotalScore(
  maximumAspects.A, maximumAspects.B, maximumAspects.C,
  maximumAspects.D, maximumAspects.E, maximumAspects.F
);
assert.strictEqual(total.totalScore, 100, 'Total seluruh instrumen harus mencapai 100');
assert.strictEqual(total.maxScore, TOTAL_MAX_SCORE, 'Skor maksimum total harus 100');
assert.strictEqual(total.percentage, 100, 'Persentase total maksimum harus 100%');

console.log('✅ Semua pengujian scoring sesuai workbook 2026 lulus.');
