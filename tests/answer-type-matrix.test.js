'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { INSTRUMENTS } = require('../utils/progress');
const catalog = require('../data/evaluation-questions.json');

const root = path.join(__dirname, '..');
const view = key => fs.readFileSync(path.join(root, 'views', 'assessment', `aspect-${key}.ejs`), 'utf8');
const route = fs.readFileSync(path.join(root, 'routes', 'assessment.js'), 'utf8');
const database = fs.readFileSync(path.join(root, 'database', 'database.js'), 'utf8');

const a = view('a');
for (const field of ['ind_1_status', 'ind_3_status', 'ind_6_status', 'ind_8_status', 'ind_11_status', 'ind_13_status']) {
  assert.ok(a.includes(`select name="${field}"`), `Instrumen A ${field} harus berupa pilihan.`);
}
for (const field of ['ind_4_jumlah', 'ind_5a_jumlah', 'ind_5b_jumlah', 'ind_7_jumlah', 'ind_12a_jumlah', 'ind_12b_jumlah']) {
  assert.ok(a.includes(`type="number" min="0" name="${field}"`), `Instrumen A ${field} harus berupa angka.`);
}
for (const field of ['ind_15_persen', 'ind_16_persen']) {
  assert.ok(a.includes(`name="${field}"`), `Instrumen A ${field} harus berupa persentase.`);
}
assert.ok(a.includes('select name="ind_2<%= item[0] %>_status"'), 'Instrumen A nomor 2 harus berupa pilihan per subpertanyaan.');
assert.ok(a.includes('select name="ind_9<%= item[0] %>_status"'), 'Instrumen A nomor 9 harus berupa pilihan per subpertanyaan.');
assert.ok(a.includes('select name="ind_10<%= item[0] %>_status"'), 'Instrumen A nomor 10 harus berupa pilihan per subpertanyaan.');
assert.ok(a.includes('select name="ind_14<%= item[0] %>_status"'), 'Instrumen A nomor 14 harus berupa pilihan per subpertanyaan.');

const b = view('b');
assert.ok(b.includes("include('_choice-question'"), 'Instrumen B harus memakai renderer pilihan tunggal.');
assert.ok(!b.includes('name="ind_3_jumlah"'), 'Instrumen B nomor 3 tidak boleh berupa angka.');
assert.ok(b.includes("numberField('ind_5_jumlah'"), 'Instrumen B nomor 5 harus berupa angka jumlah pertemuan.');
assert.ok(b.includes("selectField('ind_10a_status'"), 'Instrumen B nomor 10 harus berupa pilihan status.');
assert.ok(b.includes('name="ind_26a_status"') && b.includes('name="ind_26a_jumlah"'), 'Instrumen B nomor 26.a harus memuat status dan jumlah.');
assert.strictEqual(catalog.B.questions.find(question => Number(question.number) === 27).field, 'ind_27_pilihan', 'Instrumen B nomor 27 harus berupa pilihan tunggal.');
assert.ok(b.includes('name="ind_30_klasifikasi"'), 'Instrumen B nomor 30 harus memuat pilihan klasifikasi.');
assert.strictEqual(catalog.B.questions.find(question => Number(question.number) === 41).field, 'ind_41_pilihan', 'Instrumen B nomor 41 harus berupa pilihan tunggal kelompok nilai SAKIP.');
assert.ok(b.includes('name="ind_42_status"'), 'Instrumen B nomor 42 harus berupa pilihan status.');
assert.ok(b.includes('textarea name="ind_43c_komentar"'), 'Instrumen B nomor 43.c harus berupa komentar.');
assert.ok(b.includes('name="ind_43e_status"'), 'Instrumen B nomor 43.e harus berupa pilihan ya atau tidak.');

