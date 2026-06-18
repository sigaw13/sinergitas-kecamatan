'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const questions = require('../data/evaluation-questions.json');
const ScoringSystem = require('../utils/scoring');
const { INSTRUMENTS } = require('../utils/progress');
const { getInstrumentStandard } = require('../utils/standards');

async function main() {
  const definitions = [3, 27, 41].map(number => questions.B.questions.find(question => Number(question.number) === number));
  const expected = {
    3: [0.25, 0.5, 0.75, 1],
    27: [0, 0.25, 0.75, 1],
    41: [1, 0.75, 0.5, 0.25]
  };
  for (const question of definitions) {
    assert.strictEqual(question.answerType, 'single_choice_with_evidence');
    assert.strictEqual(question.field, `ind_${question.number}_pilihan`);
    assert.deepStrictEqual(question.options.map(option => option.key), ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(question.options.map(option => option.score), expected[question.number]);
    assert.deepStrictEqual(question.options.map(option => option.evidenceKey), ['a','b','c','d'].map(letter => `ind_${question.number}${letter}`));
  }

  const viewPath = path.join(__dirname, '..', 'views', 'assessment', 'aspect-b.ejs');
  const html = await ejs.renderFile(viewPath, {
    data: {}, uploadedFiles: [], missingEvidenceKeys: [], saved: false,
    saveResult: null, kecamatan_id: 1, isAdmin: false,
    kecamatan: 'Kecamatan Pengujian', username: 'pengujian', evaluationLocked: false,
    progress: { instrument: 'B', percent: 0, dataFilled: 0, dataTotal: INSTRUMENTS.b.fields.length, evidenceFilled: 0, evidenceTotal: 106 },
    standard: getInstrumentStandard('B'), questionDefinitions: questions.B.questions
  });

  for (const number of [3, 27, 41]) {
    const radios = [...html.matchAll(new RegExp(`name="ind_${number}_pilihan" value="([a-d])"`, 'g'))].map(match => match[1]);
    assert.deepStrictEqual(radios, ['a', 'b', 'c', 'd'], `Radio Pertanyaan ${number} harus lengkap.`);
    for (const letter of ['a', 'b', 'c', 'd']) {
      const key = `ind_${number}${letter}_file`;
      assert.strictEqual((html.match(new RegExp(`name="${key}"`, 'g')) || []).length, 1, `Slot ${key} harus muncul satu kali.`);
    }
  }
  assert(!html.includes('Data lama mencatat'), 'Form tidak boleh menampilkan keterangan migrasi di luar Excel.');
  assert(!html.includes('Isi ulang jumlah'), 'Form tidak boleh meminta pengisian ulang di luar Excel.');

  assert.strictEqual(ScoringSystem.calculateAspectB({ ind_3_pilihan: 'b' }, ['ind_3b']).details.ind_3.score, 0.5);
  assert.strictEqual(ScoringSystem.calculateAspectB({ ind_27_pilihan: 'c' }, ['ind_27c']).details.ind_27.score, 0.75);
  assert.strictEqual(ScoringSystem.calculateAspectB({ ind_41_pilihan: 'a' }, ['ind_41a']).details.ind_41.score, 1);
  assert.strictEqual(ScoringSystem.calculateAspectB({ ind_41_pilihan: 'a' }, ['ind_41b']).details.ind_41.score, 0);
  assert.strictEqual(ScoringSystem.calculateAspectB({ ind_27_pilihan: 'd' }, []).details.ind_27.score, 0);

  const dQuestion = questions.D.questions.find(question => Number(question.number) === 3);
  assert.strictEqual(dQuestion.answerType, 'single_choice_with_evidence');
  assert.deepStrictEqual(dQuestion.options.map(option => option.score), [1.5, 2, 2.5, 3]);
  assert.deepStrictEqual(dQuestion.options.map(option => option.evidenceKey), ['ind_3a','ind_3b','ind_3c','ind_3d']);
  assert.strictEqual(ScoringSystem.calculateAspectD({ ind_3_pilihan: 'c' }, ['ind_3c']).details.ind_3.score, 2.5);
  assert.strictEqual(ScoringSystem.calculateAspectD({ ind_3_pilihan: 'c' }, ['ind_3b']).details.ind_3.score, 0);

  const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'assessment.js'), 'utf8');
  for (const field of ['ind_3_pilihan', 'ind_27_pilihan', 'ind_41_pilihan']) {
    assert(route.includes(`${field}: '${field}'`), `Route harus menyimpan ${field}.`);
  }
  assert(route.includes('validateChoiceUploads'), 'Route harus memvalidasi upload pilihan.');
  assert(route.includes('INVALID_CHOICE_EVIDENCE'), 'Route harus menolak upload pada pilihan yang tidak aktif.');

  const database = fs.readFileSync(path.join(__dirname, '..', 'database', 'database.js'), 'utf8');
  for (const field of ['ind_3_pilihan', 'ind_27_pilihan', 'ind_41_pilihan']) {
    assert(database.includes(`${field} TEXT`), `Skema database harus menyediakan ${field}.`);
  }
  console.log('Pengujian pilihan tunggal dan upload per pilihan lulus.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
