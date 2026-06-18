'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const questions = require('../data/evaluation-questions.json').B.questions;
const { getInstrumentStandard } = require('../utils/standards');
const { INSTRUMENTS } = require('../utils/progress');

const officialEvidenceKeys = questions.flatMap(question => question.evidence.map(item => item.key));
assert.strictEqual(questions.length, 43, 'Instrumen B harus memiliki 43 pertanyaan utama.');
assert.strictEqual(officialEvidenceKeys.length, 106, 'Instrumen B harus memiliki 106 slot upload pada konfigurasi v1.7.8.2.');
assert.strictEqual(new Set(officialEvidenceKeys).size, 106, 'Kunci upload Instrumen B tidak boleh duplikat.');
assert.deepStrictEqual(INSTRUMENTS.b.evidenceKeys, officialEvidenceKeys, 'Progres harus memakai struktur folder resmi.');

const standard = getInstrumentStandard('B');
const totalWeight = Object.values(standard.evidenceWeights).reduce((sum, value) => sum + Number(value), 0);
assert.ok(Math.abs(totalWeight - 30) < 0.000001, 'Bobot Instrumen B harus berjumlah 30.');

const viewPath = path.join(__dirname, '..', 'views', 'assessment', 'aspect-b.ejs');
const view = fs.readFileSync(viewPath, 'utf8');
assert.ok(view.includes("include('_question-evidence'"), 'Upload harus berada di setiap kartu pertanyaan.');
assert.ok(!view.includes('Unggah Bukti Dukung Instrumen B'), 'Panel upload terpisah harus dihapus.');
assert.ok(view.includes("include('_choice-question'"), 'Renderer pilihan tunggal harus digunakan.');
assert.ok(!view.includes('name="ind_3_jumlah"'), 'Pertanyaan 3 tidak boleh menggunakan input angka.');
assert.ok(view.includes('name="ind_43c_komentar"'), 'Pertanyaan 43.c harus menggunakan komentar atau uraian.');
assert.ok(view.includes('data-subquestion="26.a"'), 'Pertanyaan 26.a harus dibuat sebagai baris tersendiri.');
assert.ok(view.includes("['f','Koordinasi dengan perangkat daerah dalam rangka pelaksanaan pembangunan kawasan perdesaan di wilayahnya'"), 'Definisi Pertanyaan 26.f harus tersedia.');
for (const number of [3, 27, 41]) {
  const question = questions.find(item => Number(item.number) === number);
  assert.strictEqual(question.answerType, 'single_choice_with_evidence', `Pertanyaan ${number} harus menggunakan pilihan tunggal.`);
}
assert.ok(view.includes('data-ratio-numerator="<%= n %>"'), 'Pertanyaan rasio harus memiliki pembilang per subpertanyaan.');
assert.ok(view.includes('data-ratio-denominator="<%= n %>"'), 'Pertanyaan rasio harus memiliki penyebut per subpertanyaan.');

const partial = fs.readFileSync(path.join(__dirname, '..', 'views', 'assessment', '_question-evidence.ejs'), 'utf8');
const slotPartial = fs.readFileSync(path.join(__dirname, '..', 'views', 'assessment', '_question-evidence-slot.ejs'), 'utf8');
assert.ok(partial.includes("include('_question-evidence-slot'"), 'Renderer bukti harus memakai satu slot per subpertanyaan.');
assert.ok(slotPartial.includes('name="<%= safeEvidenceItem.key %>_file"'), 'Nama input upload harus mengikuti kunci subpertanyaan.');
assert.ok(slotPartial.includes('safeEvidenceItem.folder'), 'Lokasi folder resmi harus tersedia pada slot upload.');

function sectionHtml(html, number, nextNumber) {
  const start = html.indexOf(`id="question-${number}"`);
  assert.ok(start >= 0, `Bagian Pertanyaan ${number} tidak ditemukan.`);
  const end = nextNumber ? html.indexOf(`id="question-${nextNumber}"`, start + 1) : html.length;
  return html.slice(start, end >= 0 ? end : html.length);
}

