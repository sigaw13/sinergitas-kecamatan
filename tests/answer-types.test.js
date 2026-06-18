'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { INSTRUMENTS } = require('../utils/progress');
const questions = require('../data/evaluation-questions.json');

const views = path.join(__dirname, '..', 'views', 'assessment');
const read = name => fs.readFileSync(path.join(views, name), 'utf8');

const b = read('aspect-b.ejs');
assert.ok(b.includes("include('_choice-question'"), 'Instrumen B harus memakai renderer pilihan tunggal.');
assert.ok(!b.includes('name="ind_3_jumlah"'), 'Instrumen B nomor 3 tidak boleh berupa input angka.');
const choiceQuestions = [3, 27, 41].map(number => questions.B.questions.find(question => Number(question.number) === number));
const q3 = choiceQuestions[0];
assert.strictEqual(q3.answerType, 'single_choice_with_evidence', 'Pertanyaan 3 harus memakai pilihan tunggal dengan bukti per pilihan.');
assert.deepStrictEqual(q3.options.map(option => option.evidenceKey), ['ind_3a','ind_3b','ind_3c','ind_3d'], 'Pilihan upload Pertanyaan 3 harus lengkap.');
for (const question of choiceQuestions) {
  assert.strictEqual(question.answerType, 'single_choice_with_evidence', `Pertanyaan ${question.number} harus memakai pilihan tunggal dengan bukti per pilihan.`);
  assert.strictEqual(question.options.length, 4, `Pertanyaan ${question.number} harus memiliki empat pilihan.`);
}
assert.ok(b.includes("numberField('ind_5_jumlah'"), 'Instrumen B nomor 5 harus berupa jumlah pertemuan.');
assert.ok(!b.includes("numberField('ind_5_persen'"), 'Instrumen B nomor 5 tidak boleh berupa persentase.');
assert.ok(b.includes('name="ind_43c_komentar"'), 'Instrumen B nomor 43.c harus berupa komentar.');
assert.ok(b.includes('name="ind_43<%= item[0] %>_jumlah"'), 'Pertanyaan 43.a dan 43.b harus menyediakan angka jumlah dokumen.');
assert.ok(b.includes('name="ind_43d_jumlah"'), 'Pertanyaan 43.d harus menyediakan angka jumlah dokumen.');

const c = read('aspect-c.ejs');
assert.ok(c.includes('<textarea name="ind_4"'), 'Instrumen C nomor 4 harus berupa komentar atau urutan prioritas.');

const d = read('aspect-d.ejs');
assert.ok(d.includes('name="ind_2_jumlah"'), 'Instrumen D nomor 2 harus memiliki satu angka jumlah inovasi.');
assert.ok(!d.includes('name="ind_2a_jumlah"'), 'Instrumen D nomor 2 tidak boleh memiliki angka kategori 2.a.');
assert.ok(!d.includes('name="ind_2b_jumlah"'), 'Instrumen D nomor 2 tidak boleh memiliki angka kategori 2.b.');
assert.ok(d.includes('name="ind_2_detail"'), 'Instrumen D nomor 2 harus memiliki uraian inovasi.');
assert.ok(d.includes('name="ind_4_detail"'), 'Instrumen D nomor 4 harus memiliki uraian prestasi.');
const d3 = questions.D.questions.find(question => Number(question.number) === 3);
assert.strictEqual(d3.answerType, 'single_choice_with_evidence', 'Instrumen D nomor 3 harus memakai pilihan tunggal dengan bukti per pilihan.');
assert.deepStrictEqual(d3.options.map(option => option.evidenceKey), ['ind_3a','ind_3b','ind_3c','ind_3d']);

for (const field of ['ind_3_pilihan', 'ind_27_pilihan', 'ind_41_pilihan', 'ind_43c_komentar']) {
  assert.ok(INSTRUMENTS.b.fields.includes(field), `Progress Instrumen B harus memuat ${field}.`);
}
for (const field of ['ind_2_jumlah', 'ind_3_pilihan', 'ind_4_detail']) {
  assert.ok(INSTRUMENTS.d.fields.includes(field), `Progress Instrumen D harus memuat ${field}.`);
}

console.log('✅ Pengujian tipe jawaban angka, pilihan, dan komentar lulus.');
