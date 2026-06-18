'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const catalog = require('../data/evaluation-questions.json');
const { INSTRUMENT_STANDARDS } = require('../utils/standards');
const {
  getInstrumentQuestions,
  buildInstrumentMatrix,
  validateAwardedScore
} = require('../utils/evaluation-matrix');

const expectedQuestionCounts = { A: 16, B: 43, C: 6, D: 4, E: 5, F: 40 };
const expectedEvidenceCounts = { A: 32, B: 106, C: 10, D: 9, E: 5, F: 40 };

for (const code of Object.keys(expectedQuestionCounts)) {
  const questions = getInstrumentQuestions(code);
  assert.strictEqual(questions.length, expectedQuestionCounts[code], `Jumlah pertanyaan Instrumen ${code} harus sesuai Excel.`);
  assert.strictEqual(
    questions.reduce((sum, question) => sum + question.evidence.length, 0),
    expectedEvidenceCounts[code],
    `Jumlah slot bukti Instrumen ${code} harus sesuai struktur folder resmi.`
  );
  assert.strictEqual(
    Math.round(questions.reduce((sum, question) => sum + Number(question.maxScore || 0), 0) * 100) / 100,
    INSTRUMENT_STANDARDS[code].maxScore,
    `Jumlah standar nilai Instrumen ${code} harus sama dengan maksimum instrumen.`
  );
}

const bQuestions = getInstrumentQuestions('B');
assert.deepStrictEqual(
  bQuestions[11].evidence.map(item => item.key),
  ['ind_12a', 'ind_12b'],
  'Pertanyaan 12 Instrumen B wajib memiliki bukti 12.a dan 12.b.'
);
assert.deepStrictEqual(
  bQuestions[15].evidence.map(item => item.key),
  ['ind_16a1', 'ind_16a2', 'ind_16a3', 'ind_16b1', 'ind_16b2', 'ind_16b3'],
  'Pertanyaan 16 Instrumen B wajib memiliki enam subpertanyaan bukti.'
);

const matrix = buildInstrumentMatrix({
  code: 'B',
  row: { ind_12a_jumlah: 2, ind_12b_jumlah: 1 },
  files: [
    { id: 1, indicator_key: 'ind_12a', original_name: 'bukti-a.pdf' },
    { id: 2, indicator_key: 'ind_12b', original_name: 'bukti-b.pdf' }
  ],
  itemScores: [{ indicator_key: 'ind_12', awarded_score: 0.5, notes: 'Sesuai' }],
  aspectScore: { details: { ind_12: { score: 0.5 } } }
});
const question12 = matrix.questions.find(item => item.number === 12);
assert(question12.evidenceComplete, 'Bukti Pertanyaan 12 harus dinyatakan lengkap saat 12.a dan 12.b tersedia.');
assert.strictEqual(question12.awardedScore, 0.5, 'Nilai admin yang tersimpan harus dipakai.');
assert.strictEqual(question12.answers.length, 2, 'Jawaban 12.a dan 12.b harus tampil bersama.');
assert.strictEqual(validateAwardedScore(question12, '0,50'), 0.5, 'Nilai dengan koma harus diterima.');
assert.throws(() => validateAwardedScore(question12, '0.75'), /harus berada/, 'Nilai tidak boleh melebihi standar pertanyaan.');

const choiceMatrix = buildInstrumentMatrix({
  code: 'B',
  row: { ind_3_pilihan: 'c' },
  files: [{ id: 3, indicator_key: 'ind_3c', original_name: 'forkopimcam.pdf' }],
  itemScores: [],
  aspectScore: { details: { ind_3: { score: 0.75 } } }
});
const question3 = choiceMatrix.questions.find(item => item.number === 3);
assert.strictEqual(question3.evidenceTotal, 1, 'Pilihan tunggal hanya mewajibkan satu bukti aktif.');
assert.strictEqual(question3.evidenceFilled, 1, 'Bukti pada pilihan aktif harus dihitung.');
assert(question3.evidenceComplete, 'Pertanyaan pilihan lengkap setelah pilihan dan bukti aktif tersedia.');

const detailView = fs.readFileSync(path.join(__dirname, '..', 'views', 'evaluation', 'detail.ejs'), 'utf8');
assert(detailView.includes('Standar Nilai'), 'Tabel admin harus menampilkan Standar Nilai.');
assert(detailView.includes('Nilai Sistem'), 'Tabel admin harus menampilkan Nilai Sistem.');
assert(detailView.includes('Hasil Penilaian'), 'Tabel admin harus menampilkan Hasil Penilaian.');
assert(detailView.includes('Jumlah Nilai Instrumen'), 'Tabel admin harus menampilkan jumlah nilai per instrumen.');

console.log('✅ Semua pengujian matriks penilaian admin lulus.');