async function main() {
  const html = await ejs.renderFile(viewPath, {
    data: {}, uploadedFiles: [], missingEvidenceKeys: [], saved: false,
    saveResult: null, kecamatan_id: 1, isAdmin: false,
    kecamatan: 'Kecamatan Pengujian', username: 'pengujian', evaluationLocked: false,
    progress: {
      instrument: 'B', percent: 0,
      dataFilled: 0, dataTotal: INSTRUMENTS.b.fields.length,
      evidenceFilled: 0, evidenceTotal: INSTRUMENTS.b.evidenceKeys.length
    },
    standard,
    questionDefinitions: questions
  });

  const fileNames = [...html.matchAll(/\bname="([^"]+_file)"/g)].map(match => match[1]);
  assert.strictEqual(fileNames.length, 106, 'HTML Instrumen B harus merender 106 slot upload.');
  assert.strictEqual(new Set(fileNames).size, 106, 'Input upload pada HTML tidak boleh duplikat.');

  const q26 = sectionHtml(html, 26, 27);
  const q26Tokens = ['26.a', 'ind_26a_file', '26.b', 'ind_26b_file', '26.c', 'ind_26c_file', '26.d', 'ind_26d_file', '26.e', 'ind_26e_file', '26.f', 'ind_26f_file'];
  let previous = -1;
  for (const token of q26Tokens) {
    const index = q26.indexOf(token);
    assert.ok(index > previous, `Urutan Pertanyaan 26 tidak benar pada ${token}.`);
    previous = index;
  }

  const q3 = sectionHtml(html, 3, 4);
  for (const key of ['ind_3a_file','ind_3b_file','ind_3c_file','ind_3d_file']) {
    assert.strictEqual((q3.match(new RegExp(key, 'g')) || []).length, 1, `Pertanyaan 3 harus memiliki satu slot ${key}.`);
  }

  for (const number of [3, 27, 41]) {
    const section = sectionHtml(html, number, number === 3 ? 4 : number === 27 ? 28 : 42);
    for (const letter of ['a', 'b', 'c', 'd']) {
      const key = `ind_${number}${letter}_file`;
      assert.strictEqual((section.match(new RegExp(key, 'g')) || []).length, 1, `Pertanyaan ${number} harus memiliki satu slot ${key}.`);
    }
  }

  const twoSlotQuestions = [28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40];
  for (const number of twoSlotQuestions) {
    const next = number === 40 ? 41 : number + 1;
    const section = sectionHtml(html, number, next);
    const inputA = section.indexOf(`name="ind_${number}a_jumlah"`);
    const uploadA = section.indexOf(`name="ind_${number}a_file"`);
    const inputB = section.indexOf(`name="ind_${number}b_jumlah"`);
    const uploadB = section.indexOf(`name="ind_${number}b_file"`);
    assert.ok(inputA >= 0 && uploadA > inputA, `Upload ${number}.a harus berada setelah jawaban ${number}.a.`);
    assert.ok(inputB > uploadA && uploadB > inputB, `Upload ${number}.b harus berada setelah jawaban ${number}.b.`);
  }

  const q33 = sectionHtml(html, 33, 34);
  previous = -1;
  for (const letter of ['a','b','c','d','e','f']) {
    const input = q33.indexOf(`name="ind_33${letter}_jumlah"`);
    const upload = q33.indexOf(`name="ind_33${letter}_file"`);
    assert.ok(input > previous, `Jawaban 33.${letter} tidak berurutan.`);
    assert.ok(upload > input, `Upload 33.${letter} harus berada setelah jawabannya.`);
    previous = upload;
  }

  console.log('✓ Struktur Instrumen B v1.7.8.2 sesuai pilihan dan slot upload.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