const c = view('c');
assert.ok(c.includes('select name="ind_1<%= item[0] %>"'), 'Instrumen C nomor 1 harus berupa pilihan ketersediaan.');
for (const field of ['ind_2a_program', 'ind_2a_indikator', 'ind_2b_program', 'ind_2b_indikator']) {
  assert.ok(c.includes(`type="number" min="0" name="${field}"`), `Instrumen C ${field} harus berupa angka.`);
}
assert.ok(c.includes('name="ind_3<%= item[0] %>"'), 'Instrumen C nomor 3 harus berupa persentase.');
assert.ok(c.includes('textarea name="ind_4"'), 'Instrumen C nomor 4 harus berupa komentar urutan prioritas.');
assert.ok(c.includes('name="ind_5<%= item[0] %>"'), 'Instrumen C nomor 5 harus berupa persentase.');
for (const field of ['ind_6a', 'ind_6b']) {
  assert.ok(c.includes(`type="number" min="0" name="${field}"`), `Instrumen C ${field} harus berupa angka rupiah.`);
}

const d = view('d');
for (const field of ['ind_1a_nama', 'ind_1b_nama', 'ind_2_detail', 'ind_4_detail']) {
  assert.ok(d.includes(`textarea name="${field}"`), `Instrumen D ${field} harus berupa komentar atau daftar nama.`);
}
for (const field of ['ind_2_jumlah', 'ind_4a_nasional', 'ind_4a_provinsi', 'ind_4a_kabupaten', 'ind_4b_nasional', 'ind_4b_provinsi']) {
  assert.ok(d.includes(`type="number" name="${field}"`) || d.includes(`type="number" min="0" name="${field}"`), `Instrumen D ${field} harus berupa angka.`);
}

assert.strictEqual(catalog.D.questions.find(question => Number(question.number) === 3).field, 'ind_3_pilihan', 'Instrumen D nomor 3 harus berupa pilihan tunggal.');

const e = view('e');
for (const field of ['ind_1a_sd', 'ind_1b_smp', 'ind_1c_sma', 'ind_1d_d3', 'ind_1e_s1', 'ind_1f_s2', 'ind_1g_s3', 'ind_2_jumlah', 'ind_3_jumlah', 'ind_4_jumlah']) {
  assert.ok(e.includes(`type="number" min="0" name="${field}"`), `Instrumen E ${field} harus berupa angka.`);
}
assert.ok(e.includes('select name="ind_1_persen_tertinggi"'), 'Instrumen E kelompok pendidikan tertinggi harus berupa pilihan.');
assert.ok(e.includes('select name="ind_5_status"'), 'Instrumen E nomor 5 harus berupa pilihan status.');

const f = view('f');
assert.ok(f.includes('select name="ind_<%= item.n %>_status"'), 'Seluruh Instrumen F harus berupa pilihan ketersediaan.');
assert.ok(!f.includes('type="number"'), 'Instrumen F tidak boleh menggunakan input angka untuk jawaban indikator.');

for (const field of ['ind_3_pilihan', 'ind_27_pilihan', 'ind_41_pilihan', 'ind_5_jumlah', 'ind_43a_jumlah', 'ind_43b_jumlah', 'ind_43c_komentar', 'ind_43d_jumlah']) {
  assert.ok(route.includes(`${field}: '${field}'`), `Route Instrumen B harus menyimpan ${field}.`);
  assert.ok(INSTRUMENTS.b.fields.includes(field), `Progress Instrumen B harus memantau ${field}.`);
  assert.ok(database.includes(field), `Schema database harus menyediakan ${field}.`);
}
for (const field of ['ind_2_jumlah', 'ind_2_detail', 'ind_3_pilihan', 'ind_4_detail']) {
  assert.ok(route.includes(`'${field}'`) || route.includes(`${field}: '${field}'`), `Route Instrumen D harus menyimpan ${field}.`);
  assert.ok(INSTRUMENTS.d.fields.includes(field), `Progress Instrumen D harus memantau ${field}.`);
  assert.ok(database.includes(field), `Schema database harus menyediakan ${field}.`);
}

assert.ok(!/\(_jumlah\|_persen[^\n]*_komentar/.test(route), 'Field komentar tidak boleh masuk pola konversi angka.');

console.log('✅ Matriks tipe jawaban Instrumen A sampai F lulus.');
